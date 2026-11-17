"""Development-only screening. Never calls old runners or report generation."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import json
import time
import os
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
from src.data import ROOT, load_data
from src.metrics import regression_metrics
from src.experimental_v3.tree_models import RichTreeRegressor, pilot_candidates


def main():
    out = ROOT / "artifacts/combination_v3/tree_pilot"
    out.mkdir(parents=True, exist_ok=True)
    df = load_data().query("role == 'development'").reset_index(drop=True)
    y = df.Solubility_log10.to_numpy()
    folds = list(GroupKFold(3, shuffle=True, random_state=2026).split(df, y, df.parent))
    configs = pilot_candidates()
    (out / "candidates.json").write_text(json.dumps(configs, indent=2))
    records = []
    for i, params in enumerate(configs):
        target = out / f"candidate_{i:02}.json"
        if target.exists():
            result = json.loads(target.read_text())
            assert result["params"] == params
        else:
            pred = np.full(len(df), np.nan)
            start = time.perf_counter()
            for fold, (tr, va) in enumerate(folds, 1):
                assert not set(df.iloc[tr].parent) & set(df.iloc[va].parent)
                model = RichTreeRegressor(**params).fit(df.iloc[tr], y[tr], df.iloc[tr].parent)
                pred[va] = model.predict(df.iloc[va])
                print(f"candidate={i} fold={fold} elapsed={time.perf_counter()-start:.1f}s", flush=True)
            result = {"candidate":i, "params":params, "seconds":time.perf_counter()-start,
                      **regression_metrics(y, pred, df.parent)}
            target.write_text(json.dumps(result, indent=2))
            pd.DataFrame({"data_row":df.data_row, "parent_id":df.parent_group_id,
                          "y":y, "prediction":pred}).to_csv(out/f"predictions_{i:02}.csv", index=False)
        records.append(result)
        print(json.dumps(result), flush=True)
    pd.DataFrame(records).sort_values("parent_macro_MAE").to_csv(out/"comparison.csv", index=False)


if __name__ == "__main__":
    main()
