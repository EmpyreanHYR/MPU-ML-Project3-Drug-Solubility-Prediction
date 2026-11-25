from sklearn.ensemble import ExtraTreesRegressor
def build_model(seed=2026,**params):return ExtraTreesRegressor(**({'n_estimators':200,'min_samples_leaf':2,'n_jobs':2,'random_state':seed}|params))
