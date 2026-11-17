"""Parent-balanced structural tree baseline + learned within-pair temperature slope."""
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator,RegressorMixin
from sklearn.linear_model import Ridge
from sklearn.ensemble import ExtraTreesRegressor
from .conditional_common import FoldTransform,weights,interactions
class HybridConditionalRegressor(RegressorMixin,BaseEstimator):
    def __init__(self,seed=2026,alpha=10.,max_depth=8,min_samples_leaf=2,n_estimators=200,balanced=True,interaction=True,temperature=True):
        self.seed=seed;self.alpha=alpha;self.max_depth=max_depth;self.min_samples_leaf=min_samples_leaf;self.n_estimators=n_estimators;self.balanced=balanced;self.interaction=interaction;self.temperature=temperature
    def fit(self,X,y,groups=None,pairs=None):
        y=np.asarray(y,float)
        if groups is None:groups=np.arange(len(y))
        if pairs is None:pairs=np.arange(len(y))
        self.transform_=FoldTransform().fit(X,y);xx=self.transform_.x(X);z=interactions(xx,self.interaction);tau=xx[:,-1]
        f=pd.DataFrame({'c':pairs,'t':tau,'y':y});dt=tau-f.groupby('c').t.transform('mean').to_numpy();dy=y-f.groupby('c').y.transform('mean').to_numpy()
        design=np.column_stack([np.ones(len(y)),z]);w=weights(groups,self.balanced);active=np.abs(dt)>1e-9
        self.slope_=Ridge(alpha=self.alpha,fit_intercept=False)
        if self.temperature and active.any():self.slope_.fit(design[active]*dt[active,None],dy[active],sample_weight=w[active])
        else:self.slope_.fit(np.zeros((1,design.shape[1])),np.zeros(1))
        adjustment=tau*self.slope_.predict(design) if self.temperature else np.zeros(len(y))
        self.base_=ExtraTreesRegressor(n_estimators=self.n_estimators,max_depth=self.max_depth,min_samples_leaf=self.min_samples_leaf,random_state=self.seed,n_jobs=2)
        self.base_.fit(z,y-adjustment,sample_weight=w);self.n_features_in_=23
        self.training_metadata_={'rows':len(y),'slope_rows':int(active.sum()),'internal_validation_rows':0,'params':self.get_params()};return self
    def predict_parts(self,X):
        xx=self.transform_.x(X);z=interactions(xx,self.interaction)
        b=self.base_.predict(z);t=xx[:,-1]*self.slope_.predict(np.column_stack([np.ones(len(z)),z])) if self.temperature else np.zeros(len(z))
        return b,t
    def predict(self,X):
        b,t=self.predict_parts(X);return b+t

def build_model(seed=2026,**params):return HybridConditionalRegressor(seed=seed,**params)
