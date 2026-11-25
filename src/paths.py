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
