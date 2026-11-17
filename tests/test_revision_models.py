import numpy as np
import joblib
from src.models.registry import create_model
from src.models.conditional_common import delta_examples,weights

def test_difference_ties_and_weights():
    x=np.zeros((4,23),np.float32);x[:,-1]=[0,0,1,2]
    a,b,dy,w=delta_examples(x,np.array([0.,2.,3.,5.]),['g']*4,['p']*4)
    np.testing.assert_allclose(dy,[2.,2.]);assert len(a)==2
    q=weights(['a','a','b']);assert np.isclose(q[:2].sum(),q[2])

def test_new_models_serialization_and_parts(tmp_path):
    rng=np.random.default_rng(42);x=rng.normal(size=(36,23)).astype(np.float32);y=x[:,0]+.2*x[:,-1]
    groups=np.repeat(np.arange(6),6);pairs=np.repeat(np.arange(12),3)
    original=x.copy()
    for name in ['HybridConditional','InteractionConditional','PlainMLP','TemperatureMLP']:
        params={'n_estimators':10} if name=='HybridConditional' else {'epochs':3,'width':16}
        m=create_model(name,2026,params).fit(x,y,groups=groups,pairs=pairs)
        pred=m.predict(x);b,t=m.predict_parts(x);np.testing.assert_allclose(pred,b+t)
        assert np.isfinite(pred).all();p=tmp_path/(name+'.joblib');joblib.dump(m,p);np.testing.assert_allclose(joblib.load(p).predict(x),pred)
    np.testing.assert_array_equal(x,original)
