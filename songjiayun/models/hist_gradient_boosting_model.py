from sklearn.ensemble import HistGradientBoostingRegressor
def build_model(seed=2026,**params):return HistGradientBoostingRegressor(**({'max_iter':200,'max_leaf_nodes':15,'learning_rate':.05,'l2_regularization':1.0,'early_stopping':False,'random_state':seed}|params))
