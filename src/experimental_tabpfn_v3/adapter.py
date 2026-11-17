"""Isolated local TabPFN-v2 adapter for second-round exploratory experiments.

Built with PriorLabs-TabPFN. Weights use the separately retained Prior Labs
License 1.1 in models/combination_v3/tabpfn_probe/LICENSE.txt.
"""
from pathlib import Path
import os

# These settings must precede the first TabPFN import in the process.
os.environ['TABPFN_DISABLE_TELEMETRY'] = '1'
os.environ['DO_NOT_TRACK'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['HF_HUB_OFFLINE'] = '1'

import gc
import hashlib
import numpy as np
import torch
from sklearn.base import BaseEstimator, RegressorMixin
from tabpfn import TabPFNRegressor
from tabpfn.constants import ModelVersion
from src.paths import model_path
from src.experimental_v3.tree_models import rich_features

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CHECKPOINT = model_path(ROOT/'output/combination_v3/tabpfn_probe/tabpfn-v2-regressor.ckpt')
CHECKPOINT_SHA256 = '2ab5a07d5c41dfe6db9aa7ae106fc6de898326c2765be66505a07e2868c10736'


class FrameTabPFNRegressor(RegressorMixin, BaseEstimator):
    """Scikit-learn style adapter; no external inference or automatic downloads.

    Serialization stores training feature context and labels, and reconstructs
    TabPFN lazily after load. GPU execution objects are deliberately excluded.
    Seed changes the genuine TabPFN preprocessing/feature-permutation ensemble.
    """
    def __init__(self, representation='small', n_estimators=2, seed=2026,
                 output_type='mean', device='mps', model_path=None):
        self.representation = representation
        self.n_estimators = n_estimators
        self.seed = seed
        self.output_type = output_type
        self.device = device
        self.model_path = model_path

    def _build(self):
        ckpt = Path(self.model_path) if self.model_path else DEFAULT_CHECKPOINT
        if not ckpt.exists():
            raise FileNotFoundError('Download the public v2 checkpoint explicitly before local inference: '+str(ckpt))
        if hashlib.sha256(ckpt.read_bytes()).hexdigest() != CHECKPOINT_SHA256:
            raise ValueError('TabPFN-v2 checkpoint identity changed')
        torch.set_num_threads(2)
        return TabPFNRegressor.create_default_for_version(
            ModelVersion.V2, model_path=ckpt, device=self.device,
            n_estimators=self.n_estimators, n_preprocessing_jobs=1,
            random_state=self.seed, memory_saving_mode='auto')

    def fit(self, X, y, groups=None):
        self.context_x_ = rich_features(X, self.representation)
        self.context_y_ = np.asarray(y, dtype=float).copy()
        self.model_ = self._build().fit(self.context_x_, self.context_y_)
        self.training_metadata_ = dict(rows=len(y), features=self.context_x_.shape[1],
                                       groups=None if groups is None else len(np.unique(groups)),
                                       local_inference_only=True, telemetry_disabled=True,
                                       sample_weight_supported=False, params=self.get_params(),
                                       checkpoint_sha256=CHECKPOINT_SHA256,
                                       serialization='stores training context and rebuilds local estimator lazily')
        return self

    def predict(self, X):
        if getattr(self, 'model_', None) is None:
            self.model_ = self._build().fit(self.context_x_, self.context_y_)
        return np.asarray(self.model_.predict(rich_features(X, self.representation),
                                             output_type=self.output_type), dtype=float)

    def release(self):
        self.model_ = None
        gc.collect()
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()

    def __getstate__(self):
        state = self.__dict__.copy()
        state.pop('model_', None)
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)
        self.model_ = None
