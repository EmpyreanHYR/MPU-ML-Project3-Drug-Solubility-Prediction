"""Repository paths for reproducible results and independently stored model weights."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "output"
MODELS = ROOT / "models"


def model_path(result_path: Path, *, create: bool = False) -> Path:
    """Map an output-relative weight location to models, optionally creating parents."""
    path = MODELS / Path(result_path).relative_to(RESULTS)
    if create:
        path.parent.mkdir(parents=True, exist_ok=True)
    return path


def normalize_frozen(value):
    """Translate only documented layout changes when checking a saved run identity.

    Historical result files are immutable. The migration manifest pairs exact old
    and new source hashes; edits after that migration still fail the frozen check.
    """
    import json
    manifest = json.loads((RESULTS / "layout_migration.json").read_text())
    hashes = manifest["code_sha256"]
    def visit(obj):
        if isinstance(obj, dict):
            result = {}
            for key, val in obj.items():
                if key == "export_code_sha256":
                    entry = hashes.get("scripts/export_tabpfn_combination_v3.py", {})
                    if val == entry.get("before"):
                        val = entry["after"]
                new_key = key.replace("artifacts/", "output/").replace("analysis/2026-11-16/", "datasets/splits/")
                if isinstance(val, str) and key in hashes and val == hashes[key]["before"]:
                    val = hashes[key]["after"]
                result[new_key] = visit(val)
            return result
        if isinstance(obj, list):
            return [visit(item) for item in obj]
        return obj
    return visit(value)
