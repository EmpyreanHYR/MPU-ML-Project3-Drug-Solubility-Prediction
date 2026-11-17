import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error,mean_squared_error,r2_score

def regression_metrics(y,p,groups):
    e=pd.DataFrame({'group':np.asarray(groups),'ae':np.abs(np.asarray(y)-np.asarray(p))})
    return dict(MAE=float(mean_absolute_error(y,p)),RMSE=float(np.sqrt(mean_squared_error(y,p))),R2=float(r2_score(y,p)),parent_macro_MAE=float(e.groupby('group').ae.mean().mean()))

def macro_bootstrap(y,p,groups,seed=2026,n=2000):
    e=pd.DataFrame({'g':groups,'ae':np.abs(np.asarray(y)-p)}).groupby('g').ae.mean().to_numpy()
    rng=np.random.default_rng(seed);boot=rng.choice(e,(n,len(e)),replace=True).mean(axis=1)
    return list(map(float,np.quantile(boot,[.025,.975])))
