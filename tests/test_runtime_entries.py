"""Regression coverage for standalone tools and complete per-fold exports."""
import json

import pandas as pd
import pytest

from scripts.analyze_combination_v3 import read_predictions
from presentation.tools import build_chart_data


def test_fold_exports_are_accepted_but_missing_fold_is_rejected(tmp_path):
    for fold in range(1, 6):
        directory = tmp_path / f'fold_{fold}'
        directory.mkdir()
        for seed in (2026, 17, 42):
            pd.DataFrame({'fold': [fold], 'seed': [seed], 'prediction': [1.]}).to_csv(
                directory / f'predictions_{seed}.csv', index=False)
    assert len(read_predictions(tmp_path)) == 15
    (tmp_path / 'fold_5/predictions_42.csv').unlink()
    with pytest.raises(AssertionError, match='Incomplete experiment'):
        read_predictions(tmp_path)


def test_presentation_rebuild_uses_bundled_evidence(tmp_path, monkeypatch):
    original = build_chart_data.OUT.read_text()
    output = tmp_path / 'chart-data.js'
    monkeypatch.setattr(build_chart_data, 'OUT', output)
    build_chart_data.main()
    def data(text):
        return json.loads(text.split('const SOLAR_DATA = ', 1)[1].strip().removesuffix(';'))
    before, after = data(original), data(output.read_text())
    before.pop('provenance'); after.pop('provenance')
    assert before == after
