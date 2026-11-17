from sklearn.ensemble import RandomForestRegressor
def build_model(seed=2026,**params):return RandomForestRegressor(**({'n_estimators':200,'min_samples_leaf':2,'n_jobs':2,'random_state':seed}|params))
