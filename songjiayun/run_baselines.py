"""Run conventional regression baselines under the frozen development 5x3
parent-grouped nested protocol.

Adds three commonly expected baselines that the report does not yet tabulate:

  * RandomForest  -- the direct cousin of ExtraTrees (identical features and
                     weighting, differing only in split randomisation)
  * Ridge         -- the classic linear QSPR baseline
  * RbfSVR        -- an RBF-kernel support-vector regression

All three use the 869-dimensional explicit solute--solvent interaction
features ("interaction" representation), the same as RichExtraTrees /
RichCatBoost / TabM, so the comparison isolates the *algorithm* rather than
the feature set.  Hyper-parameters are selected on the inner 3-fold
GroupKFold within each outer training set, exactly as the existing families.

Output schema matches the existing families, so the results can be collected
by ``run_combination_nested.py collect`` and read by ``analysis/results.py``
without further changes.

Run (from the repository root, in the project environment):

    PYTHONPATH=. uv run python scripts/run_baselines.py --model RandomForest
    PYTHONPATH=. uv run python scripts/run_baselines.py --model Ridge
    PYTHONPATH=. uv run python scripts/run_baselines.py --model RbfSVR
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import json
import time

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_selection import VarianceThreshold
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from src.data import ROOT, development_splits, load_data
from src.experimental_v3.tree_models import parent_weights, rich_features
from src.metrics import regression_metrics

OUT = ROOT / "output" / "combination_v3"
SEEDS = [2026, 17, 42]
# Feature set per model. Trees and the RBF-SVR use the 869-dim explicit
# interactions to stay comparable with RichExtraTrees/RichCatBoost/TabM.
# Ridge runs on the 23-dim base descriptors instead: a linear QSPR baseline is
# standard on low-dimensional, physically meaningful descriptors, and the
# 869-dim interaction space has near-constant columns that blow up under
# StandardScaler (the reason the earlier Ridge run diverged).
REPRESENTATION = {
    "RandomForest": "interaction",
    "Ridge": "small",
    "RbfSVR": "interaction",
}

MODELS = ["RandomForest", "Ridge", "RbfSVR"]

GRIDS = {
    "RandomForest": [
        {"n_estimators": 300, "max_features": mf, "min_samples_leaf": ml}
        for mf in (0.5, 0.7)
        for ml in (1, 2)
    ],
    "Ridge": [{"alpha": a} for a in (0.1, 1.0, 10.0, 100.0)],
    "RbfSVR": [{"C": c} for c in (1.0, 10.0)],
}


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, default=float) + "\n"
    )


def development():
    frame = load_data()
    return frame.loc[frame.role.eq("development")].reset_index(drop=True)


def X_y(df, model):
    return rich_features(df, REPRESENTATION[model]), df.Solubility_log10.to_numpy()


def make(model, seed, **params):
    if model == "RandomForest":
        return RandomForestRegressor(random_state=seed, n_jobs=2, **params)
    if model == "Ridge":
        return Ridge(random_state=seed, **params)
    if model == "RbfSVR":
        return SVR(gamma="scale", **params)
    raise ValueError(model)


def fit_predict(model, Xtr, ytr, gtr, Xva, name):
    """Fit preprocessing on the training fold only, then fit and predict."""
    imputer = SimpleImputer(strategy="median", keep_empty_features=True).fit(Xtr)
    Xtr_t, Xva_t = imputer.transform(Xtr), imputer.transform(Xva)
    selector = VarianceThreshold().fit(Xtr_t)
    Xtr_t, Xva_t = selector.transform(Xtr_t), selector.transform(Xva_t)
    if name in ("Ridge", "RbfSVR"):
        scaler = StandardScaler().fit(Xtr_t)
        Xtr_t, Xva_t = scaler.transform(Xtr_t), scaler.transform(Xva_t)
    weights = parent_weights(gtr, power=1.0)
    if name == "RbfSVR":
        model.fit(Xtr_t, ytr)  # sklearn SVR exposes no sample_weight
    else:
        model.fit(Xtr_t, ytr, sample_weight=weights)
    return model.predict(Xva_t)


def tune(model, df, dest):
    dest.mkdir(parents=True, exist_ok=True)
    X, y = X_y(df, model)
    folds = list(GroupKFold(3, shuffle=True, random_state=2026).split(X, y, df.parent))
    records = []
    for cid, params in enumerate(GRIDS[model]):
        pred = np.full(len(df), np.nan)
        assigned = np.full(len(df), -1)
        for fold, (tr, va) in enumerate(folds, 1):
            assert not set(df.iloc[tr].parent) & set(df.iloc[va].parent)
            pred[va] = fit_predict(
                make(model, 2026, **params),
                X[tr], y[tr], df.iloc[tr].parent.to_numpy(), X[va], model,
            )
            assigned[va] = fold
        assert np.isfinite(pred).all()
        record = {"params": params, "candidate": cid,
                  **regression_metrics(y, pred, df.parent)}
        pd.DataFrame({
            "data_row": df.data_row, "parent_id": df.parent_group_id,
            "inner_fold": assigned, "y": y, "prediction": pred,
        }).to_csv(dest / f"predictions_{cid:02}.csv", index=False)
        dump(dest / f"candidate_{cid:02}.json", record)
        records.append(record)
    best = min(records, key=lambda r: r["parent_macro_MAE"])
    dump(dest / "selected.json", best)
    return best["params"]


def nested(model, force=False):
    df = development()
    X, y = X_y(df, model)
    folder = OUT / "nested" / model
    for fold, (tr, va) in enumerate(development_splits(df), 1):
        assert not set(df.iloc[tr].parent) & set(df.iloc[va].parent)
        dest = folder / f"fold_{fold}"
        params = tune(model, df.iloc[tr].reset_index(drop=True), dest / "search")
        for seed in SEEDS:
            path = dest / f"predictions_{seed}.csv"
            if path.exists() and not force:
                continue
            start = time.perf_counter()
            pred = fit_predict(
                make(model, seed, **params),
                X[tr], y[tr], df.iloc[tr].parent.to_numpy(), X[va], model,
            )
            assert np.isfinite(pred).all()
            pd.DataFrame({
                "data_row": df.iloc[va].data_row,
                "parent_id": df.iloc[va].parent_group_id,
                "fold": fold, "seed": seed, "y": y[va], "prediction": pred,
            }).to_csv(path, index=False)
            dump(dest / f"metrics_{seed}.json", {
                "params": params, "seconds": time.perf_counter() - start,
                **regression_metrics(y[va], pred, df.iloc[va].parent),
            })
            print(f"{model} fold={fold} seed={seed} parent_MAE="
                  f"{regression_metrics(y[va], pred, df.iloc[va].parent)['parent_macro_MAE']:.5f}",
                  flush=True)
    print(f"BASELINE COMPLETE {model}", flush=True)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=MODELS)
    parser.add_argument("--force", action="store_true",
                        help="overwrite existing fold predictions")
    args = parser.parse_args()
    if args.model:
        nested(args.model, force=args.force)
    else:
        for m in MODELS:
            nested(m, force=args.force)
