from pathlib import Path
import sys,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from src.data import ROOT,load_data
import pandas as pd
D=load_data();dev=D[D.role.eq('development')];O=ROOT/'output/revision_v2/analysis';stats={}
for col in ['Temperature','Solubility_log10']:
 q1,q3=dev[col].quantile([.25,.75]);lo=q1-1.5*(q3-q1);hi=q3+1.5*(q3-q1);stats[col]={'q1':q1,'q3':q3,'lower':lo,'upper':hi,'flagged':int(((dev[col]<lo)|(dev[col]>hi)).sum()),'rows':len(dev)}
(O/'outlier_summary.json').write_text(json.dumps(stats,indent=2)+'\n');dev[['Temperature','Solubility_log10']].to_csv(O/'outlier_values.csv',index=False)
n=D.groupby('parent').size();D['frequency']=D.parent.map(n).map(lambda v:'1–5' if v<=5 else '6–20' if v<=20 else '>20')
D.groupby(['frequency','role']).agg(records=('data_row','size'),parents=('parent','nunique')).reset_index().to_csv(O/'sampling_flow.csv',index=False)
print(stats)
