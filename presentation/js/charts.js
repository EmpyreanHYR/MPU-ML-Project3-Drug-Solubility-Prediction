/* Offline SVG charts. Every series and value remains present when printing. */
(() => {
  'use strict';
  const D = SOLAR_DATA;
  const C = {teal:'#007b70', blue:'#3d6f9a', amber:'#b16632', ink:'#183b43', muted:'#5e7479', grid:'#cfddd6', pale:'#e6eee8'};
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (n, d=4) => Number(n).toFixed(d).replace('-', '−');
  const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  function el(tag, attrs={}, value) {
    const n=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));
    if(value!==undefined)n.textContent=value;
    return n;
  }
  function canvas(id,w,h,label) {
    const host=document.getElementById(id);
    if(!host)return null;
    const s=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':label,class:'data-chart notranslate',translate:'no'});
    s.append(el('title',{},label));host.replaceChildren(s);return s;
  }
  function text(s,x,y,value,extra={}) {s.append(el('text',{x,y,fill:C.ink,'font-size':18,...extra},value));}
  function line(s,x1,y1,x2,y2,extra={}) {s.append(el('line',{x1,y1,x2,y2,stroke:C.grid,...extra}));}
  function mark(s,detail,draw,key) {
    const g=el('g',{class:'datum',tabindex:0,role:'button','aria-label':detail,'data-detail':detail});
    if(key)g.dataset.model=key;
    g.append(el('title',{},detail));draw(g);s.append(g);return g;
  }
  function axisX(s,x,y,width,lo,hi,ticks,label,d=2) {
    const scale=v=>x+(v-lo)/(hi-lo)*width;
    ticks.forEach(v=>{line(s,scale(v),30,scale(v),y,{stroke:C.grid});text(s,scale(v),y+25,fmt(v,d),{'text-anchor':'middle','font-size':16});});
    text(s,x+width/2,y+54,label,{'text-anchor':'middle','font-size':17});
    return scale;
  }
  const short = row => ({rich:'Rich ExtraTrees',randomforest:'Random Forest',dual:'Three-branch blend',five:'Five-branch blend',kernel:'Multi-view Kernel Ridge',ridge:'Ridge',basic:'Basic ExtraTrees',tabm:'TabM',catboost:'CatBoost',svr:'RBF-SVR'})[row.id]||row.name;
  const modelColor = id => ({fusion:C.teal,rich:C.amber,tabpfn:C.blue,solar:'#855e92',basic:'#6c8185'})[id]||'#739694';
  function bars(id,rows,max=1,w=740,h=365,axisLabel='Error in log₁₀ solubility units') {
    const s=canvas(id,w,h,axisLabel);if(!s)return;
    const left=225,right=80,top=20,plotW=w-left-right,rowH=(h-75)/rows.length;
    [0,max/2,max].forEach(v=>{line(s,left+v/max*plotW,10,left+v/max*plotW,h-55);text(s,left+v/max*plotW,h-29,fmt(v,2),{'text-anchor':'middle','font-size':16});});
    rows.forEach((r,i)=>{
      const y=top+i*rowH;
      text(s,left-12,y+14,r.label,{'text-anchor':'end','font-size':18});
      mark(s,`${r.label}: ${fmt(r.value)}${r.detail?' '+r.detail:''}`,g=>{
        g.append(el('rect',{x:left,y:y-3,width:plotW,height:21,fill:C.pale}));
        g.append(el('rect',{x:left,y:y-3,width:r.value/max*plotW,height:21,fill:r.color||modelColor(r.id)}));
        g.append(el('text',{x:w-4,y:y+14,'text-anchor':'end',fill:C.ink,'font-size':19,'font-weight':r.id==='fusion'?750:500},fmt(r.value)));
      },r.id);
    });
    text(s,left+plotW/2,h-3,axisLabel,{'text-anchor':'middle','font-size':16});
  }
  function forest(id,rows,lo,hi,w=1140,h=350,caption='Difference in parent MAE',d=4) {
    const s=canvas(id,w,h,caption+' with 95% intervals');if(!s)return;
    const left=w>900?280:205,right=w>900?310:115;
    const x=axisX(s,left,h-75,w-left-right,lo,hi,[lo,0,hi],caption,3);
    line(s,x(0),15,x(0),h-75,{stroke:C.muted,'stroke-dasharray':'5 5','stroke-width':1.5});
    const rowH=(h-115)/rows.length;
    rows.forEach((r,i)=>{
      const y=42+i*rowH;
      text(s,left-15,y+6,r.label,{'text-anchor':'end','font-size':19});
      mark(s,`${r.label}: ${fmt(r.value,d)}, interval [${fmt(r.low,d)}, ${fmt(r.high,d)}]`,g=>{
        const col=r.low>0?C.amber:C.teal;
        g.append(el('line',{x1:x(r.low),y1:y,x2:x(r.high),y2:y,stroke:col,'stroke-width':3}));
        [r.low,r.high].forEach(v=>g.append(el('line',{x1:x(v),y1:y-6,x2:x(v),y2:y+6,stroke:col,'stroke-width':2})));
        g.append(el('circle',{cx:x(r.value),cy:y,r:6,fill:col}));
      });
      text(s,w-right+20,y+6,`${fmt(r.value,d)}  [${fmt(r.low,d)}, ${fmt(r.high,d)}]`,{'font-size':18});
    });
  }
  function coverage() {
    const s=canvas('coverage-chart',760,355,'Observed drug–solvent grid: 646 of 8,232 combinations.');
    const left=55,top=20,gw=650,gh=275,cw=gw/49,ch=gh/168;
    s.append(el('rect',{x:left,y:top,width:gw,height:gh,fill:'#e0e8e2'}));
    D.coverage.cells.forEach(([drug,solvent,n])=>{
      mark(s,`${D.coverage.drugs[drug]} in ${D.coverage.solvents[solvent]}: ${n} records`,g=>{
        g.append(el('rect',{x:left+solvent*cw,y:top+drug*ch,width:cw-.5,height:Math.max(1,ch-.2),fill:C.teal,opacity:.45+.55*n/23}));
      });
    });
    [0,24,48].forEach(i=>text(s,left+(i+.5)*cw,top+gh+24,String(i+1),{'text-anchor':'middle','font-size':16}));
    [0,83,167].forEach(i=>text(s,left-10,top+(i+.8)*ch,String(i+1),{'text-anchor':'end','font-size':16}));
    text(s,left+gw/2,345,'49 solvents, ranked by record count',{'text-anchor':'middle','font-size':18});
    text(s,15,top+gh/2,'168 structures',{transform:`rotate(-90 15 ${top+gh/2})`,'text-anchor':'middle','font-size':18});
  }
  function histogram() {
    const s=canvas('target-histogram',540,330,'Development target histogram, 1,507 records.');
    const bins=Array.from({length:18},(_,i)=>({lo:-6.5+i*.5,n:0}));
    D.developmentTargets.forEach(v=>bins[Math.min(17,Math.floor((v+6.5)/.5))].n++);
    const l=50,t=25,w=460,h=230,max=Math.ceil(Math.max(...bins.map(b=>b.n))/50)*50;
    [0,max/2,max].forEach(v=>{const y=t+h-v/max*h;line(s,l,y,l+w,y);text(s,l-8,y+5,v,{'text-anchor':'end','font-size':16});});
    bins.forEach((b,i)=>mark(s,`[${b.lo}, ${b.lo+.5}${i===17?']':')'}: ${b.n} development records`,g=>g.append(el('rect',{x:l+i*w/18+1,y:t+h-b.n/max*h,width:w/18-2,height:b.n/max*h,fill:C.teal}))));
    [-6,-4,-2,0,2].forEach(v=>text(s,l+(v+6.5)/9*w,t+h+24,v,{'text-anchor':'middle','font-size':16}));
    text(s,l+w/2,315,'Observed log₁₀ solubility',{'text-anchor':'middle','font-size':18});
    text(s,l,15,'Number of records',{'font-size':16});
  }

  function scatter() {
    const s=canvas('condition-scatter',585,330,'All 1,904 observations: temperature versus log solubility.');
    const l=55,t=25,w=500,h=230,x=v=>l+(v+60)/190*w,y=v=>t+h-(v+6.5)/9*h;
    [-6,-4,-2,0,2].forEach(v=>{line(s,l,y(v),l+w,y(v));text(s,l-10,y(v)+5,v,{'text-anchor':'end','font-size':16});});
    [-50,0,25,75,125].forEach(v=>text(s,x(v),t+h+25,v,{'text-anchor':'middle','font-size':16}));
    D.measurements.forEach(r=>mark(s,`${r.drug}, ${r.solvent}, ${r.t} °C: ${fmt(r.y)} log₁₀ S`,g=>g.append(el('circle',{cx:x(r.t),cy:y(r.y),r:2.5,fill:C.teal,opacity:.37}))));
    text(s,l+w/2,315,'Temperature (°C, v2 definition)',{'text-anchor':'middle','font-size':18});text(s,l,15,'Observed log₁₀ S',{'font-size':16});
  }

  function sensitivity() {
    const s=canvas('weight-chart',730,330,'Fixed TabPFN weights: all five tested points, with adaptive blend reference.');
    const l=80,t=25,w=585,h=225,x=v=>l+v*w,y=v=>t+h-(v-.66)/.03*h;
    [.66,.67,.68,.69].forEach(v=>{line(s,l,y(v),l+w,y(v));text(s,l-12,y(v)+6,fmt(v,2),{'text-anchor':'end','font-size':17});});
    const ref=D.results.metrics.fusion.parent_macro_MAE;
    line(s,l,y(ref),l+w,y(ref),{stroke:C.amber,'stroke-width':2,'stroke-dasharray':'6 4'});
    text(s,l+12,y(ref)+23,'Adaptive: 0.6668',{fill:C.amber,'font-size':17});
    const rows=D.results.fixed_weight_sensitivity;
    s.append(el('polyline',{points:rows.map(r=>`${x(r.weight)},${y(r.mae)}`).join(' '),fill:'none',stroke:C.teal,'stroke-width':3}));
    rows.forEach(r=>{mark(s,`TabPFN weight ${r.weight.toFixed(2)}: parent MAE ${fmt(r.mae)}`,g=>g.append(el('circle',{cx:x(r.weight),cy:y(r.mae),r:6,fill:C.teal})));text(s,x(r.weight),y(r.mae)-15,fmt(r.mae),{'text-anchor':'middle','font-size':18,'font-weight':650});text(s,x(r.weight),t+h+25,r.weight.toFixed(2),{'text-anchor':'middle','font-size':18});});
    text(s,l+w/2,320,'TabPFN weight α',{'text-anchor':'middle','font-size':18});
    const host=document.getElementById('seed-readouts');
    host.innerHTML=Object.entries(D.results.seed_metrics.fusion).map(([k,v])=>`<div><span>Seed ${k}</span><b>${fmt(v.parent_macro_MAE)}</b></div>`).join('');
    document.getElementById('fold-readouts').innerHTML=Object.entries(D.results.tabpfn_weight_by_fold).map(([k,v])=>`<div><span>Fold ${k}</span><b>${v.toFixed(2)}</b></div>`).join('');
  }

  function calibration() {
    D.explanations.examples.forEach((r,i)=>{
      const s=canvas('calibration-'+i,540,235,r.drug+' in acetone: observed and branch predictions.');
      const rows=[['Observed',r.observed,C.ink],['ExtraTrees',r.tree,C.amber],['TabPFN',r.pfn,C.blue],['Fusion',r.fusion,C.teal]];
      const lo=i? -1.96:-2.77,hi=i?-1.80:-2.44,l=125,w=290,x=v=>l+(v-lo)/(hi-lo)*w;
      [lo,(lo+hi)/2,hi].forEach(v=>{line(s,x(v),8,x(v),175);text(s,x(v),200,fmt(v,2),{'text-anchor':'middle','font-size':16});});
      rows.forEach(([name,v,c],j)=>{const y=28+j*43;text(s,l-12,y+6,name,{'text-anchor':'end','font-size':18});mark(s,`${name}: ${fmt(v)} log₁₀ S`,g=>{g.append(el('circle',{cx:x(v),cy:y,r:6,fill:c}));g.append(el('text',{x:537,y:y+6,'text-anchor':'end','font-size':18,fill:C.ink},fmt(v,3)));});});
      text(s,l+w/2,232,'Log₁₀ solubility (zoomed axis)',{'text-anchor':'middle','font-size':16});
    });
  }

  function latency() {
    const s=canvas('latency-chart',740,260,'Five recorded warm MPS inference times, one request at a time.');
    const l=75,t=20,w=590,h=165,y=v=>t+h-(v-1.65)/.10*h;
    [1.65,1.70,1.75].forEach(v=>{line(s,l,y(v),l+w,y(v));text(s,l-12,y(v)+6,fmt(v,2),{'text-anchor':'end','font-size':18});});
    D.application.warm_inference_seconds.forEach((v,i)=>{const x=l+(i+.5)*w/5;mark(s,`Warm request ${i+1}: ${v.toFixed(4)} seconds`,g=>g.append(el('circle',{cx:x,cy:y(v),r:7,fill:C.teal})));text(s,x,y(v)-17,v.toFixed(3)+' s',{'text-anchor':'middle','font-size':19});text(s,x,t+h+28,String(i+1),{'text-anchor':'middle','font-size':18});});
    text(s,l+w/2,253,'Sequential request after warm-up',{'text-anchor':'middle','font-size':17});
  }

  function radarBase(id,labels,max,ticks,description) {
    const s=canvas(id,760,395,description),cx=370,cy=155,r=112;
    const point=(v,i)=>[cx+Math.sin(i*Math.PI/2)*r*v/max,cy-Math.cos(i*Math.PI/2)*r*v/max];
    ticks.forEach(v=>{
      s.append(el('polygon',{points:labels.map((_,i)=>point(v,i).join(',')).join(' '),fill:'none',stroke:C.grid,'stroke-width':v===max?1.6:1}));
      text(s,cx+8,cy-r*v/max+5,String(v),{'font-size':14,fill:C.muted});
    });
    labels.forEach((label,i)=>{
      const p=point(max,i);line(s,cx,cy,...p);
      const positions=[[cx,21,'middle'],[cx+r+22,cy+6,'start'],[cx,cy+r+32,'middle'],[cx-r-22,cy+6,'end']];
      const [x,y,anchor]=positions[i];text(s,x,y,label,{'font-size':20,'font-weight':650,'text-anchor':anchor});
    });
    return {s,point};
  }
  function modelRadar() {
    const {s,point}=radarBase('model-radar',['Parent MAE','Row MAE','RMSE','R²'],1,[.25,.5,.75,1],'Four-metric model comparison. Errors inverted, min–max normalised across all 13 methods. Larger is better.');
    const bounds=Array.from({length:4},(_,j)=>[Math.min(...SOLAR_BENCHMARK.map(r=>+r.values[j])),Math.max(...SOLAR_BENCHMARK.map(r=>+r.values[j]))]);
    const ids=['basic','solar','rich','tabpfn','fusion'];
    ids.forEach((id,n)=>{
      const row=SOLAR_BENCHMARK.find(r=>r.id===id),color=modelColor(id);
      const scores=row.values.map((v,j)=>j===3?(+v-bounds[j][0])/(bounds[j][1]-bounds[j][0]):(bounds[j][1]-v)/(bounds[j][1]-bounds[j][0]));
      const detail=`${short(row)}: parent MAE ${row.values[0]}, row MAE ${row.values[1]}, RMSE ${row.values[2]}, R² ${row.values[3]}`;
      mark(s,detail,g=>{
        g.setAttribute('class','datum radar-profile');
        g.append(el('polygon',{points:scores.map((v,i)=>point(v,i).join(',')).join(' '),fill:id==='fusion'?color:'none','fill-opacity':id==='fusion'?.045:0,stroke:color,'stroke-width':id==='fusion'?3:2,'stroke-dasharray':id==='basic'?'7 4':id==='solar'?'3 3':'none','stroke-linejoin':'round'}));
        scores.forEach((v,i)=>{const [x,y]=point(v,i);g.append(el('circle',{cx:x,cy:y,r:id==='fusion'?4.5:3,fill:color}));});
      },id);
      const [x,y]=[[50,342],[275,342],[480,342],[150,377],[420,377]][n];
      mark(s,detail,g=>{line(g,x,y-6,x+28,y-6,{stroke:color,'stroke-width':3});g.append(el('text',{x:x+38,y,fill:C.ink,'font-size':18},short(row)));},id);
    });
  }
  function metrics() {
    modelRadar();
    const tbody=document.querySelector('#full-results tbody');
    SOLAR_BENCHMARK.forEach(r=>{const tr=document.createElement('tr');tr.dataset.model=r.id;if(r.id==='fusion')tr.className='is-winner';tr.innerHTML=`<th scope="row">${esc(r.name)}</th>${r.values.map(v=>`<td>${v}</td>`).join('')}`;tbody.append(tr);});
    bars('shap-chart',Object.entries(D.explanations.mean_abs_group_attribution).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:{Drug:'Drug descriptors',Interactions:'Pair interactions',Solvent:'Solvent descriptors',Temperature:'Temperature'}[k],value:v})),.5,760,320,'Mean absolute net attribution (log₁₀ units)');
  }
  function stages() {
    const s=canvas('stage-line',760,335,'Parent MAE over three modelling stages. Point estimates, not training iterations.');
    const ids=['basic','rich','fusion'],l=85,w=600,t=35,h=210,y=v=>t+h-(v-.64)/.14*h;
    [.65,.70,.75].forEach(v=>{line(s,l,y(v),l+w,y(v));text(s,l-12,y(v)+6,fmt(v,2),{'text-anchor':'end','font-size':18});});
    const rows=ids.map(id=>SOLAR_BENCHMARK.find(r=>r.id===id));
    s.append(el('polyline',{points:rows.map((r,i)=>`${l+i*w/2},${y(+r.values[0])}`).join(' '),fill:'none',stroke:C.teal,'stroke-width':3}));
    rows.forEach((r,i)=>{const x=l+i*w/2,v=+r.values[0];mark(s,`${short(r)}: parent MAE ${r.values[0]}`,g=>g.append(el('circle',{cx:x,cy:y(v),r:7,fill:modelColor(r.id)})),r.id);text(s,x,y(v)-18,r.values[0],{'text-anchor':'middle','font-size':24,'font-weight':700});text(s,x,294,short(r),{'text-anchor':'middle','font-size':18});});
    text(s,l+w/2,331,'Parent-weighted MAE (zoomed vertical axis)',{'text-anchor':'middle','font-size':17});
  }
  function intervals() {
    forest('solar-ablation-chart',D.solarAblation.map(r=>({label:r.label,value:r.delta,low:r.lower,high:r.upper})),-.04,.25,1140,330,'Δ parent MAE versus selected SOLAR-H');
    const t=D.temperature;
    forest('temperature-chart',[
      {label:'Pooled, clustered',value:t.pooled_same_subset_slope,low:t.pooled_same_subset_cluster_ci[0],high:t.pooled_same_subset_cluster_ci[1]},
      {label:'Within pair, bootstrap',value:t.within_pair_slope,low:t.within_parent_bootstrap_ci[0],high:t.within_parent_bootstrap_ci[1]},
    ],-.03,.025,1140,250,'Slope: log₁₀ S per temperature unit (°C in v2)',5);
  }
  function errors() {
    const labels=['y ≤ −4','−4 < y ≤ −2','−2 < y ≤ 0','y > 0'];
    const {s,point}=radarBase('error-radar',labels,2.5,[.5,1,1.5,2,2.5],'Raw row MAE in four measured-solubility bands. Smaller is better.');
    const series=[{label:'SOLAR-H',key:'solar_mae',color:C.amber,id:'solar'},{label:'ExtraTrees–TabPFN',key:'mae',color:C.teal,id:'fusion'}];
    series.forEach((r,n)=>{
      const detail=r.label+': '+D.results.observed_bands.map((v,i)=>`${labels[i]} MAE ${fmt(v[r.key],3)}`).join(', ');
      mark(s,detail,g=>{g.setAttribute('class','datum radar-profile');g.append(el('polygon',{points:D.results.observed_bands.map((v,i)=>point(v[r.key],i).join(',')).join(' '),fill:r.color,'fill-opacity':.055,stroke:r.color,'stroke-width':2.7}));D.results.observed_bands.forEach((v,i)=>{const [x,y]=point(v[r.key],i);g.append(el('circle',{cx:x,cy:y,r:4,fill:r.color}));});},r.id);
      const x=n?410:170;mark(s,detail,g=>{line(g,x,353,x+28,353,{stroke:r.color,'stroke-width':3});g.append(el('text',{x:x+38,y:359,'font-size':20,fill:C.ink},r.label));},r.id);
    });
    document.getElementById('error-values').innerHTML=D.results.observed_bands.map((r,i)=>`<tr><th scope="row">${labels[i]}</th><td>${fmt(r.solar_mae,3)}</td><td>${fmt(r.mae,3)}</td></tr>`).join('');
  }

  coverage();histogram();scatter();metrics();stages();sensitivity();intervals();calibration();errors();latency();
  // One Tab stop per chart, with arrow keys for its marks, including dense grids.
  document.querySelectorAll('.data-chart').forEach(s=>s.querySelectorAll('.datum').forEach((g,i)=>g.setAttribute('tabindex',i===0?0:-1)));
  const tooltip=document.createElement('div');tooltip.className='chart-tooltip';tooltip.hidden=true;tooltip.setAttribute('role','status');document.body.append(tooltip);
  let pinned=null;
  function reveal(g,e) {
    tooltip.textContent=g.dataset.detail;tooltip.hidden=false;
    const b=g.getBoundingClientRect();
    tooltip.style.left=Math.min(innerWidth-330,Math.max(12,e?.clientX??b.left))+'px';
    tooltip.style.top=Math.max(10,Math.min(innerHeight-95,(e?.clientY??b.top)+20))+'px';
  }
  document.addEventListener('pointerover',e=>{const g=e.target.closest('.datum');if(g&&!pinned)reveal(g,e);});
  document.addEventListener('pointerout',e=>{if(e.target.closest('.datum')&&!pinned)tooltip.hidden=true;});
  document.addEventListener('focusin',e=>{const g=e.target.closest('.datum');if(g&&!pinned)reveal(g);});
  document.addEventListener('click',e=>{
    const g=e.target.closest('.datum');
    if(!g){pinned?.classList.remove('is-pinned');pinned=null;tooltip.hidden=true;return;}
    const same=pinned===g;pinned?.classList.remove('is-pinned');pinned=same?null:g;
    document.querySelectorAll('.is-emphasized').forEach(n=>n.classList.remove('is-emphasized'));
    if(pinned){g.classList.add('is-pinned');if(g.dataset.model)document.querySelectorAll('[data-model="'+g.dataset.model+'"]').forEach(n=>n.classList.add('is-emphasized'));reveal(g,e);}else tooltip.hidden=true;
  });
  document.addEventListener('keydown',e=>{
    if(e.target.matches('.datum')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) {
      e.preventDefault();e.stopPropagation();
      const marks=[...e.target.closest('svg').querySelectorAll('.datum')];
      const i=marks.indexOf(e.target),delta=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
      const next=e.key==='Home'?0:e.key==='End'?marks.length-1:(i+delta+marks.length)%marks.length;
      e.target.setAttribute('tabindex',-1);marks[next].setAttribute('tabindex',0);marks[next].focus();
    }
    if(['Enter',' '].includes(e.key)&&e.target.matches('.datum')){e.preventDefault();e.stopPropagation();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
    if(e.key==='Escape'){pinned?.classList.remove('is-pinned');pinned=null;tooltip.hidden=true;document.querySelectorAll('.is-emphasized').forEach(n=>n.classList.remove('is-emphasized'));}
  },true);
  window.addEventListener('hashchange',()=>{pinned?.classList.remove('is-pinned');pinned=null;tooltip.hidden=true;});
})();
