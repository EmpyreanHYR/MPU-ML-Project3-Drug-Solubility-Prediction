"""Compatibility entry; implementation: songjiayun/run_baselines.py."""
from pathlib import Path as _Path
import sys as _sys
_sys.path.insert(0, str(_Path(__file__).resolve().parents[0]))
from src.ownership import execute as _execute
_execute('scripts/run_baselines.py', globals())
