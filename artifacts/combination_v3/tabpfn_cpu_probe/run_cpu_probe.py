"""One CPU fit/predict, same full-feature first pilot fold as prior MPS probe."""
from pathlib import Path
import os
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "2")
# Explicitly authorized performance override for this isolated 1121-row probe.
os.environ["TABPFN_ALLOW_CPU_LARGE_DATASET"] = "1"
import hashlib
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
import numpy as np
import pandas as pd
import torch
from sklearn.model_selection import GroupKFold
from src.data import load_data
from src.metrics import regression_metrics
from src.experimental_tabpfn_v3.adapter import FrameTabPFNRegressor, CHECKPOINT_SHA256
from src.experimental_v3.tree_models import rich_features


def main():
    out = Path(__file__).resolve().parent
    result_path = out/"result.json"
    if result_path.exists():
        raise RuntimeError("One-shot CPU probe already has a saved result; refusing to rerun")
    frame = load_data().query("role == 'development'").reset_index(drop=True)
    y, groups = frame.Solubility_log10.to_numpy(), frame.parent.to_numpy()
    tr, va = next(GroupKFold(3, shuffle=True, random_state=2026).split(frame, y, groups))
    assert len(tr)==1121 and len(va)==386
    assert not set(groups[tr]) & set(groups[va])
    mps_dir = out.parent/"tabpfn_probe/full_n2_mps"
    mps_predictions = pd.read_csv(mps_dir/"fold_1.csv").set_index("data_row").loc[frame.iloc[va].data_row]
    mps_metrics = json.loads((mps_dir/"fold_1.json").read_text())
    np.testing.assert_allclose(mps_predictions.y, y[va], rtol=0, atol=1e-12)
    np.testing.assert_array_equal(mps_predictions.parent, frame.iloc[va].parent_group_id)
    adapter = ROOT/"src/experimental_tabpfn_v3/adapter.py"
    adapter_sha = hashlib.sha256(adapter.read_bytes()).hexdigest()
    warm_start = time.perf_counter()
    features = rich_features(frame, "full")
    warm_seconds = time.perf_counter()-warm_start
    assert features.shape[1]==435
    print("START one-shot CPU full435/n2 fit; rows=1121/386", flush=True)
    model = FrameTabPFNRegressor(representation="full", n_estimators=2, seed=2026,
                                output_type="mean", device="cpu")
    try:
        start = time.perf_counter()
        model.fit(frame.iloc[tr], y[tr], groups[tr])
        fit_seconds = time.perf_counter()-start
        print(f"CPU fit complete in {fit_seconds:.3f}s; starting predict", flush=True)
        start = time.perf_counter()
        prediction = model.predict(frame.iloc[va])
        predict_seconds = time.perf_counter()-start
        metadata = model.training_metadata_
    finally:
        model.release()
    assert np.isfinite(prediction).all()
    reference = mps_predictions["mean"].to_numpy()
    result = {
        "purpose": "one-shot device speed/numerical probe, not a model-performance comparison",
        "fold": 1, "training_rows": len(tr), "validation_rows": len(va), "features":435,
        "n_estimators": 2, "seed":2026, "device":"cpu", "actual_torch_threads":torch.get_num_threads(),
        "adapter_sha256":adapter_sha, "checkpoint_sha256":CHECKPOINT_SHA256,
        "reserved_holdout_scored":False, "local_inference_only":True,
        "allow_cpu_large_dataset_performance_override": True,
        "deterministic_feature_warmup_seconds":warm_seconds,
        "cpu_fit_seconds":fit_seconds, "cpu_predict_seconds":predict_seconds,
        "cpu_total_seconds":fit_seconds+predict_seconds,
        "mps_fit_seconds":mps_metrics["fit_seconds"],
        "mps_predict_seconds":mps_metrics["predict_seconds"],
        "mps_total_seconds":mps_metrics["fit_seconds"]+mps_metrics["predict_seconds"],
        "max_absolute_prediction_difference":float(np.max(np.abs(prediction-reference))),
        "mean_absolute_prediction_difference":float(np.mean(np.abs(prediction-reference))),
        "cpu_metrics":regression_metrics(y[va], prediction, groups[va]),
        "mps_metrics":regression_metrics(y[va], reference, groups[va]),
        "metadata":metadata,
        "timing_caution":"Separate runs; MPS reference used direct output_type=main, adapter predicts mean; warmup, contention and hardware kernels can differ"}
    result["sample_MAE_difference_cpu_minus_mps"] = result["cpu_metrics"]["MAE"]-result["mps_metrics"]["MAE"]
    result["parent_MAE_difference_cpu_minus_mps"] = result["cpu_metrics"]["parent_macro_MAE"]-result["mps_metrics"]["parent_macro_MAE"]
    pd.DataFrame(dict(data_row=frame.iloc[va].data_row, parent_id=frame.iloc[va].parent_group_id,
                      y=y[va], cpu_mean=prediction, mps_mean=reference,
                      absolute_difference=np.abs(prediction-reference))).to_csv(out/"predictions.csv",index=False)
    result_path.write_text(json.dumps(result,indent=2))
    assert hashlib.sha256(adapter.read_bytes()).hexdigest()==adapter_sha
    print(json.dumps(result),flush=True)


if __name__=="__main__":
    main()
