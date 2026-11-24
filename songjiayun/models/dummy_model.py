from sklearn.dummy import DummyRegressor
def build_model(seed=2026,**params):return DummyRegressor(strategy='mean',**params)
