const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#227d75','#ce7657','#728cb7','#b69c55','#956baa','#477f9b'];
let state={tab:'predict',models:[],catalog:null,request:0,download:[]};
const modelName=id=>state.models.find(m=>m.id===id)?.name||id;
const modelShort=id=>modelName(id).split(' / ')[0];
const fmt=(v,n=4)=>v==null?'—':Number(v).toFixed(n);
async function api(path,payload){const r=await fetch(path,payload?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{});const j=await r.json();if(!r.ok)throw new Error(typeof j.detail==='string'?j.detail:'Please check your inputs. 请检查输入条件。');return j;}
function clear(){state.request++;state.download=[];$('error').textContent='';$('output').className='card placeholder';$('output').innerHTML='<span class="orb">S</span><h2>A solution starts with a molecule.<small>选择模型与条件，开始探索。</small></h2>';}
function option(r){return `<option value="${esc(r.id)}">${esc(r.name)}</option>`;}
function modelOptions(selected,exclude=''){let html='';for(const group of [...new Set(state.models.map(m=>m.group))])html+=`<optgroup label="${esc(group)}">${state.models.filter(m=>m.group===group&&m.id!==exclude).map(option).join('')}</optgroup>`;return html;}
function updateModels(){const prev=$('model-b').value;$('model-b').innerHTML=modelOptions(prev,$('model').value);if([...$('model-b').options].some(o=>o.value===prev))$('model-b').value=prev;const m=state.models.find(m=>m.id===$('model').value);$('details').innerHTML=m?`<strong>${esc(m.name)}</strong><br>Parent-group MAE: ${fmt(m.metrics.parent_macro_MAE)}<br><span>母体分组平均绝对误差</span><br>Version / 版本: ${esc(m.version)}`:'';}
function structures(){for(const side of ['drug','solvent']){const id=$(side).value;$(side+'-image').src='/api/structure/'+id;$(side+'-name').textContent=state.catalog[side==='drug'?'drugs':'solvents'].find(r=>r.id===id)?.name||'';}}
function chart(series,xlabel='Temperature',ylabel='Predicted log₁₀ solubility',scatter=false){
 const pts=series.flatMap(s=>s.x.map((x,i)=>[x,s.y[i]])).filter(p=>p.every(Number.isFinite));if(!pts.length)return '';
 let xmin=Math.min(...pts.map(p=>p[0])),xmax=Math.max(...pts.map(p=>p[0])),ymin=Math.min(...pts.map(p=>p[1])),ymax=Math.max(...pts.map(p=>p[1]));if(xmin===xmax)xmax++;let pad=(ymax-ymin||1)*.12;ymin-=pad;ymax+=pad;if(scatter){xmin=0;ymin=0;xmax=ymax=Math.max(xmax,ymax)*1.02;}
 const ydigits=Math.min(6,Math.max(2,Math.ceil(-Math.log10((ymax-ymin)/4))+1));
 const W=700,H=310,L=64,R=24,T=22,B=52,X=v=>L+(v-xmin)/(xmax-xmin)*(W-L-R),Y=v=>H-B-(v-ymin)/(ymax-ymin)*(H-T-B);
 let svg=`<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ylabel)}" xmlns="http://www.w3.org/2000/svg"><rect width="700" height="310" fill="white"/>`;
 for(let i=0;i<5;i++){let x=xmin+(xmax-xmin)*i/4,y=ymin+(ymax-ymin)*i/4;svg+=`<path d="M${L} ${Y(y)}H${W-R}" stroke="#e6ece7"/><text x="${L-9}" y="${Y(y)+4}" text-anchor="end" fill="#6c7d7b" font-size="11">${fmt(y,ydigits)}</text><text x="${X(x)}" y="${H-B+22}" text-anchor="middle" fill="#6c7d7b" font-size="11">${fmt(x,1)}</text>`;}
 if(scatter)svg+=`<path d="M${X(0)} ${Y(0)}L${X(xmax)} ${Y(ymax)}" stroke="#8b9e98" stroke-dasharray="5 4"><title>Equal error / 相同误差</title></path>`;
 series.forEach((s,j)=>{const c=colors[j%colors.length];if(scatter){s.x.forEach((x,i)=>svg+=`<circle cx="${X(x)}" cy="${Y(s.y[i])}" r="3" fill="${c}" opacity=".65"><title>${esc(s.label)}: ${fmt(x)}, ${fmt(s.y[i])}</title></circle>`);}else{svg+=`<polyline fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" points="${s.x.map((x,i)=>X(x)+','+Y(s.y[i])).join(' ')}"/>`;s.x.forEach((x,i)=>svg+=`<circle cx="${X(x)}" cy="${Y(s.y[i])}" r="4" fill="transparent"><title>${esc(s.label)} · ${fmt(x,2)}: ${fmt(s.y[i])}</title></circle>`);}});
 svg+=`<text x="${(L+W-R)/2}" y="${H-5}" text-anchor="middle" font-size="12" fill="#193b3a">${esc(xlabel)}</text><text transform="translate(16 ${(T+H-B)/2}) rotate(-90)" text-anchor="middle" font-size="12" fill="#193b3a">${esc(ylabel)}</text></svg>`;
 return svg+`<div class="legend">${series.map((s,i)=>`<span><i style="background:${colors[i%colors.length]}"></i>${esc(s.label)}</span>`).join('')}</div>`;
}
function title(en,zh){return `<div class="result-title"><h3>${en}<small>${zh}</small></h3><button class="download" id="download">Download CSV / 下载</button></div>`;}
function card(label,v,note,alt=false){return `<div class="metric${alt?' alt':''}"><span>${esc(label)}</span><strong>${v}</strong><small>${note}</small></div>`;}
function metricsTable(a,b){const rows=[['Parent MAE ↓ / 母体 MAE','parent_macro_MAE'],['MAE ↓ / 平均绝对误差','MAE'],['RMSE ↓ / 均方根误差','RMSE'],['R² ↑ / 决定系数','R2'],['Fit time (s) / 训练时间','fit_seconds'],['Inference (ms/row) / 推理时间','inference_ms_per_row']];return `<div class="table-scroll"><table><thead><tr><th>Grouped validation / 分组评价</th><th>${esc(modelName(a.model))}</th><th>${esc(modelName(b.model))}</th></tr></thead><tbody>${rows.map(([l,k])=>`<tr><td>${l}</td><td>${fmt(a[k])}</td><td>${fmt(b[k])}</td></tr>`).join('')}</tbody></table></div>`;}
function download(){if(!state.download.length)return;const keys=[...new Set(state.download.flatMap(Object.keys))];let csv=keys.join(',')+'\n'+state.download.map(r=>keys.map(k=>JSON.stringify(r[k]??'')).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));a.download='solubility_'+state.tab+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function run(){
 const token=++state.request;$('error').textContent='';$('run').disabled=true;state.download=[];$('output').innerHTML='';$('output').className='card';
 const q={model_id:$('model').value,drug_id:$('drug').value,solvent_id:$('solvent').value,temperature:Number($('temperature').value),temperature_min:Number($('tmin').value),temperature_max:Number($('tmax').value),solvent_ids:[$('solvent').value,...[...$('multi').selectedOptions].map(o=>o.value).filter(v=>v!==$('solvent').value)]};
 try{for(const id of (state.tab==='predict'?['temperature']:['temperature','tmin','tmax']))if(!$(id).value.trim())throw new Error('Enter a temperature value. 请输入温度数值。');if(q.solvent_ids.length>12)throw new Error('Select up to 12 solvents in total. 溶剂总数最多为12种。');let html='';if(state.tab==='predict'){
  const r=await api('/api/predict',q);if(token!==state.request)return;
  html=title('Predicted solubility','溶解度预测')+`<div class="metrics">${card('log₁₀ S',fmt(r.log_solubility),'Log concentration / 对数浓度')}${card('S · mol/L',r.concentration==null?'—':r.concentration.toPrecision(4),'Converted from log₁₀ S / 反变换浓度',true)}</div><p class="delta">${esc(modelName(r.model_id))} · ${esc($('drug-name').textContent)} × ${esc($('solvent-name').textContent)} · T = ${q.temperature}</p>`;
  if(r.base)html+=`<div class="table-scroll"><table><tr><td>Reference-temperature baseline / 参考温度基线</td><td>${fmt(r.base[0])}</td></tr><tr><td>Temperature contribution / 温度贡献</td><td>${fmt(r.temperature_component[0])}</td></tr></table></div>`;
  state.download=[{model:modelName(r.model_id),model_id:r.model_id,drug_id:q.drug_id,solvent_id:q.solvent_id,temperature:q.temperature,predicted_log10:r.log_solubility,concentration_mol_L:r.concentration}];
 }else if(state.tab==='explore'){
  const r=await api('/api/curve',q);if(token!==state.request)return;
  html=title('Temperature response','温度响应与溶剂比较')+chart(r.lines.map(l=>({x:r.temperatures,y:l.values,label:l.name})));
  r.lines.forEach(l=>r.temperatures.forEach((t,i)=>state.download.push({model:modelName(r.model_id),model_id:r.model_id,drug_id:q.drug_id,solvent:l.name,temperature:t,predicted_log10:l.values[i]})));
 }else{
  const r=await api('/api/compare',{...q,model_b:$('model-b').value});if(token!==state.request)return;
  html=title('Model comparison','相同条件，两种模型')+`<div class="metrics">${card(modelName(r.a.model_id),fmt(r.a.log_solubility),'Predicted log₁₀ S / 预测值')}${card(modelName(r.b.model_id),fmt(r.b.log_solubility),'Predicted log₁₀ S / 预测值',true)}</div><p class="delta">B − A = <strong>${fmt(r.difference)}</strong> log₁₀ units / 预测差值</p>`;
  const series=[];[r.curve_a,r.curve_b].forEach(c=>c.lines.forEach(l=>series.push({x:c.temperatures,y:l.values,label:modelName(c.model_id)+' · '+l.name})));
  html+=chart(series)+`<h3 style="margin-top:32px">Response difference<small>温度响应差值 B − A</small></h3>`+chart(r.curve_a.lines.map((l,i)=>({x:r.curve_a.temperatures,y:l.values.map((v,j)=>r.curve_b.lines[i].values[j]-v),label:l.name})),'Temperature','Prediction difference (B − A)');
  html+=`<h3 style="margin-top:32px">Validation performance<small>统一分组评价</small></h3>`+metricsTable(r.metrics_a,r.metrics_b)+chart([{x:r.group_errors.a,y:r.group_errors.b,label:'Parent-level errors'}],modelShort(r.a.model_id)+' · Parent MAE',modelShort(r.b.model_id)+' · Parent MAE',true);
  [r.curve_a,r.curve_b].forEach(c=>c.lines.forEach(l=>c.temperatures.forEach((t,i)=>state.download.push({model:modelName(c.model_id),model_id:c.model_id,drug_id:q.drug_id,solvent:l.name,temperature:t,predicted_log10:l.values[i]}))));
 }
 $('output').innerHTML=html;$('download').onclick=download;
 }catch(e){if(token===state.request){$('error').textContent=e.message;$('output').innerHTML='<h3>Adjust your selection<small>请调整输入后重试。</small></h3>';}}finally{$('run').disabled=false;}
}
function switchTab(tab){state.tab=tab;clear();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('workspace').hidden=tab==='method';$('method').hidden=tab!=='method';$('model-b-wrap').hidden=tab!=='compare';$('range').hidden=tab==='predict';$('multi-wrap').hidden=tab==='predict';$('run').innerHTML=tab==='compare'?'Compare models <span>比较模型 →</span>':tab==='explore'?'Explore response <span>探索响应 →</span>':'Predict solubility <span>预测溶解度 →</span>';}
async function init(){try{
 const [c,m]=await Promise.all([api('/api/catalog'),api('/api/models')]);state.catalog=c;state.models=m.models;
 if(!m.models.length)throw new Error('Models are not available. 模型暂不可用。');
 for(const [id,rows] of [['drug',c.drugs],['solvent',c.solvents],['multi',c.solvents]])$(id).innerHTML=rows.map(option).join('');
 $('drug').value=c.drugs.find(r=>r.name==='Caffeine')?.id||c.drugs[0].id;$('solvent').value=c.solvents.find(r=>r.name==='Acetone')?.id||c.solvents[0].id;
 $('model').innerHTML=modelOptions(m.default);$('model').value=m.default;updateModels();if(m.comparator!==m.default)$('model-b').value=m.comparator;structures();
 $('leaderboard').innerHTML='<table><thead><tr><th>Model</th><th>Parent MAE ↓</th><th>MAE ↓</th><th>RMSE ↓</th><th>R² ↑</th></tr></thead><tbody>'+[...m.models].sort((a,b)=>a.metrics.parent_macro_MAE-b.metrics.parent_macro_MAE).map(m=>`<tr><td>${esc(m.name)}</td>${['parent_macro_MAE','MAE','RMSE','R2'].map(k=>'<td>'+fmt(m.metrics[k])+'</td>').join('')}</tr>`).join('')+'</tbody></table>';
 $('run').onclick=run;document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));document.querySelectorAll('.controls input,.controls select').forEach(el=>el.onchange=()=>{clear();if(el.id==='model')updateModels();if(['drug','solvent'].includes(el.id))structures();});switchTab('predict');
 }catch(e){$('error').textContent=e.message;}}
init();
