"""Capacity-matched descriptor MLP control, without balanced or difference loss."""
from .conditional_common import NeuralRegressor

def build_model(seed=2026,**params):return NeuralRegressor(seed=seed,**params)
