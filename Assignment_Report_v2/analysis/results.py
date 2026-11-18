"""Recompute chapter 6 statistics from frozen development predictions."""
from pathlib import Path
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from src.data import load_data
from src.metrics import regression_metrics

REPORT = Path(__file__).resolve().parents[1]
ROOT = REPORT.parent
RESULTS = ROOT / "output" / "combination_v3"
KEYS = ["data_row", "parent_id", "fold", "seed"]
SEEDS = {17, 42, 2026}
SOURCES = {
    "basic": ROOT / "output/revision_v2/nested/ExtraTrees",
    "rich_tree": RESULTS / "nested/RichExtraTrees",
    "tabpfn": RESULTS / "tabpfn_nested/nested/TabPFN",
    "fusion": RESULTS / "tabpfn_nested/nested/TabPFN_ExtraTreesBlend",
    "three_branch": RESULTS / "tabpfn_nested/nested/TabPFN_TwoTreeBlend",
    "five_branch": RESULTS / "tabpfn_nested/nested/TabPFN_FiveViewBlend",
}


def load_predictions(directory):
    paths = sorted(directory.glob("fold_*/predictions_*.csv"))
    assert len(paths) == 15, directory
    frame = pd.concat([pd.read_csv(path) for path in paths], ignore_index=True)
    frame = frame.set_index(KEYS).sort_index()
    assert frame.index.is_unique, directory
    assert frame.index.get_level_values("seed").unique().difference(SEEDS).empty
    assert frame.groupby("seed").size().to_dict() == dict.fromkeys(SEEDS, 1507)
    return frame


def metrics_by_seed(frame, model):
    output = {}
    for seed, rows in frame.groupby("seed"):
        output[int(seed)] = regression_metrics(
            rows["y"], rows[model], rows.index.get_level_values("parent_id")
        )
    return output


def plot_diagnostics(paired, scores, selected_score):
    plt.rcParams.update(
        {"font.family": "DejaVu Sans", "font.size": 9, "pdf.fonttype": 42}
    )
    fig, (ax_left, ax_right) = plt.subplots(
        ncols=2, figsize=(8.2, 2.60), layout="constrained"
    )
    names = ("rich_tree", "tabpfn", "three_branch", "five_branch")
    display = ("Rich ExtraTrees", "TabPFN", "Three branches", "Five candidates")
    means, intervals = zip(*[(paired[n]["delta"], paired[n]["ci"]) for n in names])
    lo, hi = np.array(intervals).T
    means = np.array(means)
    ax_left.axvline(0, color="#777777", linestyle="--", linewidth=0.9)
    ax_left.errorbar(
        means, np.arange(len(names)), xerr=np.array([means-lo, hi-means]),
        fmt="o", color="#1f6391", capsize=3, markersize=4,
    )
    ax_left.set_yticks(range(len(display)), display)
    ax_left.invert_yaxis()
    ax_left.set_xticks([-0.04, -0.02, 0, 0.02])
    ax_left.set_xlabel("Parent MAE difference vs. comparator")
    ax_left.set_title("a   Paired model differences", loc="left")
    ax_right.plot(
        scores["weight"], scores["mae"], "o-", color="#177466",
        markersize=4, label="Same weight in all folds",
    )
    ax_right.axhline(
        selected_score, color="#555555", linestyle="--", linewidth=1.1,
        label="Inner-selected per fold",
    )
    ax_right.set(
        xlabel="TabPFN weight",
        ylabel="Parent-equal MAE",
        xticks=scores["weight"],
    )
    ax_right.legend(loc="upper center", fontsize=8, frameon=False)
    ax_right.set_title("b   Fixed-weight sensitivity", loc="left")
    for axis in (ax_left, ax_right):
        axis.spines[["top", "right"]].set_visible(False)
    fig.savefig(REPORT / "figures" / "prediction_diagnostics.pdf")
    plt.close(fig)


def main():
    data = load_data().query("role == 'development'").set_index("data_row")
    frames = {name: load_predictions(path) for name, path in SOURCES.items()}
    frame = frames["fusion"][["y"]].copy()
    row_metadata = data.loc[frame.index.get_level_values("data_row")]
    assert np.allclose(
        frame["y"], row_metadata["Solubility_log10"], rtol=0, atol=1e-10
    )
    assert np.array_equal(
        frame.index.get_level_values("parent_id"), row_metadata["parent_group_id"]
    )
    for name, rows in frames.items():
        assert frame.index.equals(rows.index), name
        assert frame["y"].equals(rows["y"]), name
        frame[name] = rows["prediction"]

    weights = {
        fold: json.loads((SOURCES["fusion"] / f"fold_{fold}/weights.json").read_text())
        ["weights"]["TabPFN"]
        for fold in range(1, 6)
    }
    alpha = frame.index.get_level_values("fold").map(weights).to_numpy()
    assert np.allclose(
        (1 - alpha) * frame["rich_tree"] + alpha * frame["tabpfn"],
        frame["fusion"], rtol=1e-10, atol=1e-10,
    )

    per_seed = {name: metrics_by_seed(frame, name) for name in SOURCES}
    overall = {
        name: pd.DataFrame(scores).mean(axis=1).to_dict()
        for name, scores in per_seed.items()
    }
    residuals = frame[list(SOURCES)].sub(frame["y"], axis=0)
    parent_error = residuals.abs().groupby("parent_id").mean()
    assert len(parent_error) == 128
    draw = np.random.default_rng(2026).integers(0, 128, size=(10000, 128))
    paired = {}
    for name in (name for name in SOURCES if name != "fusion"):
        delta = (parent_error["fusion"] - parent_error[name]).to_numpy()
        paired[name] = {
            "delta": delta.mean(),
            "relative_reduction": -delta.mean() / parent_error[name].mean(),
            "ci": np.quantile(delta[draw].mean(axis=1), [0.025, 0.975]).tolist(),
            "better": int(np.sum(delta < -1e-12)),
            "equal": int(np.sum(np.abs(delta) <= 1e-12)),
            "worse": int(np.sum(delta > 1e-12)),
        }
    tree_gain = (parent_error["rich_tree"] - parent_error["basic"]).to_numpy()
    paired["rich_vs_basic"] = {
        "delta": tree_gain.mean(),
        "relative_reduction": -tree_gain.mean() / parent_error["basic"].mean(),
        "ci": np.quantile(tree_gain[draw].mean(axis=1), [0.025, 0.975]).tolist(),
    }

    scores = pd.DataFrame({"weight": [0, 0.25, 0.5, 0.75, 1]})
    scores["mae"] = [
        ((1 - w) * frame["rich_tree"] + w * frame["tabpfn"] - frame["y"])
        .abs().groupby("parent_id").mean().mean()
        for w in scores["weight"]
    ]
    strata = pd.cut(frame["y"], [-np.inf, -4, -2, 0, np.inf], right=True)
    bands = []
    for band, errors in residuals["fusion"].groupby(strata, observed=True):
        bands.append(
            dict(
                band=str(band),
                n_rows=int(errors.index.get_level_values("data_row").nunique()),
                n_parents=int(errors.index.get_level_values("parent_id").nunique()),
                mae=errors.abs().mean(),
                bias=errors.mean(),
            )
        )

    point_error = residuals["fusion"].abs().groupby("data_row").mean()
    case_id = int(point_error.idxmax())
    case = data.loc[case_id]
    held_fold = int(
        frame.xs(case_id, level="data_row").index.get_level_values("fold")[0]
    )
    training_rows = frame.index[
        frame.index.get_level_values("fold") != held_fold
    ].get_level_values("data_row").unique()
    training = data.loc[training_rows]
    solvent_temperatures = training.loc[
        training["Solvent SMILES"].eq(case["Solvent SMILES"]), "Temperature"
    ]
    case_result = {
        "data_row": case_id, "drug": case["Drug"], "solvent": case["Solvent"],
        "temperature": case["Temperature"], "target": case["Solubility_log10"],
        "prediction": frame.xs(case_id, level="data_row")["fusion"].mean(),
        "mae": point_error.loc[case_id], "fold": held_fold,
        "train_solvent_rows": len(solvent_temperatures),
        "train_solvent_range": (
            [solvent_temperatures.min(), solvent_temperatures.max()]
            if not solvent_temperatures.empty else []
        ),
    }

    pilot = pd.read_csv(RESULTS / "tree_pilot/comparison.csv").set_index("candidate")
    caps = pd.read_csv(RESULTS / "tabpfn_balancing_pilot/comparison.csv")
    five_branches_active = []
    for fold in range(1, 6):
        path = SOURCES["five_branch"] / f"fold_{fold}/weights.json"
        five_branches_active.append(sum(w > 0 for w in json.loads(path.read_text())["weights"].values()))

    summary = {
        "metrics": overall,
        "seed_metrics": per_seed,
        "paired": paired,
        "parent_fusion_quantiles": parent_error["fusion"].quantile([0.5, 0.9, 1]).to_dict(),
        "signed_residual_pearson": residuals["rich_tree"].corr(residuals["tabpfn"]),
        "observed_bands": bands,
        "highest_error_row": case_result,
        "tabpfn_weight_by_fold": weights,
        "fixed_weight_sensitivity": scores.to_dict(orient="records"),
        "five_candidate_active_branches": five_branches_active,
        "tree_pilot_parent_mae": pilot.loc[[6, 7, 8, 9], "parent_macro_MAE"].to_dict(),
        "context_pilot_parent_mae": caps.set_index("config")["parent_macro_MAE"].to_dict(),
    }
    destination = REPORT / "analysis" / "results.json"
    destination.write_text(json.dumps(summary, ensure_ascii=False, indent=2, default=float) + "\n")
    plot_diagnostics(paired, scores, overall["fusion"]["parent_macro_MAE"])


if __name__ == "__main__":
    main()
