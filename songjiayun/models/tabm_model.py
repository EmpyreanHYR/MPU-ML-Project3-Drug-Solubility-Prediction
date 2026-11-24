"""Official TabM (ICLR 2025), with a bounded CPU training configuration.

Paper: https://arxiv.org/abs/2410.24210
Official implementation: https://github.com/yandex-research/tabm

This adapter calls ``tabm.TabM.make``; it is not an MLP labelled as TabM.
It uses TabM without numerical embeddings, a valid configuration described by
the authors. Width/depth/ensemble size and epoch budget are smaller than the
paper's default. No early stopping or internal random validation split is used.
All preprocessing is fitted on the arrays supplied to fit(), which must contain
only one outer training fold. Averaging occurs at inference, not before the
per-member squared training loss.
"""
from __future__ import annotations

import time
from importlib.metadata import version

import numpy as np
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.preprocessing import StandardScaler
from sklearn.utils.validation import check_array, check_is_fitted, check_X_y


class TabMRegressor(RegressorMixin, BaseEstimator):
    def __init__(
        self,
        seed: int = 2026,
        epochs: int = 120,
        batch_size: int = 256,
        d_block: int = 128,
        n_blocks: int = 2,
        k: int = 16,
        dropout: float = 0.1,
        learning_rate: float = 0.002,
        weight_decay: float = 0.0003,
        threads: int = 2,
    ):
        self.seed = seed
        self.epochs = epochs
        self.batch_size = batch_size
        self.d_block = d_block
        self.n_blocks = n_blocks
        self.k = k
        self.dropout = dropout
        self.learning_rate = learning_rate
        self.weight_decay = weight_decay
        self.threads = threads

    def fit(self, X, y):
        import torch
        from tabm import TabM

        X, y = check_X_y(X, y, dtype=np.float32, ensure_all_finite=True)
        if self.epochs < 1 or self.batch_size < 1 or self.threads < 1:
            raise ValueError('epochs, batch_size and threads must be positive')
        self.n_features_in_ = X.shape[1]
        self.scaler_ = StandardScaler().fit(X)
        x_tensor = torch.from_numpy(self.scaler_.transform(X).astype(np.float32))
        self.target_mean_ = float(np.mean(y))
        self.target_scale_ = max(float(np.std(y)), 1e-8)
        y_tensor = torch.from_numpy(
            ((y - self.target_mean_) / self.target_scale_).astype(np.float32)
        )
        torch.set_num_threads(self.threads)
        start = time.perf_counter()
        # Preserve caller's RNG state while seeding all stochastic model steps.
        with torch.random.fork_rng(devices=[]):
            torch.manual_seed(self.seed)
            generator = torch.Generator(device='cpu').manual_seed(self.seed)
            self.model_ = TabM.make(
                n_num_features=X.shape[1],
                d_out=1,
                n_blocks=self.n_blocks,
                d_block=self.d_block,
                k=self.k,
                dropout=self.dropout,
                arch_type='tabm',
            ).cpu()
            optimizer = torch.optim.AdamW(
                self.model_.parameters(),
                lr=self.learning_rate,
                weight_decay=self.weight_decay,
            )
            self.loss_curve_ = []
            for epoch in range(self.epochs):
                self.model_.train()
                indices = torch.randperm(len(y), generator=generator)
                sum_loss = 0.0
                for idx in indices.split(self.batch_size):
                    optimizer.zero_grad(set_to_none=True)
                    predictions = self.model_(x_tensor[idx]).squeeze(-1)
                    # Each of the k members is trained against the target.
                    loss = (predictions - y_tensor[idx, None]).square().mean()
                    if not torch.isfinite(loss):
                        raise FloatingPointError('Non-finite TabM training loss')
                    loss.backward()
                    optimizer.step()
                    sum_loss += float(loss.detach()) * len(idx)
                self.loss_curve_.append(sum_loss / len(y))
        self.model_.eval()
        self.training_metadata_ = {
            'architecture': 'official tabm.TabM, arch_type=tabm, no feature embeddings',
            'package_version': version('tabm'),
            'device': 'cpu',
            'training_rows': int(len(y)),
            'internal_validation_rows': 0,
            'epochs_completed': self.epochs,
            'elapsed_seconds': time.perf_counter() - start,
            'loss_unit': 'mean member MSE on training-fold standardized target',
            'adaptation': 'bounded training configuration; not paper-default benchmark reproduction',
            'parameters': self.get_params(deep=False),
        }
        return self

    def predict(self, X):
        import torch

        check_is_fitted(self, ['model_', 'scaler_', 'target_mean_', 'target_scale_'])
        X = check_array(X, dtype=np.float32, ensure_all_finite=True)
        if X.shape[1] != self.n_features_in_:
            raise ValueError(f'Expected {self.n_features_in_} features, got {X.shape[1]}')
        x_tensor = torch.from_numpy(self.scaler_.transform(X).astype(np.float32))
        self.model_.eval()
        with torch.inference_mode():
            outputs = [
                self.model_(batch).squeeze(-1).mean(dim=1).cpu().numpy()
                for batch in x_tensor.split(self.batch_size)
            ]
        prediction = np.concatenate(outputs) * self.target_scale_ + self.target_mean_
        return prediction.astype(np.float64)


def build_model(seed: int = 2026, **params):
    return TabMRegressor(seed=seed, **params)
