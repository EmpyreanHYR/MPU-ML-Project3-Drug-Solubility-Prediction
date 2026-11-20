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
    assert len(models()['models'])==14
    q=sample()|{'model_id':'AdaptiveHybrid'}
    for change in [{'model_id':'missing'},{'drug_id':'missing'},{'temperature':1001}]:assert client.post('/api/predict',json=q|change).status_code==422
    assert client.post('/api/compare',json=q|{'model_b':'AdaptiveHybrid'}).status_code==422
    assert client.post('/api/curve',json=q|{'temperature_min':30,'temperature_max':20}).status_code==422
    assert 'image/svg+xml' in client.get('/api/structure/'+q['drug_id']).headers['content-type']
    assert client.get('/').status_code==200


def test_restored_v2_registry():
    r=client.get('/api/models').json()
    assert r['default']=='TabPFN_ExtraTreesBlend'
    assert {m['id'] for m in r['models'] if m['group'].startswith('SOLAR controls')}=={'AdaptiveHybrid','InteractionConditional'}
    scores={m['id']:m['metrics']['parent_macro_MAE'] for m in r['models']}
    assert np.isclose(scores['AdaptiveHybrid'],0.7164050568926572)
    assert np.isclose(scores['ExtraTrees'],0.7469181701937112)


def test_fusion_inference_and_report_metrics():
    import json
    import pandas as pd
    from src.data import ROOT
    from webapp.server import MAIN_MODEL
    registry=client.get('/api/models').json()
    assert registry['default']==MAIN_MODEL
    assert registry['comparator']=='AdaptiveHybrid'
    report=pd.read_csv(ROOT/'output/combination_v3/all_nested_comparison.csv').set_index('model')
    record=next(m for m in registry['models'] if m['id']==MAIN_MODEL)
    for k in ['MAE','RMSE','R2','parent_macro_MAE']:
        assert np.isclose(record['metrics'][k],report.loc[MAIN_MODEL,k],atol=1e-12)
    q=sample()|{'model_id':MAIN_MODEL}
    r=client.post('/api/predict',json=q);assert r.status_code==200,r.text
    r=r.json();model,meta=get_model(MAIN_MODEL)
    frame=pd.DataFrame({'Drug SMILES':[lookup('Drug',q['drug_id'])['smiles']],'Solvent SMILES':[lookup('Solvent',q['solvent_id'])['smiles']],'Temperature':[25.]})
    assert np.isclose(r['log_solubility'],model.predict(frame)[0])
    assert 'base' not in r and 'temperature_component' not in r
    assert np.isclose(sum(v['contributions'][0] for v in r['components'].values()),r['log_solubility'])
    assert {k:v['weight'] for k,v in r['components'].items()}==meta['weights']
    comp=client.post('/api/compare',json=q|{'model_b':'AdaptiveHybrid','temperature_min':10.,'temperature_max':40.})
    assert comp.status_code==200,comp.text
    comp=comp.json();assert len(comp['group_errors']['ids'])==128
    assert np.isclose(comp['metrics_a']['parent_macro_MAE'],report.loc[MAIN_MODEL,'parent_macro_MAE'])
    assert len(comp['curve_a']['lines'][0]['values'])==61
    batch=client.post('/api/batch',json={'model_id':MAIN_MODEL,'rows':[sample(),sample()|{'temperature':'bad'}]})
    assert batch.status_code==200 and batch.json()['success_count']==1 and batch.json()['error_count']==1


def test_molecule_screen_and_diagnostics():
    q=sample()
    mol=client.get('/api/molecule/'+q['drug_id'])
    assert mol.status_code==200,mol.text
    mb=mol.json()
    assert mb['formula']=='C8H10N4O2'
    assert 'MolWt' in mb['properties'] and 'MolLogP' in mb['properties']
    assert client.get('/api/molecule/D999999').status_code==422

    scr=client.post('/api/screen',json={'model_id':'ExtraTrees','drug_id':q['drug_id'],'temperature':25.})
    assert scr.status_code==200,scr.text
    sb=scr.json()
    assert len(sb['results'])==49
    vals=[x['log_solubility'] for x in sb['results']]
    assert vals==sorted(vals,reverse=True)
    match=next(x for x in sb['results'] if x['solvent_id']==q['solvent_id'])
    direct=client.post('/api/predict',json=q|{'model_id':'ExtraTrees'}).json()
    assert np.isclose(match['log_solubility'],direct['log_solubility'])

    diag=client.get('/api/model_diagnostics/ExtraTrees')
    assert diag.status_code==200,diag.text
    db=diag.json()
    assert db['n_parents']==128
    assert len(db['residual_histogram'])==15
    assert len(db['scatter'])>0
    assert client.get('/api/model_diagnostics/missing').status_code==422
