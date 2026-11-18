"""Check the tracked delivery tree and its model/result dependencies before pushing."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = {'datasets', 'src', 'scripts', 'tests', 'webapp', 'plotting', 'tools',
               'configs', 'assets', 'Assignment_Report', 'Assignment_Report_v2',
               'Question', 'bibliography',
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
    tracked = {(ROOT / path).resolve() for path in files}
    # Check dependencies from both versions of the delivered report.
    for directory in ('Assignment_Report', 'Assignment_Report_v2'):
        report = ROOT / directory
        main = report / 'Assignment-main.tex'
        pdf = report / 'Assignment-main.pdf'
        assert main in tracked and pdf in tracked, report
        text = main.read_text()
        graphic_path = re.search(r'\\graphicspath\{((?:\{[^}]+\})+)\}', text)
        figure_dirs = [report / path for path in re.findall(r'\{([^}]+)\}', graphic_path[1])]
        for section in re.findall(r'\\input\{([^}]+)\}', text):
            path = report / f'{section}.tex'
            assert path in tracked and path.is_file(), path
            text += '\n' + path.read_text()
        for figure in re.findall(r'\\includegraphics(?:\[[^]]*\])?\{([^}]+)\}', text):
            paths = [(base / figure).resolve() for base in (report, *figure_dirs)]
            assert any(path.is_file() and path in tracked for path in paths), (directory, figure)
        for bibliography in re.findall(r'\\bibliography\{([^}]+)\}', text):
            path = (report / f'{bibliography}.bib').resolve()
            assert path in tracked and path.is_file(), path
    print(f'Repository check passed: {len(files)} tracked files, {len(weights)} model weights; report inputs present.')


if __name__ == '__main__':
    check()
