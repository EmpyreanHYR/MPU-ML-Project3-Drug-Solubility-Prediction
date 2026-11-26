"""Fold-local multi-view molecular kernels for exploratory v3 experiments.

Inputs are the original dataframe with Drug SMILES, Solvent SMILES, Temperature.
Deterministic molecule descriptors are cached; every fitted preprocessing statistic
and every regression parameter is learned from the fit data only.
"""
from functools import lru_cache
import numpy as np
from rdkit import Chem
from rdkit.Chem import Descriptors, rdFingerprintGenerator
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.kernel_ridge import KernelRidge
from sklearn.svm import SVR
from sklearn.metrics.pairwise import rbf_kernel

_DESC = tuple(Descriptors._descList)
_FP = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=2048, includeChirality=True)
_BASIC = ('MolWt', 'MolLogP', 'TPSA', 'NumHDonors', 'NumHAcceptors',
          'NumRotatableBonds', 'RingCount', 'NumAromaticRings',
          'HeavyAtomCount', 'FractionCSP3')


@lru_cache(maxsize=4096)
def _molecule_views(smiles):
    mol = Chem.MolFromSmiles(str(smiles))
    if mol is None:
        raise ValueError('Invalid SMILES')
    values = []
    for _, fun in _DESC:
        try:
            value = float(fun(mol))
        except Exception:
            value = np.nan
        values.append(value if np.isfinite(value) else np.nan)
    basic = [float(getattr(Descriptors, name)(mol)) for name in _BASIC]
    basic.append(float(Chem.GetFormalCharge(mol)))
    return (np.asarray(values), np.asarray(basic),
            _FP.GetFingerprintAsNumPy(mol).astype(float))


def _raw_views(frame, features):
    index = 0 if features == 'full' else 1
    ds = [_molecule_views(s) for s in frame['Drug SMILES']]
    ss = [_molecule_views(s) for s in frame['Solvent SMILES']]
    return (np.stack([a[index] for a in ds]), np.stack([a[index] for a in ss]),
            np.stack([a[2] for a in ds]), np.stack([a[2] for a in ss]),
            frame['Temperature'].to_numpy(dtype=float))


def _tanimoto(a, b):
    ab = a @ b.T
    union = a.sum(1)[:, None] + b.sum(1)[None, :] - ab
    return np.divide(ab, union, out=np.zeros_like(ab), where=union > 0)


class MultiViewKernelRegressor(RegressorMixin, BaseEstimator):
    """PSD additive/product kernels with group-balanced KRR or epsilon-SVR."""
    def __init__(self, features='full', kernel='rbf', gamma=0.3, alpha=1.0,
                 main_weight=0.5, solvent_weight=0.1, temp_weight=0.1,
                 estimator='ridge', C=10.0, epsilon=0.1, balanced=True):
        self.features = features
        self.kernel = kernel
        self.gamma = gamma
        self.alpha = alpha
        self.main_weight = main_weight
        self.solvent_weight = solvent_weight
        self.temp_weight = temp_weight
        self.estimator = estimator
        self.C = C
        self.epsilon = epsilon
        self.balanced = balanced

    def _transform(self, frame, fitting=False):
        d, s, dfp, sfp, temp = _raw_views(frame, self.features)
        if fitting:
            self.d_imputer_ = SimpleImputer(keep_empty_features=True).fit(d)
            self.s_imputer_ = SimpleImputer(keep_empty_features=True).fit(s)
            self.d_scaler_ = StandardScaler().fit(self.d_imputer_.transform(d))
            self.s_scaler_ = StandardScaler().fit(self.s_imputer_.transform(s))
            self.t_center_ = float(np.median(temp))
            self.t_scale_ = max(float(np.std(temp)), 1.0)
        d = np.clip(self.d_scaler_.transform(self.d_imputer_.transform(d)), -8, 8)
        s = np.clip(self.s_scaler_.transform(self.s_imputer_.transform(s)), -8, 8)
        return d, s, dfp, sfp, (temp - self.t_center_) / self.t_scale_

    def _kernel(self, a, b):
        ad, ass, afp, asfp, at = a
        bd, bs, bfp, bsfp, bt = b
        dr = rbf_kernel(ad, bd, gamma=self.gamma / ad.shape[1])
        sr = rbf_kernel(ass, bs, gamma=self.gamma / ass.shape[1])
        if self.kernel == 'tanimoto':
            d, s = _tanimoto(afp, bfp), _tanimoto(asfp, bsfp)
        elif self.kernel == 'mixed':
            d = 0.5 * dr + 0.5 * _tanimoto(afp, bfp)
            s = 0.5 * sr + 0.5 * _tanimoto(asfp, bsfp)
        else:
            d, s = dr, sr
        pair = d * s
        return (self.main_weight * d + self.solvent_weight * s +
                (1.0 - self.main_weight) * pair +
                self.temp_weight * pair * np.outer(at, bt))

    def fit(self, X, y, groups=None):
        y = np.asarray(y, dtype=float)
        if groups is None:
            groups = np.arange(len(y))
        _, inv, counts = np.unique(groups, return_inverse=True, return_counts=True)
        w = 1.0 / counts[inv] if self.balanced else np.ones(len(y))
        w /= w.mean()
        self.target_mean_ = float(np.average(y, weights=w))
        self.views_ = self._transform(X, fitting=True)
        kmat = self._kernel(self.views_, self.views_)
        if self.estimator == 'svr':
            self.regressor_ = SVR(kernel='precomputed', C=self.C, epsilon=self.epsilon)
        else:
            self.regressor_ = KernelRidge(kernel='precomputed', alpha=self.alpha)
        self.regressor_.fit(kmat, y - self.target_mean_, sample_weight=w)
        self.training_metadata_ = {'rows': len(y), 'groups': len(counts),
                                   'descriptor_count_per_side': self.views_[0].shape[1],
                                   'params': self.get_params()}
        return self

    def predict(self, X):
        return self.target_mean_ + self.regressor_.predict(self._kernel(self._transform(X), self.views_))


def pilot_candidates():
    candidates = []
    for features in ('basic', 'full'):
        for gamma in (0.1, 0.3, 1.0, 3.0):
            for alpha in (0.03, 0.3, 3.0):
                candidates.append(dict(features=features, gamma=gamma, alpha=alpha))
    for kernel in ('tanimoto', 'mixed'):
        for alpha in (0.03, 0.3, 3.0):
            candidates.append(dict(kernel=kernel, alpha=alpha))
    for gamma in (0.3, 1.0):
        for C in (1.0, 10.0, 100.0):
            candidates.append(dict(estimator='svr', gamma=gamma, C=C))
    return candidates
