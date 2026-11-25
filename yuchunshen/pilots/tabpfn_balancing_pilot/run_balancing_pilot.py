"""Local TabPFN-v2 parent-balanced context pilot; outputs only beside this file.

Each 3-fold validation set remains complete. For training context, a deterministic
pseudorandom rank depends only on seed, parent identity and input row number.
No labels enter the ranking. This is exploratory screening, not nested evidence.
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
from sklearn.model_selection import GroupKFold
from src.data import load_data
from src.metrics import regression_metrics
from src.experimental_tabpfn_v3.adapter import FrameTabPFNRegressor


def selected_indices(frame, cap, seed=2026):
    # Only these two input columns are visible to the selection routine.
    inputs = frame[["parent", "data_row"]]
    if cap is None:
        return np.arange(len(inputs))
    rank = [hashlib.sha256(f"{seed}|{parent}|{int(row)}".encode()).hexdigest()
            for parent, row in inputs.itertuples(index=False, name=None)]
    ranked = inputs.reset_index(drop=True).assign(random_rank=rank, local_index=np.arange(len(inputs)))
    chosen = ranked.sort_values(["parent", "random_rank", "data_row"]).groupby("parent", sort=False).head(cap)
    return np.sort(chosen.local_index.to_numpy())


def main():
    out = ROOT / "output/combination_v3/tabpfn_balancing_pilot"; out.mkdir(parents=True, exist_ok=True)
    frame = load_data().query("role == 'development'").reset_index(drop=True)
    y = frame.Solubility_log10.to_numpy()
    groups = frame.parent.to_numpy()
    folds = list(GroupKFold(3, shuffle=True, random_state=2026).split(frame, y, groups))
    provenance = {
        "purpose": "exploratory parent-balanced TabPFN context; no nested follow-up in this script",
        "development_rows": len(frame), "development_parents": frame.parent.nunique(),
        "protocol": "GroupKFold(3, shuffle=True, random_state=2026)",
        "reserved_holdout_scored": False, "representation": "small (23 features)",
        "n_estimators": 4, "model_seed": 2026, "sampling_seed": 2026,
        "sampling": "within each training fold, keep lowest SHA256(seed|parent|data_row) ranks per parent",
        "sampling_uses_targets": False, "validation_subsampled": False,
        "local_inference_only": True, "device": "mps"}
    (out/"provenance.json").write_text(json.dumps(provenance, indent=2))
    records = []
    fold_id = np.zeros(len(frame), dtype=int)
    for fold, (tr, va) in enumerate(folds, 1):
        assert not set(groups[tr]) & set(groups[va])
        fold_id[va] = fold
    frame[["data_row", "parent_group_id"]].assign(fold=fold_id).to_csv(out/"fold_manifest.csv", index=False)
    for cap in (None, 8, 16, 32):
        label = "full" if cap is None else f"cap_{cap}"
        target = out/f"{label}.json"
        if target.exists():
            record = json.loads(target.read_text())
            assert record["cap"] == cap
        else:
            start = time.perf_counter()
            prediction = np.full(len(frame), np.nan)
            details = []
            selection_rows = []
            for fold, (tr, va) in enumerate(folds, 1):
                train = frame.iloc[tr]
                chosen_local = selected_indices(train, cap)
                chosen = tr[chosen_local]
                # A target-free call produces the identical sample.
                np.testing.assert_array_equal(chosen_local,
                    selected_indices(train[["parent", "data_row"]], cap))
                assert set(groups[chosen]) == set(groups[tr])
                counts = pd.Series(groups[chosen]).value_counts()
                if cap is not None:
                    assert counts.max() <= cap
                selected_rows = set(frame.iloc[chosen].data_row)
                selection_rows.extend([
                    dict(fold=fold, data_row=int(row.data_row), parent_id=row.parent_group_id,
                         selected=int(row.data_row in selected_rows))
                    for row in train[["data_row", "parent_group_id"]].itertuples(index=False)
                ])
                model = FrameTabPFNRegressor(representation="small", n_estimators=4,
                                            seed=2026, output_type="mean", device="mps")
                fold_start = time.perf_counter()
                try:
                    model.fit(frame.iloc[chosen], y[chosen], groups[chosen])
                    prediction[va] = model.predict(frame.iloc[va])
                    metadata = model.training_metadata_
                finally:
                    model.release()
                fold_record = dict(fold=fold, available_training_rows=len(tr),
                    selected_training_rows=len(chosen), training_parents=len(counts),
                    max_rows_per_parent=int(counts.max()), validation_rows=len(va),
                    seconds=time.perf_counter()-fold_start,
                    **regression_metrics(y[va], prediction[va], groups[va]), metadata=metadata)
                details.append(fold_record)
                print(json.dumps(dict(config=label, **{k:v for k,v in fold_record.items() if k!="metadata"})), flush=True)
            assert np.isfinite(prediction).all()
            pd.DataFrame(selection_rows).to_csv(out/f"{label}_sampling_rows.csv", index=False)
            pd.DataFrame(dict(data_row=frame.data_row, parent_id=frame.parent_group_id,
                              y=y, prediction=prediction, fold=fold_id)).to_csv(out/f"{label}_predictions.csv", index=False)
            record = dict(config=label, cap=cap, seconds=time.perf_counter()-start,
                **regression_metrics(y, prediction, groups),
                folds=details, checks=dict(parent_overlap=0, all_training_parents_preserved=True,
                    fixed_complete_validation=True, label_free_sampling=True, finite_predictions=True))
            target.write_text(json.dumps(record, indent=2))
        records.append(record)
        print(json.dumps({k:v for k,v in record.items() if k not in ("folds", "checks")}), flush=True)
    comparison = [{k:r[k] for k in ("config", "cap", "seconds", "MAE", "RMSE", "R2", "parent_macro_MAE")} for r in records]
    pd.DataFrame(comparison).sort_values("parent_macro_MAE").to_csv(out/"comparison.csv", index=False)


if __name__ == "__main__":
    main()
