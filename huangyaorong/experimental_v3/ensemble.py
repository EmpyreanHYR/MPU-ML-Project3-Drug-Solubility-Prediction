"""Serializable raw-frame adapters and convex ensembles for isolated experiments."""
import numpy as np
from sklearn.base import BaseEstimator, RegressorMixin
from src.features import featurize_pairs
from src.models.tabm_model import TabMRegressor


class FrameTabMRegressor(RegressorMixin, BaseEstimator):
    def __init__(self, seed=2026, d_block=64, dropout=.1, learning_rate=.003, epochs=120):
        self.seed = seed
        self.d_block = d_block
        self.dropout = dropout
        self.learning_rate = learning_rate
        self.epochs = epochs

    @staticmethod
    def matrix(frame):
        return featurize_pairs(frame["Drug SMILES"], frame["Solvent SMILES"], frame.Temperature)

    def fit(self, X, y, groups=None):
        self.model_ = TabMRegressor(seed=self.seed, d_block=self.d_block, dropout=self.dropout,
                                   learning_rate=self.learning_rate, epochs=self.epochs)
        self.model_.fit(self.matrix(X), y)
        return self

    def predict(self, X):
        return self.model_.predict(self.matrix(X))


class FittedConvexEnsemble:
    """Only fitted components with positive weights are retained."""
    def __init__(self, models, weights, metadata=None):
        self.models = {name:m for name, m in models.items() if weights[name] > 0}
        self.weights = {name:float(w) for name, w in weights.items() if w > 0}
        if not self.weights or not np.isclose(sum(self.weights.values()), 1.):
            raise ValueError("Weights must be a nonnegative simplex")
        self.metadata = metadata or {}

    def predict(self, X):
        return sum(self.weights[name] * model.predict(X) for name, model in self.models.items())

    def predict_components(self, X):
        return {name:model.predict(X) for name, model in self.models.items()}
