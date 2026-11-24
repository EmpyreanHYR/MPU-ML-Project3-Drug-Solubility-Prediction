"""Two molecular encoders, explicit interaction, and structural/temperature heads."""
from .conditional_common import NeuralRegressor

def build_model(seed=2026,**params):
    return NeuralRegressor(**({'seed':seed,'balanced':True,'structured':True,'delta_weight':1.}|params))
