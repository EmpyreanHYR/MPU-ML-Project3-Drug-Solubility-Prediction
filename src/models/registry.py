from importlib import import_module
MODULES={'Dummy':'dummy_model','Ridge':'ridge_model','RandomForest':'random_forest_model','ExtraTrees':'extra_trees_model','HistGradientBoosting':'hist_gradient_boosting_model','TabM':'tabm_model','RealMLP':'realmlp_model'}
MODULES.update({'HybridConditional':'hybrid_conditional_model','InteractionConditional':'interaction_conditional_model','PlainMLP':'plain_mlp_model','TemperatureMLP':'temperature_mlp_model'})
def create_model(name,seed=2026,params=None):return import_module('src.models.'+MODULES[name]).build_model(seed=seed,**(params or {}))
