"""Model-specific immutable artifacts served through one local inference API."""
from pathlib import Path
from functools import lru_cache
import hashlib,json,time
import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI,HTTPException
from fastapi.responses import FileResponse,Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel,Field,model_validator
from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D
from src.data import ROOT,load_data
from src.features import featurize_pairs,canonical
ART=ROOT/'artifacts/revision_v2';STATIC=ROOT/'webapp/static'
DISPLAY={'AdaptiveHybrid':'SOLAR-H / 溶曜混合模型','HybridConditional':'SOLAR-H0 / 固定增益对照','InteractionConditional':'SOLAR-N / 溶曜交互网络','PlainMLP':'MLP / 多层感知机','TemperatureMLP':'MLP + difference / 温度差分MLP','RandomForest':'Random forest / 随机森林','HistGradientBoosting':'HGB / 梯度提升','ExtraTrees':'ExtraTrees / 极端随机树','Ridge':'Ridge / 岭回归','Dummy':'Mean / 均值预测','TabM':'TabM','RealMLP':'RealMLP'}
app=FastAPI(title='Solubility Studio',version='2.0')
app.mount('/static',StaticFiles(directory=STATIC),name='static')
@app.get('/')
def index():return FileResponse(STATIC/'index.html')

@lru_cache(maxsize=1)
def data():
    df=load_data();catalog={}
    for side,prefix in [('Drug','D'),('Solvent','S')]:
        q=df[[side,side+' SMILES']].drop_duplicates().sort_values([side,side+' SMILES']).reset_index(drop=True)
        catalog[side]=[{'id':f'{prefix}{i:03}','name':str(r[side]),'smiles':str(r[side+' SMILES'])} for i,r in q.iterrows()]
    return df,catalog
@app.get('/api/catalog')
def catalog():
    df,c=data();dev=df[df.role.eq('development')]
    return {'drugs':c['Drug'],'solvents':c['Solvent'],'temperature_min':float(dev.Temperature.min()),'temperature_max':float(dev.Temperature.max()),'temperature_scale':'Dataset scale / 数据原始尺度'}
def lookup(side,key):
    for r in data()[1][side]:
        if r['id']==key:return r
    raise HTTPException(422,'Unknown molecule / 未找到分子')
@app.get('/api/structure/{molecule_id}')
def structure(molecule_id:str):
    r=lookup('Drug' if molecule_id.startswith('D') else 'Solvent',molecule_id)
    drawer=rdMolDraw2D.MolDraw2DSVG(420,210);drawer.DrawMolecule(Chem.MolFromSmiles(r['smiles']));drawer.FinishDrawing()
    return Response(drawer.GetDrawingText(),media_type='image/svg+xml')

def model_root(name):return ART

def registry():
    results=[]
    for p in (ART/'deployment').glob('*/metadata.json'):
        m=json.loads(p.read_text());name=m['model']
        group='Proposed / 提出方法' if name in ['AdaptiveHybrid','InteractionConditional'] else ('Neural controls / 神经网络对照' if name in ['TabM','RealMLP','PlainMLP','TemperatureMLP','InteractionConditional'] else 'Classical controls / 传统模型对照')
        results.append({'id':name,'name':DISPLAY.get(name,name),'group':group,'metrics':m['nested_metrics'],'parts':name in ['AdaptiveHybrid','HybridConditional','InteractionConditional'],'version':m['model_sha256'][:12]})
    results.sort(key=lambda r:(0 if r['group'].startswith('Proposed') else 1,r['metrics']['parent_macro_MAE']))
    return results
@app.get('/api/models')
def models():
    r=registry();proposed=[m for m in r if m['group'].startswith('Proposed')];base=[m for m in r if not m['group'].startswith('Proposed')]
    return {'models':r,'default':proposed[0]['id'] if proposed else (r[0]['id'] if r else None),'comparator':min(base,key=lambda m:m['metrics']['parent_macro_MAE'])['id'] if base else None,'protocol':'Nested parent-group cross-validation / 母体分组嵌套交叉验证'}
@lru_cache(maxsize=16)
def bundle(model_id,signature):
    if model_id not in [r['id'] for r in registry()]:raise HTTPException(422,'Unknown model / 未找到模型')
    p=model_root(model_id)/'deployment'/model_id;meta=json.loads((p/'metadata.json').read_text());raw=(p/'model.joblib').read_bytes()
    if hashlib.sha256(raw).hexdigest()!=meta['model_sha256']:raise HTTPException(503,'Model unavailable / 模型暂不可用')
    return joblib.load(p/'model.joblib'),meta

def get_model(name):
    if name not in [r['id'] for r in registry()]:raise HTTPException(422,'Unknown model / 未找到模型')
    return bundle(name,(model_root(name)/'deployment'/name/'model.joblib').stat().st_mtime_ns)
class Input(BaseModel):
    model_id:str
    drug_id:str
    solvent_id:str
    temperature:float=Field(default=25,allow_inf_nan=False,ge=-1000,le=1000)
class Curve(Input):
    temperature_min:float=Field(default=10,allow_inf_nan=False,ge=-1000,le=1000)
    temperature_max:float=Field(default=60,allow_inf_nan=False,ge=-1000,le=1000)
    solvent_ids:list[str]=Field(default_factory=list,max_length=12)
    @model_validator(mode='after')
    def ordered(self):
        if self.temperature_min>=self.temperature_max:raise ValueError('Minimum must be below maximum / 起点须小于终点')
        return self
class Compare(Curve):
    model_b:str
    @model_validator(mode='after')
    def different(self):
        if self.model_id==self.model_b:raise ValueError('Choose two different models / 请选择不同模型')
        return self

def infer(name,drug_id,solvent_ids,temperatures):
    drug=lookup('Drug',drug_id);solvents=[lookup('Solvent',s) for s in solvent_ids]
    m,meta=get_model(name)
    x=featurize_pairs([drug['smiles']]*len(solvents),[s['smiles'] for s in solvents],temperatures,meta.get('representation','descriptors'))
    start=time.perf_counter();p=np.asarray(m.predict(x),float);elapsed=(time.perf_counter()-start)*1000
    if not np.isfinite(p).all():raise HTTPException(503,'Prediction unavailable / 预测暂不可用')
    out={'model_id':name,'version':meta['model_sha256'][:12],'predictions':p.tolist(),'elapsed_ms':elapsed}
    if name in ['AdaptiveHybrid','HybridConditional','InteractionConditional']:
        b,t=m.predict_parts(x);out['base']=np.asarray(b).tolist();out['temperature_component']=np.asarray(t).tolist()
    return out
@app.post('/api/predict')
def predict(q:Input):
    r=infer(q.model_id,q.drug_id,[q.solvent_id],[q.temperature]);v=r['predictions'][0]
    r.update({'drug_id':q.drug_id,'solvent_id':q.solvent_id,'temperature':q.temperature,'log_solubility':v,'concentration':float(10**v) if -300<v<300 else None})
    return r
@app.post('/api/curve')
def curve(q:Curve):
    ts=np.linspace(q.temperature_min,q.temperature_max,61);ss=q.solvent_ids or [q.solvent_id];lines=[]
    for s in ss:
        r=infer(q.model_id,q.drug_id,[s]*61,ts);lines.append({'solvent_id':s,'name':lookup('Solvent',s)['name'],'values':r['predictions']})
    return {'model_id':q.model_id,'temperatures':ts.tolist(),'lines':lines}
def group_errors(name):
    p=pd.read_csv(model_root(name)/'nested'/name/'predictions.csv');p['error']=(p.y-p.prediction).abs()
    return p.groupby('parent_id').error.mean()
@app.post('/api/compare')
def compare(q:Compare):
    a=predict(Input(**q.model_dump()));b=predict(Input(**(q.model_dump()|{'model_id':q.model_b})))
    ca=curve(Curve(**q.model_dump()));cb=curve(Curve(**(q.model_dump()|{'model_id':q.model_b})))
    ea,eb=group_errors(q.model_id),group_errors(q.model_b);joined=pd.concat([ea,eb],axis=1,keys=['a','b']).dropna()
    return {'a':a,'b':b,'difference':b['log_solubility']-a['log_solubility'],'curve_a':ca,'curve_b':cb,'group_errors':{'ids':joined.index.tolist(),'a':joined.a.tolist(),'b':joined.b.tolist()},'metrics_a':get_model(q.model_id)[1]['nested_metrics'],'metrics_b':get_model(q.model_b)[1]['nested_metrics']}
@app.get('/api/health')
def health():return {'status':'ok','models':len(registry())}

