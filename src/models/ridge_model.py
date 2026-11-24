"""Compatibility entry; implementation: songjiayun/models/ridge_model.py."""
from pathlib import Path as _Path
import sys as _sys
_sys.path.insert(0, str(_Path(__file__).resolve().parents[1]))
from src.ownership import execute as _execute
_execute('src/models/ridge_model.py', globals())
