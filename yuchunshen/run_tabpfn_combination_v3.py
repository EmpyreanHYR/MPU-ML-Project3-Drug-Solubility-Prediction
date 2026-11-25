"""Second exploratory round: TabPFN-v2 and prespecified inner-OOF blends.

No report, historical holdout, original experiment protocol, or deployment app
is written. The original 5 outer parent folds and 3 inner folds are preserved.
"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import argparse
import hashlib
import json
import os
import time
os.environ.setdefault('OMP_NUM_THREADS', '2')
os.environ.setdefault('OPENBLAS_NUM_THREADS', '2')
os.environ.setdefault('VECLIB_MAXIMUM_THREADS', '2')
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
from src.data import ROOT, load_data, development_splits
from src.paths import normalize_frozen
from src.metrics import regression_metrics
from src.experimental_tabpfn_v3.adapter import FrameTabPFNRegressor, CHECKPOINT_SHA256
from run_combination_nested import choose_weights

FIRST = ROOT/'output/combination_v3'
OUT = FIRST/'tabpfn_nested'
SEEDS = [2026,17,42]
CATALOG = [dict(representation=rep,n_estimators=n) for rep in ['small','full'] for n in [2,4]]
VARIANTS = {
    'TabPFN_TwoTreeBlend':['TabPFN','RichExtraTrees','RichCatBoost'],
    'TabPFN_ExtraTreesBlend':['TabPFN','RichExtraTrees'],
    'TabPFN_CatBoostBlend':['TabPFN','RichCatBoost'],
    'TabPFN_FiveViewBlend':['TabPFN','RichExtraTrees','RichCatBoost','MultiViewKernel','TabM'],
}


def dump(path, value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2,
                              default=lambda v:v.item() if isinstance(v,np.generic) else str(v))+'\n')


def development():
    frame=load_data()
    return frame[frame.role.eq('development')].reset_index(drop=True)


def freeze():
    df=development()
    sources=[Path(__file__), ROOT/'src/experimental_tabpfn_v3/adapter.py',
             ROOT/'src/experimental_v3/tree_models.py', ROOT/'scripts/run_combination_nested.py']
    hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    reused=[FIRST/'protocol.json']
    for folder in (FIRST/'nested').iterdir():
        if folder.name in ['RichExtraTrees','RichCatBoost','MultiViewKernel','TabM']:
            reused.extend(folder.glob('fold_*/search/selected.json'))
            reused.extend(folder.glob('fold_*/search/predictions_*.csv'))
            reused.extend(folder.glob('fold_*/predictions_*.csv'))
    reused_hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in reused}
    protocol=dict(stage='Second-round exploration after first-round outer results and two TabPFN representation pilots; not confirmatory',
                  primary='TabPFN_TwoTreeBlend; mean of three seed-specific pooled outer OOF parent_macro_MAE',
                  model='Original public TabPFN-v2 checkpoint from Nature 2025; local inference',
                  checkpoint_sha256=CHECKPOINT_SHA256, catalog=CATALOG,
                  output_type='mean, fixed from development 3-fold pilot; not tuned on outer validation',
                  outer='original frozen development parent 5-fold',inner='GroupKFold(3,shuffle=True,random_state=2026)',
                  rows=len(df),groups=df.parent.nunique(),seeds=SEEDS,
                  selection_seed=2026,variants=VARIANTS,
                  weighting='TabPFN native ICL has no sample_weight; selection and blending minimize parent macro MAE',
                  blend='nonnegative sum-to-one grid step .25; weights chosen exclusively from aligned inner OOF',
                  holdout_used=False,report_modified=False,telemetry_disabled=True,
                  code_sha256=hashes,reused_input_sha256=reused_hashes)
    path=OUT/'protocol.json'
    if path.exists():
        assert normalize_frozen(json.loads(path.read_text()))==protocol, 'Second-round frozen inputs/code changed'
    else:dump(path,protocol)
    print('SECOND-ROUND PROTOCOL FROZEN',flush=True)


def tune(df,dest):
    y=df.Solubility_log10.to_numpy()
    folds=list(GroupKFold(3,shuffle=True,random_state=2026).split(df,y,df.parent))
    records=[]
    for cid,params in enumerate(CATALOG):
        path=dest/f'candidate_{cid:02}.json'; pp=dest/f'predictions_{cid:02}.csv'
        if path.exists():
            record=json.loads(path.read_text());assert record['params']==params and pp.exists()
        else:
            pred=np.full(len(df),np.nan);assigned=np.full(len(df),-1);start=time.perf_counter()
            for fold,(tr,va) in enumerate(folds,1):
                assert not set(df.iloc[tr].parent)&set(df.iloc[va].parent)
                foldpath=dest/f'candidate_{cid:02}_fold_{fold}.csv'
                if foldpath.exists():
                    existing=pd.read_csv(foldpath);assert np.array_equal(existing.data_row,df.iloc[va].data_row)
                    pred[va]=existing.prediction.to_numpy()
                else:
                    print(f'INNER start candidate={cid} {params} fold={fold} rows={len(tr)}/{len(va)}',flush=True)
                    m=FrameTabPFNRegressor(seed=2026,**params).fit(df.iloc[tr],y[tr],groups=df.iloc[tr].parent)
                    pred[va]=m.predict(df.iloc[va]);m.release()
                    foldpath.parent.mkdir(parents=True,exist_ok=True)
                    pd.DataFrame(dict(data_row=df.iloc[va].data_row,prediction=pred[va])).to_csv(foldpath,index=False)
                assigned[va]=fold
            assert np.isfinite(pred).all()
            record=dict(params=params,candidate=cid,seconds=time.perf_counter()-start,
                        **regression_metrics(y,pred,df.parent))
            pd.DataFrame(dict(data_row=df.data_row,parent_id=df.parent_group_id,inner_fold=assigned,
                              y=y,prediction=pred)).to_csv(pp,index=False)
            dump(path,record)
            print('INNER COMPLETE '+json.dumps(record),flush=True)
        records.append(record)
    best=min(records,key=lambda r:r['parent_macro_MAE'])
    dump(dest/'selected.json',best)
    return best['params'],pd.read_csv(dest/f"predictions_{best['candidate']:02}.csv")


def nested():
    freeze();df=development();y=df.Solubility_log10.to_numpy()
    for fold,(tr,va) in enumerate(development_splits(df),1):
        dest=OUT/'nested/TabPFN'/f'fold_{fold}'
        params,_=tune(df.iloc[tr].reset_index(drop=True),dest/'search')
        for seed in SEEDS:
            path=dest/f'predictions_{seed}.csv'
            if path.exists():continue
            start=time.perf_counter()
            m=FrameTabPFNRegressor(seed=seed,**params).fit(df.iloc[tr],y[tr],groups=df.iloc[tr].parent)
            pred=m.predict(df.iloc[va]);m.release()
            assert np.isfinite(pred).all()
            pd.DataFrame(dict(data_row=df.iloc[va].data_row,parent_id=df.iloc[va].parent_group_id,
                              fold=fold,seed=seed,y=y[va],prediction=pred)).to_csv(path,index=False)
            result=dict(params=params,seconds=time.perf_counter()-start,**regression_metrics(y[va],pred,df.iloc[va].parent))
            dump(dest/f'metrics_{seed}.json',result)
            print(f'OUTER fold={fold} seed={seed} '+json.dumps(result),flush=True)


def blend():
    freeze();df=development()
    for fold,(tr,va) in enumerate(development_splits(df),1):
        names=['TabPFN','RichExtraTrees','RichCatBoost','MultiViewKernel','TabM'];inner={}
        for name in names:
            base=OUT if name=='TabPFN' else FIRST
            search=base/'nested'/name/f'fold_{fold}/search'
            selected=json.loads((search/'selected.json').read_text())
            p=pd.read_csv(search/f"predictions_{selected['candidate']:02}.csv")
            assert np.array_equal(p.data_row,df.iloc[tr].data_row)
            inner[name]=p.prediction.to_numpy()
        for vname,subset in VARIANTS.items():
            score,weights=choose_weights(np.column_stack([inner[n] for n in subset]),
                                         df.iloc[tr].Solubility_log10.to_numpy(),df.iloc[tr].parent.to_numpy())
            dest=OUT/'nested'/vname/f'fold_{fold}'
            dump(dest/'weights.json',dict(families=subset,weights=dict(zip(subset,weights.tolist())),
                                         inner_parent_macro_MAE=score,outer_validation_used=False))
            for seed in SEEDS:
                ps=[]
                for name in subset:
                    base=OUT if name=='TabPFN' else FIRST
                    p=pd.read_csv(base/'nested'/name/f'fold_{fold}'/f'predictions_{seed}.csv')
                    assert np.array_equal(p.data_row,df.iloc[va].data_row)
                    ps.append(p.prediction.to_numpy())
                pred=np.column_stack(ps)@weights
                pd.DataFrame(dict(data_row=df.iloc[va].data_row,parent_id=df.iloc[va].parent_group_id,
                                  fold=fold,seed=seed,y=df.iloc[va].Solubility_log10,prediction=pred)).to_csv(dest/f'predictions_{seed}.csv',index=False)
    print('SECOND-ROUND BLENDS COMPLETE',flush=True)


def collect():
    rows=[]
    for folder in sorted((OUT/'nested').iterdir()):
        paths=sorted(folder.glob('fold_*/predictions_*.csv'))
        if len(paths)!=15:continue
        p=pd.concat([pd.read_csv(path) for path in paths],ignore_index=True)
        p.to_csv(folder/'predictions.csv',index=False)
        sm=[dict(seed=int(seed),**regression_metrics(a.y,a.prediction,a.parent_id)) for seed,a in p.groupby('seed')]
        result=dict(model=folder.name,**{key:float(np.mean([r[key] for r in sm])) for key in ['MAE','RMSE','R2','parent_macro_MAE']},seed_metrics=sm)
        dump(folder/'summary.json',result);rows.append({k:v for k,v in result.items() if k!='seed_metrics'})
    if rows:
        table=pd.DataFrame(rows).sort_values('parent_macro_MAE')
        table.to_csv(OUT/'comparison.csv',index=False);print(table.to_string(index=False),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('stage',choices=['freeze','nested','blend','collect','all'])
    args=parser.parse_args()
    if args.stage=='all':
        nested();blend();collect()
    else:globals()[args.stage]()
