from pathlib import Path
import sys,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]));sys.path.insert(0,str(Path(__file__).resolve().parent))
from revision_style import canvas,panel,save_figure
from matplotlib.patches import PathPatch,Rectangle
from matplotlib.path import Path as MP
import pandas as pd,numpy as np
R=Path(__file__).resolve().parents[1];A=R/'output/revision_v2/analysis'
d=pd.read_csv(A/'outlier_values.csv');s=json.loads((A/'outlier_summary.json').read_text());fig,axs=canvas(height_mm=95)
for ax,col,lab in zip(axs[0],['Solubility_log10','Temperature'],['a','b']):
 ax.boxplot(d[col],widths=.4,patch_artist=True,boxprops={'facecolor':'#DCECF4'},medianprops={'color':'#455469','linewidth':1.4},flierprops={'marker':'.','markersize':3,'markeredgecolor':'#ce7657','alpha':.6});ax.set_xticks([1],['Development records']);ax.set_ylabel('log10 solubility' if lab=='a' else 'Temperature (dataset scale)');panel(ax,lab,'Solubility distribution' if lab=='a' else 'Temperature distribution')
save_figure(fig,'v2_outliers',[A/'outlier_values.csv',A/'outlier_summary.json'],{'rule':'Tukey 1.5 IQR; flag only; retain all records'})
f=pd.read_csv(A/'sampling_flow.csv');fig,axs=canvas(columns=1,height_mm=108);ax=axs[0,0];ax.set(xlim=(-.3,2.3),ylim=(-.12,1.2));ax.axis('off');panel(ax,'a','Sampling frequency and frozen data split')
colors=['#89B6CC','#B7A3D4','#E4AA8B'];bins=['1–5','6–20','>20'];roles=list(f.role.unique());positions={};cursor=1
for i,b in enumerate(bins):
 q=f[f.frequency.eq(b)];h=q.records.sum()/1904*.8;cursor-=h;positions[b]=cursor;ax.add_patch(Rectangle((.9,cursor),.15,h,fc=colors[i]));ax.text(.975,cursor+h/2,f'{b} records / parent\n{q.records.sum()} rows · {q.parents.sum()} parents',ha='center',va='center',fontsize=7);cursor-=.07
cursor=1
for r in roles:
 q=f[f.role.eq(r)];h=q.records.sum()/1904*.8;cursor-=h;positions[r]=cursor;ax.add_patch(Rectangle((1.9,cursor),.15,h,fc='#DDEEE4'));ax.text(2.075,cursor+h/2,('Development' if r=='development' else 'Fixed evaluation')+f'\n{q.records.sum()} rows\n{q.parents.sum()} parents',ha='left',va='center',fontsize=7);cursor-=.07
ax.add_patch(Rectangle((-.1,.2),.15,.8,fc='#DCECF4'));ax.text(-.14,.6,'All records\n1904 rows\n161 parents',ha='right',va='center',fontsize=7)
def ribbon(x0,y0,x1,y1,h,c):
 verts=[(x0,y0),(x0+.3,y0),(x1-.3,y1),(x1,y1),(x1,y1+h),(x1-.3,y1+h),(x0+.3,y0+h),(x0,y0+h),(x0,y0)];ax.add_patch(PathPatch(MP(verts,[1,4,4,4,2,4,4,4,79]),fc=c,ec='none',alpha=.3))
left=1.;dest={r:positions[r]+f[f.role.eq(r)].records.sum()/1904*.8 for r in roles}
for i,b in enumerate(bins):
 q=f[f.frequency.eq(b)];h=q.records.sum()/1904*.8;left-=h;ribbon(.05,left,.9,positions[b],h,colors[i]);src=positions[b]+h
 for row in q.itertuples():
  h=row.records/1904*.8;src-=h;dest[row.role]-=h;ribbon(1.05,src,1.9,dest[row.role],h,colors[i])
ax.set_xlim(-.65,2.65)
save_figure(fig,'v2_sampling_flow',[A/'sampling_flow.csv'],{'width':'record count; parent counts annotated','split':'frozen parent-disjoint split'})
