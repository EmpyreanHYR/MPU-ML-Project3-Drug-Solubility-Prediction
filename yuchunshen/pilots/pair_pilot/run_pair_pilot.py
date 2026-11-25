"""Screen eight normalized-interaction candidates using development-only 3-fold CV.

Run from any directory using the project's .venv/bin/python. This script writes
only to its own directory and never invokes report or existing experiment scripts.
"""
from pathlib import Path
import os
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")
import hashlib
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.model_selection import GroupKFold

from src.data import load_data
from src.experimental_pair_v3.pair_models import (
    NormalizedPairTreeRegressor, pilot_candidates, _raw_sides, _weights)
from src.metrics import regression_metrics


def main():
    out = ROOT / "output/combination_v3/pair_pilot"; out.mkdir(parents=True, exist_ok=True)
    frame = load_data().query("role == 'development'").reset_index(drop=True)
    y = frame.Solubility_log10.to_numpy()
    folds = list(GroupKFold(3, shuffle=True, random_state=2026).split(frame, y, frame.parent))
    code = ROOT / "src/experimental_pair_v3/pair_models.py"
    provenance = {
        "purpose": "exploratory screening, not nested final validation",
        "development_rows": len(frame), "parents": frame.parent.nunique(),
        "protocol": "GroupKFold(3, shuffle=True, random_state=2026)",
        "reserved_holdout_scored": False,
        "model_code_sha256": hashlib.sha256(code.read_bytes()).hexdigest(),
        "data_sha256": hashlib.sha256((ROOT/"datasets/data_2026.csv").read_bytes()).hexdigest(),
        "training_seed": 2026}
    (out / "provenance.json").write_text(json.dumps(provenance, indent=2))
    configs = pilot_candidates()
    (out / "candidates.json").write_text(json.dumps(configs, indent=2))
    fold_map = np.zeros(len(frame), dtype=int)
    for i, (tr, va) in enumerate(folds, 1):
        assert not set(frame.iloc[tr].parent) & set(frame.iloc[va].parent)
        fold_map[va] = i
    frame[["data_row", "parent_group_id"]].assign(fold=fold_map).to_csv(out/"fold_manifest.csv", index=False)
    results = []
    for i, params in enumerate(configs):
        target = out / f"candidate_{i:02}.json"
        if target.exists():
            result = json.loads(target.read_text())
            assert result["params"] == params
            assert result["model_code_sha256"] == provenance["model_code_sha256"]
        else:
            pred = np.full(len(frame), np.nan)
            start = time.perf_counter()
            metadata, fold_metrics = [], []
            for fold, (tr, va) in enumerate(folds, 1):
                model = clone(NormalizedPairTreeRegressor(**params))
                model.fit(frame.iloc[tr], y[tr], frame.iloc[tr].parent)
                # Verify the fitted centering against only the training rows.
                drug, solvent, _ = _raw_sides(frame.iloc[tr], model.representation)
                weights = _weights(frame.iloc[tr].parent, model.weight_power)
                np.testing.assert_allclose(model.drug_scaler_.mean_,
                    np.average(model.drug_imputer_.transform(drug), axis=0, weights=weights))
                np.testing.assert_allclose(model.solvent_scaler_.mean_,
                    np.average(model.solvent_imputer_.transform(solvent), axis=0, weights=weights))
                pred[va] = model.predict(frame.iloc[va])
                metadata.append(dict(fold=fold, **model.training_metadata_))
                fold_metrics.append(dict(fold=fold, **regression_metrics(y[va], pred[va], frame.iloc[va].parent)))
                print(f"candidate={i} fold={fold} elapsed={time.perf_counter()-start:.1f}s", flush=True)
            assert np.isfinite(pred).all()
            result = dict(candidate=i, params=params, seconds=time.perf_counter()-start,
                model_code_sha256=provenance["model_code_sha256"],
                **regression_metrics(y, pred, frame.parent),
                fold_metrics=fold_metrics, training_metadata=metadata,
                checks={"training_side_scaler_means_verified": True, "parent_overlap": 0,
                        "finite_predictions": True, "each_row_predicted_once": True})
            pd.DataFrame(dict(data_row=frame.data_row, parent_id=frame.parent_group_id,
                              y=y, prediction=pred, fold=fold_map)).to_csv(out/f"predictions_{i:02}.csv", index=False)
            target.write_text(json.dumps(result, indent=2))
        results.append(result)
        print(json.dumps({k: result[k] for k in ("candidate", "params", "seconds", "MAE", "parent_macro_MAE")}), flush=True)
    comparison = [{k: r[k] for k in ("candidate", "params", "seconds", "MAE", "RMSE", "R2", "parent_macro_MAE")} for r in results]
    pd.DataFrame(comparison).sort_values("parent_macro_MAE").to_csv(out/"comparison.csv", index=False)


if __name__ == "__main__":
    main()
