"""Nested-validation shrinkage of the structural/temperature decomposition."""
import numpy as np
from src.models.hybrid_conditional_model import HybridConditionalRegressor
from src.models.conditional_common import interactions,weights
class AdaptiveHybridRegressor(HybridConditionalRegressor):
    def __init__(self,seed=2026,temperature_gain=0.,alpha=1000.,max_depth=8,min_samples_leaf=1,n_estimators=200,balanced=True,interaction=True,temperature=True):
        super().__init__(seed,alpha,max_depth,min_samples_leaf,n_estimators,balanced,interaction,temperature)
        self.temperature_gain=temperature_gain
    def fit(self,X,y,groups=None,pairs=None):
        super().fit(X,y,groups,pairs)
        xx=self.transform_.x(X);z=interactions(xx,self.interaction)
        adjustment=self.temperature_gain*xx[:,-1]*self.slope_.predict(np.column_stack([np.ones(len(z)),z])) if self.temperature else np.zeros(len(z))
        self.base_.fit(z,np.asarray(y)-adjustment,sample_weight=weights(np.arange(len(y)) if groups is None else groups,self.balanced))
        self.training_metadata_['temperature_gain']=self.temperature_gain
        self.training_metadata_['refinement']='inner-selected shrinkage; original full-gain result retained'
        return self
    def predict_parts(self,X):
        b,t=super().predict_parts(X);return b,self.temperature_gain*t

def build_model(seed=2026,**params):return AdaptiveHybridRegressor(seed=seed,**params)
