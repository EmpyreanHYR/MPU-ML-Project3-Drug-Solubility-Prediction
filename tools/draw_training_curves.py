"""Draw the TabM training curves from the recorded per-epoch histories.

The history in output/experiments/TabM_base/training_history.json is written by
songjiayun/run_experiments.py (model.loss_curve_ per fold); replaying all five
folds reproduces every epoch value exactly, so the figure is a direct plot of
recorded numbers rather than a redraw.

    python tools/draw_training_curves.py            # write the figure
    python tools/draw_training_curves.py --check    # only verify the histories

Output: output/figures/fig_training_curve.{png,pdf,svg} plus the figure QA
records that plotting.style.save_figure writes for every report figure.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HISTORY = ROOT / 'output/experiments/TabM_base/training_history.json'
STEM = 'fig_training_curve'
sys.path.insert(0, str(ROOT))


def load_folds(path: Path = HISTORY) -> list[dict]:
    folds = json.loads(path.read_text(encoding='utf-8'))
    for fold in folds:
        assert len(fold['loss']) == fold['training_metadata']['epochs_completed'], fold['fold']
        assert all(v == v and v >= 0 for v in fold['loss']), f"non-finite loss in fold {fold['fold']}"
    return folds


def summary(folds: list[dict]) -> dict:
    import numpy as np
    curves = np.asarray([f['loss'] for f in folds], dtype=float)
    mean = curves.mean(axis=0)
    epoch = np.arange(1, curves.shape[1] + 1)
    near = mean <= mean[-1] * 1.01
    plateau = int(epoch[np.argmax(near)]) if near.any() else int(len(mean))
    return {'start_mean': round(float(mean[0]), 5), 'end_mean': round(float(mean[-1]), 5),
            'reduction_pct': round(float(100 * (1 - mean[-1] / mean[0])), 2),
            'plateau_epoch': plateau, 'folds': len(folds), 'epochs': int(curves.shape[1])}


def draw(folds: list[dict]) -> Path:
    import numpy as np
    import matplotlib.pyplot as plt
    from plotting.style import COLORS, canvas, panel, save_figure

    curves = np.asarray([f['loss'] for f in folds], dtype=float)
    epoch = np.arange(1, curves.shape[1] + 1)
    mean = curves.mean(axis=0)
    stats = summary(folds)
    fig, axes = canvas(rows=1, columns=1, height_mm=68)
    ax = axes[0][0]
    for index, curve in enumerate(curves):
        ax.plot(epoch, curve, lw=0.9, alpha=0.5, color=COLORS['traditional'],
                label='Single fold' if index == 0 else None)
    ax.plot(epoch, mean, lw=2.2, color=COLORS['selected'], label='Mean of five folds')
    ax.annotate(f"Epoch {stats['plateau_epoch']}: mean loss within 1% of its final value",
                xy=(stats['plateau_epoch'], mean[int(stats['plateau_epoch']) - 1]),
                xytext=(epoch[int(len(epoch) * 0.58)], mean[0] * 0.52), fontsize=7,
                color=COLORS['accent'],
                arrowprops={'arrowstyle': '-|>', 'lw': 0.6, 'color': COLORS['accent'],
                            'shrinkB': 3, 'connectionstyle': 'arc3,rad=-0.25'})
    panel(ax, 'a', '')
    ax.set_xlabel('Training epoch')
    ax.set_ylabel('Training loss (MSE, standardised)')
    ax.set_xlim(1, int(epoch[-1]))
    ax.set_ylim(0, mean[0] * 1.08)
    ax.legend(loc='upper center', ncol=2, bbox_to_anchor=(0.5, 1.13))
    return save_figure(fig, STEM, [HISTORY],
                       notes={'quantity': 'per-epoch training loss of the TabM deep tabular network',
                              'loss_unit': 'mean over the k=16 members of the MSE on the training-fold standardised target',
                              'folds': 'five outer development folds; no internal validation split and no early stopping',
                              'hparams': 'batch 256, d_block 128, 2 blocks, dropout 0.1, lr 0.002, weight decay 3e-4, 120 epochs, seed 2026'})


def main() -> None:
    ap = argparse.ArgumentParser(description='Draw the TabM training curves from recorded histories.')
    ap.add_argument('--check', action='store_true', help='verify the histories without drawing')
    args = ap.parse_args()
    folds = load_folds()
    print(json.dumps(summary(folds), ensure_ascii=False))
    if not args.check:
        print('wrote', draw(folds))


if __name__ == '__main__':
    main()
