"""Revision v2: nested group evaluation; training only, no plotting."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import argparse,json,time,hashlib
from datetime import datetime,timezone
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import GroupKFold,ParameterSampler
from src.data import ROOT,load_data,development_splits
from src.paths import model_path, normalize_frozen
from src.features import featurize_pairs
from src.models.registry import create_model
from src.metrics import regression_metrics
OUT=ROOT/'output/revision_v2'
NAMES=['Dummy','Ridge','RandomForest','ExtraTrees','HistGradientBoosting','TabM','RealMLP','PlainMLP','TemperatureMLP','HybridConditional','InteractionConditional']
CUSTOM={'PlainMLP','TemperatureMLP','HybridConditional','InteractionConditional'}
SEEDS=[2026,17,42]
def dump(p,obj):
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,indent=2,ensure_ascii=False,default=lambda o:o.item() if isinstance(o,np.generic) else str(o))+'\n')
def matrix(df):return featurize_pairs(df['Drug SMILES'],df['Solvent SMILES'],df.Temperature)
def fit(name,params,seed,x,y,df):
    m=create_model(name,seed,params);kw={'groups':df.parent.to_numpy(),'pairs':df.pair.to_numpy()} if name in CUSTOM else {}
    t=time.perf_counter();m.fit(x,y,**kw);return m,time.perf_counter()-t

def candidates(name):
    spaces={
      'Ridge':{'alpha':list(np.logspace(-3,4,12))},
      'RandomForest':{'n_estimators':[200],'max_depth':[8,16,None],'min_samples_leaf':[1,2,4,8],'max_features':[.7,1.]},
      'ExtraTrees':{'n_estimators':[200],'max_depth':[8,16,None],'min_samples_leaf':[1,2,4,8],'max_features':[.7,1.]},
      'HistGradientBoosting':{'max_iter':[200],'max_leaf_nodes':[7,15,31],'learning_rate':[.03,.07],'l2_regularization':[.1,1.,10.]},
      'TabM':{'epochs':[120],'d_block':[64,128],'dropout':[0.,.1,.2],'learning_rate':[.001,.003]},
      'RealMLP':{'epochs':[128],'hidden_width':[64,96,128,192],'n_hidden_layers':[1,2,3]},
      'HybridConditional':{'alpha':[1.,10.,100.,1000.],'max_depth':[8,16,None],'min_samples_leaf':[1,2],'n_estimators':[200]},
      'PlainMLP':{'width':[32,64,128],'lr':[.001,.003],'weight_decay':[.001,.01],'epochs':[160]},
      'TemperatureMLP':{'width':[32,64],'lr':[.001,.003],'delta_weight':[.1,1.,3.],'epochs':[160]},
      'InteractionConditional':{'width':[32,64],'lr':[.001,.003],'delta_weight':[.1,1.,3.],'epochs':[160]},
    }
    return [{}] if name=='Dummy' else list(ParameterSampler(spaces[name],n_iter=12,random_state=2026))

def tune(name,x,y,df,directory):
    directory.mkdir(parents=True,exist_ok=True);choices=candidates(name);dump(directory/'candidates.json',choices)
    folds=list(GroupKFold(3,shuffle=True,random_state=2026).split(x,y,df.parent));results=[]
    for j,params in enumerate(choices):
        p=directory/f'candidate_{j:02}.json'
        if p.exists():r=json.loads(p.read_text());assert r['params']==params
        else:
            pred=np.full(len(y),np.nan);times=[]
            for tr,va in folds:
                assert not set(df.iloc[tr].parent)&set(df.iloc[va].parent)
                m,sec=fit(name,params,2026,x[tr],y[tr],df.iloc[tr]);pred[va]=m.predict(x[va]);times.append(sec)
            r={'params':params,'candidate':j,'seconds':sum(times),**regression_metrics(y,pred,df.parent)};dump(p,r)
        results.append(r)
    best=min(results,key=lambda z:z['parent_macro_MAE']);dump(directory/'selected.json',best);return best['params']

def nested(name,df):
    x=matrix(df);y=df.Solubility_log10.to_numpy();folder=OUT/'nested'/name
    for fold,(tr,va) in enumerate(development_splits(df),1):
        dest=folder/f'fold_{fold}';params=tune(name,x[tr],y[tr],df.iloc[tr],dest/'search')
        for seed in SEEDS:
            p=dest/f'predictions_{seed}.csv'
            if p.exists():continue
            m,sec=fit(name,params,seed,x[tr],y[tr],df.iloc[tr]);start=time.perf_counter();pred=m.predict(x[va]);latency=(time.perf_counter()-start)/len(va)*1000
            result=pd.DataFrame({'data_row':df.iloc[va].data_row,'parent_id':df.iloc[va].parent_group_id,'fold':fold,'seed':seed,'y':y[va],'prediction':pred})
            result.to_csv(p,index=False)
            dump(dest/f'metrics_{seed}.json',{'fit_seconds':sec,'inference_ms_per_row':latency,**regression_metrics(y[va],pred,df.iloc[va].parent),'params':params,'training':getattr(m,'training_metadata_',{}),'loss':getattr(m,'loss_curve_',[])})
            print(f'NESTED {name} fold={fold} seed={seed} MAE={np.abs(pred-y[va]).mean():.4f}',flush=True)
    allp=pd.concat([pd.read_csv(p) for p in sorted(folder.glob('fold_*/predictions_*.csv'))]);allp.to_csv(folder/'predictions.csv',index=False)
    per=[regression_metrics(a.y,a.prediction,a.parent_id) for _,a in allp.groupby('seed')]
    result={'model':name,**{k:float(np.mean([r[k] for r in per])) for k in per[0]},'seed_metrics':per}
    meta=[json.loads(p.read_text()) for p in folder.glob('fold_*/metrics_*.json')];result['fit_seconds']=float(np.mean([a['fit_seconds'] for a in meta]));result['inference_ms_per_row']=float(np.mean([a['inference_ms_per_row'] for a in meta]));dump(folder/'summary.json',result)

def final(name,dev,test):
    x=matrix(dev);y=dev.Solubility_log10.to_numpy();folder=OUT/'deployment'/name
    if (folder/'metadata.json').exists() and model_path(folder/'model.joblib').exists():return
    params=tune(name,x,y,dev,OUT/'full_development_search'/name)
    dump(OUT/'full_development_search'/name/'frozen.json',{'at':datetime.now(timezone.utc).isoformat(),'params':params,'selection':'3-fold development group CV'})
    m,sec=fit(name,params,2026,x,y,dev);folder.mkdir(parents=True,exist_ok=True);joblib.dump(m,model_path(folder/'model.joblib', create=True),compress=3)
    p=m.predict(matrix(test));pd.DataFrame({'data_row':test.data_row,'parent_id':test.parent_group_id,'y':test.Solubility_log10,'prediction':p}).to_csv(folder/'historical_predictions.csv',index=False)
    meta={'model':name,'params':params,'training_rows':len(dev),'seed':2026,'fit_seconds':sec,'representation':'descriptors','model_sha256':hashlib.sha256(model_path(folder/'model.joblib').read_bytes()).hexdigest(),'historical_test':regression_metrics(test.Solubility_log10,p,test.parent),'nested_metrics':json.loads((OUT/'nested'/name/'summary.json').read_text()),'training_metadata':getattr(m,'training_metadata_',{})}
    dump(folder/'metadata.json',meta);print('DEPLOYED',name,flush=True)

def collect():
    rr=[json.loads(p.read_text()) for p in (OUT/'nested').glob('*/summary.json')]
    if rr:pd.DataFrame([{k:v for k,v in r.items() if k!='seed_metrics'} for r in rr]).sort_values('parent_macro_MAE').to_csv(OUT/'comparison.csv',index=False)

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--models',nargs='+',default=NAMES);a.add_argument('--stage',choices=['all','nested','final'],default='all');args=a.parse_args()
    df=load_data();dev=df[df.role.eq('development')].reset_index(drop=True);test=df[df.role.ne('development')].reset_index(drop=True)
    files=list((ROOT/'src/models').glob('*.py'))+[ROOT/'src/features.py',Path(__file__)]
    identity={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files};fp=OUT/'training_code_hashes.json'
    if fp.exists():assert normalize_frozen(json.loads(fp.read_text()))==identity,'Training implementation changed: create a new run version'
    else:dump(fp,identity)
    dump(OUT/'protocol.json',{'outer':'frozen development parent 5-fold','inner':'GroupKFold 3 shuffled seed 2026','seeds':SEEDS,'candidates':12,'rows':len(dev),'groups':dev.parent.nunique(),'model_names':NAMES,'primary':'mean of three seed-specific parent_macro_MAE','historical_test':'397 previously inspected records; secondary evaluation','source_sha256':hashlib.sha256((ROOT/'datasets/data_2026.csv').read_bytes()).hexdigest()})
    for name in args.models:
        if args.stage in ['all','nested']:nested(name,dev);collect()
        if args.stage in ['all','final']:final(name,dev,test)
    collect()
