"""English manuscript figures: consume saved evidence, never fit models."""
from pathlib import Path
import sys,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]));sys.path.insert(0,str(Path(__file__).resolve().parent))
import numpy as np
import pandas as pd
from matplotlib.patches import FancyBboxPatch,FancyArrowPatch
from revision_style import canvas,panel,save_figure,source_table,COLORS
from src.data import ROOT,load_data
O=ROOT/'output/revision_v2';A=O/'analysis'
D={'AdaptiveHybrid':'SOLAR-H','HybridConditional':'SOLAR-H0' ,'InteractionConditional':'SOLAR-N','TemperatureMLP':'MLP + difference','PlainMLP':'MLP','HistGradientBoosting':'HGB','RandomForest':'Random forest','ExtraTrees':'ExtraTrees','Dummy':'Mean','Ridge':'Ridge','TabM':'TabM','RealMLP':'RealMLP'}
SHORT={'MolWt':'MW','MolLogP':'LogP','TPSA':'TPSA','HBD':'HBD','HBA':'HBA','RotatableBonds':'RB','RingCount':'Rings','AromaticRings':'ArR','HeavyAtomCount':'HA','FractionCSP3':'Csp3','FormalCharge':'Charge'}
def short(n):
 for key,val in SHORT.items():n=n.replace(key,val)
 return n.replace('drug_','D: ').replace('solvent_','S: ').replace('product_','Prod: ').replace('difference_','Diff: ')
C={'AdaptiveHybrid':'#227d75','HybridConditional':'#227d75','InteractionConditional':'#ce7657','ExtraTrees':'#6888aa','TabM':'#957eb3'}
def col(n):return C.get(n,'#819197')
def read(n):return pd.read_csv(A/n)
def finish(fig,name,files,claim):return save_figure(fig,name,[A/f for f in files]+([ROOT/'datasets/data_2026.csv',ROOT/'datasets/splits/split_manifest.csv'] if name=='v2_data' else []),{'claim':claim,'language':'English','uncertainty':'specified in Chinese manuscript captions','data':'actual recorded CSV experiments'})

def data_figure():
 d=load_data();dev=read('development_eda.csv');fig,axs=canvas(2,2,126);a,b,c,e=axs.ravel();f=pd.crosstab(d['Drug SMILES'],d['Solvent SMILES']);a.imshow(f.to_numpy()>0,aspect='auto',cmap='Blues',interpolation='nearest',origin='lower');a.set(xlabel='Solvent structure index',ylabel='Drug structure index');panel(a,'a','Observed drug–solvent combinations')
 b.hist(dev.Solubility_log10,bins=27,color='#227d75',alpha=.8,edgecolor='white');b.set(xlabel='Observed log10 solubility',ylabel='Records');panel(b,'b','Development target distribution')
 c.hexbin(dev.Temperature,dev.Solubility_log10,gridsize=25,mincnt=1,cmap='Blues',linewidths=.2);c.set(xlabel='Temperature (dataset scale)',ylabel='Observed log10 solubility');panel(c,'c','Conditions and response')
 counts=d.groupby('parent').size().sort_values(ascending=False).to_numpy();e.fill_between(range(1,len(counts)+1),counts,color='#ce7657',alpha=.3);e.plot(range(1,len(counts)+1),counts,color='#ce7657');e.set(xlabel='Parent rank',ylabel='Records');panel(e,'d','Unequal sampling across parents')
 finish(fig,'v2_data',['development_eda.csv'],'Sparse molecular coverage and uneven sampling motivate group-aware modeling.')

def associations():
 corr=read('descriptor_spearman.csv').set_index('Unnamed: 0');cols=[c for c in corr.columns if c.startswith('drug_') and c!='drug_FormalCharge'];sol=[c for c in corr.columns if c.startswith('solvent_') and c!='solvent_FormalCharge']
 fig,axs=canvas(height_mm=106);a,b=axs[0]
 a.imshow(corr.loc[cols,sol],vmin=-1,vmax=1,cmap='coolwarm',aspect='auto');a.set_xticks(range(10),[SHORT[x.replace('solvent_','')] for x in sol],rotation=90,fontsize=6);a.set_yticks(range(10),[SHORT[x.replace('drug_','')] for x in cols],fontsize=6);a.set(xlabel='Solvent descriptors',ylabel='Drug');panel(a,'a','Correlation: blue −1, red +1')
 vals=corr.loc[cols,'target'].sort_values();b.hlines(range(10),0,vals,color='#9ab4a8',lw=1.2);b.scatter(vals,range(10),c=['#227d75' if v>=0 else '#ce7657' for v in vals],s=20);b.axvline(0,color='#8c9e96',lw=.7);b.set_yticks(range(10),[SHORT[x.replace('drug_','')] for x in vals.index],fontsize=6.5);b.set(xlabel='Spearman correlation with target',xlim=(-1,1));panel(b,'b','Drug descriptors and solubility')
 finish(fig,'v2_associations',['descriptor_spearman.csv'],'Development-set descriptor associations inform interaction design; correlations are descriptive.')

def architecture():
 fig,axs=canvas(columns=1,height_mm=105);ax=axs[0,0]
 ax.set(xlim=(0,1),ylim=(0,1));ax.axis('off')
 panel(ax,'a','SOLAR-H structure and temperature decomposition')
 boxes=[(.08,.76,.84,.12,'Drug + solvent descriptors and interactions'),
        (.06,.46,.41,.14,'ExtraTrees structural baseline\nb(z)'),
        (.55,.46,.39,.14,'Within-pair temperature fit\ntau × u(z) beta'),
        (.55,.23,.39,.12,'Inner-CV gain gamma'),
        (.18,.03,.64,.12,'Prediction = baseline + gamma × temperature term')]
 for x,y,w,h,label in boxes:
  ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=.01',fc='#edf4ef',ec='#738981'))
  ax.text(x+w/2,y+h/2,label,ha='center',va='center',fontsize=8)
 for start,end in [((.28,.75),(.28,.61)),((.75,.75),(.75,.61)),((.75,.45),(.75,.36)),((.28,.45),(.28,.16)),((.75,.22),(.65,.16))]:
  ax.add_patch(FancyArrowPatch(start,end,arrowstyle='->',mutation_scale=10,color='#738981'))
 save_figure(fig,'v2_architecture',[],{'claim':'Structural baseline plus a damped within-pair temperature response.'})


def comparison():
 df=pd.read_csv(O/'comparison.csv').sort_values('parent_macro_MAE');ci=read('comparison_intervals.csv').set_index('model');pe=read('parent_errors.csv');fig,axs=canvas(height_mm=112);fig.subplots_adjust(left=.18,wspace=.75);a,b=axs[0]
 for i,r in enumerate(df.itertuples()):
  q=ci.loc[r.model];a.errorbar(q['mean'],i,xerr=[[q['mean']-q.lower],[q.upper-q['mean']]],fmt='o',color=col(r.model),ms=4,capsize=2,lw=.8)
 a.set_yticks(range(len(df)),[D[n] for n in df.model]);a.invert_yaxis();a.set(xlabel='Parent-weighted MAE');panel(a,'a','Nested validation: mean and 95% CI')
 select=json.loads((A/'selection.json').read_text());names=list(dict.fromkeys(['AdaptiveHybrid','InteractionConditional',select['baseline'],'TabM']))
 rng=np.random.default_rng(2026)
 for i,n in enumerate(names):
  values=pe[pe.model.eq(n)].MAE.to_numpy();parts=b.violinplot(values,positions=[i],orientation='horizontal',widths=.65,showextrema=False)
  for body in parts['bodies']:body.set_facecolor(col(n));body.set_alpha(.22)
  b.scatter(values,i+rng.uniform(-.10,.10,len(values)),s=4,color=col(n),alpha=.4,linewidths=0);b.plot(np.median(values),i,'|',ms=12,color='#183e3c')
 b.set_yticks(range(len(names)),[D[n] for n in names]);b.set(xlabel='Individual parent MAE');panel(b,'b','Heterogeneity across 128 parents')
 finish(fig,'v2_comparison',['comparison_intervals.csv','parent_errors.csv'],'Compare prediction quality and between-parent heterogeneity under one protocol.')

def ablation():
 d=read('diagnostics.csv');fig,axs=canvas(height_mm=104);fig.subplots_adjust(left=.20,wspace=.65);a,b=axs[0];order=['AdaptiveHybrid_no_balanced','AdaptiveHybrid_no_interaction','AdaptiveHybrid_no_temperature','AdaptiveHybrid_full_gain','InteractionConditional_no_balanced','InteractionConditional_no_interaction','InteractionConditional_no_temperature','InteractionConditional_no_difference','PlainMLP_balanced'];q=d.set_index('tag').loc[order].reset_index();labels=[]
 for i,r in enumerate(q.itertuples()):
  a.errorbar(r.delta,i,xerr=[[r.delta-r.lower],[r.upper-r.delta]],fmt='o',color=col(r.model),ms=4,capsize=2,lw=.8)
  labels.append(('Hybrid: ' if r.model in ['HybridConditional','AdaptiveHybrid'] else 'Network: ' if r.model=='InteractionConditional' else 'MLP: ')+r.tag.split('_no_')[-1].replace('PlainMLP_balanced','balanced').replace('AdaptiveHybrid_full_gain','full gain'))
 a.axvline(0,color='#829490',ls='--',lw=.7);a.set_yticks(range(len(q)),labels);a.set(xlabel='Change in parent MAE');panel(a,'a','Paired component ablations')
 base=pd.read_csv(O/'comparison.csv').set_index('model')
 for n in ['AdaptiveHybrid','InteractionConditional']:
  q=d[(d.model.eq(n))&(d.fraction.lt(1))].sort_values('fraction');xs=list(q.fraction)+[1.];ys=list(q.parent_macro_MAE)+[base.loc[n,'parent_macro_MAE']];b.plot(xs,ys,'o-',color=col(n),label=D[n],ms=4)
 b.set(xlabel='Fraction of training parents',ylabel='Parent-weighted MAE');b.legend(loc='best',fontsize=6.5);panel(b,'b','Learning curves')
 finish(fig,'v2_ablation',['diagnostics.csv'],'Ablations isolate each component and learning curves test data dependence.')

def sensitivity():
 d=read('diagnostics.csv');fig,axs=canvas(height_mm=88);a,b=axs[0]
 for ax,key,xlab,title,label in [(a,'InteractionConditional_delta_','Difference-loss weight','Temperature supervision','a'),(b,'HybridConditional_alpha_','Ridge penalty','Slope regularization','b')]:
  q=d[d.tag.str.startswith(key)].copy();q['value']=q.tag.str.replace(key,'',regex=False).astype(float);q=q.sort_values('value');ax.plot(q.value,q.parent_macro_MAE,'o-',color='#227d75',ms=4);ax.set_xscale('log');ax.set(xlabel=xlab,ylabel='Parent-weighted MAE');panel(ax,label,title)
 finish(fig,'v2_sensitivity',['diagnostics.csv'],'Sensitivity profiles describe the two temperature-related hyperparameters.')

def errors_figure():
 d=read('oof_errors.csv');fig,axs=canvas(2,2,128);a,b,c,e=axs.ravel();a.hexbin(d.Solubility_log10,d.prediction,gridsize=30,mincnt=1,cmap='Blues',linewidths=.2);lo=min(d.Solubility_log10.min(),d.prediction.min());hi=max(d.Solubility_log10.max(),d.prediction.max());a.plot([lo,hi],[lo,hi],'--',color='#829490',lw=.8);a.set(xlabel='Observed log10 solubility',ylabel='Mean predicted log10 solubility');panel(a,'a','Out-of-fold predictions')
 pe=read('parent_errors.csv');sel=json.loads((A/'selection.json').read_text())
 for n in [sel['proposed'],sel['baseline']]:
  v=np.sort(pe[pe.model.eq(n)].MAE);b.step(v,np.arange(1,len(v)+1)/len(v),where='post',label=D[n],color=col(n))
 b.set(xlabel='Parent MAE',ylabel='Cumulative fraction');b.legend(fontsize=6.5);panel(b,'b','Error distributions')
 c.scatter(d.max_train_similarity,d.absolute_error,s=6,alpha=.3,c='#227d75',linewidths=0);c.set(xlabel='Maximum training Tanimoto similarity',ylabel='Absolute error');panel(c,'c','Structural distance and errors')
 counts=d.groupby('parent_group_id').agg(MAE=('absolute_error','mean'),n=('data_row','size'));e.scatter(counts.n,counts.MAE,s=18,alpha=.55,c='#ce7657',linewidths=0);e.set_xscale('log');e.set(xlabel='Records per validation parent',ylabel='Parent MAE');panel(e,'d','Error versus sampling density')
 finish(fig,'v2_errors',['oof_errors.csv','parent_errors.csv'],'Prediction errors vary across structures and sampling densities.')

def explanations():
 sv=read('hybrid_shap.csv');fv=read('hybrid_shap_features.csv');ig=read('neural_integrated_gradients.csv');per=read('permutation.csv');fig,axs=canvas(2,2,155);a,b,c,e=axs.ravel();top=sv.abs().mean().nlargest(8).index;rng=np.random.default_rng(2026)
 for i,n in enumerate(top):
  color=(fv[n]-fv[n].quantile(.05))/(fv[n].quantile(.95)-fv[n].quantile(.05)+1e-8);a.scatter(sv[n],i+rng.uniform(-.25,.25,len(sv)),c=np.clip(color,0,1),cmap='coolwarm',s=3,alpha=.6,linewidths=0)
 a.set_yticks(range(8),[short(n) for n in top],fontsize=6.5);a.invert_yaxis();a.axvline(0,color='#9aa6a3',lw=.6);a.set(xlabel='SHAP contribution to structural baseline');panel(a,'a','SOLAR-H: feature attribution')
 top2=ig.abs().mean().nlargest(8);b.barh(range(8),top2.values,color='#ce7657');b.set_yticks(range(8),[short(n) for n in top2.index],fontsize=6.5);b.invert_yaxis();b.set(xlabel='Mean absolute integrated gradient');panel(b,'b','Network: input attribution')
 parts=read('AdaptiveHybrid_parts.csv');j=int(np.argsort(np.abs(parts.target-parts.prediction))[len(parts)//2]);vals=sv.iloc[j].reindex(top);meta=json.loads((A/'explanations.json').read_text());rest=float(sv.iloc[j].sum()-vals.sum());contrib=list(vals)+[rest,float(parts.iloc[j].temperature_component)];labels=['F'+str(i+1) for i in range(8)]+['Other','Temp'];cur=meta['hybrid']['expected_value']
 for i,v in enumerate(contrib):c.bar(i,v,bottom=cur,color='#227d75' if v>=0 else '#ce7657',width=.7);cur+=v
 c.axhline(cur,color='#45615b',ls='--',lw=.6);c.set_xticks(range(10),labels,fontsize=6);c.set(ylabel='Prediction (log10 units)');panel(c,'c','SOLAR-H: median-error example')
 for i,n in enumerate(['AdaptiveHybrid','InteractionConditional']):
  q=per[per.model.eq(n)].groupby('feature_group').delta.agg(['mean','std']).reindex(['Drug','Solvent','Temperature']);e.errorbar(np.arange(3)+(i-.5)*.12,q['mean'],yerr=q['std'],fmt='o',color=col(n),label=D[n],ms=4,capsize=2)
 e.set_xticks(range(3),['Drug','Solvent','Temperature']);e.set(ylabel='Increase in parent MAE');e.legend(fontsize=6,loc='upper right');panel(e,'d','Full-model block permutation')
 finish(fig,'v2_explanations',['hybrid_shap.csv','hybrid_shap_features.csv','neural_integrated_gradients.csv','permutation.csv','explanations.json','AdaptiveHybrid_parts.csv'],'Explain structural attribution, temperature contributions, and complete-model reliance.')

def causal():
 grid=read('confounding_sensitivity.csv');within=read('within_pair.csv');fig,axs=canvas(2,2,132);a,b,c,e=axs.ravel();a.set(xlim=(0,1),ylim=(0,1));a.axis('off');panel(a,'a','Assumed causal structure')
 loc={'Drug / solvent':(.5,.86),'Unmeasured U':(.5,.51),'Temperature':(.19,.15),'Solubility':(.81,.15)}
 for text,(x,y) in loc.items():a.add_patch(FancyBboxPatch((x-.17,y-.065),.34,.13,boxstyle='round,pad=.015',fc='#edf4ef',ec='#a7bcb2',lw=.7));a.text(x,y,text,ha='center',va='center',fontsize=7)
 for p,q,rad in [('Drug / solvent','Temperature',.25),('Drug / solvent','Solubility',-.25),('Unmeasured U','Temperature',0),('Unmeasured U','Solubility',0),('Temperature','Solubility',0)]:
  x,y=loc[p];xx,yy=loc[q];a.add_patch(FancyArrowPatch((x,y-.08) if p!='Temperature' else (x+.18,y),(xx,yy+.08) if q=='Temperature' or p!='Temperature' else (xx-.18,yy),connectionstyle=f'arc3,rad={rad}',arrowstyle='->',mutation_scale=9,color='#738981',lw=.8))
 b.hexbin(within.dt,within.dy,gridsize=25,mincnt=1,cmap='Blues');beta=json.loads((A/'causal.json').read_text())['within_pair_slope'];xx=np.array([within.dt.min(),within.dt.max()]);b.plot(xx,beta*xx,color='#ce7657',lw=1);b.set(xlabel='Within-pair temperature',ylabel='Within-pair log10 solubility');panel(b,'b','Within-pair association')
 piv=grid.pivot(index='R2_outcome',columns='R2_temperature',values='adjusted_slope');levels=[-.02,-.01,0,.005,.01];cs=c.contour(piv.columns,piv.index,piv.to_numpy(),levels=levels,colors=['#9a6c58','#ba886c','#193b3a','#5d9486','#86b5a4'],linewidths=1);c.clabel(cs,fontsize=6,inline=True,fmt='%.3f');c.set(xlabel='Partial R²: U and temperature',ylabel='Partial R²: U and outcome');panel(c,'c','Omitted-variable sensitivity')
 curves=read('response_curves.csv');obs=read('response_observations.csv');q=curves[curves.pair_number.eq(1)]
 for n,g in q.groupby('model'):e.plot(g.Temperature,g.prediction,color=col(n),label=D[n],lw=1.2)
 v=obs[obs.pair_number.eq(1)];e.scatter(v.Temperature,v.target,s=9,c='#7b8987',alpha=.5);e.set(xlabel='Temperature (dataset scale)',ylabel='log10 solubility');e.legend(fontsize=6);panel(e,'d','One observed temperature series')
 finish(fig,'v2_causal',['confounding_sensitivity.csv','within_pair.csv','causal.json','response_curves.csv','response_observations.csv'],'Separate observational association, sensitivity to confounding, and model response.')
if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('--figures',nargs='*',default=['data','associations','architecture','comparison','ablation','sensitivity','errors','explanations','causal']);args=p.parse_args()
 for name in args.figures:
  {'data':data_figure,'associations':associations,'architecture':architecture,'comparison':comparison,'ablation':ablation,'sensitivity':sensitivity,'errors':errors_figure,'explanations':explanations,'causal':causal}[name]();print('FIGURE',name,flush=True)
