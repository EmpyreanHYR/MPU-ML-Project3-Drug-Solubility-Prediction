"""Nature-style English revision figures; no training code is imported here."""
from __future__ import annotations

from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".cache/matplotlib"))
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

sys.path.insert(0, str(ROOT / "tools/figure_qa"))
from audit_panel_alignment import require_matplotlib_panel_alignment

FONT = Path(font_manager.findfont("DejaVu Sans"))
if not FONT.is_file():
    raise FileNotFoundError("Repository Chinese plotting font is missing")
font_manager.fontManager.addfont(str(FONT))
CJK = font_manager.FontProperties(fname=str(FONT)).get_name()
mpl.rcParams.update({
    "font.family": "sans-serif", "font.sans-serif": [CJK, "DejaVu Sans"],
    "font.size": 8, "axes.titlesize": 8.5, "axes.labelsize": 8,
    "xtick.labelsize": 7.5, "ytick.labelsize": 7.5, "legend.fontsize": 7,
    "axes.spines.right": False, "axes.spines.top": False,
    "axes.linewidth": 0.6, "xtick.major.width": 0.6, "ytick.major.width": 0.6,
    "legend.frameon": False, "svg.fonttype": "none", "pdf.fonttype": 42,
    "figure.facecolor": "white", "axes.facecolor": "white", "savefig.facecolor": "white",
    "axes.unicode_minus": False,
})
COLORS = {"baseline": "#8A9299", "traditional": "#5D86A6", "modern": "#A48BBB", "selected": "#2E8E8B", "accent": "#CC9165"}
FIGURES = ROOT / "Assignment_Report/figures/revision_v2"
QA = ROOT / "artifacts/revision_v2/figure_qa"
SOURCE = ROOT / "artifacts/revision_v2/figure_source"
for directory in (FIGURES, QA, SOURCE):
    directory.mkdir(parents=True, exist_ok=True)


def panel(ax, label: str, title: str):
    ax.set_label(label)
    ax.annotate(label, xy=(0, 1), xycoords="axes fraction", xytext=(-23, 9),
                textcoords="offset points", ha="left", va="bottom", fontsize=9,
                fontweight="bold", fontfamily="DejaVu Sans", annotation_clip=False)
    ax.set_title(title, loc="left", pad=9)


def canvas(rows=1, columns=2, height_mm=83):
    fig, axes = plt.subplots(rows, columns, figsize=(7.204724409448819, height_mm/25.4), squeeze=False)
    # Fixed axes geometry makes final physical alignment auditable and stable.
    fig.subplots_adjust(left=.115, right=.975, bottom=.18 if rows == 1 else .11,
                        top=.84 if rows == 1 else .91, wspace=.44, hspace=.66)
    return fig, axes


def source_table(frame, stem: str):
    path = SOURCE / f"{stem}.csv"
    frame.to_csv(path, index=False)
    return path


def save_figure(fig, stem: str, source_paths, notes: dict, **alignment_options):
    """Block on alignment/size/collision failures; retain auditable source hashes."""
    fig.canvas.draw()
    require_matplotlib_panel_alignment(
        fig, json_out=QA/f"{stem}.alignment.json", overlay_svg=QA/f"{stem}.alignment.svg",
        tolerance_pt=1.5, gutter_tolerance_pt=1.5, require_panel_labels=True,
        strict=True, **alignment_options,
    )
    fig.savefig(FIGURES/f"{stem}.pdf")
    fig.savefig(FIGURES/f"{stem}.svg")
    fig.savefig(FIGURES/f"{stem}.png", dpi=600)
    pdf = FIGURES / f"{stem}.pdf"
    text_result = subprocess.run([sys.executable, str(ROOT/"tools/figure_qa/audit_pdf_text.py"), str(pdf), "--min-pt", "5", "--json"], capture_output=True, text=True)
    (QA/f"{stem}.text.json").write_text(text_result.stdout or text_result.stderr)
    collision_result = subprocess.run([
        sys.executable, str(ROOT/"tools/figure_qa/audit_figure_collisions.py"), str(pdf),
        "--json-out", str(QA/f"{stem}.collision.json"),
        "--overlay-pdf", str(QA/f"{stem}.collision-overlay.pdf"),
    ], capture_output=True, text=True)
    (QA/f"{stem}.collision.log").write_text(collision_result.stdout+collision_result.stderr)
    provenance={
        "figure": stem, "backend": "Python/matplotlib", "width_mm": fig.get_figwidth()*25.4,
        "height_mm": fig.get_figheight()*25.4,
        "font": {"name": CJK, "sha256": hashlib.sha256(FONT.read_bytes()).hexdigest()},
        "sources": [{"path": str(Path(p).relative_to(ROOT)), "sha256": hashlib.sha256(Path(p).read_bytes()).hexdigest()} for p in source_paths],
        "pdf_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(), "notes": notes,
        "text_audit_exit": text_result.returncode, "collision_audit_exit": collision_result.returncode,
        "manual_visual_review": "pending",
    }
    (QA/f"{stem}.provenance.json").write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+"\n")
    plt.close(fig)
    if text_result.returncode or collision_result.returncode:
        raise RuntimeError(f"Figure QA blocked: {stem}; inspect artifacts/figure_qa")
    return pdf
