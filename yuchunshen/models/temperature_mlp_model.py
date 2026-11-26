"""Same MLP control with within-pair difference supervision."""
from .conditional_common import NeuralRegressor

def build_model(seed=2026,**params):return NeuralRegressor(**({'seed':seed,'delta_weight':1.}|params))
