"""Evidence tables and explanations for revision v2; no plotting or fitting predictors."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import json
import numpy as np
import pandas as pd
import joblib
from scipy.optimize import brentq
from rdkit import DataStructs
from src.data import ROOT,load_data,development_splits
from src.paths import model_path
from src.features import featurize_pairs,feature_names,FP,molecule
from src.metrics import regression_metrics
OUT=ROOT/'output/revision_v2';A=OUT/'analysis';A.mkdir(exist_ok=True)
def dump(name,x):(A/name).write_text(json.dumps(x,ensure_ascii=False,indent=2,default=lambda o:o.item() if isinstance(o,np.generic) else str(o))+'\n')
def boot(x):
    x=np.asarray(x);b=np.random.default_rng(2026).choice(x,(2000,len(x)),replace=True).mean(axis=1)
    return [float(x.mean()),*np.quantile(b,[.025,.975]).tolist()]
def readpred(name):return pd.read_csv(OUT/'nested'/name/'predictions.csv')
def errors(p):return p.assign(ae=(p.y-p.prediction).abs()).groupby('parent_id').ae.mean()
def xmatrix(df):return featurize_pairs(df['Drug SMILES'],df['Solvent SMILES'],df.Temperature)
def main():
    df=load_data();dev=df[df.role.eq('development')].reset_index(drop=True);test=df[df.role.ne('development')].reset_index(drop=True)
    table=pd.read_csv(OUT/'comparison.csv');assert len(table)==12
    proposed=table[table.model.isin(['AdaptiveHybrid','HybridConditional','InteractionConditional'])].sort_values('parent_macro_MAE').iloc[0].model
    baseline=table[~table.model.isin(['AdaptiveHybrid','HybridConditional','InteractionConditional'])].sort_values('parent_macro_MAE').iloc[0].model
    groups=[];comparisons=[]
    for name in table.model:
        e=errors(readpred(name));ci=boot(e)
        for g,v in e.items():groups.append({'model':name,'parent_id':g,'MAE':v})
        comparisons.append({'model':name,'mean':ci[0],'lower':ci[1],'upper':ci[2]})
    pd.DataFrame(groups).to_csv(A/'parent_errors.csv',index=False);pd.DataFrame(comparisons).to_csv(A/'comparison_intervals.csv',index=False)
    ep,eb=errors(readpred(proposed)),errors(readpred(baseline));delta=ep-eb
    selection={'proposed':proposed,'baseline':baseline,'relative_improvement':float((eb.mean()-ep.mean())/eb.mean()),'paired_delta':boot(delta),'parents_improved':int((delta<0).sum()),'parents':len(delta),'scope':'nested development predictions; parent-level conditional bootstrap; seeds averaged within each parent'};dump('selection.json',selection)
    abl=[]
    for p in (OUT/'diagnostics').glob('*/summary.json'):
        r=json.loads(p.read_text());v=pd.read_csv(p.parent/'predictions.csv');d=errors(v)-errors(readpred(r['model']));b=boot(d)
        abl.append(r|{'delta':b[0],'lower':b[1],'upper':b[2]})
    pd.DataFrame(abl).to_csv(A/'diagnostics.csv',index=False)
    # Row-level error average over training seeds, not the error of a seed ensemble.
    p=readpred(proposed);p['absolute_error']=(p.y-p.prediction).abs();p['residual']=p.prediction-p.y
    row=p.groupby('data_row').agg(prediction=('prediction','mean'),absolute_error=('absolute_error','mean'),residual=('residual','mean'),seed_sd=('prediction','std')).reset_index()
    row=dev.merge(row,on='data_row');fps={s:FP.GetFingerprint(molecule(s)) for s in dev['Drug SMILES'].unique()};similarity={}
    for tr,va in development_splits(dev):
        train=[fps[s] for s in dev.iloc[tr]['Drug SMILES'].unique()]
        for s in dev.iloc[va]['Drug SMILES'].unique():similarity[s]=max(DataStructs.BulkTanimotoSimilarity(fps[s],train))
    row['max_train_similarity']=row['Drug SMILES'].map(similarity)
    row.to_csv(A/'oof_errors.csv',index=False)
    desc=pd.DataFrame(xmatrix(dev),columns=feature_names());desc['target']=dev.Solubility_log10.to_numpy();desc.corr(method='spearman').to_csv(A/'descriptor_spearman.csv')
    dev[['data_row','Drug','Solvent','Temperature','Solubility_log10','parent_group_id','pair']].to_csv(A/'development_eda.csv',index=False)
    # Explanations of the actual two proposed models on the same historical holdout.
    xt=xmatrix(test);y=test.Solubility_log10.to_numpy();perms=[];metadata={};rng=np.random.default_rng(2026)
    for name in ['AdaptiveHybrid','InteractionConditional']:
        m=joblib.load(model_path(OUT/'deployment'/name/'model.joblib'));pred=m.predict(xt);base,temp=m.predict_parts(xt)
        pd.DataFrame({'data_row':test.data_row,'target':y,'prediction':pred,'base':base,'temperature_component':temp}).to_csv(A/(name+'_parts.csv'),index=False)
        reference=regression_metrics(y,pred,test.parent)['parent_macro_MAE']
        for key,cols in [('Drug',range(11)),('Solvent',range(11,22)),('Temperature',[22])]:
            for repeat in range(20):
                xx=xt.copy();xx[:,cols]=xt[rng.permutation(len(xt))][:,cols]
                d=regression_metrics(y,m.predict(xx),test.parent)['parent_macro_MAE']-reference
                perms.append({'model':name,'feature_group':key,'repeat':repeat,'delta':d})
        if name=='AdaptiveHybrid':
            import shap
            from src.models.conditional_common import interactions
            zz=interactions(m.transform_.x(xt),m.interaction);names=feature_names()[:22]
            if m.interaction:names+=['product_'+n for n in list(__import__('src.features',fromlist=['DESCRIPTORS']).DESCRIPTORS)]+['difference_'+n for n in list(__import__('src.features',fromlist=['DESCRIPTORS']).DESCRIPTORS)]
            explainer=shap.TreeExplainer(m.base_);sv=np.asarray(explainer.shap_values(zz));expected=float(np.asarray(explainer.expected_value).ravel()[0]);err=float(np.max(np.abs(sv.sum(axis=1)+expected-base)))
            assert err<1e-5
            pd.DataFrame(sv,columns=names).to_csv(A/'hybrid_shap.csv',index=False);pd.DataFrame(zz,columns=names).to_csv(A/'hybrid_shap_features.csv',index=False)
            metadata['hybrid']={'model':name,'expected_value':expected,'max_additivity_error':err,'explained_component':'structural tree baseline; temperature head reported separately','rows':len(test)}
        else:
            import torch
            xx=torch.tensor(m.transform_.x(xt));acc=torch.zeros_like(xx);m.model_.eval()
            for j,a in enumerate(np.linspace(0,1,1025)):
                q=(xx*float(a)).requires_grad_(True);grad=torch.autograd.grad(m.model_(q).sum(),q)[0];acc+=grad*(.5 if j in [0,1024] else 1.)
            ig=(xx*acc/1024).detach().numpy()*m.transform_.ys
            with torch.no_grad():expected=float(m.model_(torch.zeros((1,23))).item()*m.transform_.ys+m.transform_.ym)
            err=float(np.max(np.abs(ig.sum(axis=1)+expected-pred)))
            pd.DataFrame(ig,columns=feature_names()).to_csv(A/'neural_integrated_gradients.csv',index=False)
            metadata['neural']={'expected_value':expected,'max_completeness_error':err,'integration_steps':1024,'baseline':'zero standardized descriptors and centered temperature','rows':len(test)}
    pd.DataFrame(perms).to_csv(A/'permutation.csv',index=False);dump('explanations.json',metadata)
    # Response curves from three well-covered development pairs; observations kept separate.
    curves=[];obs=[]
    counts=dev.groupby('pair').Temperature.nunique().sort_values(ascending=False)
    for number,pair in enumerate(counts.index[:3],1):
        c=dev[dev.pair.eq(pair)];r=c.iloc[0];ts=np.linspace(c.Temperature.min(),c.Temperature.max(),61)
        xx=featurize_pairs([r['Drug SMILES']]*61,[r['Solvent SMILES']]*61,ts)
        for name in ['AdaptiveHybrid','InteractionConditional',baseline]:
            model=joblib.load(model_path(OUT/'deployment'/name/'model.joblib'))
            for t,v in zip(ts,model.predict(xx)):curves.append({'pair_number':number,'Drug':r.Drug,'Solvent':r.Solvent,'model':name,'Temperature':t,'prediction':v})
        for _,r in c.iterrows():obs.append({'pair_number':number,'Temperature':r.Temperature,'target':r.Solubility_log10})
    pd.DataFrame(curves).to_csv(A/'response_curves.csv',index=False);pd.DataFrame(obs).to_csv(A/'response_observations.csv',index=False)
    # Fixed-effects association and omitted-variable point-estimate sensitivity.
    d=dev.copy();d['dt']=d.Temperature-d.groupby('pair').Temperature.transform('mean');d['dy']=d.Solubility_log10-d.groupby('pair').Solubility_log10.transform('mean');d=d[d.groupby('pair').Temperature.transform('nunique')>1].copy()
    beta=float(np.dot(d.dt,d.dy)/np.dot(d.dt,d.dt));resid=d.dy-beta*d.dt;dof=len(d)-d.pair.nunique()-1;se=float(np.sqrt(np.dot(resid,resid)/dof/np.dot(d.dt,d.dt)))
    equal=brentq(lambda r:se*np.sqrt(dof*r*r/(1-r))-abs(beta),1e-9,.999)
    grid=[]
    for rt in np.linspace(0,.8,41):
        for ry in np.linspace(0,.8,41):grid.append({'R2_temperature':rt,'R2_outcome':ry,'adjusted_slope':beta-se*np.sqrt(dof*ry*rt/(1-rt))})
    pd.DataFrame(grid).to_csv(A/'confounding_sensitivity.csv',index=False)
    causal=json.loads((ROOT/'output/analysis/causal_associations.json').read_text());assert abs(causal['within_pair_slope']-beta)<1e-12
    causal.update({'OLS_residual_df':int(dof),'OLS_SE_for_bias_identity':se,'equal_strength_R2_to_remove_estimate':equal,'sensitivity_scope':'point-estimate omitted-variable bias identity; not cluster-adjusted confidence interval or evidence that confounding exists'})
    dump('causal.json',causal);d[['data_row','dt','dy']].to_csv(A/'within_pair.csv',index=False)
    print(json.dumps(selection),flush=True)
if __name__=='__main__':main()
