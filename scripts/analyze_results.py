"""Post-selection explanations, error analysis and explicitly noncausal associations.

No plotting and no hyperparameter selection. Reads frozen predictions/models.
"""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import json,hashlib
import numpy as np
import pandas as pd
import joblib
import statsmodels.api as sm
from src.data import ROOT,load_data
from src.paths import model_path
from src.features import featurize_pairs,feature_names
from src.metrics import regression_metrics

OUT=ROOT/'output/analysis';OUT.mkdir(exist_ok=True,parents=True)
def write_json(name,obj):
    (OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2,default=lambda o:o.item() if isinstance(o,np.generic) else str(o))+'\n')
def features(df,rep):return featurize_pairs(df['Drug SMILES'].tolist(),df['Solvent SMILES'].tolist(),df.Temperature.tolist(),rep)

def causal_associations(df):
    # An exploratory estimand/design record precedes calculation.
    write_json('causal_design.json',{'data_scope':'development only; no intervention data','exposure':'Temperature in CSV raw units','outcome':'Solubility_log10','contrast':'one raw temperature unit within exact molecule-solvent pairs','observed_adjustment':'exact drug-solvent pair fixed effects','unmeasured_confounders':['experimental source','pH','solid form','pressure','protocol'],'assumptions_for_causal_reading':['no unmeasured within-pair temperature-outcome confounding','consistent treatment/measurement','positivity','correct functional form'],'identification':'not established; coefficients are associations, not identified causal effects','DAG_edges':[['Drug','Temperature'],['Drug','Y'],['Solvent','Temperature'],['Solvent','Y'],['U','Temperature'],['U','Y'],['Temperature','Y']],'DAG_status':'hypothesized causal assumptions, not learned or proven from CSV'})
    d=df.copy();d['T_within']=d.Temperature-d.groupby('pair').Temperature.transform('mean');d['Y_within']=d.Solubility_log10-d.groupby('pair').Solubility_log10.transform('mean')
    varying=d.groupby('pair').Temperature.transform('nunique').gt(1)
    d=d[varying].copy()
    pooled=sm.OLS(df.Solubility_log10,sm.add_constant(df.Temperature)).fit(cov_type='cluster',cov_kwds={'groups':df.parent})
    pooled_same_subset=sm.OLS(d.Solubility_log10,sm.add_constant(d.Temperature)).fit(cov_type='cluster',cov_kwds={'groups':d.parent})
    within=sm.OLS(d.Y_within,d[['T_within']]).fit(cov_type='cluster',cov_kwds={'groups':d.parent})
    # Parent-group bootstrap on within-pair sufficient statistics preserves pairs.
    d['xy']=d.T_within*d.Y_within;d['xx']=d.T_within**2
    sums=d.groupby('parent')[['xy','xx']].sum().to_numpy();rng=np.random.default_rng(2026)
    indices=rng.integers(0,len(sums),(2000,len(sums)));bs=sums[indices].sum(axis=1);beta_bs=bs[:,0]/bs[:,1]
    group_indices=[g.index.to_numpy() for _,g in d.groupby('pair')]
    perm=[]
    for _ in range(500):
        shuffled=d.T_within.copy()
        for idx in group_indices:shuffled.loc[idx]=rng.permutation(shuffled.loc[idx].to_numpy())
        perm.append(float(np.dot(shuffled,d.Y_within)/np.dot(shuffled,shuffled)))
    beta=float(within.params.iloc[0]);p=(1+sum(abs(v)>=abs(beta) for v in perm))/(1+len(perm))
    leave=[];tot=sums.sum(axis=0)
    for xy,xx in sums:leave.append((tot[0]-xy)/(tot[1]-xx))
    stats={'pooled_slope':float(pooled.params.iloc[1]),'pooled_cluster_ci':pooled.conf_int().iloc[1].tolist(),'within_pair_slope':beta,'within_cluster_ci':within.conf_int().iloc[0].tolist(),'within_parent_bootstrap_ci':np.quantile(beta_bs,[.025,.975]).tolist(),'within_rows':len(d),'within_pairs':d.pair.nunique(),'within_parent_groups':d.parent.nunique(),'excluded_from_within_only_constant_temperature_rows':len(df)-len(d),'permutation_two_sided_p_exploratory':p,'permutation_iterations':500,'leave_one_parent_out_slope_range':[min(leave),max(leave)],'interpretation':'association conditional on observed pairs; unmeasured confounding not ruled out; no identified do(T) effect','unit':'log10 per CSV raw temperature unit','cluster_ci':'statsmodels cluster-robust normal approximation; auxiliary to group bootstrap'}
    stats.update({'pooled_same_subset_slope':float(pooled_same_subset.params.iloc[1]),'pooled_same_subset_cluster_ci':pooled_same_subset.conf_int().iloc[1].tolist(),'cohort_comparison_note':'Compare within slope to pooled_same_subset to hold observations fixed; pooled_slope uses all development records','permutation_assumption':'temperature exchangeability within exact pairs; unverified with missing experimental-source metadata'})
    write_json('causal_associations.json',stats)
    d[['data_row','parent_group_id','T_within','Y_within']].to_csv(OUT/'within_pair_points.csv',index=False)
    pd.DataFrame({'bootstrap_slope':beta_bs}).to_csv(OUT/'causal_bootstrap.csv',index=False)
    pd.DataFrame({'permuted_slope':perm}).to_csv(OUT/'causal_permutation.csv',index=False)

def main():
    df=load_data();dev=df[df.role.eq('development')].copy();test=df[df.role.ne('development')].copy()
    meta=json.loads((ROOT/'output/deployment/metadata.json').read_text());rep=meta['representation']
    model=joblib.load(model_path(ROOT/'output/deployment/model.joblib'));xt=features(test,rep);y=test.Solubility_log10.to_numpy();pred=model.predict(xt)
    names=feature_names(rep);baseline=regression_metrics(y,pred,test.parent)
    rng=np.random.default_rng(2026);rows=[]
    for group in ['drug','solvent','temperature']:
        cols=[j for j,n in enumerate(names) if (n=='Temperature' if group=='temperature' else n.startswith(group+'_'))]
        for repeat in range(20):
            xp=xt.copy();order=rng.permutation(len(xt));xp[:,cols]=xt[order][:,cols]
            m=regression_metrics(y,model.predict(xp),test.parent)
            rows.append({'group':group,'repeat':repeat,'delta_macro_MAE':m['parent_macro_MAE']-baseline['parent_macro_MAE']})
    pd.DataFrame(rows).to_csv(OUT/'group_permutation.csv',index=False)
    # Explain a named tree reference model. Do not claim these values explain a different winner.
    import shap
    reference=joblib.load(model_path(ROOT/'output/final_models/ExtraTrees_base.joblib'))
    xdesc=features(test,'descriptors');explainer=shap.TreeExplainer(reference,feature_perturbation='tree_path_dependent')
    shap_values=np.asarray(explainer.shap_values(xdesc));expected=float(np.asarray(explainer.expected_value).reshape(-1)[0])
    residual=np.abs(shap_values.sum(axis=1)+expected-reference.predict(xdesc))
    assert residual.max()<1e-4,'SHAP additivity check failed'
    sd=pd.DataFrame(shap_values,columns=feature_names('descriptors'));sd.insert(0,'data_row',test.data_row.to_numpy());sd.to_csv(OUT/'shap_values.csv',index=False)
    pd.DataFrame({'feature':feature_names('descriptors'),'mean_abs_SHAP':np.mean(np.abs(shap_values),axis=0)}).sort_values('mean_abs_SHAP',ascending=False).to_csv(OUT/'shap_importance.csv',index=False)
    write_json('explainability_metadata.json',{'group_permutation_model':meta['experiment_id'],'group_permutation_repeats':20,'group_permutation_scope':'all 397 holdout rows; whole molecule blocks permuted together; new combinations may be outside support','SHAP_model':'ExtraTrees_base, descriptor reference; not a surrogate claim about a different selected model','SHAP_rows':len(test),'SHAP_method':'tree_path_dependent TreeSHAP','SHAP_expected_value':expected,'SHAP_max_additivity_error':float(residual.max()),'SHAP_version':shap.__version__,'causal_interpretation':False})
    test['prediction']=pred;test['residual']=pred-y;test['absolute_error']=np.abs(pred-y)
    test['solvent_seen']=test['Solvent SMILES'].isin(dev['Solvent SMILES'])
    test['temperature_in_global_range']=test.Temperature.between(dev.Temperature.min(),dev.Temperature.max())
    q=dev.Solubility_log10.quantile([1/3,2/3]).to_numpy();test['target_band']=pd.cut(test.Solubility_log10,[-np.inf,*q,np.inf],labels=['low','middle','high'])
    test['temperature_band']=pd.cut(test.Temperature,[-np.inf,20,30,np.inf],labels=['below20','20to30','above30'])
    strata=[]
    for field in ['solvent_seen','temperature_in_global_range','target_band','temperature_band']:
        for key,g in test.groupby(field,observed=True):strata.append({'stratifier':field,'stratum':str(key),'rows':len(g),'parents':g.parent.nunique(),**regression_metrics(g.Solubility_log10,g.prediction,g.parent)})
    pd.DataFrame(strata).to_csv(OUT/'error_strata.csv',index=False)
    test[['data_row','Drug','Solvent','Temperature','Solubility_log10','prediction','residual','absolute_error','parent_group_id','solvent_seen','temperature_in_global_range','target_band','temperature_band']].to_csv(OUT/'holdout_error_rows.csv',index=False)
    test.groupby('parent_group_id').agg(rows=('absolute_error','size'),MAE=('absolute_error','mean')).sort_values('MAE',ascending=False).to_csv(OUT/'holdout_parent_errors.csv')
    # Pairwise parent-level changes relative to Ridge on matched holdout groups.
    ridge=pd.read_csv(ROOT/'output/final_results/Ridge_base/predictions.csv').set_index('data_row')
    test['ridge_ae']=np.abs(test.Solubility_log10-test.data_row.map(ridge.prediction))
    paired=test.groupby('parent_group_id')[['absolute_error','ridge_ae']].mean();paired['delta_selected_minus_Ridge']=paired.absolute_error-paired.ridge_ae
    paired.to_csv(OUT/'paired_parent_errors.csv')
    delta=paired.delta_selected_minus_Ridge.to_numpy();bs=rng.choice(delta,(2000,len(delta)),replace=True).mean(axis=1)
    write_json('paired_comparison.json',{'reference':'Ridge_base','selected':meta['experiment_id'],'parents':len(delta),'mean_delta_macro_MAE':float(delta.mean()),'bootstrap95':np.quantile(bs,[.025,.975]).tolist(),'parents_improved':int((delta<0).sum()),'interpretation':'paired parent bootstrap, conditional on this held-out sample'})
    causal_associations(dev)
    # Pure model response curves on most-supported development pairs; no synthetic labels.
    curve=[]
    for pair in dev.pair.value_counts().head(3).index:
        g=dev[dev.pair.eq(pair)];r=g.iloc[0];temps=np.linspace(g.Temperature.min(),g.Temperature.max(),40)
        x=featurize_pairs([r['Drug SMILES']]*40,[r['Solvent SMILES']]*40,temps,rep);pp=model.predict(x)
        for temp,pv in zip(temps,pp):curve.append({'pair_id':hashlib.sha256(pair.encode()).hexdigest()[:12],'Temperature':float(temp),'prediction':float(pv),'support_rows':len(g)})
    pd.DataFrame(curve).to_csv(OUT/'temperature_response.csv',index=False)
    print('Analysis complete:',meta['experiment_id'],json.dumps(baseline),flush=True)

if __name__=='__main__':main()
