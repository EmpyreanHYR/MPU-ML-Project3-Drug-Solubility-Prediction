"""Compatibility entry; implementation: yuchunshen/pilots/tabpfn_cpu_probe/run_cpu_probe.py."""
from pathlib import Path as _Path
import sys as _sys
_sys.path.insert(0, str(_Path(__file__).resolve().parents[2]))
from src.ownership import execute as _execute
_execute('scripts/pilots/tabpfn_cpu_probe/run_cpu_probe.py', globals())
