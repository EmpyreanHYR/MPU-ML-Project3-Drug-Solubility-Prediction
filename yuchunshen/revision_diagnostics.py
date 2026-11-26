"""Training diagnostics with frozen outer-fold configurations; never select on outer scores."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
sys.path.insert(0,str(Path(__file__).resolve().parent))
import argparse,json,time
import numpy as np
import pandas as pd
from run_revision import OUT,load_data,matrix,fit,dump,development_splits,SEEDS
from src.metrics import regression_metrics

def evaluate(tag,name,changes,df,fraction=1.):
    folder=OUT/'diagnostics'/tag;folder.mkdir(parents=True,exist_ok=True);x=matrix(df);y=df.Solubility_log10.to_numpy()
    for fold,(tr,va) in enumerate(development_splits(df),1):
        params=json.loads((OUT/'nested'/name/f'fold_{fold}/search/selected.json').read_text())['params']|changes
        for seed in SEEDS:
            p=folder/f'fold_{fold}_{seed}.csv'
            if p.exists():continue
            tt=tr
            if fraction<1:
                rng=np.random.default_rng(seed);groups=df.iloc[tr].parent.unique();keep=rng.choice(groups,max(3,int(len(groups)*fraction)),replace=False);tt=tr[df.iloc[tr].parent.isin(keep).to_numpy()]
            m,sec=fit(name,params,seed,x[tt],y[tt],df.iloc[tt]);pred=m.predict(x[va])
            pd.DataFrame({'data_row':df.iloc[va].data_row,'parent_id':df.iloc[va].parent_group_id,'fold':fold,'seed':seed,'y':y[va],'prediction':pred}).to_csv(p,index=False)
    allp=pd.concat([pd.read_csv(p) for p in folder.glob('fold_*.csv')]);allp.to_csv(folder/'predictions.csv',index=False)
    mm=[regression_metrics(a.y,a.prediction,a.parent_id) for _,a in allp.groupby('seed')]
    result={'tag':tag,'model':name,'changes':changes,'fraction':fraction,**{k:float(np.mean([r[k] for r in mm])) for k in mm[0]}};dump(folder/'summary.json',result);print('DIAGNOSTIC',tag,round(result['parent_macro_MAE'],4),flush=True)
if __name__=='__main__':
    df=load_data();df=df[df.role.eq('development')].reset_index(drop=True)
    for name in ['HybridConditional','InteractionConditional']:
        for key in ['balanced','interaction','temperature']:evaluate(name+'_no_'+key,name,{key:False},df)
    evaluate('InteractionConditional_no_difference','InteractionConditional',{'delta_weight':0.},df)
    evaluate('PlainMLP_balanced','PlainMLP',{'balanced':True},df)
    for name in ['HybridConditional','InteractionConditional']:
        for frac in [.25,.5,.75]:evaluate(name+'_fraction_'+str(frac),name,{},df,frac)
    for val in [.01,.1,1.,10.]:evaluate('InteractionConditional_delta_'+str(val),'InteractionConditional',{'delta_weight':val},df)
    for val in [32,64,128]:evaluate('InteractionConditional_width_'+str(val),'InteractionConditional',{'width':val},df)
    for val in [1.,10.,100.,1000.]:evaluate('HybridConditional_alpha_'+str(val),'HybridConditional',{'alpha':val},df)
    rr=[json.loads(p.read_text()) for p in (OUT/'diagnostics').glob('*/summary.json')];pd.DataFrame(rr).to_csv(OUT/'diagnostics.csv',index=False)
