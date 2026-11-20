/* SOLAR Studio: dependency-free, local-first teaching workbench. */
'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
 flask:'M9 3h6m-5 0v6L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9V3M8 14h8',
 layers:'m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
 curve:'M3 4v16h18M6 16c4 0 3-9 7-9s3 5 7-3',
 table:'M3 4h18v16H3zM3 9h18M9 4v16M15 9v11M3 15h18',
 chart:'M3 3v18h18M7 16v-5M12 16V6M17 16V9',
 book:'M12 5c-3-3-8-2-9-1v15c2-1 6-2 9 0 3-2 7-1 9 0V4c-1-1-6-2-9 1Zm0 0v14',
 shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
 expand:'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',
 play:'m8 4 12 8-12 8V4Z',
 database:'M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3Zm0 0v12c0 2-4 3-8 3s-8-1-8-3V6m0 6c0 2 4 3 8 3s8-1 8-3',
 molecule:'m12 3 8 5v8l-8 5-8-5V8l8-5Zm0 0v7m8-2-8 5-8-5m8 5v8',
 target:'M21 12a9 9 0 1 1-9-9m0 4a5 5 0 1 0 5 5m-5 0 9-9m-5 0h5v5',
 sliders:'M4 6h7m4 0h5M4 12h2m4 0h10M4 18h10m4 0h2M11 3v6M6 9v6m8 0v6',
 search:'M17 17l4 4M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
 download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
 upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
 info:'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
 clock:'M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
 check:'m5 12 4 4L19 6',
 file:'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h8'
};
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.info}"/></svg>`;}
function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});}
const palette=['#2d8b76','#bf8b48','#6888b0','#b77772','#8e83b2','#578b98'];
const views={
 overview:['Project overview / 项目总览','OVERVIEW / LAB HOME','Traceable molecular machine learning / 可溯源的分子机器学习','14 models · Parent-grouped nested validation · RDKit descriptors / 14 种模型 · 母体分组嵌套验证 · 分子理化描述符','Start exploring / 开始探索'],
 predict:['Solubility prediction / 溶解度预测','01 / PREDICTION LAB','Start a molecular experiment / 开启你的分子实验','Choose a drug, solvent and temperature to inspect predictions and data support. / 选择药物、溶剂与温度，查看预测结果与数据支持。','Predict solubility / 预测溶解度'],
 compare:['Model comparison / 模型对照实验','02 / MODEL COMPARISON','Compare models under identical conditions / 在相同条件下，看见模型差异','Use identical inputs and evaluation to compare predictions and generalization across parents. / 统一输入、统一评价，比较预测与跨母体推广表现。','Compare models / 运行模型对照'],
 explore:['Temperature and solvent explorer / 温度与溶剂探索','03 / CONDITION EXPLORER','Explore responses to changing conditions / 改变条件，追踪模型响应','Fix the drug structure and explore temperature responses across solvents. / 固定药物结构，探索温度曲线与不同溶剂的响应。','Explore responses / 探索条件响应'],
 screen:['Solvent screening / 全溶剂筛选排序','04 / SOLVENT SCREENING','Rank all 49 solvents for a drug / 为选定药物全景筛选并排序 49 种溶剂','Screen every catalog solvent at a fixed temperature to discover solubility patterns and polarity trends. / 在固定温度下对目录全部溶剂进行批量推理与排序，探索极性规律。','Screen all solvents / 筛选全部溶剂'],
 batch:['Batch experiments / 批量实验','05 / BATCH EXPERIMENTS','Turn hypotheses into experiments / 把一组假设，变成一组实验','Import CSV or load examples; run up to 100 rows with individual results and errors. / 导入 CSV 或载入示例；每次最多 100 条，逐行显示结果与错误。','Run batch predictions / 运行批量预测'],
 insights:['Data and model evidence / 数据与模型证据','EVIDENCE / DATA & MODELS','Good results need good evidence / 好结果，也需要好证据','Understand the experimental design behind the numbers, from splits to evaluation. / 从数据划分到统一评价，理解数字背后的实验设计。',''],
 learn:['Learning center / 互动学习中心','LEARN / EXPERIMENT / REFLECT','Understand the prediction, not just the number / 不止看见预测，也理解预测','Follow the model to learn through explanation and reflection. / 循着模型的思路，完成一次有解释、有反思的学习。',''],
 journal:['Experiment notebook / 实验记录笔记本','JOURNAL / NOTEBOOK','Verifiable local experiment records / 本地可核验实验记录','The latest 30 experiments stay in this browser. / 最近 30 次实验保存在本机浏览器，可一键恢复条件继续探索。','']
};
const STORE='solar-experiments-v3';
let history=[];
try{const saved=JSON.parse(localStorage.getItem(STORE)||'[]');if(Array.isArray(saved))history=saved.filter(r=>r&&['predict','compare','explore','screen'].includes(r.tab)&&r.q&&typeof r.q==='object'&&!Array.isArray(r.q)&&(r.q.solvent_ids==null||(Array.isArray(r.q.solvent_ids)&&r.q.solvent_ids.every(id=>typeof id==='string')))&&typeof r.time==='string'&&typeof r.label==='string').slice(0,30);}catch(_){/* Storage is optional. */}
const state={tab:'overview',models:[],catalog:null,insights:null,request:0,controller:null,current:null,stale:false,showObservations:true,unit:'log',history,allHistory:false,defaultModel:'TabPFN_ExtraTreesBlend',comparator:'AdaptiveHybrid',batchRequest:0,molCache:{},molReq:0,screenFilter:'all',screenSort:'desc',diagCache:{},leaderboardGroup:'all',radarSelected:['TabPFN_ExtraTreesBlend','AdaptiveHybrid'],compareDeck:'radar',predictDeck:'prediction',exploreDeck:'curves',screenDeck:'ranking',insightsDeck:'protocol',overviewDeck:'dashboard'};
const chartRegistry=new Map();
let chartSeq=0;
const fmt=(v,n=4)=>Number.isFinite(Number(v))&&v!==null&&v!==''?Number(v).toFixed(n):'—';
const short=id=>(state.models.find(m=>m.id===id)?.name||id).split(' / ')[0];
const label=(side,id)=>state.catalog?.[side==='drug'?'drugs':'solvents'].find(x=>x.id===id)?.name||id;
const selected=(side,id)=>state.catalog?.[side==='drug'?'drugs':'solvents'].find(x=>x.id===id);
const chinese=text=>String(text);

const MODEL_COLORS = {
  TabPFN_ExtraTreesBlend: '#2d8b76',
  TabPFN_TwoTreeBlend: '#10b981',
  AdaptiveHybrid: '#d97706',
  ExtraTrees: '#2563eb',
  RandomForest: '#4f46e5',
  TabM: '#8b5cf6',
  HistGradientBoosting: '#0284c7',
  RealMLP: '#dc2626',
  HybridConditional: '#b45309',
  TemperatureMLP: '#db2777',
  PlainMLP: '#7c3aed',
  InteractionConditional: '#0f766e',
  Ridge: '#475569',
  Dummy: '#9ca3af'
};
function getModelColor(id, idx = 0) {
  return MODEL_COLORS[id] || palette[idx % palette.length];
}

const MODEL_TAKEAWAYS = {
  TabPFN_ExtraTreesBlend: {
    en: 'Best parent generalization & accuracy; balances tabular foundation model with molecular feature trees.',
    zh: '跨母体推广与绝对精度最优；在表格基础模型先验上融合分子特征树。'
  },
  TabPFN_TwoTreeBlend: {
    en: 'Strong second-place generalization; two-tree ensemble provides robust variance reduction.',
    zh: '泛化表现次优；双树集成提供稳健的方差缩减。'
  },
  AdaptiveHybrid: {
    en: 'SOLAR baseline with dynamic confidence blending; fast inference with moderate model size.',
    zh: 'SOLAR 自适应置信度融合基线；推理速度快，参数规模适中。'
  },
  ExtraTrees: {
    en: 'Top single-tree model; high explained variance (R² 0.42) with ultra-fast inference (0.04 ms/row).',
    zh: '最优单树模型；高方差解释率 (R² 0.42) 与极低推理时延 (0.04 ms/条)。'
  },
  RandomForest: {
    en: 'Solid tree ensemble baseline; balanced stability across diverse molecular chemical families.',
    zh: '稳健的随机森林基线；对不同化学骨架具有均衡的预测稳定性。'
  },
  TabM: {
    en: 'Strongest neural model; multi-head weight sharing boosts tabular fingerprint representation.',
    zh: '神经网络对照中最强；多头权重共享机制显著提升表格指纹表征能力。'
  },
  HistGradientBoosting: {
    en: 'Efficient gradient boosted trees; excellent record accuracy with fast native histogram binning.',
    zh: '高效直方图梯度提升树；样本精度高且具备低延迟原生分箱优势。'
  },
  RealMLP: {
    en: 'Regularized deep MLP; normalized layer embeddings prevent severe molecular overfitting.',
    zh: '正则化深度感知机；归一化层有效减缓高维指纹特征上的过拟合。'
  },
  HybridConditional: {
    en: 'SOLAR conditional hybrid; cleanly separates structural baseline from thermal condition terms.',
    zh: 'SOLAR 条件混合模型；将结构基线与温度条件项进行解耦分解。'
  },
  TemperatureMLP: {
    en: 'Thermal physics-aware MLP; integrates temperature directly into hidden representations.',
    zh: '温度感知多层感知机；将热力学温度直接融合至隐层特征表征。'
  },
  PlainMLP: {
    en: 'Standard MLP baseline; high inference throughput but struggles on novel parent generalization.',
    zh: '基础全连接感知机；推理吞吐高，但未见新母体外推泛化受限。'
  },
  InteractionConditional: {
    en: 'Explicit pairwise interaction model; provides pedagogical interpretability of solute-solvent pairs.',
    zh: '显式交互模型；展示药物与溶剂成对交叉项对溶解度的解释作用。'
  },
  Ridge: {
    en: 'L2-regularized linear baseline; fast benchmark that exposes non-linear chemical interactions.',
    zh: 'L2 线性基线；极快基准，反衬出非线性化学相互作用的必要性。'
  },
  Dummy: {
    en: 'Constant mean baseline (0-utility anchor); lowest accuracy, instant inference time.',
    zh: '常数均值基线；误差最大，提供零信息量对照锚点。'
  }
};

const RADAR_AXES = [
  {
    key: 'parent_macro_MAE',
    labelEn: 'Parent Generalization',
    labelZh: '跨母体推广 (↓)',
    better: 'lower',
    descEn: 'Macro-averaged MAE across unseen parent drug groups (primary project metric).',
    descZh: '未见母体药物分组宏平均绝对误差（项目首要评价指标，越低越好）。',
    format: v => fmt(v, 4),
    score: v => Math.max(8, Math.min(98, 100 * (0.98 - v) / (0.98 - 0.65)))
  },
  {
    key: 'MAE',
    labelEn: 'Record Accuracy',
    labelZh: '样本绝对精度 (↓)',
    better: 'lower',
    descEn: 'Mean Absolute Error across all evaluation records.',
    descZh: '全部验证样本上的平均绝对误差（越低越好）。',
    format: v => fmt(v, 4),
    score: v => Math.max(8, Math.min(98, 100 * (1.08 - v) / (1.08 - 0.64)))
  },
  {
    key: 'R2',
    labelEn: 'Explained Variance',
    labelZh: '方差解释率 R² (↑)',
    better: 'higher',
    descEn: 'Coefficient of determination (proportion of variance explained).',
    descZh: '决定系数 R²，反映模型对溶解度变化的解释比例（越高越好）。',
    format: v => fmt(v, 4),
    score: v => Math.max(8, Math.min(98, 100 * (v - (-0.08)) / (0.55 - (-0.08))))
  },
  {
    key: 'RMSE',
    labelEn: 'Error Stability',
    labelZh: '极值离群控制 (↓)',
    better: 'lower',
    descEn: 'Root Mean Squared Error (penalizes large outlier errors).',
    descZh: '均方根误差，对极端离群预测给予更大惩罚（越低越好）。',
    format: v => fmt(v, 4),
    score: v => Math.max(8, Math.min(98, 100 * (1.35 - v) / (1.35 - 0.86)))
  },
  {
    key: 'inference_ms_per_row',
    labelEn: 'Inference Speed',
    labelZh: '推理时效吞吐 (↑)',
    better: 'speed',
    descEn: 'Log-scale throughput based on ms per sample.',
    descZh: '单样本推理耗时（对数变换换算为速度得分，耗时越短吞吐越高）。',
    format: v => v < 0.01 ? (v * 1000).toFixed(1) + ' µs' : fmt(v, 2) + ' ms',
    score: v => {
      const logV = Math.log10(Math.max(1e-6, Number(v) || 1.0));
      return Math.max(15, Math.min(98, 100 * (1.0 - logV) / (1.0 - (-4.52))));
    }
  }
];

function computeModelRadarScores(modelId) {
  const m = state.models.find(x => x.id === modelId);
  if (!m || !m.metrics) return null;
  const met = m.metrics;
  return RADAR_AXES.map((axis, i) => {
    const raw = met[axis.key];
    const score = axis.score(raw);
    return {
      axisIndex: i,
      key: axis.key,
      labelEn: axis.labelEn,
      labelZh: axis.labelZh,
      raw,
      formatted: axis.format(raw),
      score: Number(score.toFixed(1)),
      better: axis.better
    };
  });
}

function buildRadarSVG(selectedIds) {
  const width = 520, height = 430;
  const cx = 260, cy = 215, R = 145;
  const K = RADAR_AXES.length;
  const angles = Array.from({length: K}, (_, i) => -Math.PI / 2 + i * 2 * Math.PI / K);

  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPolys = levels.map(frac => {
    const pts = angles.map(th => `${(cx + frac * R * Math.cos(th)).toFixed(1)},${(cy + frac * R * Math.sin(th)).toFixed(1)}`).join(' ');
    const isOuter = frac === 1.0;
    return `<polygon points="${pts}" fill="${isOuter ? 'rgba(248, 250, 252, 0.6)' : 'none'}" stroke="${isOuter ? 'var(--border)' : '#cbd5e1'}" stroke-width="${isOuter ? '1.5' : '1'}" stroke-dasharray="${isOuter ? 'none' : '3,3'}" />`;
  }).join('');

  const gridLabels = levels.map(frac => {
    return `<text x="${cx + 6}" y="${(cy - frac * R + 3).toFixed(1)}" fill="#94a3b8" font-size="9" font-family="var(--mono)">${Math.round(frac * 100)}</text>`;
  }).join('');

  const spokes = angles.map(th => {
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(th)).toFixed(1)}" y2="${(cy + R * Math.sin(th)).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2" />`;
  }).join('');

  const axisLabels = RADAR_AXES.map((axis, i) => {
    const th = angles[i];
    const labelDist = R + 26;
    const lx = cx + labelDist * Math.cos(th);
    const ly = cy + labelDist * Math.sin(th);
    let anchor = 'middle';
    let dyEn = 0, dyZh = 13;
    if (i === 0) {
      anchor = 'middle';
      dyEn = -6;
      dyZh = 12;
    } else if (i === 1) {
      anchor = 'start';
      dyEn = -2;
      dyZh = 13;
    } else if (i === 2) {
      anchor = 'start';
      dyEn = 4;
      dyZh = 13;
    } else if (i === 3) {
      anchor = 'end';
      dyEn = 4;
      dyZh = 13;
    } else if (i === 4) {
      anchor = 'end';
      dyEn = -2;
      dyZh = 13;
    }
    return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}">
      <tspan x="${lx.toFixed(1)}" dy="${dyEn}" font-weight="600" font-size="11.5" fill="var(--text-main)">${axis.labelEn}</tspan>
      <tspan x="${lx.toFixed(1)}" dy="${dyZh}" font-size="10" fill="var(--text-muted)">${axis.labelZh}</tspan>
    </text>`;
  }).join('');

  const modelSvgGroups = selectedIds.map((id, mIdx) => {
    const m = state.models.find(x => x.id === id);
    if (!m) return '';
    const scores = computeModelRadarScores(id);
    if (!scores) return '';
    const color = getModelColor(id, mIdx);
    const pts = scores.map((s, i) => {
      const dist = (s.score / 100) * R;
      const px = cx + dist * Math.cos(angles[i]);
      const py = cy + dist * Math.sin(angles[i]);
      return {x: px, y: py, s};
    });
    const polyStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const fillOp = selectedIds.length > 5 ? '0.07' : selectedIds.length > 2 ? '0.12' : '0.18';
    const strokeW = selectedIds.length > 5 ? '1.8' : '2.5';

    const dots = pts.map((p, i) => {
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="${color}" stroke="#ffffff" stroke-width="1.5" class="radar-dot" data-model="${esc(id)}" data-axis="${i}" data-score="${p.s.score}" data-raw="${esc(p.s.formatted)}" data-name="${esc(short(id))}" data-label="${esc(p.s.labelEn)} (${esc(p.s.labelZh)})" />`;
    }).join('');

    return `<g class="radar-model-group" data-model="${esc(id)}">
      <polygon points="${polyStr}" fill="${color}" fill-opacity="${fillOp}" stroke="${color}" stroke-width="${strokeW}" stroke-linejoin="round" class="radar-polygon" data-model="${esc(id)}" data-name="${esc(short(id))}" />
      ${dots}
    </g>`;
  }).join('');

  const centerDot = `<circle cx="${cx}" cy="${cy}" r="3" fill="#94a3b8" />`;

  return `<svg viewBox="0 0 ${width} ${height}" class="radar-svg" role="img" aria-label="Model evaluation radar chart">
    <g class="radar-grid">${gridPolys}${gridLabels}${spokes}</g>
    <g class="radar-axes">${axisLabels}</g>
    <g class="radar-models">${modelSvgGroups}</g>
    ${centerDot}
  </svg>`;
}

function buildRadarMatrixHTML(selectedIds) {
  if (!selectedIds || selectedIds.length === 0) {
    return `<div class="radar-empty-hint">Please select at least one model above to display its multi-dimensional capability breakdown. / 请在上方至少勾选一个模型以查看多维能力矩阵。</div>`;
  }

  let html = '';

  if (selectedIds.length === 2) {
    const [idA, idB] = selectedIds;
    const mA = state.models.find(x => x.id === idA);
    const mB = state.models.find(x => x.id === idB);
    if (mA && mB) {
      const scoresA = computeModelRadarScores(idA);
      const scoresB = computeModelRadarScores(idB);
      html += `<div class="radar-head2head-card">
        <div class="h2h-header">
          <div class="h2h-title">Head-to-Head Comparison / 逐项对决 (A vs B)</div>
          <button type="button" class="button outline compact radar-apply-compare-btn" data-pair-a="${esc(idA)}" data-pair-b="${esc(idB)}">
            <span class="btn-stack"><span lang="en" class="btn-text-en">Set as Compare Inputs</span><span lang="zh-CN" class="btn-text-zh">设为表单对比</span></span>
          </button>
        </div>
        <div class="h2h-grid">
          ${RADAR_AXES.map((axis, i) => {
            const scA = scoresA[i].score, scB = scoresB[i].score;
            const rawA = scoresA[i].formatted, rawB = scoresB[i].formatted;
            const aWins = scA > scB;
            const bWins = scB > scA;
            return `<div class="h2h-row">
              <span class="h2h-label">${esc(axis.labelEn)}</span>
              <span class="h2h-val ${aWins ? 'win' : ''}">${esc(short(idA))}: ${rawA} (${scA}) ${aWins ? '✓' : ''}</span>
              <span class="h2h-val ${bWins ? 'win' : ''}">${esc(short(idB))}: ${rawB} (${scB}) ${bWins ? '✓' : ''}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
  }

  html += selectedIds.map((id, mIdx) => {
    const m = state.models.find(x => x.id === id);
    if (!m) return '';
    const scores = computeModelRadarScores(id);
    if (!scores) return '';
    const color = getModelColor(id, mIdx);
    const takeaway = MODEL_TAKEAWAYS[id] || {en: 'Baseline model in the evaluation benchmark.', zh: '评估基准中的对照模型。'};
    const rank = [...state.models].sort((a,b)=>(a.metrics?.parent_macro_MAE||99)-(b.metrics?.parent_macro_MAE||99)).findIndex(x=>x.id===id) + 1;

    return `<div class="radar-model-card" style="--model-color:${color}">
      <div class="rmc-header">
        <div class="rmc-name-group">
          <span class="rmc-name">${esc(short(id))}</span>
          <span class="rmc-group">${esc(chinese(m.group))}</span>
        </div>
        <div class="rmc-badges">
          <span class="badge ${rank === 1 ? 'good' : ''}">Rank #${rank}</span>
          <span class="badge">Parent MAE ${fmt(m.metrics.parent_macro_MAE, 4)}</span>
        </div>
      </div>

      <div class="rmc-dim-list">
        ${scores.map(s => {
          return `<div class="rmc-dim-row">
            <div class="rmc-dim-meta">
              <span class="rmc-dim-name">${esc(s.labelEn)} · ${esc(s.labelZh)}</span>
              <span class="rmc-dim-val">${s.score} <small>(${esc(s.formatted)})</small></span>
            </div>
            <div class="rmc-bar-track">
              <div class="rmc-bar-fill" style="width:${s.score}%;background:${color}"></div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="rmc-takeaway">
        <strong>Takeaway / 特性：</strong>${takeaway.en}<br><span style="color:var(--text-muted);font-size:0.75rem">${takeaway.zh}</span>
      </div>

      <div class="rmc-actions">
        <button type="button" class="text-button radar-focus-btn" data-focus="${esc(id)}">
          <span class="btn-stack"><span lang="en" class="btn-text-en">Focus</span><span lang="zh-CN" class="btn-text-zh">仅看此项</span></span>
        </button>
        <button type="button" class="text-button radar-remove-btn" data-remove="${esc(id)}">
          <span class="btn-stack"><span lang="en" class="btn-text-en">Remove</span><span lang="zh-CN" class="btn-text-zh">取消勾选</span></span>
        </button>
      </div>
    </div>`;
  }).join('');

  return html;
}

function renderRadarComponent() {
  if (!state.models || state.models.length === 0) return '';
  const selected = state.radarSelected || [state.defaultModel, state.comparator];
  const countStr = `${selected.length} / ${state.models.length}`;
  const sortedModels = [...state.models].sort((a,b) => (a.metrics?.parent_macro_MAE || 99) - (b.metrics?.parent_macro_MAE || 99));

  return `<div class="card radar-comparison-card" id="radar-comparison-card">
    <div class="radar-card-header">
      <div class="radar-card-title-group">
        <span class="card-kicker">MODEL EVALUATION RADAR / 多维评价雷达图</span>
        <h3 class="radar-card-title">
          <span class="title-en">Multi-Model Performance &amp; Efficiency Radar</span>
          <span class="title-zh">现有模型综合评价雷达图 · 5维全景对比</span>
        </h3>
        <p class="radar-card-desc">
          Compare models across 5 normalized dimensions: Parent Generalization, Record Accuracy, Explained Variance (R²), Error Stability (RMSE), and Inference Speed.
          <br><span class="desc-zh">在统一的 5×3 嵌套分组验证口径下，评估跨母体推广、记录精度、方差解释、误差稳定性与推理吞吐。</span>
        </p>
      </div>
      <div class="radar-selected-badge">
        <span class="badge" id="radar-count-badge">${countStr} selected / 已选</span>
      </div>
    </div>

    <div class="radar-presets-bar">
      <span class="radar-bar-label">Quick presets / 快速选择预设:</span>
      <div class="radar-presets-btns">
        <button type="button" class="button outline compact radar-preset-btn" data-preset="pair">
          <span class="btn-stack"><span lang="en" class="btn-text-en">Current Pair</span><span lang="zh-CN" class="btn-text-zh">当前对比模型</span></span>
        </button>
        <button type="button" class="button outline compact radar-preset-btn" data-preset="top3">
          <span class="btn-stack"><span lang="en" class="btn-text-en">Top 3 Models</span><span lang="zh-CN" class="btn-text-zh">榜单前三</span></span>
        </button>
        <button type="button" class="button outline compact radar-preset-btn" data-preset="arch4">
          <span class="btn-stack"><span lang="en" class="btn-text-en">4 Architectures</span><span lang="zh-CN" class="btn-text-zh">典型架构对比</span></span>
        </button>
        <button type="button" class="button outline compact radar-preset-btn" data-preset="tree_vs_nn">
          <span class="btn-stack"><span lang="en" class="btn-text-en">Tree vs Neural</span><span lang="zh-CN" class="btn-text-zh">树模型 vs 神经网络</span></span>
        </button>
        <button type="button" class="button outline compact radar-preset-btn" data-preset="all">
          <span class="btn-stack"><span lang="en" class="btn-text-en">All 14 Models</span><span lang="zh-CN" class="btn-text-zh">全部 14 款</span></span>
        </button>
        <button type="button" class="button outline compact radar-preset-btn" data-preset="clear">
          <span class="btn-stack"><span lang="en" class="btn-text-en">Reset to A</span><span lang="zh-CN" class="btn-text-zh">重置为模型 A</span></span>
        </button>
      </div>
    </div>

    <div class="radar-chips-bar">
      <span class="radar-bar-label">Toggle models to compare / 点击切换勾选对比模型:</span>
      <div class="radar-chips-container" id="radar-chips-container">
        ${sortedModels.map((m, idx) => {
          const isAct = selected.includes(m.id);
          const color = getModelColor(m.id, idx);
          return `<button type="button" class="radar-chip ${isAct ? 'active' : ''}" data-model-id="${esc(m.id)}" style="--chip-color:${color}">
            <span class="radar-chip-dot" style="background:${color}"></span>
            <span class="radar-chip-name">${esc(short(m.id))}</span>
            <span class="radar-chip-rank">#${idx + 1}</span>
          </button>`;
        }).join('')}
      </div>
    </div>

    <div class="radar-content-grid">
      <div class="radar-chart-stage">
        <div class="radar-svg-wrapper" id="radar-svg-wrapper">
          ${buildRadarSVG(selected)}
        </div>
        <div class="radar-tooltip" id="radar-tooltip"></div>
        <div class="radar-axis-guide">
          <span class="guide-item"><i class="guide-arrow down">↓</i> Lower is better: Parent MAE, MAE, RMSE / 误差越低越好</span>
          <span class="guide-item"><i class="guide-arrow up">↑</i> Higher is better: R², Speed / 解释率与时效越高越好</span>
        </div>
      </div>

      <div class="radar-matrix-panel" id="radar-matrix-panel">
        ${buildRadarMatrixHTML(selected)}
      </div>
    </div>
  </div>`;
}

function bindRadarEvents(container) {
  const root = container?.querySelector('#radar-comparison-card') || container;
  if (!root) return;

  function updateRadarDisplay() {
    const badge = root.querySelector('#radar-count-badge');
    if (badge) badge.textContent = `${state.radarSelected.length} / ${state.models.length} selected / 已选`;

    root.querySelectorAll('.radar-chip').forEach(chip => {
      const mid = chip.dataset.modelId;
      chip.classList.toggle('active', state.radarSelected.includes(mid));
    });

    const svgWrap = root.querySelector('#radar-svg-wrapper');
    if (svgWrap) {
      svgWrap.innerHTML = buildRadarSVG(state.radarSelected);
      bindSvgHovers();
    }

    const matrixPanel = root.querySelector('#radar-matrix-panel');
    if (matrixPanel) {
      matrixPanel.innerHTML = buildRadarMatrixHTML(state.radarSelected);
      bindMatrixActions();
    }
  }

  root.querySelectorAll('.radar-chip').forEach(chip => {
    chip.onclick = e => {
      e.preventDefault();
      const mid = chip.dataset.modelId;
      if (state.radarSelected.includes(mid)) {
        if (state.radarSelected.length > 1) {
          state.radarSelected = state.radarSelected.filter(x => x !== mid);
        } else {
          toast('Keep at least 1 model selected / 请至少保留一个模型');
          return;
        }
      } else {
        state.radarSelected.push(mid);
      }
      updateRadarDisplay();
    };
  });

  root.querySelectorAll('.radar-preset-btn').forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      const preset = btn.dataset.preset;
      if (preset === 'pair') {
        const curA = $('model')?.value || state.defaultModel;
        const curB = $('model-b')?.value || state.comparator;
        state.radarSelected = [curA, curB];
      } else if (preset === 'top3') {
        state.radarSelected = ['TabPFN_ExtraTreesBlend', 'TabPFN_TwoTreeBlend', 'AdaptiveHybrid'];
      } else if (preset === 'arch4') {
        state.radarSelected = ['TabPFN_ExtraTreesBlend', 'AdaptiveHybrid', 'ExtraTrees', 'TabM'];
      } else if (preset === 'tree_vs_nn') {
        state.radarSelected = ['ExtraTrees', 'RandomForest', 'HistGradientBoosting', 'TabM', 'RealMLP', 'TemperatureMLP'];
      } else if (preset === 'all') {
        state.radarSelected = state.models.map(m => m.id);
      } else if (preset === 'clear') {
        const curA = $('model')?.value || state.defaultModel;
        state.radarSelected = [curA];
      }
      updateRadarDisplay();
    };
  });

  function bindMatrixActions() {
    root.querySelectorAll('.radar-focus-btn').forEach(btn => {
      btn.onclick = () => {
        const mid = btn.dataset.focus;
        state.radarSelected = [mid];
        updateRadarDisplay();
      };
    });

    root.querySelectorAll('.radar-remove-btn').forEach(btn => {
      btn.onclick = () => {
        const mid = btn.dataset.remove;
        if (state.radarSelected.length > 1) {
          state.radarSelected = state.radarSelected.filter(x => x !== mid);
          updateRadarDisplay();
        } else {
          toast('Keep at least 1 model selected / 请至少保留一个模型');
        }
      };
    });

    root.querySelectorAll('.radar-apply-compare-btn').forEach(btn => {
      btn.onclick = () => {
        const {pairA, pairB} = btn.dataset;
        if (pairA && pairB && $('model') && $('model-b')) {
          $('model').value = pairA;
          updateModels();
          $('model-b').value = pairB;
          structures();
          toast(`Comparison pair set to: ${short(pairA)} vs ${short(pairB)} / 已设为表单对比`);
        }
      };
    });
  }

  function bindSvgHovers() {
    const tooltip = root.querySelector('#radar-tooltip');
    const stage = root.querySelector('.radar-chart-stage');
    if (!tooltip || !stage) return;

    root.querySelectorAll('.radar-dot').forEach(dot => {
      dot.onmouseenter = e => {
        const {name, label, score, raw} = dot.dataset;
        tooltip.innerHTML = `<div class="radar-tooltip-title">${esc(name)}</div>
          <div class="radar-tooltip-score">${esc(label)}: <strong>${score}</strong> / 100</div>
          <div class="radar-tooltip-raw">Benchmark / 实测: <strong>${esc(raw)}</strong></div>`;
        const stageRect = stage.getBoundingClientRect();
        const dotRect = dot.getBoundingClientRect();
        const left = dotRect.left - stageRect.left + 12;
        const top = dotRect.top - stageRect.top - 10;
        tooltip.style.left = `${Math.min(stageRect.width - 240, Math.max(10, left))}px`;
        tooltip.style.top = `${Math.max(10, top)}px`;
        tooltip.style.opacity = '1';
      };
      dot.onmouseleave = () => {
        tooltip.style.opacity = '0';
      };
    });

    root.querySelectorAll('.radar-polygon').forEach(poly => {
      poly.onmouseenter = () => {
        const mid = poly.dataset.model;
        root.querySelectorAll(`.radar-model-card[style*="${mid}"]`).forEach(card => card.style.borderColor = 'var(--teal)');
      };
      poly.onmouseleave = () => {
        root.querySelectorAll('.radar-model-card').forEach(card => card.style.borderColor = '');
      };
    });
  }

  bindMatrixActions();
  bindSvgHovers();
}
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
async function api(path,payload,signal){
 const controller=signal?null:new AbortController(),timer=controller?setTimeout(()=>controller.abort(),90000):null;
 try{const r=await fetch(path,{...(payload?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{}),signal:signal||controller.signal});let j;try{j=await r.json();}catch(_){throw new Error('Invalid service response. Check the local server. / 服务响应异常，请检查本地服务。');}if(!r.ok){const d=j.detail;throw new Error(typeof d==='string'?chinese(d):Array.isArray(d)?'Invalid input: / 输入有误：'+d.map(x=>x.loc?.slice(1).join('.')+' '+x.msg).join('；'):'Request failed. Please try again. / 请求失败，请稍后重试。');}return j;}finally{if(timer)clearTimeout(timer);}
}
function option(r){return `<option value="${esc(r.id)}">${esc(r.name)}</option>`;}
function modelOptions(exclude=''){return [...new Set(state.models.map(m=>m.group))].map(group=>`<optgroup label="${esc(chinese(group))}">${state.models.filter(m=>m.group===group&&m.id!==exclude).map(option).join('')}</optgroup>`).join('');}
function updateModels(){
 const prev=$('model-b').value;$('model-b').innerHTML=modelOptions($('model').value);if([...$('model-b').options].some(o=>o.value===prev))$('model-b').value=prev;else if($('model-b').querySelector(`option[value="${state.comparator}"]`))$('model-b').value=state.comparator;
 const m=state.models.find(m=>m.id===$('model').value);if(!m)return;
 $('model-hint').textContent=m.id===state.defaultModel?'Main method: tabular foundation model and molecular feature tree blend / 主方法 · 表格基础模型与分子特征树融合':chinese(m.group);
 $('details').innerHTML=`<strong>${esc(m.name)}</strong><br>Parent MAE / 母体 MAE：${fmt(m.metrics.parent_macro_MAE)}<br>Training seed: 2026; metrics average three seeds / 训练种子：2026；指标为三个随机种子的均值${m.weights?'<br>Blend weights / 融合权重：'+Object.entries(m.weights).map(([k,v])=>esc(k)+' '+fmt(v,2)).join(' · '):''}${m.temperature_gain!=null?'<br>Temperature gain / 温度增益 γ：'+fmt(m.temperature_gain,2):''}`;
}
async function getMolProfile(id){
 if(!id)return null;if(state.molCache[id])return state.molCache[id];
 try{const p=await api('/api/molecule/'+encodeURIComponent(id));state.molCache[id]=p;return p;}catch(_){return null;}
}
function renderMolProps(side,p){
 const el=$(side+'-props');if(!el)return;
 if(!p){el.innerHTML='';return;}
 const pr=p.properties;
 el.innerHTML=`<span class="mol-prop-chip"><strong>${esc(p.formula)}</strong></span><span class="mol-prop-chip">MW <strong>${fmt(pr.MolWt,1)}</strong></span><span class="mol-prop-chip">cLogP <strong>${fmt(pr.MolLogP,2)}</strong></span><span class="mol-prop-chip">TPSA <strong>${fmt(pr.TPSA,1)}</strong></span>${side==='drug'?`<span class="mol-prop-chip ${p.lipinski_violations===0?'ro5-ok':'ro5-warn'}">${p.lipinski_violations===0?'Ro5 ✓':'Ro5: '+p.lipinski_violations+' viol.'}</span>`:''}<span class="mol-prop-chip">Dev <strong>${p.dev_support.row_count}</strong></span>`;
}
function updatePairMatch(dp,sp){
 const pill=$('pair-match-pill');if(!pill)return;
 if(!dp||!sp){pill.hidden=true;return;}
 const dLogP=Math.abs(dp.properties.MolLogP-sp.properties.MolLogP);
 const similar=dLogP<=1.5;
 pill.className='pair-match-pill'+(similar?'':' warn');
 pill.innerHTML=`ΔcLogP ${fmt(dLogP,2)}<br>${similar?'Similar polarity / 极性相近':'Polarity gap / 极性差异'}`;
 pill.hidden=false;
}
function structures(){
 const req=++state.molReq;
 const dId=$('drug').value,sId=$('solvent').value;
 for(const side of ['drug','solvent']){
  const r=selected(side,$(side).value);
  $(side+'-image').src=r?'/api/structure/'+encodeURIComponent(r.id):'';
  $(side+'-image').alt=r?r.name+'  molecular structure / 的二维分子结构':'No molecule selected / 未选择分子';
  $(side+'-name').textContent=r?.name||'No matches / 没有匹配项';
  $(side+'-smiles').textContent=r?.smiles||'';$(side+'-smiles').title=r?.smiles||'';
  if(!r)$(side+'-props').innerHTML='';
 }
 Promise.all([getMolProfile(dId),getMolProfile(sId)]).then(([dp,sp])=>{
  if(req!==state.molReq)return;
  renderMolProps('drug',dp);renderMolProps('solvent',sp);updatePairMatch(dp,sp);
 });
}
async function openMolModal(side){
 const id=$(side).value,r=selected(side,id);if(!r)return;
 const p=await getMolProfile(id);
 $('mol-dialog-kicker').textContent=(side==='drug'?'DRUG':'SOLVENT')+' MOLECULAR PROFILE / 分子理化档案';
 $('mol-dialog-title').textContent=r.name;
 if(!p){$('mol-dialog-body').innerHTML='<p class="chart-caption">Profile unavailable.</p>';$('mol-dialog').showModal();return;}
 const pr=p.properties;
 $('mol-dialog-body').innerHTML=`<div class="mol-detail-hero"><img src="/api/structure/${encodeURIComponent(id)}" alt="${esc(r.name)}"><div class="mol-detail-meta"><strong>${esc(p.formula)}</strong><code>${esc(p.smiles)}</code><div class="tag-row" style="justify-content:flex-start"><span class="badge">Dev rows / 开发集 ${p.dev_support.row_count}</span><span class="badge">Partners / 配对数 ${p.dev_support.partner_count}</span>${p.dev_support.temp_min!=null?`<span class="badge">T: ${p.dev_support.temp_min} ~ ${p.dev_support.temp_max}</span>`:''}</div></div></div><div class="mol-detail-grid"><div class="mol-detail-stat"><span>MolWt (g/mol)</span><strong>${fmt(pr.MolWt,2)}</strong></div><div class="mol-detail-stat"><span>cLogP (Crippen)</span><strong>${fmt(pr.MolLogP,3)}</strong></div><div class="mol-detail-stat"><span>TPSA (Å²)</span><strong>${fmt(pr.TPSA,2)}</strong></div><div class="mol-detail-stat"><span>HBD / HBA</span><strong>${pr.HBD} / ${pr.HBA}</strong></div><div class="mol-detail-stat"><span>Rotatable Bonds</span><strong>${pr.RotatableBonds}</strong></div><div class="mol-detail-stat"><span>Rings (Aromatic)</span><strong>${pr.RingCount} (${pr.AromaticRings})</strong></div><div class="mol-detail-stat"><span>Heavy Atoms</span><strong>${pr.HeavyAtomCount}</strong></div><div class="mol-detail-stat"><span>Fraction CSP3</span><strong>${fmt(pr.FractionCSP3,3)}</strong></div><div class="mol-detail-stat"><span>Lipinski Ro5</span><strong>${p.lipinski_violations===0?'Pass (0 viol.)':p.lipinski_violations+' violations'}</strong></div></div>`;
 $('mol-dialog').showModal();
}
function emptyOutput(){
  if(state.tab==='compare'){
    const deck = state.compareDeck || 'radar';
    const tabs = [
      {id: 'radar', en: 'Multi-Model Radar', zh: '5维综合评价雷达图'},
      {id: 'guide', en: 'Comparison Guide', zh: '对照实验操作指南'}
    ];
    const tabsBar = `<div class="deck-tabs-bar" role="tablist" aria-label="Comparison subviews">
      ${tabs.map(t => `<button type="button" class="deck-tab ${deck === t.id ? 'active' : ''}" data-deck="${t.id}" role="tab" aria-selected="${deck === t.id}">
        <span class="btn-stack"><span lang="en" class="btn-text-en">${t.en}</span><span lang="zh-CN" class="btn-text-zh">${t.zh}</span></span>
      </button>`).join('')}
    </div>`;

    if(deck === 'radar'){
      return tabsBar + `<div class="deck-pane">${renderRadarComponent()}</div>`;
    }
    return tabsBar + `<div class="deck-pane scrollable"><div class="card empty-state"><span class="empty-symbol">${icon('layers')}</span><h3>Controlled Model Comparison / 同条件模型对照实验指南</h3><p>Choose two models on the left to compare predictions and grouped evaluation under identical conditions. / 选择左侧两种不同模型，在统一条件下比较预测与分组评价。</p><div class="tag-row"><span>5×3 Nested Protocol / 5×3 嵌套分组验证</span><span>14 Models / 14 种模型</span><span>5 Evaluation Dimensions / 5 维综合指标</span></div><button class="button outline" id="quick-start">${icon('play')}<span class="btn-stack"><span lang="en" class="btn-text-en">Run classroom comparison</span><span lang="zh-CN" class="btn-text-zh">运行课堂对照示例</span></span></button></div></div>`;
  }
  return `<div class="card empty-state"><span class="empty-symbol">${icon(state.tab==='explore'?'curve':state.tab==='screen'?'sliders':'flask')}</span><h3>${state.tab==='explore'?'Discover patterns in response curves / 一条曲线，开启新的发现':state.tab==='screen'?'Screen all 49 catalog solvents / 一次运行，遍历全部 49 种溶剂':'Start exploring with a molecule / 从一个分子，开始探索'}</h3><p>${state.tab==='explore'?'Set a temperature range and solvents to explore model responses. / 设定温度范围与溶剂，观察模型如何响应条件变化。':state.tab==='screen'?'Select a drug, model and temperature to rank all catalog solvents and inspect polarity patterns. / 选择药物、模型与温度，对全部溶剂溶解度排序并分析极性规律。':'Set conditions to obtain a real model prediction, / 设置左侧条件，获得真实模型预测，<br>then inspect supporting development observations. / 并查看开发集中的观测支持。'}</p><div class="tag-row"><span>Real models / 真实模型</span><span>RDKit descriptors / 分子理化属性</span><span>Data support / 数据支持</span></div><button class="button outline" id="quick-start">${icon('play')}<span class="btn-stack"><span lang="en" class="btn-text-en">Run classroom example</span><span lang="zh-CN" class="btn-text-zh">运行课堂示例</span></span></button></div>`;
}
function setEmpty(){
  $('output').innerHTML=emptyOutput();
  window.StudioLanguage.normalize($('output'));
  if($('quick-start'))$('quick-start').onclick=()=>loadDemo(state.tab);
  document.querySelectorAll('#output [data-deck]').forEach(b=>{
    b.onclick=()=>{
      if(state.tab==='compare')state.compareDeck=b.dataset.deck;
      setEmpty();
    };
  });
  if(state.tab==='compare' && (state.compareDeck || 'radar') === 'radar')bindRadarEvents($('output'));
}
function cancelRun(){state.request++;state.controller?.abort();state.controller=null;$('run').disabled=false;if(views[state.tab]?.[4])window.StudioLanguage.btn($('run-label'),views[state.tab][4]);$('output').removeAttribute('aria-busy');}
function invalidate(){cancelRun();state.stale=!!state.current;$('error').textContent='';if(state.current){if(!$('output').querySelector('.stale-banner'))$('output').insertAdjacentHTML('afterbegin','<div class="stale-banner">Conditions changed. The results below belong to the previous run; run again to update. / 条件已更改。下方仍为上一次实验结果；点击运行以更新。</div>');}else setEmpty();}
function switchView(tab,scroll=false){
 if(!views[tab])return;cancelRun();state.tab=tab;state.current=null;state.stale=false;state.unit='log';$('error').textContent='';
 document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===tab;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===tab);b.setAttribute('aria-pressed',String(b.dataset.mode===tab));});
 const isOverview=tab==='overview';
 const isExperiment=['predict','compare','explore','screen'].includes(tab);
 $('overview-view').hidden=!isOverview;
 $('experiment-view').hidden=!isExperiment;
 $('batch-view').hidden=tab!=='batch';
 $('insights-view').hidden=tab!=='insights';
 $('learn-view').hidden=tab!=='learn';
 $('journal-view').hidden=tab!=='journal';
 $('page-title').textContent=views[tab][0];

 if(isExperiment){
  $('workspace-kicker').textContent=views[tab][1];
  window.StudioLanguage.heading($('workspace-title'),views[tab][2]);
  $('workspace-subtitle').textContent=views[tab][3];
  window.StudioLanguage.btn($('run-label'),views[tab][4]);
  $('model-b-wrap').hidden=tab!=='compare';
  $('solvent-field').hidden=tab==='screen';
  $('range-fields').hidden=!['compare','explore'].includes(tab);
  $('tmin').disabled=!['compare','explore'].includes(tab);
  $('tmax').disabled=!['compare','explore'].includes(tab);
  $('multi-wrap').hidden=tab!=='explore';
  setEmpty();
 }
 if(tab==='insights')renderInsights();
 if(tab==='learn')window.LearningStudio?.render($('learning-content'));
 if(tab==='journal')renderHistory();
 window.StudioLanguage.normalize();
 window.scrollTo({top:0,left:0,behavior:'instant'});
 const mainEl=$('main');if(mainEl)mainEl.scrollTop=0;
}
function resetConditions(){
 $('drug-search').value='';$('solvent-search').value='';$('drug').innerHTML=state.catalog.drugs.map(option).join('');$('solvent').innerHTML=state.catalog.solvents.map(option).join('');$('drug').value=state.catalog.drugs.find(r=>r.name==='Lovastatin')?.id||state.catalog.drugs[0].id;$('solvent').value=state.catalog.solvents.find(r=>r.name==='Acetone')?.id||state.catalog.solvents[0].id;$('model').value=state.defaultModel;updateModels();$('model-b').value=state.comparator;$('temperature').value=25;$('temperature-slider').value=25;$('tmin').value=10;$('tmax').value=45;document.querySelectorAll('#solvent-chips input').forEach(el=>el.checked=false);[...$('multi').options].forEach(o=>o.selected=false);structures();invalidate();
}
function readConditions(){
 const q={model_id:$('model').value,drug_id:$('drug').value,solvent_id:$('solvent').value,temperature:Number($('temperature').value),temperature_min:Number($('tmin').value),temperature_max:Number($('tmax').value)};
 for(const id of ['compare','explore'].includes(state.tab)?['temperature','tmin','tmax']:['temperature'])if(!$(id).value.trim()||!Number.isFinite(Number($(id).value))||Math.abs(Number($(id).value))>1000)throw new Error('Enter a finite temperature between -1000 and 1000. / 请输入 −1000 至 1000 之间的有效温度。');
 if(!q.drug_id||(state.tab!=='screen'&&!q.solvent_id))throw new Error('Choose a drug and solvent from the catalog. / 请选择目录中的药物与溶剂。');if(['compare','explore'].includes(state.tab)&&q.temperature_min>=q.temperature_max)throw new Error('The starting temperature must be below the ending temperature. / 温度曲线起点须小于终点。');
 q.solvent_ids=state.tab==='explore'?[...new Set([q.solvent_id,...[...document.querySelectorAll('#solvent-chips input:checked')].map(x=>x.value),...[...$('multi').selectedOptions].map(o=>o.value)])]:[q.solvent_id];if(q.solvent_ids.length>6)throw new Error('Select up to six solvents for a readable chart. / 为保证图表可读性，每次最多选择 6 种溶剂。');
 if(state.tab==='compare'){q.model_b=$('model-b').value;if(q.model_id===q.model_b)throw new Error('Choose two different models. / 请选择两种不同的模型。');}return q;
}
function resultHeader(title,kicker){return `<div class="result-heading"><h3>${window.StudioLanguage.html(title)}<small>${esc(kicker)}</small></h3><div class="result-actions"><button class="button outline" data-export="csv">${icon('download')}Export CSV / 导出 CSV</button><button class="button outline" data-export="report">${icon('file')}Experiment report / 实验报告</button></div></div>`;}
function valueCard(title,value,note,alt=false){return `<div class="prediction-value${alt?' alt':''}"><span>${esc(title)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`;}
function callout(text,warn=false){return `<div class="callout${warn?' warn':''}"><span>${icon('info')}</span><p>${text}</p></div>`;}
function gainNote(id){const m=state.models.find(m=>m.id===id);return m?.temperature_gain===0?callout(`<strong>${esc(short(id))} Current model: gamma = 0. / 当前模型 γ = 0。</strong>Inner validation disabled the temperature term. A flat response is expected; select SOLAR-N to explore its temperature response. / 内层选择关闭了温度分量，因此平坦响应符合实际模型。可切换 SOLAR-N 观察其温度响应。`,true):'';}
function domainHTML(e){
 const d=e.domain,badge=(yes,a,b)=>`<span class="badge ${yes?'good':'warn'}">${icon(yes?'check':'info')}${yes?a:b}</span>`;
 return `<div class="domain-strip">${badge(d.parent_seen,'Parent seen in development / 开发集已见母体','Parent unseen in development / 开发集未见母体')}${badge(d.pair_seen,'Pair observations / 组合观测 '+e.support.pair_rows+' rows / 条','No pair observations / 组合暂无实测')}${badge(d.temperature_in_range&&(!d.pair_seen||d.pair_temperature_in_range),d.pair_seen?'Within observed pair range / 组合温度范围内':'Within global temperature range / 全局温度范围内','Temperature extrapolation / 存在温度外推')}</div>${d.notes.length?callout(d.notes.map(n=>esc(chinese(n))).join('；')+'。',true):''}${label('drug',e.drug_id).toLowerCase()==='glucose'?callout('The Glucose name and structure require verification; inference uses the supplied SMILES. / 原数据中的 Glucose 名称与结构存在待核对疑点；推理使用提供的 SMILES。',true):''}`;
}
function axisText(value){const text=String(value),i=text.indexOf(' / ');return i<0?esc(text):esc(text.slice(0,i))+`<tspan x="0" dy="13" font-size="9">${esc(text.slice(i+3))}</tspan>`;}
function chart(series,{xLabel='Temperature T, original dataset scale / 温度 T · 数据原始尺度',yLabel='log₁₀ S',identity=false,id=''}={}){
 const valid=series.map(s=>({...s,points:s.x.map((x,i)=>[Number(x),Number(s.y[i]),s.pointLabels?.[i],s.pointColors?.[i]]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]))})).filter(s=>s.points.length);const pts=valid.flatMap(s=>s.points);if(!pts.length)return '<p class="chart-caption">Values cannot be plotted on this scale. / 当前数值无法在此尺度绘制。</p>';
 let xmin=Math.min(...pts.map(p=>p[0])),xmax=Math.max(...pts.map(p=>p[0])),ymin=Math.min(...pts.map(p=>p[1])),ymax=Math.max(...pts.map(p=>p[1]));if(xmin===xmax){xmin-=1;xmax+=1;}if(identity){xmin=0;ymin=0;xmax=ymax=Math.max(xmax,ymax,0.1)*1.05;}else{const padding=(ymax-ymin||Math.max(Math.abs(ymax)*.03,.1))*.15;ymin-=padding;ymax+=padding;}
 const W=700,H=310,L=72,R=22,T=20,B=68,X=x=>L+(x-xmin)/(xmax-xmin)*(W-L-R),Y=y=>H-B-(y-ymin)/(ymax-ymin)*(H-T-B);
 const tick=v=>Math.abs(v)>9999||(Math.abs(v)<.001&&v!==0)?v.toExponential(1):Math.abs(ymax-ymin)<.1?v.toFixed(4):v.toFixed(2);
 const cid='chart-'+(++chartSeq);
 chartRegistry.set(cid,{valid,xmin,xmax,ymin,ymax,W,H,L,R,T,B,identity,xLabel,yLabel});
 let svg=`<svg class="plot" data-cid="${cid}" ${id?'id="'+esc(id)+'"':''} viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(yLabel+' versus / 与 '+xLabel)}" style="font-family:system-ui,sans-serif"><title>${esc(yLabel+' versus / 与 '+xLabel)}</title><rect width="${W}" height="${H}" fill="white"/>`;
 for(let i=0;i<=4;i++){const y=ymin+(ymax-ymin)*i/4,x=xmin+(xmax-xmin)*i/4;svg+=`<path d="M${L} ${Y(y)}H${W-R}" stroke="#e9eef0"/><text x="${L-10}" y="${Y(y)+4}" text-anchor="end" fill="#8a9ba4" font-size="10">${tick(y)}</text><text x="${X(x)}" y="${H-B+20}" text-anchor="middle" fill="#8a9ba4" font-size="10">${x.toFixed(1)}</text>`;}
 if(identity)svg+=`<path d="M${X(0)} ${Y(0)}L${X(xmax)} ${Y(ymax)}" stroke="#a1b3b9" stroke-dasharray="5 5"/>`;
 valid.forEach((s,j)=>{const c=s.color||palette[j%palette.length];if(s.kind!=='dots')svg+=`<polyline fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round" points="${s.points.map(p=>X(p[0])+','+Y(p[1])).join(' ')}"/>`;s.points.forEach(p=>{const pc=p[3]||c;svg+=`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${s.kind==='dots'?4.2:3.5}" fill="${pc}" opacity="${s.kind==='dots'?'.82':'0'}"><title>${esc(p[2]||s.label)} · X=${fmt(p[0],2)} · Y=${fmt(p[1],4)}</title></circle>`;});});
 svg+=`<line class="chart-crosshair" x1="0" x2="0" y1="${T}" y2="${H-B}" stroke="#34796e" stroke-width="1" stroke-dasharray="3 3" opacity="0"/><g class="chart-highlights"></g>`;
 svg+=`<text transform="translate(${(L+W-R)/2} ${H-18})" text-anchor="middle" font-size="11" fill="#6a858d">${axisText(xLabel)}</text><text transform="translate(16 ${(T+H-B)/2}) rotate(-90)" text-anchor="middle" font-size="11" fill="#6a858d">${axisText(yLabel)}</text></svg>`;
 return `<div class="chart-wrap">${svg}<div class="chart-tooltip" hidden></div></div><div class="legend">${valid.map((s,j)=>`<span><i class="${s.kind==='dots'?'dot':''}" style="background:${s.color||palette[j%palette.length]}"></i>${esc(s.label)}</span>`).join('')}</div>`;
}
function attachChartInteractivity(root=document){
 root.querySelectorAll('.chart-wrap svg.plot[data-cid]').forEach(svg=>{
  const meta=chartRegistry.get(svg.dataset.cid);if(!meta)return;
  const wrap=svg.parentElement,tip=wrap.querySelector('.chart-tooltip'),cross=svg.querySelector('.chart-crosshair'),hi=svg.querySelector('.chart-highlights');
  const {valid,xmin,xmax,ymin,ymax,W,H,L,R,T,B,identity}=meta;
  const X=x=>L+(x-xmin)/(xmax-xmin)*(W-L-R),Y=y=>H-B-(y-ymin)/(ymax-ymin)*(H-T-B);
  svg.addEventListener('mousemove',e=>{
   const rect=svg.getBoundingClientRect();
   const sx=(e.clientX-rect.left)/rect.width*W,sy=(e.clientY-rect.top)/rect.height*H;
   if(sx<L||sx>W-R||sy<T||sy>H-B){tip.hidden=true;cross.setAttribute('opacity','0');hi.innerHTML='';return;}
   const dataX=xmin+(sx-L)/(W-L-R)*(xmax-xmin);
   const dataY=ymax-(sy-T)/(H-T-B)*(ymax-ymin);
   const hits=[];
   const isScatter=valid.every(s=>s.kind==='dots');
   if(isScatter){
    let best=null,bestD=Infinity;
    valid.forEach((s,j)=>{const c=s.color||palette[j%palette.length];s.points.forEach(p=>{const d=Math.hypot(X(p[0])-sx,Y(p[1])-sy);if(d<bestD){bestD=d;best={s,p,c:p[3]||c};}});});
    if(best&&bestD<28)hits.push(best);
   }else{
    valid.forEach((s,j)=>{const c=s.color||palette[j%palette.length];let best=null,bestD=Infinity;s.points.forEach(p=>{const d=Math.abs(p[0]-dataX);if(d<bestD){bestD=d;best=p;}});if(best)hits.push({s,p:best,c:best[3]||c});});
   }
   if(!hits.length){tip.hidden=true;cross.setAttribute('opacity','0');hi.innerHTML='';return;}
   const cx=X(hits[0].p[0]);
   cross.setAttribute('x1',cx);cross.setAttribute('x2',cx);cross.setAttribute('opacity','0.65');
   hi.innerHTML=hits.map(h=>`<circle cx="${X(h.p[0])}" cy="${Y(h.p[1])}" r="5.5" fill="none" stroke="${h.c}" stroke-width="2"/><circle cx="${X(h.p[0])}" cy="${Y(h.p[1])}" r="3" fill="${h.c}"/>`).join('');
   const title=hits[0].p[2]?esc(hits[0].p[2]):(identity?`X = ${fmt(hits[0].p[0],3)}`:`T = ${fmt(hits[0].p[0],2)}`);
   tip.innerHTML=`<div class="tt-title">${title}</div>`+hits.map(h=>`<div class="tt-row"><span><i class="tt-dot" style="background:${h.c}"></i>${esc(h.s.label.split(' / ')[0])}</span><strong>${fmt(h.p[1],4)}</strong></div>`).join('')+(identity&&hits[0]?`<div class="tt-row" style="color:#a8cdc1"><span>X vs Y</span><strong>${fmt(hits[0].p[0],3)} vs ${fmt(hits[0].p[1],3)}</strong></div>`:'');
   tip.hidden=false;
   const px=(e.clientX-rect.left)+14,py=(e.clientY-rect.top)-12;
   tip.style.left=Math.min(px,rect.width-tip.offsetWidth-8)+'px';
   tip.style.top=Math.max(4,Math.min(py,rect.height-tip.offsetHeight-4))+'px';
  });
  svg.addEventListener('mouseleave',()=>{tip.hidden=true;cross.setAttribute('opacity','0');hi.innerHTML='';});
 });
}
function chartToolbar(){return '<div class="chart-tools"><label class="observations-toggle"><input id="observations-toggle" type="checkbox" '+(state.showObservations?'checked':'')+'>Observed points / 实测点</label><button data-unit="log" class="'+(state.unit==='log'?'active':'')+'">log₁₀ S / 对数尺度</button><button data-unit="raw" class="'+(state.unit==='raw'?'active':'')+'">Original scale 10ʸ / 原尺度 10ʸ</button><button data-export="svg">Export SVG / 导出 SVG</button></div>';}
const transform=ys=>state.unit==='raw'?ys.map(v=>10**v):ys;
function evidenceBlock(e,r){
 const observations=e.observations;return `<div class="card result-card"><div class="chart-header"><h3>Observed evidence and data support / 实测对照与数据支持</h3><span class="badge">Development data only / 仅开发集</span></div>${domainHTML(e)}<div class="support-info"><span>Drug structure support / 药物结构支持：${e.support.drug_rows} rows / 条</span><span>Solvent structure support / 溶剂结构支持：${e.support.solvent_rows} rows / 条</span><span>Selected pair / 该组合：${e.support.pair_rows} rows / 条</span></div>${observations.length?chart([{x:observations.map(o=>o.temperature),y:observations.map(o=>o.log_solubility),label:'Development observations / 开发集观测',kind:'dots',color:'#bf9a62'},{x:[r.temperature],y:[r.log_solubility],label:'Current prediction / 本次模型预测',kind:'dots',color:'#2d8b76'}]):'<div class="journal-empty">No development observations exist for this pair. Explore model responses in the condition explorer. / 该药物与溶剂组合暂无开发集观测。可在条件探索中比较模型响应。</div>'}<p class="chart-caption">Development observations may be used in model training. They describe data support, not independent test accuracy or prediction intervals. Values follow CSV field definitions. / 开发集观测可能参与模型训练；此处仅说明数据支持，不作为独立测试准确率，也不代表预测置信区间。图中数值来自 CSV 字段约定。</p></div>`;
}
function metricsTable(a,b){
  const mA = state.models?.find(m => m.id === a.model || m.id === a.model_id)?.metrics || a;
  const mB = state.models?.find(m => m.id === b.model || m.id === b.model_id)?.metrics || b;
  const rows = [
    ['Parent MAE / 母体 MAE ↓', 'parent_macro_MAE'],
    ['Record MAE / 记录 MAE ↓', 'MAE'],
    ['RMSE ↓', 'RMSE'],
    ['R² ↑', 'R2'],
    ['Fit time / 训练耗时 / s', 'fit_seconds'],
    ['Inference / 推理 / ms·row⁻¹', 'inference_ms_per_row']
  ];
  return `<div class="table-scroll"><table><thead><tr><th>Nested grouped validation, mean across three seeds / 嵌套分组验证 · 三种子均值</th><th>${esc(short(a.model || a.model_id))}</th><th>${esc(short(b.model || b.model_id))}</th></tr></thead><tbody>${rows.map(([title,key])=>`<tr><td>${title}</td><td class="${key==='R2'?(mA[key]>mB[key]?'cell-best':''):(mA[key]<mB[key]?'cell-best':'')}">${fmt(mA[key])}</td><td class="${key==='R2'?(mB[key]>mA[key]?'cell-best':''):(mB[key]<mA[key]?'cell-best':'')}">${fmt(mB[key])}</td></tr>`).join('')}</tbody></table></div>`;
}

function deckTabsBar(deckVar, activeDeck, tabs){
  return `<div class="deck-tabs-bar" role="tablist">
    ${tabs.map(t => `<button type="button" class="deck-tab ${activeDeck === t.id ? 'active' : ''}" data-deck="${t.id}" data-deck-var="${deckVar}" role="tab" aria-selected="${activeDeck === t.id}">
      <span class="btn-stack"><span lang="en" class="btn-text-en">${t.en}</span><span lang="zh-CN" class="btn-text-zh">${t.zh}</span></span>
    </button>`).join('')}
  </div>`;
}

function renderScreenBody(r){
  const items=r.results;
  const filtered=items.filter(x=>state.screenFilter==='all'?true:state.screenFilter==='obs'?x.pair_rows>0:x.pair_rows===0);
  const sorted=[...filtered].sort((a,b)=>state.screenSort==='desc'?b.log_solubility-a.log_solubility:a.log_solubility-b.log_solubility);
  const vals=items.map(x=>x.log_solubility),minV=Math.min(...vals),maxV=Math.max(...vals),span=Math.max(maxV-minV,1e-6);
  const obsCount=items.filter(x=>x.pair_rows>0).length;
  const med=[...vals].sort((a,b)=>a-b)[Math.floor(vals.length/2)];
  return `<div class="deck-split-grid">
    <div class="deck-split-col">
      <div class="card result-card" style="padding:14px 16px;">
        <div class="batch-summary">
          <div class="batch-stat"><span>Highest / 最高 log₁₀ S</span><strong>${fmt(maxV,3)}</strong></div>
          <div class="batch-stat"><span>Median / 中位 log₁₀ S</span><strong>${fmt(med,3)}</strong></div>
          <div class="batch-stat"><span>Lowest / 最低 log₁₀ S</span><strong>${fmt(minV,3)}</strong></div>
          <div class="batch-stat"><span>Observed pairs / 已有实测</span><strong>${obsCount} / ${items.length}</strong></div>
        </div>
        <div class="screen-toolbar">
          <div class="screen-filters">
            <button type="button" class="pill-btn ${state.screenFilter==='all'?'active':''}" data-sfilter="all">All (${items.length}) / 全部</button>
            <button type="button" class="pill-btn ${state.screenFilter==='obs'?'active':''}" data-sfilter="obs">Observed (${obsCount}) / 实测</button>
            <button type="button" class="pill-btn ${state.screenFilter==='unobs'?'active':''}" data-sfilter="unobs">Unobserved (${items.length-obsCount}) / 未测</button>
          </div>
          <div class="screen-filters">
            <button type="button" class="pill-btn ${state.screenSort==='desc'?'active':''}" data-ssort="desc">Highest first ↓ / 降序 ↓</button>
            <button type="button" class="pill-btn ${state.screenSort==='asc'?'active':''}" data-ssort="asc">Lowest first ↑ / 升序 ↑</button>
          </div>
        </div>
        <div class="screen-list" style="flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;">
          ${sorted.map((x,idx)=>{const pct=Math.max(4,((x.log_solubility-minV)/span)*100);return `<button type="button" class="screen-row" data-pick-solvent="${esc(x.solvent_id)}" title="Click to inspect in Point Prediction / 点击跳转单点预测"><span class="screen-rank">${idx+1}</span><span class="screen-name">${esc(x.name)}</span><span class="screen-bar-track"><span class="screen-bar-fill ${x.pair_rows>0?'observed':''}" style="width:${pct}%"></span></span><span class="screen-val">${fmt(x.log_solubility,3)}</span><span class="screen-badge ${x.pair_rows>0?'obs':''}">${x.pair_rows>0?x.pair_rows+' obs':'pred'}</span></button>`;}).join('')}
        </div>
        <p class="chart-caption" style="margin-top:6px;">Click any solvent row to open it in Point Prediction. / 点击任意溶剂行可直接跳转单点预测。</p>
      </div>
    </div>
    <div class="deck-split-col">
      <div class="card result-card" style="padding:14px 16px;">
        <div class="chart-header"><h3>Predicted solubility vs Solvent cLogP / 预测溶解度与溶剂疏水性关系</h3></div>
        ${chart([{x:items.filter(x=>x.pair_rows===0&&x.mol_logp!=null).map(x=>x.mol_logp),y:items.filter(x=>x.pair_rows===0&&x.mol_logp!=null).map(x=>x.log_solubility),pointLabels:items.filter(x=>x.pair_rows===0&&x.mol_logp!=null).map(x=>x.name),label:'Unobserved pairs / 模型预测',kind:'dots',color:'#34796e'},{x:items.filter(x=>x.pair_rows>0&&x.mol_logp!=null).map(x=>x.mol_logp),y:items.filter(x=>x.pair_rows>0&&x.mol_logp!=null).map(x=>x.log_solubility),pointLabels:items.filter(x=>x.pair_rows>0&&x.mol_logp!=null).map(x=>x.name+' ('+x.pair_rows+' obs)'),label:'Observed in development / 开发集已有观测',kind:'dots',color:'#c2924c'}],{xLabel:'Solvent cLogP (Wildman-Crippen) / 溶剂疏水常数 cLogP',yLabel:'Predicted log₁₀ S / 预测 log₁₀ S'})}
        <p class="chart-caption">Explore correlation between solvent lipophilicity (cLogP) and predicted drug solubility across all 49 solvents. / 分析全部 49 种溶剂的脂水分配系数 (cLogP) 与药物溶解度的分布相关性。</p>
      </div>
    </div>
  </div>`;
}

function renderResult(){
  const c=state.current;if(!c)return;const {tab,q,r,evidence}=c;const e=evidence[0];let html='';
  if(tab==='predict'){
    const deck = state.predictDeck || 'prediction';
    const tabs = [
      {id:'prediction', en:'Prediction & Decomposition', zh:'溶解度预测与分解'},
      {id:'evidence', en:'Data Support & Evidence', zh:'实测对照与数据支持'}
    ];
    const tabsBar = deckTabsBar('predictDeck', deck, tabs);
    if(deck==='prediction'){
      let predCard = `<div class="card result-card">${resultHeader('Solubility prediction / 溶解度预测','MODEL PREDICTION')}<div class="prediction-grid">${valueCard('Predicted log₁₀ S / 预测 log₁₀ S',fmt(r.log_solubility),'Base-10 logarithm of solubility / 以 10 为底的对数溶解度')}${valueCard('Original scale S = 10ʸ / 原尺度 S = 10ʸ',r.concentration==null?'Outside numerical range / 超出数值范围':r.concentration.toPrecision(4),'Inverse transform using CSV field definitions / 按 CSV 字段约定反变换',true)}</div><p class="result-context">${esc(short(q.model_id))} · ${esc(label('drug',q.drug_id))} × ${esc(label('solvent',q.solvent_id))} · T = ${q.temperature}<br>Current inference time / 本次模型计算 ${fmt(r.elapsed_ms,1)} ms</p>`;
      if(r.components){
        const entries=Object.entries(r.components);
        predCard+=`<div class="decomposition"><div class="small-heading">Blend components / 融合组成 <span class="badge">Base model prediction times weight / 基模型预测 × 权重</span></div><div class="blend-bar-wrap"><div class="blend-bar-track">${entries.map(([name,comp],idx)=>`<div class="blend-bar-seg" style="width:${comp.weight*100}%;background:${palette[idx%palette.length]}" title="${esc(name)}: ${fmt(comp.weight*100,0)}%"></div>`).join('')}</div><div class="blend-bar-labels">${entries.map(([name,comp])=>`<span>${esc(name)} · ${fmt(comp.weight*100,0)}%</span>`).join('')}</div></div><div class="decomp-equation">${entries.map(([name,comp])=>`<div class="decomp-block"><span>${esc(name)} · Weight / 权重 ${fmt(comp.weight,2)}</span><strong>${fmt(comp.predictions[0])}</strong><small>Weighted contribution / 加权贡献 ${fmt(comp.contributions[0])}</small></div>`).join('<span class="decomp-operator">+</span>')}</div><p class="chart-caption">Weighted contributions sum to the final prediction; base models are not separate structure and temperature terms. / 融合贡献之和为最终预测；基模型不是结构与温度的独立分量。</p></div>`;
      }
      if(r.base)predCard+=`<div class="decomposition"><div class="small-heading">Prediction decomposition / 预测分解 <span class="badge">Structure plus conditions / 结构 + 条件</span></div><div class="decomp-equation"><div class="decomp-block"><span>Structural baseline at reference temperature / 参考温度下的结构基线</span><strong>${fmt(r.base[0])}</strong></div><span class="decomp-operator">+</span><div class="decomp-block"><span>Temperature contribution / 温度贡献</span><strong>${fmt(r.temperature_component[0])}</strong></div><span class="decomp-operator">=</span><div class="decomp-block"><span>Final prediction / 最终预测</span><strong>${fmt(r.log_solubility)}</strong></div></div></div>`;
      predCard+=gainNote(q.model_id)+callout('A one-unit increase in log₁₀ S means tenfold solubility. Decomposition describes model components, not causal attribution. / 如何读数？log₁₀ S 每增加 1，原尺度溶解度变为 10 倍。预测分解是模型结构输出，不代表因果归因。')+'</div>';
      html = tabsBar + `<div class="deck-pane scrollable">${predCard}</div>`;
    }else{
      html = tabsBar + `<div class="deck-pane scrollable">${evidenceBlock(e,r)}</div>`;
    }
  }else if(tab==='explore'){
    const deck = state.exploreDeck || 'curves';
    const tabs = [
      {id:'curves', en:'Response Curves & Summary', zh:'多溶剂温度曲线与汇总'},
      {id:'coverage', en:'Data Coverage Support', zh:'实验条件数据覆盖'}
    ];
    const tabsBar = deckTabsBar('exploreDeck', deck, tabs);
    if(deck==='curves'){
      const series=r.lines.flatMap((l,i)=>[{x:r.temperatures,y:transform(l.values),label:l.name,color:palette[i]},...(state.showObservations&&evidence[i].observations.length?[{x:evidence[i].observations.map(o=>o.temperature),y:transform(evidence[i].observations.map(o=>o.log_solubility)),label:l.name+' · Development observations / 开发实测',kind:'dots',color:palette[i]}]:[])]);
      const card = `<div class="card result-card">${resultHeader('Temperature and solvent responses / 温度与溶剂响应','CONDITION RESPONSE')}<div class="chart-header"><h3>${esc(short(q.model_id))} · ${esc(label('drug',q.drug_id))}</h3>${chartToolbar()}</div>${chart(series,{yLabel:state.unit==='raw'?'S = 10ʸ · Original scale / 原尺度':'Predicted log₁₀ S / 预测 log₁₀ S'})}<p class="chart-caption">61 temperature samples. Hover over curves for values. Temperature uses the original CSV scale; inverse transformation is mathematical only. / 61 个温度采样点 · 将鼠标停在曲线上查看数值。温度采用 CSV 原始尺度；原尺度仅做数学反变换。</p>${gainNote(q.model_id)}<div class="table-scroll"><table><thead><tr><th>Solvent / 溶剂</th><th>Prediction at start / 起点预测</th><th>Prediction at end / 终点预测</th><th>Δ log₁₀ S</th><th>Data support / 数据支持</th></tr></thead><tbody>${r.lines.map((l,i)=>`<tr><td>${esc(l.name)}</td><td>${fmt(l.values[0])}</td><td>${fmt(l.values.at(-1))}</td><td>${fmt(l.values.at(-1)-l.values[0])}</td><td>${evidence[i].support.pair_rows} pair observations / 条组合观测</td></tr>`).join('')}</tbody></table></div>${callout('Curves describe model responses. Solvent rankings are not experimental or formulation conclusions; data support is not calibrated confidence. / 曲线展示模型对输入变化的响应。不同溶剂曲线之间的高低不构成实际配方或实验结论；开发集支持不等于校准后的置信度。')}</div>`;
      html = tabsBar + `<div class="deck-pane scrollable">${card}</div>`;
    }else{
      const covCard = `<div class="card result-card"><h3>Data coverage of selected conditions / 所选条件的数据覆盖</h3>${evidence.map((ev,i)=>`<div class="chart-section"><div class="small-heading">${esc(r.lines[i].name)} · ${ev.support.pair_rows} pair observations / 条组合观测</div>${domainHTML(ev)}${ev.range.min!=null?`<p class="chart-caption">Observed pair temperature range / 组合实测温度范围 ${ev.range.min} ～ ${ev.range.max}；Requested curve range / 本次曲线范围 ${q.temperature_min} ～ ${q.temperature_max}。${q.temperature_min<ev.range.min||q.temperature_max>ev.range.max?'Part of the curve lies outside the observed range for this pair. / 曲线部分区间超出该组合观测范围。':''}</p>`:'<p class="chart-caption">No pair observations exist; curves explore model behavior. / 没有该组合的开发集观测，曲线用于探索模型行为。</p>'}</div>`).join('')}</div>`;
      html = tabsBar + `<div class="deck-pane scrollable">${covCard}</div>`;
    }
  }else if(tab==='screen'){
    html = `<div class="deck-pane" style="height:100%;overflow:hidden;">${renderScreenBody(r)}</div>`;
  }else{
    const series=[r.curve_a,r.curve_b].map((curve,i)=>({x:curve.temperatures,y:transform(curve.lines[0].values),label:short(curve.model_id),color:palette[i]}));
    if(state.showObservations&&e.observations.length)series.push({x:e.observations.map(o=>o.temperature),y:transform(e.observations.map(o=>o.log_solubility)),label:'Development observations / 开发集实测',kind:'dots',color:'#a6aeb3'});
    const improvement=(r.metrics_b.parent_macro_MAE-r.metrics_a.parent_macro_MAE)/r.metrics_b.parent_macro_MAE*100;
    const winsA=r.group_errors.a.filter((v,i)=>v<r.group_errors.b[i]).length,totalP=r.group_errors.ids.length;
    const pColors=r.group_errors.a.map((v,i)=>v<r.group_errors.b[i]?'#2d8b76':'#c2924c');

    const deck = state.compareDeck || 'radar';
    const tabs = [
      {id:'radar', en:'Evaluation Radar', zh:'5维评价雷达图'},
      {id:'curves', en:'Response Curves', zh:'温度响应与差值'},
      {id:'protocol', en:'Benchmark Protocol', zh:'统一评价表现'},
      {id:'predictions', en:'Point Prediction', zh:'单点预测对比'},
      {id:'evidence', en:'Data Support', zh:'实测对照支持'}
    ];
    const tabsBar = deckTabsBar('compareDeck', deck, tabs);

    if(deck === 'radar'){
      html = tabsBar + `<div class="deck-pane">${renderRadarComponent()}</div>`;
    }else if(deck === 'curves'){
      html = tabsBar + `<div class="deck-split-grid">
        <div class="deck-split-col">
          <div class="card result-card">
            <div class="chart-header">
              <h3>Temperature response / 相同药物溶剂下的温度响应</h3>
              ${chartToolbar()}
            </div>
            ${chart(series,{yLabel:state.unit==='raw'?'S = 10ʸ · Original scale / 原尺度':'Predicted log₁₀ S / 预测 log₁₀ S'})}
            ${gainNote(q.model_id)}
            ${gainNote(q.model_b)}
            <p class="chart-caption">61 sampled points. Hover for point coordinates. / 61 个采样点，鼠标悬停可查看对应温度与对数溶解度数值。</p>
          </div>
        </div>
        <div class="deck-split-col">
          <div class="card result-card">
            <div class="chart-header">
              <h3>Response difference B - A / 温度响应差值 B − A</h3>
              <span class="badge">${esc(short(q.model_b))} − ${esc(short(q.model_id))}</span>
            </div>
            ${chart([{x:r.curve_a.temperatures,y:r.curve_b.lines[0].values.map((v,i)=>v-r.curve_a.lines[0].values[i]),label:short(q.model_b)+' − '+short(q.model_id)}],{yLabel:'Prediction difference B - A, log₁₀ S / 预测差值 B − A · log₁₀ S'})}
            <p class="chart-caption">The difference chart always uses the logarithmic scale to compare model responses across the temperature sweep. / 差值图始终使用对数尺度，直观展示两个模型在全温度区间上的偏离趋势。</p>
            <div class="callout" style="margin-top:auto;">Point prediction difference at T=${q.temperature}: <strong>${fmt(r.difference)}</strong> log₁₀ units / 当前温度下的单点预测差值</div>
          </div>
        </div>
      </div>`;
    }else if(deck === 'protocol'){
      html = tabsBar + `<div class="deck-split-grid">
        <div class="deck-split-col">
          <div class="card result-card">
            <div class="chart-header">
              <h3>Performance under shared evaluation protocol / 统一评价协议下的模型表现</h3>
              <span class="badge good">${esc(short(q.model_id))} lower error on ${winsA} / ${totalP} parents (${fmt(winsA/totalP*100,1)}%)</span>
            </div>
            ${metricsTable(r.metrics_a,r.metrics_b)}
            <p class="chart-caption">A Parent MAE relative to B / 相对 B 的母体 MAE ${improvement>=0?'decrease / 降低':'increase / 增加'} ${fmt(Math.abs(improvement),2)}%。Descriptive differences are not statistical significance; a single prediction difference does not identify the more accurate model. / 描述性差异不代表统计显著；单点预测差异不表示哪种模型更准确。</p>
            ${callout('Grouped metrics summarize outer evaluation; the app uses the model fitted on the full development set. / 分组验证指标汇总外层评价结果；应用使用完整开发集拟合的模型。')}
          </div>
        </div>
        <div class="deck-split-col">
          <div class="card result-card">
            <div class="chart-header">
              <h3>128 Molecular parents error comparison / 128 个分子母体误差对比散点图</h3>
              <span class="badge">Nested 5×3 CV</span>
            </div>
            ${chart([{x:r.group_errors.a,y:r.group_errors.b,pointColors:pColors,pointLabels:r.group_errors.ids.map(pid=>'Parent '+pid),label:'Teal: Model A lower MAE · Amber: Model B lower MAE / 青色：A 更优 · 琥珀：B 更优',kind:'dots',color:'#2d8b76'}],{xLabel:short(q.model_id)+' · Parent MAE / 母体 MAE',yLabel:short(q.model_b)+' · Parent MAE / 母体 MAE',identity:true})}
            <p class="chart-caption">Each point is a parent. The dashed line marks equal errors; points above it favor model A. / 每个点代表一个母体。虚线表示两模型误差相同；点在虚线上方表示模型 A 误差更低。</p>
          </div>
        </div>
      </div>`;
    }else if(deck === 'predictions'){
      html = tabsBar + `<div class="deck-pane scrollable">
        <div class="card result-card">
          ${resultHeader('Comparison under identical conditions / 同条件模型对照','CONTROLLED MODEL COMPARISON')}
          <div class="prediction-grid">
            ${valueCard(short(q.model_id),fmt(r.a.log_solubility),'Predicted log₁₀ S, model A / 预测 log₁₀ S · 模型 A')}
            ${valueCard(short(q.model_b),fmt(r.b.log_solubility),'Predicted log₁₀ S, model B / 预测 log₁₀ S · 模型 B',true)}
          </div>
          <p class="comparison-highlight">Point prediction difference B - A = / 单点预测差值 B − A = <strong>${fmt(r.difference)}</strong> log₁₀ units / 单位</p>
          <p class="result-context">Drug / 药物：${esc(label('drug',q.drug_id))} · Solvent / 溶剂：${esc(label('solvent',q.solvent_id))} · T = ${q.temperature}<br>Model A inference: ${fmt(r.a.elapsed_ms,1)} ms · Model B inference: ${fmt(r.b.elapsed_ms,1)} ms</p>
          ${callout('A single prediction difference does not indicate which model is globally superior. Refer to Benchmark Metrics and Multi-Model Radar for comprehensive generalization assessment. / 单点预测差异不表示哪种模型更准确，请结合统一评价指标与多维雷达图评估泛化性能。')}
        </div>
      </div>`;
    }else{
      html = tabsBar + `<div class="deck-pane scrollable">${evidenceBlock(e,r.a)}</div>`;
    }
  }
  $('output').innerHTML=(state.stale?'<div class="stale-banner">Conditions changed. The results below belong to the previous run; run again to update. / 条件已更改。下方仍为上一次实验结果；点击运行以更新。</div>':'')+html;
  window.StudioLanguage.normalize($('output'));
  attachChartInteractivity($('output'));
  bindResultActions();
}

function bindResultActions(){
  if($('observations-toggle'))$('observations-toggle').onchange=e=>{state.showObservations=e.target.checked;renderResult();};
  document.querySelectorAll('#output [data-export]').forEach(b=>b.onclick=()=>exportCurrent(b.dataset.export));
  document.querySelectorAll('#output [data-unit]').forEach(b=>b.onclick=()=>{state.unit=b.dataset.unit;renderResult();});
  document.querySelectorAll('#output [data-sfilter]').forEach(b=>b.onclick=()=>{state.screenFilter=b.dataset.sfilter;renderResult();});
  document.querySelectorAll('#output [data-ssort]').forEach(b=>b.onclick=()=>{state.screenSort=b.dataset.ssort;renderResult();});
  document.querySelectorAll('#output [data-deck]').forEach(b=>{
    b.onclick=()=>{
      const d=b.dataset.deck, v=b.dataset.deckVar || (state.tab+'Deck');
      state[v]=d;
      renderResult();
    };
  });
  document.querySelectorAll('#output [data-pick-solvent]').forEach(b=>b.onclick=()=>{
    const sid=b.dataset.pickSolvent,q=state.current.q;
    switchView('predict');$('drug').value=q.drug_id;$('solvent').value=sid;$('model').value=q.model_id;$('temperature').value=q.temperature;$('temperature-slider').value=q.temperature;updateModels();structures();run();
  });
  if(state.tab==='compare' && (state.compareDeck==='radar' || !state.current)) bindRadarEvents($('output'));
}
function resultRows(tab,q,r){const common={model:short(q.model_id),model_id:q.model_id,drug:label('drug',q.drug_id),drug_id:q.drug_id,temperature_scale:'CSV original scale'};if(tab==='predict')return [{...common,solvent:label('solvent',q.solvent_id),solvent_id:q.solvent_id,temperature:q.temperature,predicted_log10:r.log_solubility,inverse_10_power_y:r.concentration,base:r.base?.[0],temperature_component:r.temperature_component?.[0]}];if(tab==='screen')return r.results.map(x=>({...common,solvent:x.name,solvent_id:x.solvent_id,temperature:q.temperature,predicted_log10:x.log_solubility,inverse_10_power_y:x.concentration,pair_observations:x.pair_rows,solvent_cLogP:x.mol_logp}));const curves=tab==='compare'?[r.curve_a,r.curve_b]:[r];return curves.flatMap(curve=>curve.lines.flatMap(line=>curve.temperatures.map((t,i)=>({...common,model:short(curve.model_id),model_id:curve.model_id,solvent:line.name,solvent_id:line.solvent_id,temperature:t,predicted_log10:line.values[i]}))));}
async function run(event){
 event?.preventDefault();if(!state.catalog)return;let q;try{q=readConditions();}catch(e){$('error').textContent=e.message;return;}
 cancelRun();state.current=null;state.stale=false;const token=state.request,tab=state.tab,controller=new AbortController();state.controller=controller;$('run').disabled=true;window.StudioLanguage.btn($('run-label'),'Running model… / 模型计算中…');$('error').textContent='';$('output').setAttribute('aria-busy','true');$('output').innerHTML=`<div class="card loading-card"><div class="loading-label"><span class="spinner"></span>Running the model and checking data support… / 正在运行真实模型并核对数据支持…</div><div class="skeleton big"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
 const timeout=setTimeout(()=>controller.abort(),90000);
 try{
 if(tab==='screen'){
  const r=await api('/api/screen',{model_id:q.model_id,drug_id:q.drug_id,temperature:q.temperature},controller.signal);
  if(token!==state.request)return;
  state.current={tab,q,r,evidence:[{domain:{status:'screening'}}],time:new Date().toISOString(),rows:resultRows(tab,q,r)};
 }else{
  const path=tab==='predict'?'/api/predict':tab==='explore'?'/api/curve':'/api/compare';const [r,evidence]=await Promise.all([api(path,q,controller.signal),Promise.all(q.solvent_ids.map(id=>api('/api/evidence?'+new URLSearchParams({drug_id:q.drug_id,solvent_id:id,temperature:q.temperature}),null,controller.signal)))]);if(token!==state.request)return;
  state.current={tab,q,r,evidence,time:new Date().toISOString(),rows:resultRows(tab,q,r)};
 }
 state.unit='log';renderResult();recordExperiment();window.LearningStudio?.markTask(tab==='screen'?'explore':tab);if(innerWidth<800)$('output').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){if(token!==state.request)return;$('error').textContent=e.name==='AbortError'?'Inference timed out. Try again or choose another model. / 计算已超时，可稍后重试或选择其他模型。':e.message;state.current=null;setEmpty();}finally{clearTimeout(timeout);if(token===state.request){$('run').disabled=false;window.StudioLanguage.btn($('run-label'),views[tab][4]);$('output').removeAttribute('aria-busy');state.controller=null;}}
}
function recordExperiment(){const c=state.current;if(!c)return;state.history.unshift({tab:c.tab,q:c.q,time:c.time,label:label('drug',c.q.drug_id)+(c.tab==='screen'?' × All 49 solvents':' × '+label('solvent',c.q.solvent_id)),model:short(c.q.model_id),value:c.tab==='predict'?c.r.log_solubility:c.tab==='compare'?c.r.a.log_solubility:c.tab==='screen'?c.r.results[0]?.log_solubility:null,rows:c.rows.length,support:c.evidence[0].domain.status});state.history=state.history.slice(0,30);saveHistory();renderHistory();}
function saveHistory(){try{localStorage.setItem(STORE,JSON.stringify(state.history));}catch(_){toast('Browser storage is unavailable; records remain in this page session. / 本次记录保留在当前页面；浏览器存储不可用。');}}
function renderHistory(){
 const countEl=$('sidebar-history-count')||$('history-count');
 if(countEl)countEl.textContent=state.history.length;
 $('history-export').disabled=!state.history.length;$('history-clear').disabled=!state.history.length;
 if(!state.history.length){$('history-list').innerHTML='<div class="journal-empty">After an experiment, inputs, model and a result summary are recorded here. / 完成一次实验后，条件、模型与结果摘要会自动记录在这里。</div>';return;}
 const rows=state.allHistory?state.history:state.history.slice(0,4);$('history-list').innerHTML='<div class="history-items">'+rows.map((r,i)=>`<article class="history-item"><span class="history-type">${icon(r.tab==='predict'?'flask':r.tab==='compare'?'layers':r.tab==='screen'?'sliders':'curve')}</span><div><strong>${esc(r.label)}</strong><small>${esc(r.model)} · ${esc(views[r.tab][0])} · ${esc(new Date(r.time).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}</small></div><div class="history-value">${r.value!=null?fmt(r.value):r.rows+' points / 点'}<small>${r.value!=null?'log₁₀ S':'Curve data / 曲线数据'}</small></div><button class="text-button" data-restore="${i}">Restore inputs ↗ / 恢复条件 ↗</button></article>`).join('')+'</div>'+(state.history.length>4?`<button class="text-button history-more" id="history-more">${state.allHistory?'Show fewer records / 收起记录':'View all / 查看全部 '+state.history.length+' experiments / 次实验'}</button>`:'');
 window.StudioLanguage.normalize($('history-list'));
 document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>restoreExperiment(Number(b.dataset.restore)));if($('history-more'))$('history-more').onclick=()=>{state.allHistory=!state.allHistory;renderHistory();};
}
function restoreExperiment(i){const r=state.history[i];if(!r)return;switchView(r.tab);$('drug-search').value='';$('solvent-search').value='';$('drug').innerHTML=state.catalog.drugs.map(option).join('');$('solvent').innerHTML=state.catalog.solvents.map(option).join('');for(const [id,key] of [['drug','drug_id'],['solvent','solvent_id'],['model','model_id'],['temperature','temperature'],['tmin','temperature_min'],['tmax','temperature_max']])if(r.q[key]!=null)$(id).value=r.q[key];updateModels();if(r.q.model_b)$('model-b').value=r.q.model_b;$('temperature-slider').value=r.q.temperature;document.querySelectorAll('#solvent-chips input').forEach(el=>el.checked=false);[...$('multi').options].forEach(o=>o.selected=(r.q.solvent_ids||[]).includes(o.value)&&o.value!==r.q.solvent_id);structures();toast('Inputs restored. Run the experiment to verify again. / 已恢复实验条件；点击运行可重新验证。');}
function csvCell(v){if(v==null)return '""';let s=String(v);if(typeof v==='string'&&/^[=+@\t\r-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function csvText(rows){const keys=[...new Set(rows.flatMap(Object.keys))];return keys.map(csvCell).join(',')+'\r\n'+rows.map(r=>keys.map(k=>csvCell(r[k])).join(',')).join('\r\n');}
function downloadFile(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportCurrent(type){
 const c=state.current;if(!c)return;
 if(type==='csv')downloadFile('\uFEFF'+csvText(c.rows),'SOLAR_'+c.tab+'.csv','text/csv;charset=utf-8');
 else if(type==='svg'){const svg=$('output').querySelector('svg.plot');if(svg)downloadFile(svg.outerHTML,'SOLAR_'+c.tab+'_chart.svg','image/svg+xml;charset=utf-8');}
 else{
 const copy=$('output').cloneNode(true);copy.querySelectorAll('button,.result-actions,.stale-banner').forEach(el=>el.remove());
 const style='body{font:14px/1.8 system-ui,sans-serif;color:#243b45;max-width:950px;margin:40px auto;padding:0 25px}h1{font-size:27px}h3{font-size:17px}small{display:block;color:#82929a}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}.card{border:1px solid #dce5e3;border-radius:10px;padding:24px;margin:20px 0;break-inside:avoid}.plot{width:100%}.prediction-grid,.decomp-equation{display:flex;gap:25px}.prediction-value{flex:1;background:#eff5f0;padding:20px}.prediction-value strong{display:block;font:32px monospace}.callout,.chart-caption{font-size:12px;color:#7d8f95}.domain-strip{margin:15px 0}.badge{border:1px solid #ddd;padding:4px 7px;margin:4px;display:inline-block;font-size:11px}.icon{width:14px;height:14px;fill:none;stroke:currentColor;display:inline-block}.legend{font-size:12px;color:#69818a}.legend span{margin-right:15px}.legend i{display:inline-block;width:12px;height:3px;margin-right:6px}.support-info{font-size:12px;display:flex;gap:20px}.table-scroll{overflow:auto}@media print{body{margin:0;padding:0}.card{break-inside:avoid}}';
 const meta=`<p>Generated at / 生成时间：${esc(new Date(c.time).toLocaleString('zh-CN'))} · ${esc(views[c.tab][0])}<br>Drug / 药物：${esc(label('drug',c.q.drug_id))} · Solvent / 溶剂：${esc(label('solvent',c.q.solvent_id))} · Temperature / 温度 T=${c.q.temperature}（CSV Original scale / 原始尺度）<br>Model / 模型：${esc(short(c.q.model_id))}${c.q.model_b?' × '+esc(short(c.q.model_b)):''}</p>`;
 downloadFile('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>SOLAR Experiment report / 实验报告</title><style>'+style+'</style><body><h1>SOLAR Studio · Experiment report / 实验报告</h1>'+meta+copy.innerHTML+'<p>Data: datasets/data_2026.csv. Evaluation: five outer and three inner folds, seeds 2026 / 17 / 42. Development observations are support only, not independent test scores or calibrated intervals. Print in a browser to save a PDF. / 数据：datasets/data_2026.csv；评价：5 外折 × 3 内折，种子 2026 / 17 / 42。开发观测仅解释支持情况，非独立测试分数；未校准单点预测区间。可使用浏览器打印保存为 PDF。</p></body></html>','SOLAR_'+c.tab+'_report.html','text/html;charset=utf-8');
 }
 toast('Download file generated. / 已生成下载文件。');
}
async function loadDiagnostics(modelId){
 const box=$('diag-body');if(!box)return;
 box.innerHTML='<div class="loading-label"><span class="spinner"></span>Loading nested-CV diagnostics… / 正在加载嵌套验证诊断…</div>';
 try{
  const d=state.diagCache[modelId]||(state.diagCache[modelId]=await api('/api/model_diagnostics/'+encodeURIComponent(modelId)));
  if(!$('diag-body'))return;
  box.innerHTML=`<div class="diag-kpis"><div class="diag-kpi"><span>Median AE (P50)</span><strong>${fmt(d.quantiles.p50_ae,3)}</strong></div><div class="diag-kpi"><span>P75 Abs Error</span><strong>${fmt(d.quantiles.p75_ae,3)}</strong></div><div class="diag-kpi"><span>P90 Abs Error</span><strong>${fmt(d.quantiles.p90_ae,3)}</strong></div><div class="diag-kpi"><span>Mean Bias (y−ŷ)</span><strong>${fmt(d.quantiles.bias,4)}</strong></div></div><div class="evidence-grid"><div><h4>Residual distribution (y − ŷ) / 残差分布</h4>${histogram(d.residual_histogram)}<p class="chart-caption">${d.n_rows} nested-CV rows across ${d.n_parents} parents. Centered near 0 indicates low systematic bias. / 共 ${d.n_rows} 条嵌套验证预测、${d.n_parents} 个母体。</p></div><div><h4>Predicted vs Observed (sampled) / 预测值 vs 实测值</h4>${chart([{x:d.scatter.map(p=>p.y),y:d.scatter.map(p=>p.pred),pointLabels:d.scatter.map(p=>'Parent '+p.parent),label:short(modelId),kind:'dots',color:'#34796e'}],{xLabel:'Observed log₁₀ S / 实测 log₁₀ S',yLabel:'Predicted log₁₀ S / 预测 log₁₀ S',identity:false})}</div></div>`;
  attachChartInteractivity(box);
 }catch(e){if($('diag-body'))$('diag-body').innerHTML=`<p class="error-message">${esc(e.message)}</p>`;}
}

function renderInsights(sort='parent_macro_MAE'){
  const d=state.insights;
  if(!d){
    $('insights-content').innerHTML='<div class="card">Data overview is not loaded. Refresh the page to retry. / 数据概览尚未加载，请刷新页面重试。</div>';
    return;
  }
  const s=d.summary;
  const groupMatch=m=>state.leaderboardGroup==='all'?true:state.leaderboardGroup==='main'?m.group.startsWith('Main')||m.group.startsWith('New'):state.leaderboardGroup==='solar'?m.group.startsWith('SOLAR'):state.leaderboardGroup==='neural'?m.group.startsWith('Neural'):m.group.startsWith('Classical');
  const models=[...state.models].filter(groupMatch).sort((a,b)=>sort==='R2'?b.metrics[sort]-a.metrics[sort]:a.metrics[sort]-b.metrics[sort]);
  const maximum=Math.max(...state.models.map(m=>m.metrics.parent_macro_MAE));
  const bars=state.models.slice().sort((a,b)=>a.metrics.parent_macro_MAE-b.metrics.parent_macro_MAE).map(m=>`<div class="model-bar ${m.id===state.defaultModel?'proposed':''}"><span>${esc(short(m.id))}</span><span class="model-bar-track"><i style="width:${m.metrics.parent_macro_MAE/maximum*100}%"></i></span><span>${fmt(m.metrics.parent_macro_MAE,3)}</span></div>`).join('');
  const tradeoffSeries=[{x:state.models.map(m=>Math.log10(Math.max(m.metrics.inference_ms_per_row,1e-4))),y:state.models.map(m=>m.metrics.parent_macro_MAE),pointLabels:state.models.map(m=>short(m.id)+' ('+fmt(m.metrics.inference_ms_per_row,3)+' ms/row)'),pointColors:state.models.map(m=>m.id===state.defaultModel?'#c2924c':'#34796e'),label:'14 models (Amber: Main model) / 14 种模型（琥珀色为主模型）',kind:'dots',color:'#34796e'}];

  const deck = state.insightsDeck || 'protocol';
  const tabs = [
    {id:'protocol', en:'Evaluation Protocol', zh:'评价体系与数据划分'},
    {id:'benchmark', en:'Benchmark Matrix', zh:'基准评测与速度权衡'},
    {id:'diagnostics', en:'Error Diagnostics', zh:'嵌套验证残差诊断'},
    {id:'leaderboard', en:'Model Leaderboard', zh:'完整模型性能榜单'}
  ];

  const tabsBar = `<div class="deck-tabs-bar" role="tablist">
    ${tabs.map(t => `<button type="button" class="deck-tab ${deck === t.id ? 'active' : ''}" data-ideck="${t.id}" role="tab" aria-selected="${deck === t.id}">
      <span class="btn-stack"><span lang="en" class="btn-text-en">${t.en}</span><span lang="zh-CN" class="btn-text-zh">${t.zh}</span></span>
    </button>`).join('')}
  </div>`;

  let paneHtml = '';
  if(deck === 'protocol'){
    paneHtml = `<div class="evidence-grid">
      <article class="card">
        <div class="card-heading"><h3>A clearly defined data partition / 有边界的数据划分</h3><span class="badge good">Overlapping parents / 母体交集 ${d.protocol.parent_overlap}</span></div>
        <div class="split-bar"><span style="width:${s.development_rows/s.total_rows*100}%"></span><span style="flex:1"></span></div>
        <div class="split-legend"><div>Development set / 开发集<strong>${s.development_rows} rows / 条 / ${s.development_parents} Parents / 母体</strong></div><div>Test set, evaluated once after the method is finalized / 测试集 · 方法确定后评价<strong>${s.holdout_rows} rows / 条 / ${s.holdout_parents} Parents / 母体</strong></div></div>
        <div class="stat-inline"><div><strong>${s.total_rows}</strong><span>Total records / 总记录数</span></div><div><strong>${s.drug_count}</strong><span>Drug names / 药物名称数</span></div><div><strong>${s.solvent_count}</strong><span>Solvent names / 溶剂名称数</span></div><div><strong>${s.parent_count}</strong><span>Total molecular parents / 分子母体总数</span></div></div>
        ${callout('Related molecular forms stay in the same partition. Only test-set counts and roles are shown; its targets are not exposed as observed evidence. / 同一母体的相关分子形式留在同一集合。测试集仅显示数量与角色，观测对照不公开其标签。')}
      </article>
      <article class="card">
        <h3>Select first, evaluate second / 先选择，再评价</h3>
        <div class="protocol-steps"><div class="protocol-step"><strong>3 folds / 折</strong>Inner grouped selection / 内层分组选择</div><span>→</span><div class="protocol-step"><strong>5 folds / 折</strong>Outer grouped evaluation / 外层分组评价</div><span>→</span><div class="protocol-step"><strong>3 Seeds / 种子</strong>Aggregate across seeds / 汇总稳定表现</div></div>
        <div class="data-notes">
          <div class="data-note"><strong>Parent MAE, the primary project metric / 母体 MAE · 本项目主指标</strong>Average absolute errors within each parent, then weight parents equally to reduce sampling imbalance. / 先在母体内求平均绝对误差，再对母体等权平均，减少记录数量不平衡的影响。</div>
          <div class="data-note"><strong>Training and evaluation protocol / 训练与评价口径</strong>Evaluation seeds: 2026 / 17 / 42; the app uses the model fitted on the full development set. / 评价种子：2026 / 17 / 42；应用使用完整开发集拟合的模型。</div>
        </div>
      </article>
    </div>`;
  }else if(deck === 'benchmark'){
    paneHtml = `<div class="evidence-grid">
      <article class="card">
        <h3>Parent errors on a common scale / 母体误差，放在同一把尺上</h3>
        <p class="chart-caption">Nested-validation parent MAE, lower is better / 嵌套验证母体 MAE · 越低越好</p>
        <div class="model-bars">${bars}</div>
      </article>
      <article class="card">
        <h3>Accuracy vs inference speed trade-off / 精度与推理速度权衡</h3>
        <p class="chart-caption">Lower-left is both faster and more accurate (X: log₁₀ ms/row, Y: Parent MAE) / 左下角代表推理更快且误差更低</p>
        ${chart(tradeoffSeries,{xLabel:'log₁₀(Inference ms/row) / 推理耗时 (ms/行)',yLabel:'Parent MAE / 母体 MAE'})}
      </article>
    </div>`;
  }else if(deck === 'diagnostics'){
    paneHtml = `<div class="evidence-grid">
      <article class="card">
        <div class="chart-header">
          <h3>Nested-CV residual & error diagnostics / 嵌套验证残差与误差诊断</h3>
          <div class="diag-controls"><label for="diag-model">Model / 诊断模型</label><select id="diag-model">${state.models.map(m=>`<option value="${esc(m.id)}">${esc(short(m.id))}</option>`).join('')}</select></div>
        </div>
        <div id="diag-body"></div>
      </article>
      <article class="card">
        <h3>Temperature distribution and input boundaries / 温度分布与输入边界</h3>
        <div class="stat-inline"><div><strong>${d.temperature.min} ～ ${d.temperature.max}</strong><span>Development temperature range, original CSV scale / 开发集温度范围 · CSV 原始尺度</span></div></div>
        ${histogram(d.temperature.histogram)}
        <div class="data-notes">
          <div class="data-note"><strong>Within range does not guarantee accuracy / 范围内，不等于保证正确</strong>Global temperature coverage differs from coverage for a specific pair. Results distinguish these support levels. / 全局温度覆盖与某一药物–溶剂组合的覆盖不同。实验结果中会分别提示数据支持。</div>
          <div class="data-note"><strong>Respect data definitions / 尊重数据语义</strong>Physical temperature units are unverified. Drug names, structures and parents are distinct counts. Original-scale values follow CSV field definitions. / 温度物理单位未独立确认；药物名称、结构和母体是不同计数口径。原尺度结果仅按 CSV 字段约定反变换。</div>
        </div>
      </article>
    </div>`;
  }else{
    paneHtml = `<article class="card leaderboard-card">
      <div class="card-heading">
        <h3>Complete model comparison / 完整模型对照</h3>
        <div class="leaderboard-toolbar">
          <div class="leaderboard-pills">
            <button type="button" class="pill-btn ${state.leaderboardGroup==='all'?'active':''}" data-lgroup="all">All (${state.models.length}) / 全部</button>
            <button type="button" class="pill-btn ${state.leaderboardGroup==='main'?'active':''}" data-lgroup="main">Main / 主模型</button>
            <button type="button" class="pill-btn ${state.leaderboardGroup==='solar'?'active':''}" data-lgroup="solar">SOLAR / 物理融合</button>
            <button type="button" class="pill-btn ${state.leaderboardGroup==='neural'?'active':''}" data-lgroup="neural">Neural / 神经网络</button>
            <button type="button" class="pill-btn ${state.leaderboardGroup==='classical'?'active':''}" data-lgroup="classical">Classical / 传统方法</button>
          </div>
          <div class="leaderboard-sort-wrap">
            <label for="leaderboard-sort">Sort by / 排序依据</label>
            <select id="leaderboard-sort">
              <option value="parent_macro_MAE">Parent MAE / 母体 MAE ↓</option>
              <option value="MAE">Record MAE / 记录 MAE ↓</option>
              <option value="RMSE">RMSE ↓</option>
              <option value="R2">R² ↑</option>
              <option value="inference_ms_per_row">Inference time / 推理耗时 ↓</option>
            </select>
          </div>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Model / 模型</th>
              <th>Parent MAE / 母体 MAE ↓</th>
              <th>MAE ↓</th>
              <th>RMSE ↓</th>
              <th>R² ↑</th>
              <th>Inference / 推理 ms/row</th>
            </tr>
          </thead>
          <tbody>
            ${models.map(m=>`<tr class="${m.id===state.defaultModel?'highlight':''}">
              <td><strong>${esc(short(m.id))}</strong>${m.id===state.defaultModel?' <span class="badge good">Proposed / 本研究推荐</span>':''}</td>
              ${['parent_macro_MAE','MAE','RMSE','R2','inference_ms_per_row'].map(k=>'<td class="'+(k==='R2'?(m.metrics[k]===Math.max(...models.map(x=>x.metrics[k]))?'cell-best':''):(m.metrics[k]===Math.min(...models.map(x=>x.metrics[k]))?'cell-best':''))+'">'+fmt(m.metrics[k])+'</td>').join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${callout('Main method TabPFN + ExtraTrees: parent MAE / 主方法 TabPFN＋ExtraTrees：母体 MAE '+fmt(state.models.find(m=>m.id===state.defaultModel)?.metrics.parent_macro_MAE,4)+'，Record MAE / 记录 MAE '+fmt(state.models.find(m=>m.id===state.defaultModel)?.metrics.MAE,4)+'。Parent MAE is 2.32% lower than the strongest single branch TabPFN. The paired 95% interval [-0.0478, 0.0178] crosses zero. / 相对最强单分支 TabPFN 的母体 MAE 降低 2.32%；95%配对差值区间为 [-0.0478, 0.0178]，仍跨零。')}
      <p class="chart-caption">Evaluation follows the same nested grouped cross-validation protocol as the paper. / 评价口径与论文保持严格一致。</p>
    </article>`;
  }

  $('insights-content').innerHTML = tabsBar + `<div class="deck-pane">${paneHtml}</div>`;
  window.StudioLanguage.normalize($('insights-content'));
  attachChartInteractivity($('insights-content'));

  document.querySelectorAll('[data-ideck]').forEach(b => {
    b.onclick = () => {
      state.insightsDeck = b.dataset.ideck;
      renderInsights(sort);
    };
  });

  if(deck === 'diagnostics'){
    const diagSel = $('diag-model');
    if(diagSel){
      diagSel.value = state.diagModel || state.defaultModel;
      diagSel.onchange = e => {
        state.diagModel = e.target.value;
        loadDiagnostics(e.target.value);
      };
      loadDiagnostics(state.diagModel || state.defaultModel);
    }
  }

  if(deck === 'leaderboard'){
    const lSort = $('leaderboard-sort');
    if(lSort){
      lSort.value = sort;
      lSort.onchange = e => renderInsights(e.target.value);
    }
    document.querySelectorAll('[data-lgroup]').forEach(b => {
      b.onclick = () => {
        state.leaderboardGroup = b.dataset.lgroup;
        renderInsights($('leaderboard-sort')?.value || sort);
      };
    });
  }
}
function histogram(bins){const max=Math.max(...bins.map(b=>b.count),1),W=560,H=180,L=38,B=30,T=20,bw=(W-L-15)/bins.length;return `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Development temperature histogram / 开发集温度直方图" xmlns="http://www.w3.org/2000/svg"><title>Development temperature histogram / 开发集温度直方图</title>${bins.map((b,i)=>{const h=b.count/max*(H-B-T);return `<rect x="${L+i*bw+3}" y="${H-B-h}" width="${bw-6}" height="${h}" rx="3" fill="#91b9a9"><title>${fmt(b.min,1)} ～ ${fmt(b.max,1)}：${b.count} rows / 条</title></rect><text x="${L+(i+.5)*bw}" y="${H-B-h-5}" font-size="9" fill="#72958a" text-anchor="middle">${b.count}</text>${i%2===0?`<text x="${L+i*bw}" y="${H-9}" font-size="9" fill="#8d9fa6" text-anchor="middle">${fmt(b.min,0)}</text>`:''}`;}).join('')}<path d="M${L} ${H-B}H${W-10}" stroke="#dfe8e6"/></svg>`;}
function parseCSV(text){
 const rows=[];let row=[],field='',quoted=false,closed=false;const pushField=()=>{row.push(field.trim());field='';closed=false;};const pushRow=()=>{pushField();if(row.some(x=>x!==''))rows.push(row);row=[];};
 for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}else if(ch==='"'){quoted=false;closed=true;}else field+=ch;}else if(ch==='"'){if(field.trim()||closed)throw new Error('CSV Invalid CSV quotation. / 引号格式无效。');field='';quoted=true;}else if(ch===','){pushField();}else if(ch==='\n'){pushRow();}else if(ch==='\r'){if(text[i+1]==='\n')i++;pushRow();}else{if(closed&&ch.trim())throw new Error('CSV A delimiter must follow a closing quote. / 引号后应为分隔符。');field+=ch;}}
 if(quoted)throw new Error('CSV contains an unclosed quote. / 中有未闭合的引号。');if(field||row.length)pushRow();if(rows.length<2)throw new Error('Provide column headers and at least one data row. / 请提供列名和至少一条数据。');return rows;
}
function batchExample(){const drug=state.catalog.drugs.find(x=>x.name==='Lovastatin')||state.catalog.drugs[0];const solvents=['Acetone','Butyl Acetate','1-Octanol'].map(n=>state.catalog.solvents.find(x=>x.name===n)).filter(Boolean);return 'drug,solvent,temperature\n'+solvents.flatMap(s=>[25,40].map(t=>[csvCell(drug.name),csvCell(s.name),t].join(','))).join('\n');}
async function runBatch(){
 const token=++state.batchRequest;$('batch-error').textContent='';let rows,source;
 try{const text=$('batch-input').value.replace(/^\uFEFF/,'');if(new Blob([text]).size>100000)throw new Error('CSV content / CSV 内容超过 100 KB，请精简后重试。');const parsed=parseCSV(text),head=parsed.shift().map(h=>h.toLowerCase());const indices=['drug','solvent','temperature'].map(k=>head.indexOf(k));if(indices.some(i=>i<0))throw new Error('Headers must include drug, solvent and temperature. / 列名必须包含 drug、solvent、temperature。');if(new Set(head).size!==head.length)throw new Error('CSV must not contain duplicate headers. / 不能包含重复列名。');if(parsed.length>100)throw new Error('Run up to 100 rows at a time. / 每次最多运行 100 条记录。');if(parsed.some(r=>r.length!==head.length))throw new Error('CSV has rows with incorrect column counts. Check commas and quotation. / 有行的列数与列名不一致，请检查逗号与引号。');source=parsed.map(row=>({drug:row[indices[0]],solvent:row[indices[1]],temperature:row[indices[2]]}));const resolve=(items,s)=>items.find(x=>x.id.toLowerCase()===s.toLowerCase()||x.name.toLowerCase()===s.toLowerCase())?.id||s;rows=source.map(r=>({drug_id:resolve(state.catalog.drugs,r.drug),solvent_id:resolve(state.catalog.solvents,r.solvent),temperature:r.temperature.trim()===''?null:Number(r.temperature)}));}catch(e){$('batch-error').textContent=e.message;return;}
 $('batch-run').disabled=true;$('batch-output').innerHTML='<div class="card loading-card"><div class="loading-label"><span class="spinner"></span>Running predictions row by row… / 正在逐行运行模型…</div><div class="skeleton big"></div></div>';const model=$('batch-model').value;
 try{const r=await api('/api/batch',{model_id:model,rows});if(token!==state.batchRequest)return;const results=r.results.map((x,i)=>({...source[i],...x,model:short(model),model_id:model,temperature_scale:'CSV original scale'}));const okVals=results.filter(x=>x.status==='ok').map(x=>x.log_solubility).sort((a,b)=>a-b);const bMean=okVals.length?okVals.reduce((a,b)=>a+b,0)/okVals.length:null;const bMed=okVals.length?okVals[Math.floor(okVals.length/2)]:null;let bHist='';if(okVals.length>=3){const mn=okVals[0],mx=okVals[okVals.length-1],span=Math.max(mx-mn,1e-4),nb=Math.min(8,okVals.length),bw=span/nb,bins=Array.from({length:nb},(_,k)=>({min:mn+k*bw,max:mn+(k+1)*bw,count:0}));okVals.forEach(v=>{const idx=Math.min(nb-1,Math.floor((v-mn)/bw));bins[idx].count++;});bHist=`<div style="margin:12px 0">${histogram(bins)}</div>`;}const summaryHtml=okVals.length?`<div class="batch-summary"><div class="batch-stat"><span>Min log₁₀ S</span><strong>${fmt(okVals[0],3)}</strong></div><div class="batch-stat"><span>Median log₁₀ S</span><strong>${fmt(bMed,3)}</strong></div><div class="batch-stat"><span>Mean log₁₀ S</span><strong>${fmt(bMean,3)}</strong></div><div class="batch-stat"><span>Max log₁₀ S</span><strong>${fmt(okVals[okVals.length-1],3)}</strong></div></div>${bHist}`:'';$('batch-output').innerHTML=`<div class="card"><div class="card-heading"><h3>Batch results / 批量实验结果</h3><button class="button outline compact" id="batch-download">${icon('download')}Export CSV / 导出 CSV</button></div><div class="batch-counts"><span class="badge good">Success / 成功 ${r.success_count} rows / 条</span><span class="badge ${r.error_count?'warn':''}">Failed / 失败 ${r.error_count} rows / 条</span></div>${summaryHtml}<div class="table-scroll"><table><thead><tr><th>row / 行</th><th>Drug / 药物</th><th>Solvent / 溶剂</th><th>T</th><th>Predicted log₁₀ S / 预测 log₁₀ S</th><th>Status and explanation / 状态 / 说明</th></tr></thead><tbody>${results.map(x=>`<tr class="${x.status==='error'?'batch-error-row':''}"><td>${x.row}</td><td>${esc(x.drug)}</td><td>${esc(x.solvent)}</td><td>${esc(x.temperature)}</td><td>${x.status==='ok'?fmt(x.log_solubility):'—'}</td><td>${x.status==='ok'?'Completed / 完成':esc(chinese(x.error))}</td></tr>`).join('')}</tbody></table></div>${gainNote(model)}${callout('Invalid rows do not replace valid results. Batch predictions neither train models nor write uploaded content into source data. / 逐行检查失败不会覆盖其他有效行。结果为模型预测；批量功能不进行模型训练，也不将上传内容写回原始数据。')}<p class="chart-caption">Model / 模型 ${esc(short(model))} · CSV Original temperature scale / 原始温度尺度</p></div>`;window.StudioLanguage.normalize($('batch-output'));$('batch-download').onclick=()=>downloadFile('\uFEFF'+csvText(results.map(({predictions,base,temperature_component,...x})=>x)),'SOLAR_batch.csv','text/csv;charset=utf-8');toast(`Batch completed / 批量实验完成：${r.success_count} rows / 条Success / 成功，${r.error_count} rows need attention. / 条需检查。`);}catch(e){if(token===state.batchRequest){$('batch-error').textContent=e.name==='AbortError'?'Inference timed out. Reduce the row count or retry later. / 计算超时，请减少行数或稍后重试。':e.message;$('batch-output').innerHTML='<div class="card journal-empty">Batch incomplete. Correct the inputs and retry. / 批量实验未完成，请修正后重试。</div>';}}finally{if(token===state.batchRequest)$('batch-run').disabled=false;}
}
function loadDemo(tab){if(!['predict','compare','explore','screen'].includes(tab))tab='predict';switchView(tab);resetConditions();if(tab==='explore'){$('model').value='InteractionConditional';updateModels();for(const n of ['Butyl Acetate','1-Octanol']){const s=state.catalog.solvents.find(x=>x.name===n);const chip=s&&document.querySelector(`#solvent-chips input[value="${s.id}"]`);if(chip)chip.checked=true;}}structures();$('demo-dialog').close();run();}
function bindUI(){
 $('conditions').onsubmit=run;document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view,true));document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>switchView(b.dataset.mode));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>switchView(b.dataset.jump));$('reset').onclick=resetConditions;
 $('conditions').addEventListener('change',e=>{if(['drug-search','solvent-search'].includes(e.target.id))return;invalidate();if(e.target.id==='model')updateModels();if(['drug','solvent'].includes(e.target.id))structures();if(e.target.id==='temperature')$('temperature-slider').value=e.target.value;});
 $('conditions').addEventListener('input',e=>{if(['drug-search','solvent-search'].includes(e.target.id))return;if(e.target.id==='temperature-slider')$('temperature').value=e.target.value;if(['temperature','temperature-slider','tmin','tmax'].includes(e.target.id))invalidate();});
 $('drug-search').oninput=e=>{const term=e.target.value.toLowerCase(),prev=$('drug').value,items=state.catalog.drugs.filter(r=>(r.name+' '+r.smiles).toLowerCase().includes(term));$('drug').innerHTML=items.map(option).join('');if(items.some(r=>r.id===prev))$('drug').value=prev;if(!items.length)$('drug').innerHTML='<option value="">No matching drug / 未找到匹配药物</option>';structures();invalidate();};
 $('solvent-search').oninput=e=>{const term=e.target.value.toLowerCase(),prev=$('solvent').value,items=state.catalog.solvents.filter(r=>(r.name+' '+r.smiles).toLowerCase().includes(term));$('solvent').innerHTML=items.map(option).join('');if(items.some(r=>r.id===prev))$('solvent').value=prev;if(!items.length)$('solvent').innerHTML='<option value="">No matching solvent / 未找到匹配溶剂</option>';structures();invalidate();};
 document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>openMolModal(b.dataset.inspect));
 document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{const r=selected(b.dataset.copy,$(b.dataset.copy).value);if(r?.smiles){navigator.clipboard?.writeText(r.smiles).then(()=>toast('SMILES copied / 已复制 SMILES: '+r.smiles)).catch(()=>toast(r.smiles));}});
 $('mol-dialog-close').onclick=()=>$('mol-dialog').close();
 $('mol-dialog').addEventListener('click',e=>{if(e.target===$('mol-dialog')){const box=e.target.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)e.target.close();}});
 $('demo-open').onclick=()=>$('demo-dialog').showModal();$('demo-close').onclick=()=>$('demo-dialog').close();$('demo-dialog').addEventListener('click',e=>{if(e.target===$('demo-dialog')){const box=e.target.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)e.target.close();}});document.querySelectorAll('[data-demo]').forEach(b=>b.onclick=()=>loadDemo(b.dataset.demo));
 $('focus-toggle').onclick=()=>{const enabled=document.body.classList.toggle('focus-mode');$('focus-toggle').setAttribute('aria-pressed',String(enabled));window.StudioLanguage.btn($('focus-toggle'),enabled?'Exit presentation / 退出展示':'Presentation mode / 展示模式',icon('expand'));toast(enabled?'Presentation mode enabled. Click again to exit. / 展示模式已开启；再次点击可退出。':'Presentation mode closed. / 已退出展示模式。');};
 $('history-clear').onclick=()=>{state.history=[];saveHistory();renderHistory();toast('Local experiment history cleared. / 本机实验记录已清空。');};$('history-export').onclick=()=>downloadFile('\uFEFF'+csvText(state.history.map(r=>({time:r.time,type:views[r.tab][0],model:r.model,drug:label('drug',r.q.drug_id),solvent:label('solvent',r.q.solvent_id),temperature:r.q.temperature,temperature_min:r.q.temperature_min,temperature_max:r.q.temperature_max,model_b:r.q.model_b||'',solvent_ids:(r.q.solvent_ids||[]).join('|'),predicted_log10:r.value,support:r.support}))), 'SOLAR_notebook.csv','text/csv;charset=utf-8');
 $('batch-model').innerHTML=modelOptions();$('batch-model').value=state.defaultModel;$('batch-example').onclick=()=>{$('batch-input').value=batchExample();$('batch-input').dispatchEvent(new Event('input'));$('batch-error').textContent='';};
 $('batch-sweep').onclick=()=>{const d=selected('drug',$('drug').value)?.name||'Lovastatin',s=selected('solvent',$('solvent').value)?.name||'Acetone';const temps=[10,15,20,25,30,35,40,45,50,55];$('batch-input').value='drug,solvent,temperature\n'+temps.map(t=>[csvCell(d),csvCell(s),t].join(',')).join('\n');$('batch-input').dispatchEvent(new Event('input'));$('batch-error').textContent='';toast('Generated 10-point temperature sweep / 已生成 10 点温度扫描');};
 $('batch-template').onclick=()=>downloadFile('\uFEFF'+batchExample(),'SOLAR_template.csv','text/csv;charset=utf-8');$('batch-run').onclick=runBatch;const staleBatch=()=>{if($('batch-download')&&!$('batch-output').querySelector('.stale-banner'))$('batch-output').insertAdjacentHTML('afterbegin','<div class="stale-banner">Batch inputs changed. Results below belong to the previous submission; run again to update. / 批量输入已更改；下方为上次提交的结果，请重新运行以更新。</div>');};$('batch-input').addEventListener('input',staleBatch);$('batch-model').addEventListener('change',staleBatch);$('batch-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>100000){$('batch-error').textContent='File exceeds 100 KB. Reduce it and retry. / 文件超过 100 KB，请精简后重试。';return;}try{$('batch-input').value=await file.text();staleBatch();$('batch-error').textContent='';toast('CSV loaded. Review the content before running. / 已载入，可检查内容后运行。');}catch(_){$('batch-error').textContent='Cannot read the file. Select it again. / 文件读取失败，请重新选择。';}};
}
async function init(){
 hydrateIcons();$('run').disabled=true;renderHistory();setEmpty();
 try{const [catalog,registry,insights]=await Promise.all([api('/api/catalog'),api('/api/models'),api('/api/insights')]);if(!registry.models.length)throw new Error('No models are available. / 当前没有可用模型。');state.catalog=catalog;state.models=registry.models;state.insights=insights;state.defaultModel=registry.default;state.comparator=registry.comparator;
 for(const [id,rows] of [['drug',catalog.drugs],['solvent',catalog.solvents],['multi',catalog.solvents]])$(id).innerHTML=rows.map(option).join('');$('model').innerHTML=modelOptions();
 const presets=[['Lovastatin','Acetone',25],['Caffeine','Ethanol',25],['Ibuprofen','1-Octanol',25],['Paracetamol','Water',25]].map(([dn,sn,t])=>({d:catalog.drugs.find(x=>x.name.toLowerCase()===dn.toLowerCase()),s:catalog.solvents.find(x=>x.name.toLowerCase()===sn.toLowerCase()),t})).filter(p=>p.d&&p.s);
 $('preset-chips').innerHTML=presets.map((p,i)=>`<button type="button" class="preset-chip" data-preset="${i}">${esc(p.d.name)} × ${esc(p.s.name)}</button>`).join('');
 document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const p=presets[Number(b.dataset.preset)];if(!p)return;$('drug-search').value='';$('solvent-search').value='';$('drug').innerHTML=state.catalog.drugs.map(option).join('');$('solvent').innerHTML=state.catalog.solvents.map(option).join('');$('drug').value=p.d.id;$('solvent').value=p.s.id;$('temperature').value=p.t;$('temperature-slider').value=p.t;structures();invalidate();});
 $('solvent-chips').innerHTML=['Acetone','Butyl Acetate','Ethyl ether','1-Octanol'].map(n=>catalog.solvents.find(s=>s.name===n)).filter(Boolean).map(s=>`<label class="solvent-chip"><input type="checkbox" value="${esc(s.id)}">${esc(s.name)}</label>`).join('');
 $('temperature-slider').min=catalog.temperature_min;$('temperature-slider').max=catalog.temperature_max;$('slider-min').textContent=catalog.temperature_min;$('slider-max').textContent=catalog.temperature_max;
 $('stat-rows').innerHTML=insights.summary.development_rows+'<small>rows · 条</small>';$('stat-parents').innerHTML=insights.summary.development_parents+'<small>groups · 组</small>';$('stat-models').innerHTML=state.models.length+'<small>models · 种</small>';$('stat-mae').textContent=fmt(state.models.find(m=>m.id===state.defaultModel)?.metrics.parent_macro_MAE);
 bindUI();resetConditions();switchView('predict');$('service-status').classList.add('ready');$('service-status').innerHTML='<i></i>'+state.models.length+' models ready / 已就绪模型';$('demo-open').disabled=false;
 }catch(e){$('error').textContent='Initialization failed / 初始化失败：'+e.message;$('service-status').textContent='Service connection failed / 服务连接异常';$('output').innerHTML=`<div class="card empty-state"><h3>Cannot connect to the experiment service / 暂时无法连接实验服务</h3><p>${esc(e.message)}</p><button class="button outline" id="retry-init">Reconnect / 重新连接</button></div>`;$('retry-init').onclick=()=>location.reload();$('demo-open').disabled=true;}
}
init();
