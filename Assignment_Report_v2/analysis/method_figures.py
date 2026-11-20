"""Render report figures from the implemented methods and saved analyses."""

import json
from pathlib import Path

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.patches import FancyBboxPatch

REPORT = Path(__file__).resolve().parents[1]
SOURCE = REPORT.parent / "output/revision_v2/analysis"
FIGURES = REPORT / "figures"
PREVIEWS = REPORT.parent / ".cache/report_v2/method_figures"
BLUE = "#176689"
AMBER = "#a35e1c"
INK = "#17242d"

mpl.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["DejaVu Sans"],
    "font.size": 9,
    "pdf.fonttype": 42,
    "svg.fonttype": "none",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.linewidth": 0.7,
    "text.color": INK,
})


def export(fig, name):
    fig.savefig(FIGURES / f"{name}.pdf")
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    fig.savefig(PREVIEWS / f"{name}.svg")
    fig.savefig(PREVIEWS / f"{name}.png", dpi=300)
    plt.close(fig)


def method_flow():
    fig, ax = plt.subplots(figsize=(6.65, 2.47))
    fig.subplots_adjust(left=0.02, right=0.98, bottom=0.06, top=0.97)
    ax.set(xlim=(0, 1), ylim=(0, 1))
    ax.set_axis_off()
    stages = [
        (0.115, "Molecular and\ncondition inputs", "Fold-local\npreprocessing"),
        (0.375, "Rich ExtraTrees\n+ TabPFN", "Structure tree\n+ within-pair ridge"),
        (0.635, "Select convex weights\nfrom inner OOF", "Select temperature gain\nand tree depth"),
        (0.885, "Weighted\nprediction", "Structural baseline\n+ temperature term"),
    ]
    for y, color, fill, heading, pos in (
        (0.67, AMBER, "#fbf3e8", "SOLAR-H structure–temperature model", 2),
        (0.19, BLUE, "#edf6fb", "ExtraTrees–TabPFN fusion", 1),
    ):
        ax.text(0.006, y + 0.185, heading, fontsize=10, weight="bold", color=color)
        for idx, stage in enumerate(stages):
            x = stage[0]
            ax.add_patch(FancyBboxPatch((x - 0.102, y - 0.12), 0.204, 0.24,
                                       boxstyle="round,pad=0.008,rounding_size=0.016",
                                       facecolor=fill, edgecolor=color, linewidth=0.8))
            ax.text(x, y, stage[pos], ha="center", va="center", fontsize=8.0)
            if idx:
                ax.annotate("", (x - 0.116, y), (stages[idx - 1][0] + 0.114, y),
                            arrowprops={"arrowstyle": "->", "color": color, "lw": 1.1})
    export(fig, "method_workflows")


def forest(name, labels, estimates, limits, xlabel, xlim, height, left=0.31):
    """Draw point estimates and their saved intervals with a common zero line."""
    means = np.asarray(estimates)
    ci = np.asarray(limits)
    assert np.all(ci[:, 0] <= means) and np.all(means <= ci[:, 1])
    fig, ax = plt.subplots(figsize=(6.65, height))
    fig.subplots_adjust(left=left, right=0.94, bottom=0.26, top=0.94)
    y = np.arange(len(labels))[::-1]
    ax.axvline(0, ls=(0, (3, 3)), lw=0.9, color="#7b8790")
    for row, mean, limit in zip(y, means, ci, strict=True):
        color = AMBER if limit[0] > 0 else BLUE
        ax.errorbar(mean, row, xerr=[[mean-limit[0]], [limit[1]-mean]], fmt="o",
                    ms=4.6, color=color, capsize=3, lw=1.3, zorder=3)
    ax.set(yticks=y, yticklabels=labels, ylim=(-0.55, len(y)-0.45),
           xlim=xlim, xlabel=xlabel)
    ax.spines["left"].set_visible(False)
    ax.tick_params(axis="y", length=0, pad=6)
    ax.grid(axis="x", color="#e7ebee", linewidth=0.6)
    ax.set_axisbelow(True)
    export(fig, name)


def main():
    method_flow()
    records = pd.read_csv(SOURCE / "diagnostics.csv").set_index("tag")
    rows = records.loc[[f"AdaptiveHybrid_{x}" for x in (
        "no_balanced", "no_interaction", "no_temperature", "full_gain",
    )]]
    forest("solar_ablation", ["Equal row weights", "Remove interactions",
                             "Remove temperature term", "Fix temperature gain at 1"],
           rows["delta"], rows[["lower", "upper"]],
           "Change in parent-macro MAE vs. selected SOLAR-H", (-0.041, 0.252), 2.48)
    slopes = json.loads((SOURCE / "causal.json").read_text())
    forest("temperature_associations", ["Pooled · clustered",
                                        "Within pair · clustered",
                                        "Within pair · parent bootstrap"],
           [slopes["pooled_same_subset_slope"], slopes["within_pair_slope"],
            slopes["within_pair_slope"]],
           [slopes["pooled_same_subset_cluster_ci"], slopes["within_cluster_ci"],
            slopes["within_parent_bootstrap_ci"]],
           "Slope (log solubility per raw temperature unit)", (-0.03, 0.024), 2.24, left=0.35)


if __name__ == "__main__":
    main()
