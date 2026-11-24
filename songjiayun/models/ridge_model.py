from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
def build_model(seed=2026,**params):return make_pipeline(StandardScaler(),Ridge(**({'alpha':10.0}|params)))
