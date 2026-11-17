"""Model-specific immutable artifacts served through one local inference API."""
from pathlib import Path
from functools import lru_cache
import hashlib,json,time
from threading import RLock
import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI,HTTPException
from fastapi.responses import FileResponse,Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel,Field,model_validator,ValidationError
from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D
from src.data import ROOT,load_data
from src.features import featurize_pairs,canonical,drug_parent
ART=ROOT/'artifacts/revision_v2';STATIC=ROOT/'webapp/static'
NEWART=ROOT/'artifacts/combination_v3/tabpfn_nested'
MAIN_MODEL='TabPFN_ExtraTreesBlend'
NEW_MODELS={'TabPFN_ExtraTreesBlend':'TabPFN＋ExtraTrees / 主融合模型','TabPFN_TwoTreeBlend':'TabPFN＋双树 / 融合对照'}
INFERENCE_LOCK=RLock()
DISPLAY={'AdaptiveHybrid':'SOLAR-H / 溶曜混合模型','HybridConditional':'SOLAR-H0 / 固定增益对照','InteractionConditional':'SOLAR-N / 溶曜交互网络','PlainMLP':'MLP / 多层感知机','TemperatureMLP':'MLP + difference / 温度差分MLP','RandomForest':'Random forest / 随机森林','HistGradientBoosting':'HGB / 梯度提升','ExtraTrees':'ExtraTrees / 极端随机树','Ridge':'Ridge / 岭回归','Dummy':'Mean / 均值预测','TabM':'TabM','RealMLP':'RealMLP'}
app=FastAPI(title='Solubility Studio',version='4.0')
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

def model_root(name):return NEWART if name in NEW_MODELS else ART

def artifact_paths(name):
    if name in NEW_MODELS:
        directory=NEWART/'deployment'
        return directory/f'{name}.joblib',directory/f'{name}_metadata.json'
    return ART/'deployment'/name/'model.joblib',ART/'deployment'/name/'metadata.json'

def model_metadata(name):
    _,path=artifact_paths(name)
    meta=json.loads(path.read_text())
    if name in NEW_MODELS:
        meta['nested_metrics']=json.loads((NEWART/'nested'/name/'summary.json').read_text())
    return meta


def registry():
    results=[]
    for p in (ART/'deployment').glob('*/metadata.json'):
        m=json.loads(p.read_text());name=m['model']
        group='SOLAR controls / SOLAR对照' if name in ['AdaptiveHybrid','InteractionConditional'] else ('Neural controls / 神经网络对照' if name in ['TabM','RealMLP','PlainMLP','TemperatureMLP','InteractionConditional'] else 'Classical controls / 传统模型对照')
        results.append({'id':name,'name':DISPLAY.get(name,name),'group':group,'metrics':m['nested_metrics'],'parts':name in ['AdaptiveHybrid','HybridConditional','InteractionConditional'],'version':m['model_sha256'][:12],'params':m.get('params',{}),'temperature_gain':m.get('training_metadata',{}).get('temperature_gain',m.get('params',{}).get('temperature_gain'))})
    for name,display in NEW_MODELS.items():
        m=model_metadata(name)
        results.append({'id':name,'name':display,'group':'Main / 主方法' if name==MAIN_MODEL else 'New controls / 新增融合对照','metrics':m['nested_metrics'],'parts':False,'version':m['model_sha256'][:12],'params':m['params'],'weights':m['weights'],'exploratory':True})
    results.sort(key=lambda r:(0 if r['id']==MAIN_MODEL else 1,r['metrics']['parent_macro_MAE']))
    return results
@app.get('/api/models')
def models():
    return {'models':registry(),'default':MAIN_MODEL,'comparator':'AdaptiveHybrid','protocol':'5 outer × 3 inner parent folds; mean of seed-specific metrics / 母体五折外层、三折内层，先按种子计算再平均'}
@lru_cache(maxsize=16)
def bundle(model_id,signature):
    if model_id not in [r['id'] for r in registry()]:raise HTTPException(422,'Unknown model / 未找到模型')
    path,_=artifact_paths(model_id);meta=model_metadata(model_id);raw=path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=meta['model_sha256']:raise HTTPException(503,'Model unavailable / 模型暂不可用')
    return joblib.load(path),meta

def get_model(name):
    if name not in [r['id'] for r in registry()]:raise HTTPException(422,'Unknown model / 未找到模型')
    return bundle(name,artifact_paths(name)[0].stat().st_mtime_ns)
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
    start=time.perf_counter()
    components=None
    with INFERENCE_LOCK:
        if name in NEW_MODELS:
            x=pd.DataFrame({'Drug SMILES':[drug['smiles']]*len(solvents),'Solvent SMILES':[s['smiles'] for s in solvents],'Temperature':temperatures})
            cp=m.predict_components(x)
            components={key:{'weight':m.weights[key],'predictions':np.asarray(value,float).tolist(),'contributions':(m.weights[key]*np.asarray(value,float)).tolist()} for key,value in cp.items()}
            p=sum(m.weights[key]*np.asarray(value,float) for key,value in cp.items())
        else:
            x=featurize_pairs([drug['smiles']]*len(solvents),[s['smiles'] for s in solvents],temperatures,meta.get('representation','descriptors'))
            p=np.asarray(m.predict(x),float)
    elapsed=(time.perf_counter()-start)*1000
    if not np.isfinite(p).all():raise HTTPException(503,'Prediction unavailable / 预测暂不可用')
    out={'model_id':name,'version':meta['model_sha256'][:12],'predictions':p.tolist(),'elapsed_ms':elapsed}
    if components is not None:out['components']=components
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



@app.get('/api/insights')
def insights():
    """Traceable teaching facts; reserved outcomes are deliberately never exposed."""
    df, catalog = data()
    dev = df[df.role.eq('development')]
    holdout = df[df.role.ne('development')]
    counts, edges = np.histogram(dev.Temperature.to_numpy(float), bins=10)
    source = ROOT / 'datasets/data_2026.csv'
    return {
        'summary': {
            'total_rows': len(df), 'development_rows': len(dev),
            'holdout_rows': len(holdout), 'parent_count': int(df.parent.nunique()),
            'development_parents': int(dev.parent.nunique()),
            'holdout_parents': int(holdout.parent.nunique()),
            'drug_count': int(df.Drug.nunique()), 'drug_count_definition': '药物名称数 / unique drug names',
            'drug_structure_count': int(df['Drug SMILES'].nunique()),
            'solvent_count': int(df.Solvent.nunique()), 'solvent_count_definition': '溶剂名称数 / unique solvent names',
            'pair_count': int(dev.pair.nunique()),
        },
        'temperature': {
            'min': float(dev.Temperature.min()), 'max': float(dev.Temperature.max()),
            'median': float(dev.Temperature.median()),
            'scale': 'Dataset scale / 数据原始尺度',
            'histogram': [{'min': float(a), 'max': float(b), 'count': int(n)}
                          for a, b, n in zip(edges[:-1], edges[1:], counts)],
        },
        'models': registry(),
        'protocol': {
            'name': 'Nested parent-group cross-validation / 母体分组嵌套交叉验证',
            'outer_folds': 5, 'inner_folds': 3, 'seeds': [2026, 17, 42],
            'deployment_seed': 2026, 'primary_metric': 'parent_macro_MAE',
            'parent_overlap': len(set(dev.parent) & set(holdout.parent)),
            'holdout_scored': False,
            'main_model': MAIN_MODEL,
            'selection_note': '主方法为探索性最低分方案；相对原SOLAR-H的母体差值95%区间[-0.1091, 0.0128]跨零。历史保留集未对新模型评分。',
            'metric_note': 'Metrics average the frozen nested evaluations across three seeds; deployment uses seed 2026. / 指标为冻结嵌套评估的三种子平均，部署使用种子2026。',
        },
        'source': {
            'file': 'datasets/data_2026.csv',
            'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'concentration_unit': 'mol/L', 'target': 'log10(solubility / mol L⁻¹)',
            'model_artifacts': 'artifacts/combination_v3/tabpfn_nested/deployment/; artifacts/revision_v2/deployment/',
            'observations_scope': 'development_only',
        },
        'learning_notes': [
            {'id': 'grouping', 'title': 'Why group by parent? / 为什么按母体分组？',
             'text': 'Related forms of one molecule stay in the same fold. Random row splits can leak related structures into validation. / 同母体的分子形式留在同一折，避免随机按行划分造成相关结构泄漏。'},
            {'id': 'macro', 'title': 'Parent MAE / 母体宏平均MAE',
             'text': 'Average absolute errors inside each parent first, then average parents equally. Smaller values are better. / 先求每个母体的平均绝对误差，再对母体等权平均，数值越小越好。'},
            {'id': 'log', 'title': 'Read log₁₀ S / 理解对数溶解度',
             'text': 'A difference of one log unit means a tenfold concentration ratio. / 相差1个对数单位，对应10倍浓度差。'},
            {'id': 'scope', 'title': 'Deployment and evidence / 部署与证据',
             'text': 'Displayed development observations may be part of deployment training. They explain data support, not independent test accuracy or confidence intervals. / 开发集观测可能用于部署训练，仅解释数据支持，不代表独立测试准确率或置信区间。'},
        ],
    }


@app.get('/api/evidence')
def evidence(drug_id: str, solvent_id: str, temperature: float = 25):
    """Return descriptive support using development rows only, never holdout labels."""
    if not np.isfinite(temperature) or not -1000 <= temperature <= 1000:
        raise HTTPException(422, 'Invalid temperature / 温度须为-1000至1000的有限数值')
    drug, solvent = lookup('Drug', drug_id), lookup('Solvent', solvent_id)
    df = data()[0]
    dev = df[df.role.eq('development')]
    dc, sc = canonical(drug['smiles']), canonical(solvent['smiles'])
    pair_key = dc + '|' + sc
    drug_rows = dev[dev['Drug SMILES'].map(canonical).eq(dc)]
    solvent_rows = dev[dev['Solvent SMILES'].map(canonical).eq(sc)]
    pair_rows = dev[dev.pair.eq(pair_key)].sort_values('Temperature')
    parent_seen = bool(dev.parent.eq(drug_parent(drug['smiles'])).any())
    global_in_range = bool(dev.Temperature.min() <= temperature <= dev.Temperature.max())
    pair_in_range = bool(len(pair_rows) and pair_rows.Temperature.min() <= temperature <= pair_rows.Temperature.max())
    notes = []
    if not parent_seen:
        notes.append('Drug parent absent from development data / 开发集中未见该药物母体')
    if not len(solvent_rows):
        notes.append('Solvent absent from development data / 开发集中未见该溶剂')
    if not len(pair_rows):
        notes.append('No observed drug–solvent pair in development data / 开发集中没有该药物–溶剂组合观测')
    if not global_in_range:
        notes.append('Temperature outside the development range / 温度超出开发集范围')
    elif len(pair_rows) and not pair_in_range:
        notes.append('Temperature outside the observed pair range / 温度超出该组合的观测范围')
    status = ('unseen_parent' if not parent_seen else
              'unseen_solvent' if not len(solvent_rows) else
              'temperature_extrapolation' if not global_in_range or (len(pair_rows) and not pair_in_range) else
              'unobserved_pair' if not len(pair_rows) else 'supported')
    return {
        'drug_id': drug_id, 'solvent_id': solvent_id, 'temperature': temperature,
        'observations_scope': 'development_only',
        'observations': [{'temperature': float(r.Temperature), 'log_solubility': float(r.Solubility_log10)}
                         for r in pair_rows.itertuples()],
        'domain': {
            'drug_seen': bool(len(drug_rows)), 'parent_seen': parent_seen,
            'solvent_seen': bool(len(solvent_rows)), 'pair_seen': bool(len(pair_rows)),
            'temperature_in_range': global_in_range, 'pair_temperature_in_range': pair_in_range,
            'status': status, 'notes': notes,
            'interpretation': 'Descriptive data support only; not a calibrated applicability domain or uncertainty estimate. / 仅为描述性数据支持，不是校准后的适用域或不确定度估计。',
        },
        'support': {'drug_rows': len(drug_rows), 'solvent_rows': len(solvent_rows), 'pair_rows': len(pair_rows)},
        'range': {'min': float(pair_rows.Temperature.min()) if len(pair_rows) else None,
                  'max': float(pair_rows.Temperature.max()) if len(pair_rows) else None},
        'development_range': {'min': float(dev.Temperature.min()), 'max': float(dev.Temperature.max())},
        'temperature_scale': 'Dataset scale / 数据原始尺度',
        'note': 'Development observations can be used in deployment training. Do not interpret agreement as independent validation. / 开发集观测可能参与部署训练，预测与观测一致不代表独立验证。',
    }


class BatchInput(BaseModel):
    model_id: str
    rows: list[dict] = Field(min_length=1, max_length=100)


@app.post('/api/batch')
def batch(q: BatchInput):
    """Keep valid rows usable when another CSV row contains an invalid value."""
    if q.model_id not in {r['id'] for r in registry()}:
        raise HTTPException(422, 'Unknown model / 未找到模型')
    results = [None] * len(q.rows)
    groups = {}
    for i, row in enumerate(q.rows):
        try:
            request = Input.model_validate(row | {'model_id': q.model_id})
            lookup('Drug',request.drug_id);lookup('Solvent',request.solvent_id)
            groups.setdefault(request.drug_id,[]).append((i,request))
        except ValidationError as exc:
            fields = ', '.join('.'.join(map(str, error['loc'])) for error in exc.errors())
            results[i]={'row':i+1,'status':'error','error':'Invalid fields / 无效字段: '+fields}
        except HTTPException as exc:
            results[i]={'row':i+1,'status':'error','error':str(exc.detail)}
    for drug_id, requests in groups.items():
        try:
            prediction=infer(q.model_id,drug_id,[r.solvent_id for _,r in requests],[r.temperature for _,r in requests])
            for j,(i,r) in enumerate(requests):
                value=prediction['predictions'][j]
                results[i]={'row':i+1,'status':'ok','model_id':q.model_id,'drug_id':drug_id,
                    'solvent_id':r.solvent_id,'temperature':r.temperature,'version':prediction['version'],
                    'log_solubility':value,'concentration':float(10**value) if -300<value<300 else None}
        except HTTPException as exc:
            for i,r in requests:results[i]={'row':i+1,'status':'error','error':str(exc.detail)}
    successes = sum(r['status'] == 'ok' for r in results)
    return {'model_id': q.model_id, 'results': results, 'success_count': successes,
            'error_count': len(results) - successes, 'temperature_scale': 'Dataset scale / 数据原始尺度'}
