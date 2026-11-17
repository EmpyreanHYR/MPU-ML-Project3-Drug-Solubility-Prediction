"""Check the tracked delivery tree and its model/result dependencies before pushing."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = {'datasets', 'src', 'scripts', 'tests', 'webapp', 'plotting', 'tools',
               'configs', 'assets', 'Assignment_Report', 'Question', 'bibliography',
               'models', 'output'}
ROOT_FILES = {'.gitignore', '.python-version', 'README.md', 'pyproject.toml', 'uv.lock',
              '启动Studio.bat', '启动Studio.command'}
WEIGHTS = {'.joblib', '.ckpt', '.pt', '.pth', '.safetensors'}


def check():
    raw = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT)
    files = [Path(s.decode()) for s in raw.split(b'\0') if s]
    ignored = subprocess.run(['git', 'check-ignore', '--no-index', '-z', '--stdin'],
                             input=raw, cwd=ROOT, capture_output=True, check=False)
    assert ignored.returncode in (0, 1), ignored.stderr.decode()
    assert not ignored.stdout, 'Tracked files violate .gitignore: ' + ignored.stdout.decode().replace('\0', ', ')
    for path in files:
        assert (ROOT/path).is_file(), f'Missing tracked file: {path}'
        assert (path.parts[0] in DIRECTORIES if len(path.parts) > 1 else str(path) in ROOT_FILES), path
        assert path.suffix != '.log' and '__pycache__' not in path.parts, path
        if path.suffix in WEIGHTS:
            assert path.parts[0] == 'models', f'Weight outside models/: {path}'
        if path.parts[0] == 'output':
            assert path.suffix in {'.csv', '.json'} or path.name == 'README.md', path
    manifest = json.loads((ROOT/'models/manifest.json').read_text())
    weights = {str(p) for p in files if p.suffix in WEIGHTS}
    assert weights == {entry['path'] for entry in manifest['files']}, 'Update models/manifest.json for added/removed weights'
    for entry in manifest['files']:
        path = ROOT/entry['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], path
    # Check only sections actually included by the delivered manuscript.
    main = (ROOT/'Assignment_Report/Assignment-main.tex').read_text()
    sections = re.findall(r'\\input\{([^}]+)\}', main)
    text = main
    for section in sections:
        path = ROOT/'Assignment_Report'/f'{section}.tex'
        assert path.is_file(), path
        text += '\n' + path.read_text()
    for figure in re.findall(r'\\includegraphics(?:\[[^]]*\])?\{([^}]+)\}', text):
        path = ROOT/'Assignment_Report/figures'/figure
        assert path.is_file() and str(path.relative_to(ROOT)) in {str(p) for p in files}, path
    print(f'Repository check passed: {len(files)} tracked files, {len(weights)} model weights; report inputs present.')


if __name__ == '__main__':
    check()
