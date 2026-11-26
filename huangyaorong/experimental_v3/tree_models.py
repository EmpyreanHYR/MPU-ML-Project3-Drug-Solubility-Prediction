"""Rich deterministic chemistry features with fold-local fitted preprocessing."""
from functools import lru_cache

import numpy as np
from rdkit import Chem
from rdkit.Chem import Descriptors
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.feature_selection import VarianceThreshold

from src.features import featurize_pairs, molecule, drug_parent

DESCRIPTOR_NAMES = tuple(name for name, _ in Descriptors._descList)


@lru_cache(maxsize=8192)
def full_descriptors(smiles):
    mol = molecule(smiles)
    values = []
    for _, fn in Descriptors._descList:
        try:
            value = float(fn(mol))
        except (ValueError, RuntimeError, OverflowError, ZeroDivisionError):
            value = np.nan
        values.append(value if np.isfinite(value) else np.nan)
    return np.asarray(values, dtype=float)


def rich_features(frame, representation="full"):
    """Uses structures and original temperature only; does not access targets."""
    small = featurize_pairs(frame["Drug SMILES"], frame["Solvent SMILES"], frame.Temperature)
    if representation == "small":
        return small.astype(float)
    drug = np.stack([full_descriptors(s) for s in frame["Drug SMILES"]])
    solvent = np.stack([full_descriptors(s) for s in frame["Solvent SMILES"]])
    blocks = [drug, solvent, small[:, -1:]]
    if representation in ("interaction", "parent"):
        # Commensurate descriptor products/differences expose solute/solvent matching.
        blocks.extend([drug * solvent, np.abs(drug - solvent)])
    if representation == "parent":
        blocks.append(np.stack([full_descriptors(drug_parent(s)) for s in frame["Drug SMILES"]]))
    if representation not in ("full", "interaction", "parent"):
        raise ValueError(representation)
    x = np.concatenate(blocks, axis=1)
    x[~np.isfinite(x)] = np.nan
    return x


def parent_weights(groups, power=1.0):
    _, inv, counts = np.unique(np.asarray(groups), return_inverse=True, return_counts=True)
    w = counts[inv].astype(float) ** (-power)
    return w / w.mean()


class RichTreeRegressor(RegressorMixin, BaseEstimator):
    def __init__(self, family="catboost", representation="full", weight_power=1.,
                 depth=5, iterations=500, learning_rate=.04, l2_leaf_reg=5.,
                 loss="MAE", max_features=.7, min_samples_leaf=2,
                 seed=2026, threads=2):
        self.family = family
        self.representation = representation
        self.weight_power = weight_power
        self.depth = depth
        self.iterations = iterations
        self.learning_rate = learning_rate
        self.l2_leaf_reg = l2_leaf_reg
        self.loss = loss
        self.max_features = max_features
        self.min_samples_leaf = min_samples_leaf
        self.seed = seed
        self.threads = threads

    def fit(self, X, y, groups=None):
        x = rich_features(X, self.representation)
        self.imputer_ = SimpleImputer(strategy="median", keep_empty_features=True).fit(x)
        x = self.imputer_.transform(x)
        self.selector_ = VarianceThreshold().fit(x)
        x = self.selector_.transform(x)
        w = parent_weights(np.arange(len(y)) if groups is None else groups, self.weight_power)
        if self.family == "catboost":
            from catboost import CatBoostRegressor
            self.model_ = CatBoostRegressor(
                iterations=self.iterations, depth=self.depth,
                learning_rate=self.learning_rate, l2_leaf_reg=self.l2_leaf_reg,
                loss_function=self.loss, random_seed=self.seed, thread_count=self.threads,
                verbose=False, allow_writing_files=False,
            )
        elif self.family == "extra":
            self.model_ = ExtraTreesRegressor(
                n_estimators=self.iterations, max_depth=self.depth,
                max_features=self.max_features, min_samples_leaf=self.min_samples_leaf,
                random_state=self.seed, n_jobs=self.threads,
            )
        elif self.family == "hist":
            self.model_ = HistGradientBoostingRegressor(
                max_iter=self.iterations, max_leaf_nodes=2**self.depth,
                learning_rate=self.learning_rate, l2_regularization=self.l2_leaf_reg,
                loss="absolute_error" if self.loss == "MAE" else "squared_error",
                early_stopping=False, random_state=self.seed,
            )
        else:
            raise ValueError(self.family)
        self.model_.fit(x, y, sample_weight=w)
        self.training_metadata_ = {"rows":len(y), "features":x.shape[1],
                                   "parameters": self.get_params(), "preprocessing":"training fold only"}
        return self

    def predict(self, X):
        x = rich_features(X, self.representation)
        return np.asarray(self.model_.predict(self.selector_.transform(self.imputer_.transform(x))), float)


def pilot_candidates():
    configs = []
    for rep in ["small", "full", "interaction"]:
        for loss, power in [("MAE", 1.), ("RMSE", .5)]:
            configs.append(dict(family="catboost", representation=rep, weight_power=power,
                                loss=loss, iterations=500, depth=5, learning_rate=.04))
    for rep in ["full", "interaction", "parent"]:
        for power in [0., 1.]:
            configs.append(dict(family="extra", representation=rep, weight_power=power,
                                iterations=300, depth=None, min_samples_leaf=2, max_features=.7))
    return configs
