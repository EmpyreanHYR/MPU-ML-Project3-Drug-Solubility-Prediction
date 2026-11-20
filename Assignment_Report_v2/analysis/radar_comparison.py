"""Render a radar chart comparing models across the four headline metrics.

The values are the frozen outer five-fold parent-grouped averages reported in
Table ``tab:v2_main_metrics`` of the report.  All four axes are normalised to
``[0, 1]`` so that a larger radius is always better: the three error metrics
(parent-weighted MAE, row-wise MAE and RMSE) are inverted, while ``R^2`` is
kept in its natural direction.
"""

from pathlib import Path

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np

REPORT = Path(__file__).resolve().parents[1]
FIGURES = REPORT / "figures"

INK = "#17242d"
GRID = "#c9d2d8"
OURS = "#c0392b"

# (label, [parent_MAE, row_MAE, RMSE, R2], colour, linewidth, fill_alpha)
MODELS = [
    ("ExtraTrees–TabPFN (ours)", [0.6668, 0.6510, 0.8842, 0.5234], OURS, 2.4, 0.12),
    ("Three-branch blend",        [0.6729, 0.6631, 0.8882, 0.5191], "#176689", 1.2, 0.05),
    ("Five-branch blend",         [0.6767, 0.6568, 0.8899, 0.5172], "#5b7a99", 1.2, 0.05),
    ("Feature-rich ExtraTrees",   [0.6831, 0.6720, 0.8981, 0.5083], "#a35e1c", 1.2, 0.05),
    ("TabPFN v2",                 [0.6827, 0.6698, 0.9117, 0.4933], "#b08d3a", 1.2, 0.05),
    ("Random forest",             [0.6815, 0.7057, 0.9254, 0.4780], "#2e7d32", 1.2, 0.05),
    ("CatBoost",                  [0.6931, 0.7168, 0.9462, 0.4542], "#6a4c93", 1.2, 0.05),
    ("SOLAR-H",                   [0.7164, 0.7520, 1.0016, 0.3884], "#00796b", 1.2, 0.05),
    ("RBF SVR",                   [0.7226, 0.6600, 0.9125, 0.4924], "#7b8790", 1.2, 0.05),
]

AXES = ["Parent-weighted\nMAE", "Row-wise\nMAE", "RMSE", r"$R^2$"]
LOWER_BETTER = [True, True, True, False]


def normalise():
    raw = np.array([m[1] for m in MODELS], dtype=float)
    lo = raw.min(axis=0)
    hi = raw.max(axis=0)
    span = hi - lo
    norm = np.empty_like(raw)
    for j, invert in enumerate(LOWER_BETTER):
        if invert:
            norm[:, j] = (hi[j] - raw[:, j]) / span[j]
        else:
            norm[:, j] = (raw[:, j] - lo[j]) / span[j]
    return norm


def radar_angles(n):
    theta = np.linspace(0.0, 2.0 * np.pi, n, endpoint=False)
    return np.append(theta, theta[0])


def main():
    mpl.rcParams.update({
        "font.family": "sans-serif",
        "font.sans-serif": ["DejaVu Sans"],
        "font.size": 9,
        "pdf.fonttype": 42,
        "text.color": INK,
    })
    norm = normalise()
    theta = radar_angles(len(AXES))

    fig, ax = plt.subplots(figsize=(6.4, 6.3), subplot_kw={"projection": "polar"})
    fig.subplots_adjust(left=0.12, right=0.88, bottom=0.22, top=0.88)

    for (label, _, colour, lw, alpha), row in zip(MODELS, norm, strict=True):
        values = np.append(row, row[0])
        ax.plot(theta, values, label=label, color=colour, linewidth=lw,
                alpha=1.0, zorder=3)
        ax.fill(theta, values, color=colour, alpha=alpha, zorder=1)

    ax.set_xticks(theta[:-1])
    ax.set_xticklabels(AXES, fontsize=8.5)
    ax.set_ylim(0, 1)
    ax.set_yticks([0.25, 0.5, 0.75, 1.0])
    ax.set_yticklabels(["0.25", "0.50", "0.75", "1.00"], fontsize=7, color="#5b6b75")
    ax.set_rlabel_position(22.5)
    ax.spines["polar"].set_color(GRID)
    ax.grid(color=GRID, linewidth=0.6)
    ax.tick_params(colors=INK)

    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.04), ncol=3,
              frameon=False, fontsize=8, labelcolor=INK, handlelength=1.6,
              columnspacing=1.0, handletextpad=0.4)

    fig.savefig(FIGURES / "model_radar.pdf")
    plt.close(fig)
    print(f"wrote {FIGURES / 'model_radar.pdf'}")


if __name__ == "__main__":
    main()
