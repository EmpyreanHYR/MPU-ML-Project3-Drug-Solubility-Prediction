"""Contributor layout must preserve public entrypoints and resource paths."""
import subprocess
import sys

from fastapi.testclient import TestClient

from src.ownership import IMPLEMENTATIONS, ROOT, SourcePath
from src.paths import RESULTS, MODELS


def test_single_implementation_and_stable_source_reads():
    for logical, owned in IMPLEMENTATIONS.items():
        assert (ROOT / owned).is_file()
        assert not (ROOT / logical).exists()
        assert (SourcePath(ROOT) / logical).read_bytes() == (ROOT / owned).read_bytes()
    assert RESULTS == ROOT / 'output'
    assert MODELS == ROOT / 'models'


def test_personal_entrypoints_from_another_directory(tmp_path):
    for owner, script in [('songjiayun', 'run_revision.py'),
                          ('yuchunshen', 'run_combination_nested.py'),
                          ('hehaoran', 'launch_studio.py')]:
        result = subprocess.run(
            [sys.executable, str(ROOT / owner / 'run.py'), script, '--help'],
            cwd=tmp_path, capture_output=True, text=True, timeout=60)
        assert result.returncode == 0, result.stderr
        assert 'usage:' in result.stdout.lower()


def test_application_assets_moved_with_owner():
    from hehaoran.webapp.server import app, STATIC
    assert STATIC == ROOT / 'hehaoran/webapp/static'
    client = TestClient(app)
    for url in ['/', '/static/app.js', '/static/style.css']:
        assert client.get(url).status_code == 200


def test_presentation_uses_relocated_application_assets():
    from fastapi import FastAPI
    from hehaoran.webapp.server import STATIC
    from presentation.launch import mount_presentation
    application = FastAPI()
    mount_presentation(application, STATIC, 'cpu')
    client = TestClient(application)
    for url in ['/presentation/', '/presentation/studio?view=predict',
                '/presentation/studio-script/predict.js']:
        assert client.get(url).status_code == 200
