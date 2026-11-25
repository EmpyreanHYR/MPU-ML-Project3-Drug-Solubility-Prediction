"""Dataframe estimators with training-only, side-specific interaction scaling.

Original descriptors and temperature remain available. Products and absolute
differences use z-scores fitted separately for the drug and solvent sides, with
the same parent-balancing weights as the fitted regressor. No target is used to
compute any structural feature or preprocessing statistic.
"""
from functools import lru_cache

import numpy as np
from rdkit.Chem import Descriptors
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.ensemble import ExtraTreesRegressor
from sklearn.feature_selection import VarianceThreshold
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

from src.features import DESCRIPTORS, molecule


@lru_cache(maxsize=4096)
def _describe(smiles, representation):
    descriptor_functions = (tuple(Descriptors._descList) if representation == "full"
                            else tuple(DESCRIPTORS.items()))
    mol = molecule(smiles)
    values = []
    for _, fn in descriptor_functions:
        try:
            value = float(fn(mol))
        except (ValueError, RuntimeError, OverflowError, ZeroDivisionError):
            value = np.nan
        values.append(value if np.isfinite(value) else np.nan)
    return np.asarray(values, dtype=float)


def _raw_sides(frame, representation):
    if representation not in ("full", "basic"):
        raise ValueError(representation)
    return (np.stack([_describe(s, representation) for s in frame["Drug SMILES"]]),
            np.stack([_describe(s, representation) for s in frame["Solvent SMILES"]]),
            frame["Temperature"].to_numpy(dtype=float).reshape(-1, 1))


def _weights(groups, power):
    _, inverse, counts = np.unique(np.asarray(groups), return_inverse=True, return_counts=True)
    weights = counts[inverse].astype(float) ** (-power)
    return weights / weights.mean()


class NormalizedPairTreeRegressor(RegressorMixin, BaseEstimator):
    def __init__(self, representation="full", family="extra", weight_power=1.0,
                 iterations=300, min_samples_leaf=2, max_features=0.7,
                 depth=None, learning_rate=0.04, l2_leaf_reg=5.0,
                 loss="MAE", clip=8.0, seed=2026, threads=2):
        self.representation = representation
        self.family = family
        self.weight_power = weight_power
        self.iterations = iterations
        self.min_samples_leaf = min_samples_leaf
        self.max_features = max_features
        self.depth = depth
        self.learning_rate = learning_rate
        self.l2_leaf_reg = l2_leaf_reg
        self.loss = loss
        self.clip = clip
        self.seed = seed
        self.threads = threads

    def _transform(self, X, weights=None):
        drug, solvent, temp = _raw_sides(X, self.representation)
        fitting = weights is not None
        if fitting:
            self.drug_imputer_ = SimpleImputer(strategy="median", keep_empty_features=True).fit(drug)
            self.solvent_imputer_ = SimpleImputer(strategy="median", keep_empty_features=True).fit(solvent)
        drug = self.drug_imputer_.transform(drug)
        solvent = self.solvent_imputer_.transform(solvent)
        if fitting:
            self.drug_scaler_ = StandardScaler().fit(drug, sample_weight=weights)
            self.solvent_scaler_ = StandardScaler().fit(solvent, sample_weight=weights)
        drug_z = self.drug_scaler_.transform(drug)
        solvent_z = self.solvent_scaler_.transform(solvent)
        if self.clip is not None:
            drug_z = np.clip(drug_z, -self.clip, self.clip)
            solvent_z = np.clip(solvent_z, -self.clip, self.clip)
        matrix = np.concatenate([drug, solvent, temp, drug_z * solvent_z,
                                 np.abs(drug_z - solvent_z)], axis=1)
        if not np.isfinite(matrix).all():
            raise ValueError("Non-finite transformed input")
        if fitting:
            self.selector_ = VarianceThreshold().fit(matrix)
        return self.selector_.transform(matrix)

    def fit(self, X, y, groups=None):
        y = np.asarray(y, dtype=float)
        if groups is None:
            groups = np.arange(len(y))
        weights = _weights(groups, self.weight_power)
        matrix = self._transform(X, weights)
        if self.family == "extra":
            self.model_ = ExtraTreesRegressor(
                n_estimators=self.iterations, max_depth=self.depth,
                max_features=self.max_features, min_samples_leaf=self.min_samples_leaf,
                random_state=self.seed, n_jobs=self.threads)
        elif self.family == "catboost":
            from catboost import CatBoostRegressor
            self.model_ = CatBoostRegressor(
                iterations=self.iterations, depth=self.depth,
                learning_rate=self.learning_rate, l2_leaf_reg=self.l2_leaf_reg,
                loss_function=self.loss, random_seed=self.seed, thread_count=self.threads,
                verbose=False, allow_writing_files=False)
        else:
            raise ValueError(self.family)
        self.model_.fit(matrix, y, sample_weight=weights)
        self.training_metadata_ = {
            "training_rows": len(y), "training_parents": len(np.unique(groups)),
            "descriptor_count_per_side": len(_describe(X["Drug SMILES"].iloc[0], self.representation)),
            "retained_features": matrix.shape[1],
            "scaling": "separate side StandardScaler, training rows only, parent weighted",
            "imputation": "training side medians", "params": self.get_params()}
        return self

    def predict(self, X):
        return np.asarray(self.model_.predict(self._transform(X)), dtype=float)


def pilot_candidates():
    result = [
        dict(representation="full", family="extra", weight_power=power,
             iterations=300, min_samples_leaf=leaf)
        for power in (1.0, 0.5) for leaf in (1, 2)
    ]
    result.extend([
        dict(representation="basic", family="extra", weight_power=1.0,
             iterations=300, min_samples_leaf=1),
        dict(representation="basic", family="extra", weight_power=0.5,
             iterations=300, min_samples_leaf=2),
    ])
    result.extend([
        dict(representation=representation, family="catboost", weight_power=1.0,
             iterations=500, depth=5, learning_rate=0.04, loss="MAE")
        for representation in ("full", "basic")
    ])
    return result
