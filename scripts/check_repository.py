"""Check the tracked delivery tree and its model/result dependencies before pushing."""
from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = {'.github', 'assets', 'bibliography', 'configs', 'Contribution', 'datasets',
               'models', 'output', 'plotting', 'presentation', 'Question', 'Report_final',
               'scripts', 'src', 'tests', 'tools',
               'songjiayun', 'yuchunshen', 'huangyaorong', 'hehaoyang', 'hehaoyang'}
ROOT_FILES = {'.gitignore', '.python-version', 'README.md', 'pyproject.toml', 'uv.lock',
              'SOLAR_Studio_Demo_Bilingual.mp4', 'SOLAR_Studio_Demo_Bilingual.srt',
              'SOLAR_Studio_Demo_Bilingual_boxed.srt', 'SOLAR_Studio_Demo_Bilingual_boxed.ass',
              '启动Studio.bat', '启动Studio.command', 'Dockerfile'}
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
            assert path.suffix in {'.csv', '.json', '.txt'} or path.name == 'README.md', path
    manifest = json.loads((ROOT/'models/manifest.json').read_text())
    weights = {str(p) for p in files if p.suffix in WEIGHTS}
    assert weights == {entry['path'] for entry in manifest['files']}, 'Update models/manifest.json for added/removed weights'
    for entry in manifest['files']:
        assert (ROOT/entry['path']).exists(), entry['path']
    print(f'Repository check passed: {len(files)} tracked files, {len(weights)} model weights; '
          'archived reports live outside the repository.')


if __name__ == '__main__':
    check()
