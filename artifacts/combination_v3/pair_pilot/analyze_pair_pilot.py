"""Compare new OOF predictions with matching earlier 3-fold pilot predictions.

These fixed blends are exploratory diagnostics. Candidate selection and the
blends are not a substitute for outer-fold evaluation of the whole selector.
"""
from pathlib import Path
import json
import sys
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from src.metrics import regression_metrics


def main():
    out = Path(__file__).resolve().parent
    combination = out.parent
    raw = pd.read_csv(combination/"tree_pilot/predictions_09.csv").sort_values("data_row")
    normalized = pd.read_csv(out/"predictions_01.csv").sort_values("data_row")
    cat = pd.read_csv(combination/"tree_pilot/predictions_03.csv").sort_values("data_row")
    for candidate in (normalized, cat):
        np.testing.assert_array_equal(raw.data_row, candidate.data_row)
        np.testing.assert_array_equal(raw.parent_id, candidate.parent_id)
        np.testing.assert_allclose(raw.y, candidate.y, rtol=0, atol=0)
    y, groups = raw.y.to_numpy(), raw.parent_id.to_numpy()
    a, b, c = raw.prediction.to_numpy(), normalized.prediction.to_numpy(), cat.prediction.to_numpy()
    recipes = {
        "raw_interaction_ET": a,
        "normalized_interaction_ET": b,
        "half_raw_half_normalized": (a+b)/2,
        "three_quarters_raw_quarter_normalized": .75*a+.25*b,
        "half_raw_ET_half_CatBoost": (a+c)/2,
        "equal_raw_ET_normalized_ET_CatBoost": (a+b+c)/3,
    }
    results = [dict(recipe=name, **regression_metrics(y, prediction, groups))
               for name, prediction in recipes.items()]
    pd.DataFrame(results).to_csv(out/"blend_diagnostics.csv", index=False)
    pred = raw[["data_row", "parent_id", "y"]].copy()
    for name, prediction in recipes.items():
        pred[name] = prediction
    pred.to_csv(out/"blend_predictions.csv", index=False)
    (out/"blend_diagnostics.json").write_text(json.dumps({
        "scope": "same-development 3-fold exploratory diagnostics; no holdout",
        "baseline_sources": ["tree_pilot candidate 09", "tree_pilot candidate 03"],
        "new_source": "pair_pilot candidate 01",
        "caution": "Best candidate was identified on these OOF scores; final inference requires nested validation",
        "checks": {"same_rows": True, "same_parents": True, "same_targets": True},
        "results": results,
    }, indent=2))


if __name__ == "__main__":
    main()

