"""Official RealMLP (NeurIPS 2024), using the PyTabKit implementation.

Paper: https://arxiv.org/abs/2407.04491
Proceedings DOI: https://doi.org/10.52202/079017-0837
Official implementation: https://github.com/dholzmueller/pytabkit

The wrapper keeps the official RealMLP-TD regressor's learned numerical
embeddings, robust preprocessing, parametric activations and schedules. It
reduces hidden width and epochs for this small CPU study; this is explicitly
an adapted configuration, not the paper's full default benchmark protocol.

``val_fraction=0`` removes the library's internal random validation split.
``use_early_stopping=False`` alone would NOT prevent best-epoch selection if
validation data were supplied. Here no validation data are supplied and the
specified number of epochs is fixed before external grouped evaluation.
"""
from __future__ import annotations

import time
from importlib.metadata import version
from pathlib import Path

import numpy as np
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.utils.validation import check_array, check_is_fitted, check_X_y


class RealMLPRegressor(RegressorMixin, BaseEstimator):
    def __init__(
        self,
        seed: int = 2026,
        epochs: int = 128,
        batch_size: int = 256,
        hidden_width: int = 128,
        n_hidden_layers: int = 3,
        threads: int = 2,
    ):
        self.seed = seed
        self.epochs = epochs
        self.batch_size = batch_size
        self.hidden_width = hidden_width
        self.n_hidden_layers = n_hidden_layers
        self.threads = threads

    def fit(self, X, y):
        import torch
        from pytabkit import RealMLP_TD_Regressor

        X, y = check_X_y(X, y, dtype=np.float32, ensure_all_finite=True)
        if self.epochs < 1 or self.batch_size < 1 or self.threads < 1:
            raise ValueError('epochs, batch_size and threads must be positive')
        self.n_features_in_ = X.shape[1]
        # Explicit repository path even though current RealMLP does not write
        # temporary model files. Do not use an operating-system temp folder.
        tmp_folder = Path(__file__).resolve().parents[2] / '.cache' / 'realmlp'
        self.model_ = RealMLP_TD_Regressor(
            device='cpu',
            random_state=self.seed,
            n_cv=1,
            n_refit=0,
            n_repeats=1,
            val_fraction=0.0,
            use_early_stopping=False,
            n_epochs=self.epochs,
            batch_size=self.batch_size,
            hidden_sizes=[self.hidden_width] * self.n_hidden_layers,
            n_threads=self.threads,
            verbosity=0,
            tmp_folder=str(tmp_folder),
            normalize_output=True,
            # Preserve an unconstrained regression output; no target clipping.
            clamp_output=False,
        )
        start = time.perf_counter()
        torch.set_num_threads(self.threads)
        self.model_.fit(X, y)
        self.training_metadata_ = {
            'architecture': 'official pytabkit.RealMLP_TD_Regressor',
            'package_version': version('pytabkit'),
            'device': 'cpu',
            'training_rows': int(len(y)),
            'internal_validation_rows': 0,
            'epochs_completed': self.epochs,
            'elapsed_seconds': time.perf_counter() - start,
            'adaptation': '128-wide, bounded epoch configuration; no internal validation or output clipping',
            'parameters': self.get_params(deep=False),
            'official_resolved_config': self.model_.get_config(),
        }
        return self

    def predict(self, X):
        check_is_fitted(self, 'model_')
        X = check_array(X, dtype=np.float32, ensure_all_finite=True)
        if X.shape[1] != self.n_features_in_:
            raise ValueError(f'Expected {self.n_features_in_} features, got {X.shape[1]}')
        return np.asarray(self.model_.predict(X), dtype=np.float64).reshape(-1)


def build_model(seed: int = 2026, **params):
    return RealMLPRegressor(seed=seed, **params)
