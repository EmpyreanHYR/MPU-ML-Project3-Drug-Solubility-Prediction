"""Training only. Persist predictions/source data; plotting is a separate step."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import argparse,json,time,platform
from datetime import datetime,timezone
from importlib.metadata import version
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import ParameterSampler
from src.data import ROOT,load_data,development_splits
from src.paths import model_path
from src.features import featurize_pairs,feature_names
from src.models.registry import create_model
from src.metrics import regression_metrics,macro_bootstrap

OUT=ROOT/'output';SEED=2026
BASE=['Dummy','Ridge','RandomForest','ExtraTrees','HistGradientBoosting','TabM','RealMLP']
def dump(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x))+'\n')

def matrix(df,representation):
    return featurize_pairs(df['Drug SMILES'].tolist(),df['Solvent SMILES'].tolist(),df.Temperature.tolist(),representation)

def run_cv(exp_id,model_name,representation='descriptors',params=None,protocol='parent_group_primary',drop=None,seed=SEED,weight=False,dedup=False):
    df=load_data()  # Validate immutable source and frozen groups even on cache hits.
    config=dict(exp_id=exp_id,model_name=model_name,representation=representation,params=params or {},protocol=protocol,drop=drop,seed=seed,weight=weight,dedup=dedup)
    folder=OUT/'experiments'/exp_id
    if (folder/'metrics.json').exists():
        assert json.loads((folder/'config.json').read_text())==config,'Experiment ID reused with changed configuration'
        return json.loads((folder/'metrics.json').read_text())
    dump(folder/'config.json',config)
    df=df[df.role.eq('development')].reset_index(drop=True)
    x=matrix(df,representation);names=feature_names(representation)
    keep=np.array([not (drop=='temperature' and n=='Temperature') and not (drop in ['drug','solvent'] and n.startswith(drop+'_')) for n in names])
    x=x[:,keep];y=df.Solubility_log10.to_numpy();pred=np.full(len(y),np.nan)
    fold_metrics=[];records=[];histories=[]
    start=time.perf_counter()
    for fold,(tr,va) in enumerate(development_splits(df,protocol),1):
        if dedup:
            original_cols=['Drug','Solvent','Drug SMILES','Solvent SMILES','Temperature','Solubility_log10','Solubility Unit']
            tr=tr[~df.iloc[tr][original_cols].duplicated().to_numpy()]
        model=create_model(model_name,seed,params)
        kw={}
        if weight:
            counts=df.iloc[tr].parent.value_counts();w=df.iloc[tr].parent.map(lambda z:1/counts[z]).to_numpy();kw['sample_weight']=w/w.mean()
        t=time.perf_counter();model.fit(x[tr],y[tr],**kw);fit_time=time.perf_counter()-t
        pred[va]=model.predict(x[va]);trainpred=model.predict(x[tr])
        fold_metrics.append(dict(fold=fold,train_rows=len(tr),validation_rows=len(va),fit_seconds=fit_time,train_MAE=float(np.abs(y[tr]-trainpred).mean()),**regression_metrics(y[va],pred[va],df.iloc[va].parent)))
        histories.append(dict(fold=fold,training_metadata=getattr(model,'training_metadata_',{}),loss=getattr(model,'loss_curve_',[])))
        print(f'{exp_id} fold {fold}/5 MAE={fold_metrics[-1]["MAE"]:.4f} ({fit_time:.1f}s)',flush=True)
        for j in va:records.append(dict(data_row=int(df.iloc[j].data_row),fold=fold,parent_id=df.iloc[j].parent_group_id,y=float(y[j]),prediction=float(pred[j])))
    assert np.isfinite(pred).all()
    result=dict(**config,**regression_metrics(y,pred,df.parent),macro_MAE_CI95=macro_bootstrap(y,pred,df.parent.to_numpy()),elapsed_seconds=time.perf_counter()-start,n_features=x.shape[1],rows=len(df),score_role='development pooled OOF; model-selection score')
    pd.DataFrame(records).to_csv(folder/'predictions.csv',index=False)
    pd.DataFrame(fold_metrics).to_csv(folder/'fold_metrics.csv',index=False)
    dump(folder/'training_history.json',histories);dump(folder/'metrics.json',result)
    return result

def collect():
    records=[json.loads(p.read_text()) for p in sorted((OUT/'experiments').glob('*/metrics.json'))]
    if records:pd.DataFrame(records).to_csv(OUT/'cv_results.csv',index=False)
    return records

def baseline(names):
    for name in names:run_cv(name+'_base',name)
    collect()

def improvements():
    a=run_cv('ExtraTrees_fp','ExtraTrees','fingerprints')
    b=run_cv('ExtraTrees_combined','ExtraTrees','combined')
    base=run_cv('ExtraTrees_base','ExtraTrees')
    rep=min([a,b,base],key=lambda r:r['parent_macro_MAE'])['representation']
    choices=list(ParameterSampler({'max_depth':[8,16,None],'min_samples_leaf':[1,2,4,8],'max_features':[.5,.8,1.]},n_iter=20,random_state=SEED))
    dump(OUT/'search_space.json',{'representation_selected_on_development':rep,'configs':choices,'n_estimators':300,'selection_metric':'pooled OOF parent_macro_MAE'})
    for i,params in enumerate(choices):run_cv(f'ExtraTrees_tune_{i:02}','ExtraTrees',rep,dict(params,n_estimators=300))
    collect()

def freeze_and_ablations():
    results=collect()
    candidates=[r for r in results if r['protocol']=='parent_group_primary' and r['drop'] is None and not r['weight'] and not r['dedup'] and (r['exp_id'].endswith('_base') or r['exp_id'].startswith('ExtraTrees_'))]
    assert set(BASE)<=set(r['model_name'] for r in candidates),'All planned base models must complete first'
    selected=min(candidates,key=lambda r:r['parent_macro_MAE'])
    freeze={'frozen_at':datetime.now(timezone.utc).isoformat(),'selection_metric':'development pooled OOF parent_macro_MAE','selected':selected,'final_comparators':[n+'_base' for n in BASE], 'holdout_labels_not_used_for_selection':True}
    p=OUT/'selection_frozen.json'
    if p.exists():assert json.loads(p.read_text())['selected']==selected
    else:dump(p,freeze)
    name=selected['model_name'];rep=selected['representation'];params=selected['params']
    for drop in ['temperature','solvent','drug']:run_cv('ablation_no_'+drop,name,rep,params,drop=drop)
    for protocol in ['random_rows_diagnostic','pair_group']:run_cv('protocol_'+protocol,name,rep,params,protocol=protocol)
    for seed in [17,42]:run_cv('sensitivity_seed_'+str(seed),name,rep,params,seed=seed)
    run_cv('sensitivity_dedup_training',name,rep,params,dedup=True)
    # Weighting experiment uses a supported tree estimator, explicitly named.
    tree=min([r for r in candidates if r['model_name']=='ExtraTrees'],key=lambda r:r['parent_macro_MAE'])
    run_cv('sensitivity_ExtraTrees_parent_weight','ExtraTrees',tree['representation'],tree['params'],weight=True)
    collect()

def final_evaluation():
    freeze=json.loads((OUT/'selection_frozen.json').read_text())
    all_df=load_data();dev=all_df[all_df.role.eq('development')].copy();test=all_df[all_df.role.ne('development')].copy()
    configs=[json.loads((OUT/'experiments'/n/'config.json').read_text()) for n in freeze['final_comparators']]
    selected=freeze['selected']
    if selected['exp_id'] not in [c['exp_id'] for c in configs]:configs.append(selected)
    final_records=[]
    for c in configs:
        exp=c['exp_id'];folder=OUT/'final_results'/exp;weight_path=model_path(OUT/'final_models'/f'{exp}.joblib', create=True);weight_path.parent.mkdir(exist_ok=True,parents=True)
        if not (folder/'metrics.json').exists():
            model=create_model(c['model_name'],c['seed'],c['params']);x=matrix(dev,c['representation']);xt=matrix(test,c['representation'])
            start=time.perf_counter();model.fit(x,dev.Solubility_log10.to_numpy());fit_sec=time.perf_counter()-start
            y=test.Solubility_log10.to_numpy();p=model.predict(xt)
            result=dict(exp_id=exp,model_name=c['model_name'],representation=c['representation'],params=c['params'],selected_on_development=(exp==selected['exp_id']),fit_seconds=fit_sec,**regression_metrics(y,p,test.parent),macro_MAE_CI95=macro_bootstrap(y,p,test.parent.to_numpy()),test_rows=len(test),test_parent_groups=test.parent.nunique())
            folder.mkdir(exist_ok=True,parents=True);pd.DataFrame({'data_row':test.data_row,'parent_id':test.parent_group_id,'y':y,'prediction':p}).to_csv(folder/'predictions.csv',index=False)
            joblib.dump(model,weight_path,compress=3)
            dump(folder/'metrics.json',result);dump(folder/'training_metadata.json',getattr(model,'training_metadata_',{}))
            print('FINAL',json.dumps(result),flush=True)
        final_records.append(json.loads((folder/'metrics.json').read_text()))
    pd.DataFrame(final_records).to_csv(OUT/'final_metrics.csv',index=False)
    # Deploy the selected, already evaluated development-trained model. No full-data refit.
    deployment=OUT/'deployment';deployment.mkdir(exist_ok=True)
    import shutil
    shutil.copy2(model_path(OUT/'final_models'/f'{selected["exp_id"]}.joblib'),model_path(deployment/'model.joblib', create=True))
    cols=['Drug','Solvent','Drug SMILES','Solvent SMILES','Temperature','Solubility_log10','data_row','parent_group_id']
    dev[cols].to_csv(deployment/'training_support.csv',index=False)
    dump(deployment/'metadata.json',{'model_name':selected['model_name'],'experiment_id':selected['exp_id'],'representation':selected['representation'],'feature_names':feature_names(selected['representation']),'training_rows':len(dev),'temperature_range':[float(dev.Temperature.min()),float(dev.Temperature.max())],'metrics':next(r for r in final_records if r['exp_id']==selected['exp_id']),'fit_role':'development_only; final holdout not used for fitting','versions':{p:version(p) for p in ['numpy','scikit-learn','rdkit','torch','tabm','pytabkit','streamlit']}})

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('stage',choices=['baselines','improvements','freeze','final','collect']);parser.add_argument('--models',nargs='+',default=BASE);args=parser.parse_args()
    (OUT/'provenance').mkdir(exist_ok=True,parents=True)
    dump(OUT/'provenance/runtime.json',{'python':platform.python_version(),'platform':platform.platform(),'processor':platform.machine(),'versions':{p:version(p) for p in ['numpy','pandas','scikit-learn','rdkit','torch','tabm','pytabkit','shap','statsmodels','streamlit']},'device':'cpu','native_threads':2,'seed':SEED})
    if args.stage=='baselines':baseline(args.models)
    elif args.stage=='improvements':improvements()
    elif args.stage=='freeze':freeze_and_ablations()
    elif args.stage=='final':final_evaluation()
    else:collect()
