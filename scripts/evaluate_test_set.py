"""One-shot evaluation of the frozen models on the reserved test rows.

Run from the repository root after the method and weights are frozen:

    uv run python scripts/evaluate_test_set.py

The script only reads the 397 rows marked `reserved_holdout_unscored` in
datasets/splits/split_manifest.csv. It does not refit, tune, or select.
Outputs are written to output/combination_v3/test_set/.
"""
from pathlib import Path
import json
import os

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "datasets/data_2026.csv"
SPLIT = ROOT / "datasets/splits/split_manifest.csv"
CKPT = ROOT / "models/combination_v3/tabpfn_probe/tabpfn-v2-regressor.ckpt"
OUT = ROOT / "output/combination_v3/test_set"
MODELS = {
    "TabPFN_ExtraTreesBlend": ROOT / "models/combination_v3/tabpfn_nested/deployment/TabPFN_ExtraTreesBlend.joblib",
    "TabPFN_TwoTreeBlend": ROOT / "models/combination_v3/tabpfn_nested/deployment/TabPFN_TwoTreeBlend.joblib",
}
FEATURES = ["Drug SMILES", "Solvent SMILES", "Temperature"]
BOOTSTRAP = 10000
SEED = 2026


def metrics(y, pred):
    err = y - pred
    ae = np.abs(err)
    return {
        "MAE": float(ae.mean()),
        "RMSE": float(np.sqrt(np.mean(err ** 2))),
        "R2": float(1 - np.sum(err ** 2) / np.sum((y - y.mean()) ** 2)),
    }


def parent_mae(frame):
    return frame.groupby("parent_group_id").ae.mean()


def bootstrap_ci(values, seed=SEED, n=BOOTSTRAP):
    rng = np.random.default_rng(seed)
    draws = np.array([rng.choice(values, len(values), replace=True).mean() for _ in range(n)])
    return [float(np.percentile(draws, 2.5)), float(np.percentile(draws, 97.5))]


def prepare_model(model):
    """Point TabPFN components at the repository checkpoint and chosen device."""
    device = os.environ.get("TABPFN_DEVICE", "mps")
    components = getattr(model, "models", {})
    for component in components.values():
        if hasattr(component, "model_path"):
            component.model_path = str(CKPT)
        if hasattr(component, "device"):
            component.device = device
    return model


def main():
    data = pd.read_csv(DATA, encoding="utf-8-sig")
    data["data_row"] = np.arange(1, len(data) + 1)
    split = pd.read_csv(SPLIT)
    test = data.merge(split, on="data_row", how="inner", validate="one_to_one")
    test = test[test["role"] == "reserved_holdout_unscored"].reset_index(drop=True)
    if len(test) != 397 or test["parent_group_id"].nunique() != 33:
        raise RuntimeError(f"unexpected test split: {len(test)} rows, {test['parent_group_id'].nunique()} parents")

    y = test["Solubility_log10"].to_numpy(float)
    result = {"rows": int(len(test)), "parents": int(test["parent_group_id"].nunique()), "models": {}}
    predictions = test[["data_row", "parent_group_id", "Solubility_log10"]].copy()

    for name, path in MODELS.items():
        if not path.exists():
            print(f"skip {name}: {path} not found")
            continue
        model = prepare_model(joblib.load(path))
        pred = np.asarray(model.predict(test[FEATURES]), dtype=float)
        frame = test[["parent_group_id"]].copy()
        frame["ae"] = np.abs(y - pred)
        pm = parent_mae(frame)
        row = metrics(y, pred)
        row["parent_macro_MAE"] = float(pm.mean())
        row["parent_macro_MAE_95CI"] = bootstrap_ci(pm.to_numpy())
        result["models"][name] = row
        predictions[name] = pred
        del model
        print(f"{name}: parent {row['parent_macro_MAE']:.4f}, MAE {row['MAE']:.4f}, RMSE {row['RMSE']:.4f}, R2 {row['R2']:.4f}")

    if len(result["models"]) == 2:
        main = predictions["TabPFN_ExtraTreesBlend"]
        other = predictions["TabPFN_TwoTreeBlend"]
        frame = test[["parent_group_id"]].copy()
        frame["d"] = np.abs(y - main) - np.abs(y - other)
        diff = frame.groupby("parent_group_id").d.mean()
        result["main_minus_twotree"] = {
            "mean": float(diff.mean()),
            "parent_macro_difference_95CI": bootstrap_ci(diff.to_numpy()),
            "main_better": int((diff < 0).sum()),
            "twotree_better": int((diff > 0).sum()),
        }

    OUT.mkdir(parents=True, exist_ok=True)
    predictions.to_csv(OUT / "test_predictions.csv", index=False)
    (OUT / "test_metrics.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"saved to {OUT}")


if __name__ == "__main__":
    main()
