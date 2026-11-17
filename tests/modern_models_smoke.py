"""Small API/integrity smoke test; synthetic data are not experiment evidence.

Run from the repository root with ``uv run python -m tests.modern_models_smoke``
or ``PYTHONPATH=. .venv/bin/python tests/modern_models_smoke.py``.
"""
from __future__ import annotations

import json
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
from sklearn.base import clone

from src.models.tabm_model import build_model as build_tabm
from src.models.realmlp_model import build_model as build_realmlp


def main():
    rng = np.random.default_rng(19)
    X = rng.normal(size=(72, 6)).astype(np.float32)
    X[:, -1] = 0.0  # constant descriptors occur in the supplied dataset
    y = (X[:, 0] - 0.5 * X[:, 1] + rng.normal(0, .05, len(X))).astype(np.float32)
    before_x, before_y = X.copy(), y.copy()
    records = []
    builders = [('TabM', build_tabm), ('RealMLP', build_realmlp)]
    for name, builder in builders:
        start = time.perf_counter()
        model = clone(builder(seed=17, epochs=3))
        model.fit(X[:60], y[:60])
        pred = model.predict(X[60:])
        assert pred.shape == (12,), (name, pred.shape)
        assert np.isfinite(pred).all(), name
        assert model.training_metadata_['internal_validation_rows'] == 0
        assert model.training_metadata_['training_rows'] == 60
        assert model.training_metadata_['epochs_completed'] == 3
        assert np.array_equal(X, before_x) and np.array_equal(y, before_y)
        try:
            model.predict(X[60:, :-1])
        except ValueError:
            pass
        else:
            raise AssertionError(f'{name}: wrong feature count was accepted')
        records.append({
            'model': name, 'synthetic_training_rows': 60,
            'synthetic_prediction_rows': 12, 'finite_outputs': True,
            'input_unchanged': True, 'wrong_feature_count_rejected': True,
            'zero_internal_validation': True,
            'seconds': time.perf_counter() - start,
            'package_version': model.training_metadata_['package_version'],
        })
    output = Path(__file__).resolve().parents[1] / 'artifacts' / 'tests'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'modern_models_smoke.json').write_text(json.dumps(records, indent=2)+'\n')
    print(json.dumps(records, indent=2))


if __name__ == '__main__':
    main()
