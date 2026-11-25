"""Run a contributor entrypoint with the project's shared runtime context."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from src.ownership import IMPLEMENTATIONS, execute

if __name__ == '__main__':
    entries = {Path(new).relative_to(Path(__file__).parent.name).as_posix(): old
               for old, new in IMPLEMENTATIONS.items()
               if new.startswith(Path(__file__).parent.name + '/') and old.startswith('scripts/')}
    if len(sys.argv) < 2 or sys.argv[1] not in entries:
        raise SystemExit('Usage: python ' + Path(__file__).parent.name + '/run.py <entry> [args]\nEntries: ' + ', '.join(sorted(entries)))
    entry = entries[sys.argv.pop(1)]
    sys.argv[0] = str(ROOT / IMPLEMENTATIONS[entry])
    execute(entry, {'__name__': '__main__', '__package__': None})
