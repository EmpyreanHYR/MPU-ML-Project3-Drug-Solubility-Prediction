import numpy as np
import pytest
from fastapi.testclient import TestClient
from webapp.server import app,models,get_model,lookup
from src.features import featurize_pairs
client=TestClient(app)

def sample():
    c=client.get('/api/catalog').json()
    return {'drug_id':next(x['id'] for x in c['drugs'] if x['name']=='Caffeine'),'solvent_id':next(x['id'] for x in c['solvents'] if x['name']=='Acetone'),'temperature':25.}

@pytest.mark.parametrize('name',['AdaptiveHybrid','Dummy','Ridge','RandomForest','ExtraTrees','HistGradientBoosting','TabM','RealMLP','PlainMLP','TemperatureMLP','InteractionConditional'])
def test_every_model_matches_offline(name):
    q=sample()|{'model_id':name};r=client.post('/api/predict',json=q);assert r.status_code==200,r.text
    x=featurize_pairs([lookup('Drug',q['drug_id'])['smiles']],[lookup('Solvent',q['solvent_id'])['smiles']],[25.]);p=get_model(name)[0].predict(x)[0]
    assert np.isclose(r.json()['log_solubility'],p)

def test_comparison_and_curve_share_inputs():
    q=sample()|{'model_id':'AdaptiveHybrid','model_b':'InteractionConditional','temperature_min':10.,'temperature_max':40.}
    r=client.post('/api/compare',json=q);assert r.status_code==200,r.text;r=r.json()
    assert r['curve_a']['temperatures']==r['curve_b']['temperatures'];assert len(r['curve_a']['temperatures'])==61
    assert len(r['group_errors']['ids'])==128
    assert np.isclose(r['difference'],r['b']['log_solubility']-r['a']['log_solubility'])
    for k,name in [('a','AdaptiveHybrid'),('b','InteractionConditional')]:
        direct=client.post('/api/predict',json=sample()|{'model_id':name}).json()
        assert np.isclose(direct['log_solubility'],r[k]['log_solubility'])
    mid=client.post('/api/predict',json=sample()|{'model_id':'AdaptiveHybrid'}).json()['log_solubility']
    assert np.isclose(mid,r['curve_a']['lines'][0]['values'][30])

def test_invalid_requests_and_model_registry():
    assert len(models()['models'])==12
    q=sample()|{'model_id':'AdaptiveHybrid'}
    for change in [{'model_id':'missing'},{'drug_id':'missing'},{'temperature':1001}]:assert client.post('/api/predict',json=q|change).status_code==422
    assert client.post('/api/compare',json=q|{'model_b':'AdaptiveHybrid'}).status_code==422
    assert client.post('/api/curve',json=q|{'temperature_min':30,'temperature_max':20}).status_code==422
    assert 'image/svg+xml' in client.get('/api/structure/'+q['drug_id']).headers['content-type']
    assert client.get('/').status_code==200


def test_restored_v2_registry():
    r=client.get('/api/models').json()
    assert r['default']=='AdaptiveHybrid'
    assert {m['id'] for m in r['models'] if m['group'].startswith('Proposed')}=={'AdaptiveHybrid','InteractionConditional'}
    scores={m['id']:m['metrics']['parent_macro_MAE'] for m in r['models']}
    assert np.isclose(scores['AdaptiveHybrid'],0.7164050568926572)
    assert np.isclose(scores['ExtraTrees'],0.7469181701937112)
