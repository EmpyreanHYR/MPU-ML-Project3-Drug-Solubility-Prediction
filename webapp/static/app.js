/* SOLAR Studio v5.0: Courseware-aligned, high-signal Drug Solubility Prediction Workbench (COMP6133). */
'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const icons = {
  flask:'M9 3h6m-5 0v6L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9V3M8 14h8',
  layers:'m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  curve:'M3 4v16h18M6 16c4 0 3-9 7-9s3 5 7-3',
  table:'M3 4h18v16H3zM3 9h18M9 4v16M15 9v11M3 15h18',
  chart:'M3 3v18h18M7 16v-5M12 16V6M17 16V9',
  shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  play:'m8 4 12 8-12 8V4Z',
  database:'M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3Zm0 0v12c0 2-4 3-8 3s-8-1-8-3V6m0 6c0 2 4 3 8 3s8-1 8-3',
  sliders:'M4 6h7m4 0h5M4 12h2m4 0h10M4 18h10m4 0h2M11 3v6M6 9v6m8 0v6',
  search:'M17 17l4 4M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  info:'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  check:'m5 12 4 4L19 6',
  file:'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h8'
};
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.info}"/></svg>`;}
function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});}

const palette = ['#2d8b76','#d97706','#2563eb','#dc2626','#7c3aed','#0284c7'];

const views = {
  predict: [
    '01 · Point Prediction & Branch Decomposition / 单点溶解度预测与分支拆解',
    'Predict Solubility / 预测溶解度'
  ],
  compare: [
    '02 · Controlled Model Comparison & 5D Radar / 同条件模型对照与五维评价雷达',
    'Run Comparison / 运行模型对照'
  ],
  screen: [
    '03 · 49-Solvent High-Throughput Screening & T-Curves / 49种全溶剂筛选与多溶剂变温响应',
    'Run Screening / 运行筛选与曲线'
  ],
  insights: [
    '04 · Model Improvement Chain, Ablation & Mechanism Evidence / 模型改进消融链与机理解析证据',
    ''
  ],
  batch: [
    '05 · High-Throughput Batch CSV Inference / 批量CSV高通量容错推断',
    ''
  ]
};

/* Verified scientific data from Assignment_Report_v2/analysis/results.json, deployment_explanations.json, & causal.json */
const REPORT_EVIDENCE = {
  ablationChain: [
    {
      stage: 'B0 · Basic Baseline',
      name: 'Basic ExtraTrees (23D descriptors, q=0) / 基础23维ExtraTrees',
      features: '23D (11 Drug + 11 Solvent + T)',
      parent_mae: 0.7469,
      mae: 0.7491,
      rmse: 0.9730,
      r2: 0.4229,
      delta_vs_basic: 'Baseline / 基准',
      ci_vs_basic: '—',
      highlight: false
    },
    {
      stage: 'H0 · Handcraft Model',
      name: 'SOLAR-H (Structure–Temp Decomposition) / SOLAR-H物理分解模型',
      features: 'ŷ = b(z) + γ·τ·(uᵀβ), closed-form ridge + ET',
      parent_mae: 0.7164,
      mae: 0.7520,
      rmse: 1.0016,
      r2: 0.3884,
      delta_vs_basic: '−0.0305 (−4.08%)',
      ci_vs_basic: '77/128 parents beaten by Fusion',
      highlight: false
    },
    {
      stage: 'B3 · Feature & Weighting',
      name: 'Rich Interaction ExtraTrees (869D, q=1) / 869维交互+母体等权树',
      features: '869D [D, S, T, D⊙S, |D−S|] → 665D + wᵢ ∝ n_g⁻¹',
      parent_mae: 0.6831,
      mae: 0.6720,
      rmse: 0.8981,
      r2: 0.5083,
      delta_vs_basic: '−0.0638 (−8.54%)',
      ci_vs_basic: '[−0.1219, −0.0082] ✓',
      highlight: false
    },
    {
      stage: 'P0 · Foundation Branch',
      name: 'TabPFN v2 Single Branch / TabPFN v2表格基础模型单分支',
      features: 'In-context Transformer attention prior',
      parent_mae: 0.6827,
      mae: 0.6698,
      rmse: 0.9117,
      r2: 0.4933,
      delta_vs_basic: '−0.0643 (−8.60%)',
      ci_vs_basic: '15.0% residual sign disagreement vs ET',
      highlight: false
    },
    {
      stage: 'M3 · Multi-Tree Control',
      name: 'Three-Branch Blend (TabPFN + ET + CatBoost) / 三分支融合对照',
      features: '869D interaction + CatBoost branch',
      parent_mae: 0.6729,
      mae: 0.6631,
      rmse: 0.8882,
      r2: 0.5191,
      delta_vs_basic: '−0.0741 (−9.92%)',
      ci_vs_basic: '[−0.0201, +0.0076] vs Main',
      highlight: false
    },
    {
      stage: 'F ★ Proposed Main',
      name: 'ExtraTrees–TabPFN Fusion (0.75 ET + 0.25 TabPFN) / 本文主融合模型',
      features: '869D Interaction + q=1 + OOF Convex Fusion',
      parent_mae: 0.6668,
      mae: 0.6510,
      rmse: 0.8842,
      r2: 0.5234,
      delta_vs_basic: '−0.0801 (−10.73%)',
      ci_vs_basic: '[−0.1366, −0.0276] ✓',
      highlight: true
    }
  ],
  treePilot: [
    {label: '23D Basic Concat (q=0) / 23维基础拼接', mae: 0.7112},
    {label: '435D Rich Concat (q=0) / 435维丰富拼接', mae: 0.6853},
    {label: '869D Explicit Interaction (q=0) / 869维显式交互(无加权)', mae: 0.6985},
    {label: '869D Explicit Interaction + Parent-Equal (q=1) / 869维交互+母体等权', mae: 0.6760}
  ],
  weightSensitivity: [
    {w: 0.00, mae: 0.6831, label: 'α=0.00 (Pure ExtraTrees)'},
    {w: 0.25, mae: 0.6734, label: 'α=0.25 (Deploy weight)'},
    {w: 0.50, mae: 0.6708, label: 'α=0.50 (Equal blend)'},
    {w: 0.75, mae: 0.6732, label: 'α=0.75 (TabPFN heavy)'},
    {w: 1.00, mae: 0.6827, label: 'α=1.00 (Pure TabPFN)'}
  ],
  seedStability: [
    {seed: 'Seed 17', fusion_parent_mae: 0.6635, fusion_r2: 0.5276, et_mae: 0.6820, pfn_mae: 0.6818, solar_mae: 0.7205},
    {seed: 'Seed 42', fusion_parent_mae: 0.6679, fusion_r2: 0.5238, et_mae: 0.6831, pfn_mae: 0.6839, solar_mae: 0.7082},
    {seed: 'Seed 2026 (Deploy)', fusion_parent_mae: 0.6690, fusion_r2: 0.5188, et_mae: 0.6842, pfn_mae: 0.6822, solar_mae: 0.7205}
  ],
  shapGroups: [
    {group: 'Drug Structure Descriptors (217D) / 药物分子结构特征', val: 0.4660, pct: 45.9, color: '#2d8b76'},
    {group: 'Explicit Drug×Solvent Interactions (D⊙S, |D−S|) / 显式分子间交互', val: 0.4324, pct: 42.6, color: '#2563eb'},
    {group: 'Solvent Descriptors (217D) / 溶剂分子理化特征', val: 0.0841, pct: 8.3, color: '#d97706'},
    {group: 'Temperature Condition (T) / 实验温度条件项', val: 0.0334, pct: 3.3, color: '#7c3aed'}
  ],
  solubilityBands: [
    {band: '(−∞, −4.0] · Extreme Insoluble (Solubility Cliff / 极端难溶悬崖)', rows: 23, parents: 8, fusion_mae: 2.2508, fusion_bias: '+2.2504 (Overest.)', solar_mae: 2.4127},
    {band: '(−4.0, −2.0] · Low Solubility (低溶解度区间)', rows: 321, parents: 56, fusion_mae: 0.8743, fusion_bias: '+0.7837', solar_mae: 0.9972},
    {band: '(−2.0, 0.0] · Moderate Solubility (54.7% 主力工业区间 ★)', rows: 824, parents: 110, fusion_mae: 0.4653, fusion_bias: '−0.1197 (Near zero)', solar_mae: 0.5514},
    {band: '(0.0, +∞) · High Solubility (高溶解度区间)', rows: 339, parents: 43, fusion_mae: 0.7823, fusion_bias: '−0.7719', solar_mae: 0.8949}
  ],
  causalTemp: {
    subset: '157 multi-temperature pairs · 1,118 rows · 73 parents',
    pooled_slope: -0.00746,
    pooled_ci: '[-0.0261, +0.0112]',
    within_slope: +0.01538,
    within_ci: '[+0.0120, +0.0188]',
    bootstrap_ci: '[+0.0124, +0.0190]',
    robust_r2: 0.5401
  }
};

const state = {
  tab: 'predict',
  models: [],
  catalog: null,
  insights: null,
  request: 0,
  controller: null,
  current: null,
  compareCache: null,
  screenCache: null,
  exploreCache: null,
  stale: false,
  showObservations: true,
  unit: 'log',
  defaultModel: 'TabPFN_ExtraTreesBlend',
  comparator: 'AdaptiveHybrid',
  batchRequest: 0,
  batchInitialized: false,
  molCache: {},
  molReq: 0,
  screenFilter: 'all',
  screenSort: 'desc',
  screenSubTab: 'ranking', // 'ranking' | 'explore'
  diagCache: {},
  diagModel: 'TabPFN_ExtraTreesBlend',
  leaderboardGroup: 'all',
  radarSelected: ['TabPFN_ExtraTreesBlend', 'AdaptiveHybrid', 'ExtraTrees', 'TabM'],
  compareDeck: 'radar', // 'radar' | 'protocol' | 'curves'
  insightsDeck: 'ablation' // 'ablation' | 'mechanism' | 'leaderboard'
};

const chartRegistry = new Map();
let chartSeq = 0;
const fmt = (v, n=4) => Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v).toFixed(n) : '—';
const short = id => (state.models.find(m => m.id === id)?.name || id).split(' / ')[0];
const label = (side, id) => state.catalog?.[side === 'drug' ? 'drugs' : 'solvents'].find(x => x.id === id)?.name || id;
const selected = (side, id) => state.catalog?.[side === 'drug' ? 'drugs' : 'solvents'].find(x => x.id === id);

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
  TabPFN_ExtraTreesBlend: 'Main Model (0.75 ET + 0.25 TabPFN) · Best parent MAE (0.6668) & R² (0.5234)',
  TabPFN_TwoTreeBlend: '3-Branch Ensemble (TabPFN + ET + CatBoost) · 2nd best generalization (0.6729)',
  AdaptiveHybrid: 'SOLAR-H Physical Structure–Temp Decomposition · Adaptive gain γ damping (0.7164)',
  ExtraTrees: 'Basic 23D ExtraTrees Baseline · Ultra-fast inference (0.04 ms/row, MAE 0.7469)',
  RandomForest: 'Classical Bagging Tree Ensemble · Stable variance reduction (MAE 0.7310)',
  TabM: 'Multi-Head Parameter-Sharing Deep Tabular Network (MAE 0.7694)',
  HistGradientBoosting: 'Histogram Gradient Boosted Decision Trees (MAE 0.7340)',
  RealMLP: 'Regularized Deep MLP with Normalized Embeddings (MAE 0.7405)',
  HybridConditional: 'SOLAR-H0 Unshrunk Fixed-Gain Decomposition Control (γ=1)',
  TemperatureMLP: 'Thermal Difference Conditioned Neural MLP',
  PlainMLP: 'Standard Feedforward MLP Baseline',
  InteractionConditional: 'SOLAR-N Dual-Encoder Explicit Pairwise Interaction Network',
  Ridge: 'L2-Regularized Linear Regression Baseline (Exposes non-linearity)',
  Dummy: 'Zero-Information Constant Mean Anchor'
};

const RADAR_AXES = [
  {
    key: 'parent_macro_MAE',
    labelEn: 'Parent Generalization',
    labelZh: '跨母体推广 MAE ↓',
    better: 'lower',
    format: v => fmt(v, 4),
    score: v => Math.max(8, Math.min(98, 100 * (0.98 - v) / (0.98 - 0.65)))
  },
  {
    key: 'MAE',
    labelEn: 'Record Accuracy',
    labelZh: '样本精度 MAE ↓',
    better: 'lower',
    format: v => fmt(v, 4),
    score: v => Math.max(8, Math.min(98, 100 * (1.08 - v) / (1.08 - 0.64)))
  },
  {
    key: 'R2',
    labelEn: 'Explained Variance',
    labelZh: '决定系数 R² ↑',
    better: 'higher',
    format: v => fmt(v, 4),
    score: v => Math.max(8, Math.min(98, 100 * (v - (-0.08)) / (0.55 - (-0.08))))
  },
  {
    key: 'RMSE',
    labelEn: 'Outlier Stability',
    labelZh: '均方根误差 RMSE ↓',
    better: 'lower',
    format: v => fmt(v, 4),
    score: v => Math.max(8, Math.min(98, 100 * (1.35 - v) / (1.35 - 0.86)))
  },
  {
    key: 'inference_ms_per_row',
    labelEn: 'Inference Throughput',
    labelZh: '推理时效 ↑',
    better: 'speed',
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
  const width = 490, height = 370;
  const cx = 245, cy = 188, R = 128;
  const K = RADAR_AXES.length;
  const angles = Array.from({length: K}, (_, i) => -Math.PI / 2 + i * 2 * Math.PI / K);

  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPolys = levels.map(frac => {
    const pts = angles.map(th => `${(cx + frac * R * Math.cos(th)).toFixed(1)},${(cy + frac * R * Math.sin(th)).toFixed(1)}`).join(' ');
    const isOuter = frac === 1.0;
    return `<polygon points="${pts}" fill="${isOuter ? 'rgba(248, 250, 252, 0.6)' : 'none'}" stroke="${isOuter ? '#cbd5e1' : '#e2e8f0'}" stroke-width="${isOuter ? '1.5' : '1'}" stroke-dasharray="${isOuter ? 'none' : '3,3'}" />`;
  }).join('');

  const gridLabels = levels.map(frac => {
    return `<text x="${cx + 5}" y="${(cy - frac * R + 3).toFixed(1)}" fill="#94a3b8" font-size="8.5" font-family="var(--mono)">${Math.round(frac * 100)}</text>`;
  }).join('');

  const spokes = angles.map(th => {
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(th)).toFixed(1)}" y2="${(cy + R * Math.sin(th)).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2" />`;
  }).join('');

  const axisLabels = RADAR_AXES.map((axis, i) => {
    const th = angles[i];
    const labelDist = R + 22;
    const lx = cx + labelDist * Math.cos(th);
    const ly = cy + labelDist * Math.sin(th);
    let anchor = 'middle', dyEn = 0, dyZh = 12;
    if (i === 0) { anchor = 'middle'; dyEn = -6; dyZh = 11; }
    else if (i === 1) { anchor = 'start'; dyEn = -2; dyZh = 12; }
    else if (i === 2) { anchor = 'start'; dyEn = 4; dyZh = 12; }
    else if (i === 3) { anchor = 'end'; dyEn = 4; dyZh = 12; }
    else if (i === 4) { anchor = 'end'; dyEn = -2; dyZh = 12; }
    return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}">
      <tspan x="${lx.toFixed(1)}" dy="${dyEn}" font-weight="600" font-size="10.5" fill="#1e293b">${axis.labelEn}</tspan>
      <tspan x="${lx.toFixed(1)}" dy="${dyZh}" font-size="9.5" fill="#64748b">${axis.labelZh}</tspan>
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
      return {x: cx + dist * Math.cos(angles[i]), y: cy + dist * Math.sin(angles[i]), s};
    });
    const polyStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const fillOp = selectedIds.length > 5 ? '0.06' : selectedIds.length > 2 ? '0.11' : '0.18';
    const strokeW = selectedIds.length > 5 ? '1.8' : '2.4';

    const dots = pts.map((p, i) => {
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${color}" stroke="#ffffff" stroke-width="1.5" class="radar-dot" data-model="${esc(id)}" data-axis="${i}" data-score="${p.s.score}" data-raw="${esc(p.s.formatted)}" data-name="${esc(short(id))}" data-label="${esc(p.s.labelEn)} (${esc(p.s.labelZh)})" />`;
    }).join('');

    return `<g class="radar-model-group" data-model="${esc(id)}">
      <polygon points="${polyStr}" fill="${color}" fill-opacity="${fillOp}" stroke="${color}" stroke-width="${strokeW}" stroke-linejoin="round" class="radar-polygon" data-model="${esc(id)}" data-name="${esc(short(id))}" />
      ${dots}
    </g>`;
  }).join('');

  return `<svg viewBox="0 0 ${width} ${height}" class="radar-svg" role="img" aria-label="5-Axis Model Evaluation Radar Chart">
    <g class="radar-grid">${gridPolys}${gridLabels}${spokes}</g>
    <g class="radar-axes">${axisLabels}</g>
    <g class="radar-models">${modelSvgGroups}</g>
    <circle cx="${cx}" cy="${cy}" r="2.5" fill="#94a3b8" />
  </svg>`;
}

/* Crisp, scannable comparative matrix table for selected models (fits on 1 screen without card clutter) */
function buildRadarMatrixHTML(selectedIds) {
  if (!selectedIds || selectedIds.length === 0) {
    return `<div class="radar-empty-hint">Select at least 1 model above / 请在上方勾选至少 1 个模型</div>`;
  }
  const allRanked = [...state.models].sort((a,b) => (a.metrics?.parent_macro_MAE||99) - (b.metrics?.parent_macro_MAE||99));
  const selectedModels = selectedIds.map(id => state.models.find(m => m.id === id)).filter(Boolean);

  const bestParent = Math.min(...selectedModels.map(m => m.metrics.parent_macro_MAE));
  const bestMAE = Math.min(...selectedModels.map(m => m.metrics.MAE));
  const bestRMSE = Math.min(...selectedModels.map(m => m.metrics.RMSE));
  const bestR2 = Math.max(...selectedModels.map(m => m.metrics.R2));
  const bestSpeed = Math.min(...selectedModels.map(m => m.metrics.inference_ms_per_row));

  let pairBanner = '';
  if (selectedModels.length >= 2) {
    const [mA, mB] = selectedModels;
    const diffPct = ((mB.metrics.parent_macro_MAE - mA.metrics.parent_macro_MAE) / mB.metrics.parent_macro_MAE * 100).toFixed(2);
    pairBanner = `<div class="radar-pair-strip">
      <span><strong>${esc(short(mA.id))}</strong> vs <strong>${esc(short(mB.id))}</strong>: Parent MAE Δ = <b>${(mA.metrics.parent_macro_MAE - mB.metrics.parent_macro_MAE).toFixed(4)}</b> (${diffPct >= 0 ? '−' + diffPct : '+' + Math.abs(diffPct)}%)</span>
      <button type="button" class="button outline compact radar-apply-compare-btn" data-pair-a="${esc(mA.id)}" data-pair-b="${esc(mB.id)}">
        <span class="btn-stack"><span lang="en" class="btn-text-en">Load Pair in A vs B</span><span lang="zh-CN" class="btn-text-zh">载入左侧A/B对比</span></span>
      </button>
    </div>`;
  }

  return `${pairBanner}
  <div class="table-scroll">
    <table class="radar-comp-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Model / 模型</th>
          <th>Parent MAE ↓</th>
          <th>Record MAE ↓</th>
          <th>RMSE ↓</th>
          <th>R² ↑</th>
          <th>Speed</th>
        </tr>
      </thead>
      <tbody>
        ${selectedModels.map((m, idx) => {
          const rank = allRanked.findIndex(x => x.id === m.id) + 1;
          const color = getModelColor(m.id, idx);
          const met = m.metrics;
          const spd = met.inference_ms_per_row < 0.01 ? (met.inference_ms_per_row * 1000).toFixed(1) + ' µs' : fmt(met.inference_ms_per_row, 2) + ' ms';
          return `<tr>
            <td><span class="badge ${rank===1?'good':''}">#${rank}</span></td>
            <td><span class="radar-chip-dot" style="background:${color};display:inline-block;margin-right:5px"></span><strong>${esc(short(m.id))}</strong></td>
            <td class="${met.parent_macro_MAE===bestParent?'cell-best':''}">${fmt(met.parent_macro_MAE, 4)}</td>
            <td class="${met.MAE===bestMAE?'cell-best':''}">${fmt(met.MAE, 4)}</td>
            <td class="${met.RMSE===bestRMSE?'cell-best':''}">${fmt(met.RMSE, 4)}</td>
            <td class="${met.R2===bestR2?'cell-best':''}">${fmt(met.R2, 4)}</td>
            <td class="${met.inference_ms_per_row===bestSpeed?'cell-best':''}">${spd}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  <div class="radar-takeaways-list">
    ${selectedModels.slice(0, 4).map((m, idx) => {
      const color = getModelColor(m.id, idx);
      return `<div class="radar-takeaway-row" style="border-left:3px solid ${color}">
        <strong>${esc(short(m.id))}:</strong> ${esc(MODEL_TAKEAWAYS[m.id] || m.group)}
      </div>`;
    }).join('')}
  </div>`;
}

function renderRadarComponent() {
  if (!state.models || state.models.length === 0) return '';
  const selected = state.radarSelected || [state.defaultModel, state.comparator];
  const sortedModels = [...state.models].sort((a,b) => (a.metrics?.parent_macro_MAE || 99) - (b.metrics?.parent_macro_MAE || 99));

  return `<div class="card radar-comparison-card" id="radar-comparison-card">
    <div class="radar-presets-bar">
      <span class="radar-bar-label">Presets / 预设组合:</span>
      <div class="radar-presets-btns">
        <button type="button" class="button outline compact radar-preset-btn" data-preset="pair">
          <span class="btn-stack"><span lang="en" class="btn-text-en">Current A vs B</span><span lang="zh-CN" class="btn-text-zh">当前A与B</span></span>
        </button>
        <button type="button" class="button outline compact radar-preset-btn" data-preset="arch4">
          <span class="btn-stack"><span lang="en" class="btn-text-en">4 Core Architectures</span><span lang="zh-CN" class="btn-text-zh">四类核心架构</span></span>
        </button>
        <button type="button" class="button outline compact radar-preset-btn" data-preset="top3">
          <span class="btn-stack"><span lang="en" class="btn-text-en">Top 3 Models</span><span lang="zh-CN" class="btn-text-zh">榜单前三</span></span>
        </button>
        <button type="button" class="button outline compact radar-preset-btn" data-preset="tree_vs_nn">
          <span class="btn-stack"><span lang="en" class="btn-text-en">Tree vs Neural</span><span lang="zh-CN" class="btn-text-zh">树模型 vs 神经网络</span></span>
        </button>
        <button type="button" class="button outline compact radar-preset-btn" data-preset="all">
          <span class="btn-stack"><span lang="en" class="btn-text-en">All 14 Models</span><span lang="zh-CN" class="btn-text-zh">全部14款</span></span>
        </button>
      </div>
      <span class="badge" id="radar-count-badge" style="margin-left:auto">${selected.length} / ${state.models.length} selected</span>
    </div>

    <div class="radar-chips-bar">
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
        <div class="radar-svg-wrapper" id="radar-svg-wrapper">${buildRadarSVG(selected)}</div>
        <div class="radar-tooltip" id="radar-tooltip"></div>
        <div class="radar-axis-guide">
          <span>Normalized 0–100 scale (outer ring = best) · 5×3 Nested Parent-Grouped CV</span>
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
    if (badge) badge.textContent = `${state.radarSelected.length} / ${state.models.length} selected`;
    root.querySelectorAll('.radar-chip').forEach(chip => {
      chip.classList.toggle('active', state.radarSelected.includes(chip.dataset.modelId));
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
        if (state.radarSelected.length > 1) state.radarSelected = state.radarSelected.filter(x => x !== mid);
        else toast('Keep at least 1 model selected / 请至少保留 1 个模型');
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
        state.radarSelected = [$('model')?.value || state.defaultModel, $('model-b')?.value || state.comparator];
      } else if (preset === 'top3') {
        state.radarSelected = ['TabPFN_ExtraTreesBlend', 'TabPFN_TwoTreeBlend', 'AdaptiveHybrid'];
      } else if (preset === 'arch4') {
        state.radarSelected = ['TabPFN_ExtraTreesBlend', 'AdaptiveHybrid', 'ExtraTrees', 'TabM'];
      } else if (preset === 'tree_vs_nn') {
        state.radarSelected = ['TabPFN_ExtraTreesBlend', 'ExtraTrees', 'RandomForest', 'TabM', 'RealMLP'];
      } else if (preset === 'all') {
        state.radarSelected = state.models.map(m => m.id);
      }
      updateRadarDisplay();
    };
  });

  function bindMatrixActions() {
    root.querySelectorAll('.radar-apply-compare-btn').forEach(btn => {
      btn.onclick = () => {
        const {pairA, pairB} = btn.dataset;
        if (pairA && pairB && $('model') && $('model-b')) {
          $('model').value = pairA;
          updateModels();
          $('model-b').value = pairB;
          run();
        }
      };
    });
  }

  function bindSvgHovers() {
    const tooltip = root.querySelector('#radar-tooltip');
    const stage = root.querySelector('.radar-chart-stage');
    if (!tooltip || !stage) return;
    root.querySelectorAll('.radar-dot').forEach(dot => {
      dot.onmouseenter = () => {
        const {name, label, score, raw} = dot.dataset;
        tooltip.innerHTML = `<div class="radar-tooltip-title">${esc(name)}</div>
          <div class="radar-tooltip-score">${esc(label)}: <strong>${score}</strong> / 100</div>
          <div class="radar-tooltip-raw">Nested CV: <strong>${esc(raw)}</strong></div>`;
        const stageRect = stage.getBoundingClientRect();
        const dotRect = dot.getBoundingClientRect();
        tooltip.style.left = `${Math.min(stageRect.width - 210, Math.max(8, dotRect.left - stageRect.left + 10))}px`;
        tooltip.style.top = `${Math.max(8, dotRect.top - stageRect.top - 10)}px`;
        tooltip.style.opacity = '1';
      };
      dot.onmouseleave = () => { tooltip.style.opacity = '0'; };
    });
  }

  bindMatrixActions();
  bindSvgHovers();
}

let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}

async function api(path, payload, signal){
  const controller = signal ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), 90000) : null;
  try {
    const r = await fetch(path, {
      ...(payload ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)} : {}),
      signal: signal || controller.signal
    });
    let j;
    try { j = await r.json(); } catch(_) { throw new Error('Invalid service response / 服务响应异常'); }
    if (!r.ok) {
      const d = j.detail;
      throw new Error(typeof d === 'string' ? d : Array.isArray(d) ? 'Invalid input: ' + d.map(x => x.loc?.slice(1).join('.') + ' ' + x.msg).join('; ') : 'Request failed');
    }
    return j;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function option(r){return `<option value="${esc(r.id)}">${esc(r.name)}</option>`;}
function modelOptions(exclude=''){
  return [...new Set(state.models.map(m=>m.group))].map(group =>
    `<optgroup label="${esc(group)}">${state.models.filter(m=>m.group===group&&m.id!==exclude).map(option).join('')}</optgroup>`
  ).join('');
}

function updateModels(){
  const prev = $('model-b').value;
  $('model-b').innerHTML = modelOptions($('model').value);
  if ([...$('model-b').options].some(o => o.value === prev)) $('model-b').value = prev;
  else if ($('model-b').querySelector(`option[value="${state.comparator}"]`)) $('model-b').value = state.comparator;
  const m = state.models.find(m => m.id === $('model').value);
  if (!m) return;
  $('model-hint').textContent = m.id === state.defaultModel ? 'MAIN · 0.6668' : 'MAE ' + fmt(m.metrics.parent_macro_MAE, 3);
}

async function getMolProfile(id){
  if (!id) return null;
  if (state.molCache[id]) return state.molCache[id];
  try { const p = await api('/api/molecule/' + encodeURIComponent(id)); state.molCache[id] = p; return p; }
  catch(_) { return null; }
}

function renderMolProps(side, p){
  const el = $(side + '-props');
  if (!el) return;
  if (!p) { el.innerHTML = ''; return; }
  const pr = p.properties;
  el.innerHTML = `<span class="mol-prop-chip"><strong>${esc(p.formula)}</strong></span>` +
    `<span class="mol-prop-chip">MW <strong>${fmt(pr.MolWt,1)}</strong></span>` +
    `<span class="mol-prop-chip">cLogP <strong>${fmt(pr.MolLogP,2)}</strong></span>` +
    `<span class="mol-prop-chip">TPSA <strong>${fmt(pr.TPSA,1)}</strong></span>` +
    (side === 'drug' ? `<span class="mol-prop-chip ${p.lipinski_violations===0?'ro5-ok':'ro5-warn'}">${p.lipinski_violations===0?'Lipinski ✓':'Ro5: '+p.lipinski_violations}</span>` : '');
}

function updatePairMatch(dp, sp){
  const pill = $('pair-match-pill');
  if (!pill) return;
  if (!dp || !sp) { pill.hidden = true; return; }
  const dLogP = Math.abs(dp.properties.MolLogP - sp.properties.MolLogP);
  pill.className = 'pair-match-pill' + (dLogP <= 1.5 ? '' : ' warn');
  pill.innerHTML = `ΔcLogP ${fmt(dLogP,2)}`;
  pill.hidden = false;
}

function structures(){
  const req = ++state.molReq;
  const dId = $('drug').value, sId = $('solvent').value;
  for (const side of ['drug', 'solvent']) {
    const r = selected(side, $(side).value);
    $(side + '-image').src = r ? '/api/structure/' + encodeURIComponent(r.id) : '';
    $(side + '-image').alt = r ? r.name + ' 2D structure' : 'No molecule';
    $(side + '-name').textContent = r?.name || '—';
    $(side + '-smiles').textContent = r?.smiles || '';
    $(side + '-smiles').title = r?.smiles || '';
    if (!r) $(side + '-props').innerHTML = '';
  }
  Promise.all([getMolProfile(dId), getMolProfile(sId)]).then(([dp, sp]) => {
    if (req !== state.molReq) return;
    renderMolProps('drug', dp);
    renderMolProps('solvent', sp);
    updatePairMatch(dp, sp);
  });
}

async function openMolModal(side){
  const id = $(side).value, r = selected(side, id);
  if (!r) return;
  const p = await getMolProfile(id);
  $('mol-dialog-kicker').textContent = (side === 'drug' ? 'DRUG' : 'SOLVENT') + ' RDKIT DESCRIPTOR PROFILE / 分子理化描述符档案';
  $('mol-dialog-title').textContent = r.name;
  if (!p) { $('mol-dialog-body').innerHTML = '<p>Profile unavailable.</p>'; $('mol-dialog').showModal(); return; }
  const pr = p.properties;
  $('mol-dialog-body').innerHTML = `<div class="mol-detail-hero">
    <img src="/api/structure/${encodeURIComponent(id)}" alt="${esc(r.name)}">
    <div class="mol-detail-meta">
      <strong>${esc(p.formula)}</strong>
      <code>${esc(p.smiles)}</code>
      <div class="tag-row" style="justify-content:flex-start">
        <span class="badge">Dev records: ${p.dev_support.row_count}</span>
        <span class="badge">Partners: ${p.dev_support.partner_count}</span>
        ${p.dev_support.temp_min != null ? `<span class="badge">T: [${p.dev_support.temp_min}, ${p.dev_support.temp_max}]</span>` : ''}
      </div>
    </div>
  </div>
  <div class="mol-detail-grid">
    <div class="mol-detail-stat"><span>MolWt (g/mol)</span><strong>${fmt(pr.MolWt,2)}</strong></div>
    <div class="mol-detail-stat"><span>cLogP (Crippen)</span><strong>${fmt(pr.MolLogP,3)}</strong></div>
    <div class="mol-detail-stat"><span>TPSA (Å²)</span><strong>${fmt(pr.TPSA,2)}</strong></div>
    <div class="mol-detail-stat"><span>HBD / HBA</span><strong>${pr.HBD} / ${pr.HBA}</strong></div>
    <div class="mol-detail-stat"><span>Rotatable Bonds</span><strong>${pr.RotatableBonds}</strong></div>
    <div class="mol-detail-stat"><span>Rings (Aromatic)</span><strong>${pr.RingCount} (${pr.AromaticRings})</strong></div>
    <div class="mol-detail-stat"><span>Heavy Atoms</span><strong>${pr.HeavyAtomCount}</strong></div>
    <div class="mol-detail-stat"><span>Fraction Csp³</span><strong>${fmt(pr.FractionCSP3,3)}</strong></div>
    <div class="mol-detail-stat"><span>Lipinski Ro5</span><strong>${p.lipinski_violations===0?'Pass (0 viol.)':p.lipinski_violations+' violations'}</strong></div>
  </div>`;
  $('mol-dialog').showModal();
}

function cancelRun(){
  state.request++;
  state.controller?.abort();
  state.controller = null;
  $('run').disabled = false;
  if (views[state.tab]?.[1]) window.StudioLanguage.btn($('run-label'), views[state.tab][1]);
  $('output').removeAttribute('aria-busy');
}

function syncFormVisibility(){
  const tab = state.tab;
  const isExploreMode = tab === 'screen' && state.screenSubTab === 'explore';
  const isScreenRanking = tab === 'screen' && state.screenSubTab === 'ranking';
  const showRange = (tab === 'compare' && state.compareDeck === 'curves') || isExploreMode;

  $('model-b-wrap').hidden = tab !== 'compare';
  $('solvent-field').hidden = isScreenRanking;
  $('range-fields').hidden = !showRange;
  $('tmin').disabled = !showRange;
  $('tmax').disabled = !showRange;
  $('multi-wrap').hidden = !isExploreMode;
  $('molecules-strip').hidden = tab !== 'predict';
}

function switchView(tab){
  if (!views[tab]) return;
  cancelRun();
  state.tab = tab;
  state.stale = false;
  state.unit = 'log';
  $('error').textContent = '';

  document.querySelectorAll('[data-view]').forEach(b => {
    const active = b.dataset.view === tab;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  const isExperiment = ['predict', 'compare', 'screen'].includes(tab);
  $('experiment-view').hidden = !isExperiment;
  $('insights-view').hidden = tab !== 'insights';
  $('batch-view').hidden = tab !== 'batch';
  $('page-title').textContent = views[tab][0];

  if (isExperiment) {
    window.StudioLanguage.btn($('run-label'), views[tab][1]);
    syncFormVisibility();
    run();
  } else if (tab === 'insights') {
    renderInsights();
  } else if (tab === 'batch') {
    if (!state.batchInitialized && state.catalog) {
      state.batchInitialized = true;
      $('batch-input').value = batchExample();
      runBatch();
    }
  }
  window.StudioLanguage.normalize();
  window.scrollTo({top:0, left:0, behavior:'instant'});
}

function resetConditions(){
  $('drug-search').value = '';
  $('solvent-search').value = '';
  $('drug').innerHTML = state.catalog.drugs.map(option).join('');
  $('solvent').innerHTML = state.catalog.solvents.map(option).join('');
  $('drug').value = state.catalog.drugs.find(r => r.name === 'Lovastatin')?.id || state.catalog.drugs[0].id;
  $('solvent').value = state.catalog.solvents.find(r => r.name === 'Acetone')?.id || state.catalog.solvents[0].id;
  $('model').value = state.defaultModel;
  updateModels();
  $('model-b').value = state.comparator;
  $('temperature').value = 25;
  $('temperature-slider').value = 25;
  $('tmin').value = 10;
  $('tmax').value = 45;
  document.querySelectorAll('#solvent-chips input').forEach((el, idx) => { el.checked = idx < 2; });
  structures();
}

function readConditions(){
  const tab = state.tab;
  const isExploreMode = tab === 'screen' && state.screenSubTab === 'explore';
  const isScreenRanking = tab === 'screen' && state.screenSubTab === 'ranking';
  const needRange = tab === 'compare' || isExploreMode;

  const q = {
    model_id: $('model').value,
    drug_id: $('drug').value,
    solvent_id: $('solvent').value,
    temperature: Number($('temperature').value),
    temperature_min: Number($('tmin').value),
    temperature_max: Number($('tmax').value)
  };

  for (const id of needRange ? ['temperature', 'tmin', 'tmax'] : ['temperature']) {
    if (!$(id).value.trim() || !Number.isFinite(Number($(id).value)) || Math.abs(Number($(id).value)) > 1000) {
      throw new Error('Enter a valid temperature between -1000 and 1000 / 请输入有效温度 (-1000 ~ 1000)');
    }
  }
  if (!q.drug_id || (!isScreenRanking && !q.solvent_id)) {
    throw new Error('Choose a drug and solvent from the catalog / 请选择药物与溶剂');
  }
  if (needRange && q.temperature_min >= q.temperature_max) {
    throw new Error('T start must be below T end / 温度起点须小于终点');
  }
  q.solvent_ids = isExploreMode
    ? [...new Set([q.solvent_id, ...[...document.querySelectorAll('#solvent-chips input:checked')].map(x => x.value)])].slice(0, 6)
    : [q.solvent_id];

  if (tab === 'compare') {
    q.model_b = $('model-b').value;
    if (q.model_id === q.model_b) throw new Error('Choose two different models to compare / 请选择两个不同的模型进行对比');
  }
  return q;
}

function valueCard(title, value, note, alt=false){
  return `<div class="prediction-value${alt?' alt':''}"><span>${esc(title)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`;
}

function domainHTML(e){
  const d = e.domain;
  const badge = (yes, a, b) => `<span class="badge ${yes?'good':'warn'}">${icon(yes?'check':'info')}${yes?a:b}</span>`;
  const rangeStr = e.range?.min != null ? ` [${e.range.min} ~ ${e.range.max}°C]` : '';
  return `<div class="domain-strip">
    ${badge(d.parent_seen, 'Parent Seen in Dev / 开发集已见母体', 'Unseen Drug Parent / 未见药物母体外推')}
    ${badge(d.pair_seen, `Pair Observations: ${e.support.pair_rows} rows${rangeStr} / 组合实测 ${e.support.pair_rows} 条`, 'Unobserved Pair / 该药物-溶剂组合无实测')}
    ${badge(d.temperature_in_range && (!d.pair_seen || d.pair_temperature_in_range), 'Within Observed T-Range / 位于实测温区内', 'Temperature Extrapolation / 温度区间外推预警')}
  </div>`;
}

function axisText(value){
  const text = String(value), i = text.indexOf(' / ');
  return i < 0 ? esc(text) : esc(text.slice(0, i)) + ` · ${esc(text.slice(i + 3))}`;
}

function chart(series, {xLabel='Temperature T (°C) / 温度 T', yLabel='log₁₀ S (mol/L)', identity=false, id='', H=235}={}){
  const valid = series.map(s => ({
    ...s,
    points: s.x.map((x,i) => [Number(x), Number(s.y[i]), s.pointLabels?.[i], s.pointColors?.[i]])
               .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
  })).filter(s => s.points.length);
  const pts = valid.flatMap(s => s.points);
  if (!pts.length) return '<p class="chart-caption">No plottable values / 暂无可绘制数据</p>';

  let xmin = Math.min(...pts.map(p=>p[0])), xmax = Math.max(...pts.map(p=>p[0]));
  let ymin = Math.min(...pts.map(p=>p[1])), ymax = Math.max(...pts.map(p=>p[1]));
  if (xmin === xmax) { xmin -= 1; xmax += 1; }
  if (identity) {
    xmin = 0; ymin = 0; xmax = ymax = Math.max(xmax, ymax, 0.1) * 1.05;
  } else {
    const pad = (ymax - ymin || Math.max(Math.abs(ymax) * 0.03, 0.1)) * 0.14;
    ymin -= pad; ymax += pad;
  }

  const W = 640, L = 62, R = 18, T = 14, B = 48;
  const X = x => L + (x - xmin) / (xmax - xmin) * (W - L - R);
  const Y = y => H - B - (y - ymin) / (ymax - ymin) * (H - T - B);
  const tick = v => Math.abs(v) > 9999 || (Math.abs(v) < 0.001 && v !== 0) ? v.toExponential(1) : Math.abs(ymax - ymin) < 0.1 ? v.toFixed(3) : v.toFixed(2);
  const cid = 'chart-' + (++chartSeq);
  chartRegistry.set(cid, {valid, xmin, xmax, ymin, ymax, W, H, L, R, T, B, identity, xLabel, yLabel});

  let svg = `<svg class="plot" data-cid="${cid}" ${id?'id="'+esc(id)+'"':''} viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" style="font-family:system-ui,sans-serif"><rect width="${W}" height="${H}" fill="white"/>`;
  for (let i = 0; i <= 4; i++) {
    const y = ymin + (ymax - ymin) * i / 4, x = xmin + (xmax - xmin) * i / 4;
    svg += `<path d="M${L} ${Y(y)}H${W-R}" stroke="#eef2f3"/>` +
           `<text x="${L-8}" y="${Y(y)+3.5}" text-anchor="end" fill="#64748b" font-size="9.5">${tick(y)}</text>` +
           `<text x="${X(x)}" y="${H-B+16}" text-anchor="middle" fill="#64748b" font-size="9.5">${x.toFixed(1)}</text>`;
  }
  if (identity) svg += `<path d="M${X(0)} ${Y(0)}L${X(xmax)} ${Y(ymax)}" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4 4"/>`;
  valid.forEach((s, j) => {
    const c = s.color || palette[j % palette.length];
    if (s.kind !== 'dots') {
      svg += `<polyline fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round" points="${s.points.map(p => X(p[0])+','+Y(p[1])).join(' ')}"/>`;
    }
    s.points.forEach(p => {
      const pc = p[3] || c;
      const r = s.radius || (s.kind === 'dots' ? 4.2 : 3.2);
      svg += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${r}" fill="${pc}" stroke="${s.kind==='dots'?'#fff':'none'}" stroke-width="1" opacity="${s.kind==='dots'?'0.88':'0'}"><title>${esc(p[2]||s.label)} · X=${fmt(p[0],2)} · Y=${fmt(p[1],4)}</title></circle>`;
    });
  });
  svg += `<line class="chart-crosshair" x1="0" x2="0" y1="${T}" y2="${H-B}" stroke="#34796e" stroke-width="1" stroke-dasharray="3 3" opacity="0"/><g class="chart-highlights"></g>`;
  svg += `<text x="${(L+W-R)/2}" y="${H-10}" text-anchor="middle" font-size="10" fill="#475569">${axisText(xLabel)}</text>` +
         `<text transform="translate(14 ${(T+H-B)/2}) rotate(-90)" text-anchor="middle" font-size="10" fill="#475569">${axisText(yLabel)}</text></svg>`;
  return `<div class="chart-wrap">${svg}<div class="chart-tooltip" hidden></div></div>` +
         `<div class="legend">${valid.map((s,j) => `<span><i class="${s.kind==='dots'?'dot':''}" style="background:${s.color||palette[j%palette.length]}"></i>${esc(s.label)}</span>`).join('')}</div>`;
}

function attachChartInteractivity(root=document){
  root.querySelectorAll('.chart-wrap svg.plot[data-cid]').forEach(svg => {
    const meta = chartRegistry.get(svg.dataset.cid);
    if (!meta) return;
    const wrap = svg.parentElement, tip = wrap.querySelector('.chart-tooltip'), cross = svg.querySelector('.chart-crosshair'), hi = svg.querySelector('.chart-highlights');
    const {valid, xmin, xmax, ymin, ymax, W, H, L, R, T, B, identity} = meta;
    const X = x => L + (x - xmin) / (xmax - xmin) * (W - L - R);
    const Y = y => H - B - (y - ymin) / (ymax - ymin) * (H - T - B);
    svg.addEventListener('mousemove', e => {
      const rect = svg.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / rect.width * W, sy = (e.clientY - rect.top) / rect.height * H;
      if (sx < L || sx > W - R || sy < T || sy > H - B) { tip.hidden = true; cross.setAttribute('opacity', '0'); hi.innerHTML = ''; return; }
      const dataX = xmin + (sx - L) / (W - L - R) * (xmax - xmin);
      const hits = [];
      const isScatter = valid.every(s => s.kind === 'dots');
      if (isScatter) {
        let best = null, bestD = Infinity;
        valid.forEach((s, j) => {
          const c = s.color || palette[j % palette.length];
          s.points.forEach(p => {
            const d = Math.hypot(X(p[0]) - sx, Y(p[1]) - sy);
            if (d < bestD) { bestD = d; best = {s, p, c: p[3] || c}; }
          });
        });
        if (best && bestD < 28) hits.push(best);
      } else {
        valid.forEach((s, j) => {
          const c = s.color || palette[j % palette.length];
          let best = null, bestD = Infinity;
          s.points.forEach(p => {
            const d = Math.abs(p[0] - dataX);
            if (d < bestD) { bestD = d; best = p; }
          });
          if (best) hits.push({s, p: best, c: best[3] || c});
        });
      }
      if (!hits.length) { tip.hidden = true; cross.setAttribute('opacity', '0'); hi.innerHTML = ''; return; }
      const cx = X(hits[0].p[0]);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('opacity', '0.65');
      hi.innerHTML = hits.map(h => `<circle cx="${X(h.p[0])}" cy="${Y(h.p[1])}" r="5" fill="none" stroke="${h.c}" stroke-width="2"/><circle cx="${X(h.p[0])}" cy="${Y(h.p[1])}" r="2.8" fill="${h.c}"/>`).join('');
      const title = hits[0].p[2] ? esc(hits[0].p[2]) : (identity ? `X = ${fmt(hits[0].p[0],3)}` : `T = ${fmt(hits[0].p[0],2)}`);
      tip.innerHTML = `<div class="tt-title">${title}</div>` +
        hits.map(h => `<div class="tt-row"><span><i class="tt-dot" style="background:${h.c}"></i>${esc(h.s.label.split(' / ')[0])}</span><strong>${fmt(h.p[1],4)}</strong></div>`).join('');
      tip.hidden = false;
      const px = (e.clientX - rect.left) + 12, py = (e.clientY - rect.top) - 10;
      tip.style.left = Math.min(px, rect.width - tip.offsetWidth - 6) + 'px';
      tip.style.top = Math.max(4, Math.min(py, rect.height - tip.offsetHeight - 4)) + 'px';
    });
    svg.addEventListener('mouseleave', () => { tip.hidden = true; cross.setAttribute('opacity', '0'); hi.innerHTML = ''; });
  });
}

function chartToolbar(){
  return `<div class="chart-tools">
    <label class="observations-toggle"><input id="observations-toggle" type="checkbox" ${state.showObservations?'checked':''}>Dev Obs / 实测点</label>
    <button type="button" data-unit="log" class="${state.unit==='log'?'active':''}">log₁₀ S</button>
    <button type="button" data-unit="raw" class="${state.unit==='raw'?'active':''}">S = 10ʸ (mol/L)</button>
    <button type="button" data-export="csv">CSV ↓</button>
  </div>`;
}
const transform = ys => state.unit === 'raw' ? ys.map(v => 10 ** v) : ys;

function metricsTable(a, b, idA, idB){
  const mA = state.models?.find(m => m.id === idA || m.id === a?.model)?.metrics || a;
  const mB = state.models?.find(m => m.id === idB || m.id === b?.model)?.metrics || b;
  const rows = [
    ['Parent Macro MAE ↓ (Primary / 首要母体指标)', 'parent_macro_MAE'],
    ['Record MAE ↓ (逐行平均绝对误差)', 'MAE'],
    ['Global RMSE ↓ (全局均方根误差)', 'RMSE'],
    ['Explained Variance R² ↑ (决定系数)', 'R2'],
    ['Training Fit Time (s) ↓ (训练耗时)', 'fit_seconds'],
    ['Inference Latency (ms/row) ↓ (单行推理耗时)', 'inference_ms_per_row']
  ];
  return `<div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>5×3 Nested Grouped CV (3-Seed Mean)</th>
          <th>${esc(short(idA))}</th>
          <th>${esc(short(idB))}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(([title, key]) => {
          const vA = mA[key], vB = mB[key];
          const aBetter = key === 'R2' ? vA > vB : vA < vB;
          const bBetter = key === 'R2' ? vB > vA : vB < vA;
          return `<tr>
            <td>${title}</td>
            <td class="${aBetter?'cell-best':''}">${fmt(vA, 4)}</td>
            <td class="${bBetter?'cell-best':''}">${fmt(vB, 4)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

function deckTabsBar(deckVar, activeDeck, tabs){
  return `<div class="deck-tabs-bar" role="tablist">
    ${tabs.map(t => `<button type="button" class="deck-tab ${activeDeck === t.id ? 'active' : ''}" data-deck="${t.id}" data-deck-var="${deckVar}" role="tab" aria-selected="${activeDeck === t.id}">
      <span class="btn-stack"><span lang="en" class="btn-text-en">${t.en}</span><span lang="zh-CN" class="btn-text-zh">${t.zh}</span></span>
    </button>`).join('')}
  </div>`;
}

/* Module 03: Solvent Screening & Multi-Solvent Temperature Curves */
function renderScreenModule(c){
  const tabs = [
    {id: 'ranking', en: '49-Solvent Ranking & cLogP', zh: '49种全溶剂高通量排序与极性分析'},
    {id: 'explore', en: 'Multi-Solvent T-Response Curves', zh: '多溶剂61点连续变温响应曲线'}
  ];
  const tabsBar = deckTabsBar('screenSubTab', state.screenSubTab, tabs);

  if (state.screenSubTab === 'explore') {
    const {q, r, evidence} = c;
    if (!r.lines) return tabsBar + `<div class="card loading-card">Loading temperature response curves…</div>`;
    const series = r.lines.flatMap((l, i) => [
      {x: r.temperatures, y: transform(l.values), label: l.name, color: palette[i % palette.length]},
      ...(state.showObservations && evidence[i]?.observations?.length
        ? [{x: evidence[i].observations.map(o=>o.temperature), y: transform(evidence[i].observations.map(o=>o.log_solubility)), label: l.name + ' (Obs)', kind: 'dots', color: palette[i % palette.length]}]
        : [])
    ]);
    return tabsBar + `<div class="deck-split-grid">
      <div class="deck-split-col">
        <div class="card result-card">
          <div class="chart-header">
            <h3>Multi-Solvent Temperature Response (61 Points) / 多溶剂连续变温响应 (${esc(label('drug', q.drug_id))})</h3>
            ${chartToolbar()}
          </div>
          ${chart(series, {yLabel: state.unit==='raw' ? 'S = 10ʸ (mol/L)' : 'Predicted log₁₀ S', H: 250})}
        </div>
      </div>
      <div class="deck-split-col">
        <div class="card result-card">
          <div class="chart-header">
            <h3>Temperature Sensitivity &amp; Data Coverage / 溶剂变温幅度与实测覆盖</h3>
            <span class="badge">${esc(short(q.model_id))} · T ∈ [${q.temperature_min}, ${q.temperature_max}]</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Solvent / 溶剂</th>
                  <th>log₁₀ S (${q.temperature_min}°)</th>
                  <th>log₁₀ S (${q.temperature_max}°)</th>
                  <th>Δ log₁₀ S</th>
                  <th>Dev Obs / 实测</th>
                </tr>
              </thead>
              <tbody>
                ${r.lines.map((l, i) => {
                  const delta = l.values.at(-1) - l.values[0];
                  const ev = evidence[i];
                  const obsStr = ev?.support?.pair_rows ? `${ev.support.pair_rows} rows [${ev.range.min}~${ev.range.max}°]` : '0 (Unobserved)';
                  return `<tr>
                    <td><strong style="color:${palette[i%palette.length]}">●</strong> <strong>${esc(l.name)}</strong></td>
                    <td>${fmt(l.values[0], 4)}</td>
                    <td>${fmt(l.values.at(-1), 4)}</td>
                    <td class="${delta > 0 ? 'cell-best' : ''}">${delta >= 0 ? '+' : ''}${fmt(delta, 4)}</td>
                    <td>${esc(obsStr)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  }

  const r = c.r;
  const items = r.results || [];
  const filtered = items.filter(x => state.screenFilter === 'all' ? true : state.screenFilter === 'obs' ? x.pair_rows > 0 : x.pair_rows === 0);
  const sorted = [...filtered].sort((a,b) => state.screenSort === 'desc' ? b.log_solubility - a.log_solubility : a.log_solubility - b.log_solubility);
  const vals = items.map(x => x.log_solubility), minV = Math.min(...vals), maxV = Math.max(...vals), span = Math.max(maxV - minV, 1e-6);
  const obsCount = items.filter(x => x.pair_rows > 0).length;
  const med = [...vals].sort((a,b) => a - b)[Math.floor(vals.length / 2)];

  return tabsBar + `<div class="deck-split-grid">
    <div class="deck-split-col">
      <div class="card result-card">
        <div class="batch-summary">
          <div class="batch-stat"><span>Best Solvent / 最高 log₁₀ S</span><strong>${fmt(maxV,3)}</strong></div>
          <div class="batch-stat"><span>Median / 中位 log₁₀ S</span><strong>${fmt(med,3)}</strong></div>
          <div class="batch-stat"><span>Lowest / 最低 log₁₀ S</span><strong>${fmt(minV,3)}</strong></div>
          <div class="batch-stat"><span>Observed Pairs / 已有实测</span><strong>${obsCount} / ${items.length}</strong></div>
        </div>
        <div class="screen-toolbar">
          <div class="screen-filters">
            <button type="button" class="pill-btn ${state.screenFilter==='all'?'active':''}" data-sfilter="all">All (${items.length}) / 全部</button>
            <button type="button" class="pill-btn ${state.screenFilter==='obs'?'active':''}" data-sfilter="obs">Observed (${obsCount}) / 实测</button>
            <button type="button" class="pill-btn ${state.screenFilter==='unobs'?'active':''}" data-sfilter="unobs">Unobserved (${items.length-obsCount}) / 预测</button>
          </div>
          <div class="screen-filters">
            <button type="button" class="pill-btn ${state.screenSort==='desc'?'active':''}" data-ssort="desc">High→Low ↓ / 降序</button>
            <button type="button" class="pill-btn ${state.screenSort==='asc'?'active':''}" data-ssort="asc">Low→High ↑ / 升序</button>
          </div>
        </div>
        <div class="screen-list">
          ${sorted.map((x, idx) => {
            const pct = Math.max(4, ((x.log_solubility - minV) / span) * 100);
            return `<button type="button" class="screen-row" data-pick-solvent="${esc(x.solvent_id)}" title="Click to inspect in Point Prediction / 点击跳转单点预测">
              <span class="screen-rank">${idx + 1}</span>
              <span class="screen-name">${esc(x.name)}</span>
              <span class="screen-bar-track"><span class="screen-bar-fill ${x.pair_rows>0?'observed':''}" style="width:${pct}%"></span></span>
              <span class="screen-val">${fmt(x.log_solubility, 3)}</span>
              <span class="screen-badge ${x.pair_rows>0?'obs':''}">${x.pair_rows>0 ? x.pair_rows+' obs' : 'pred'}</span>
            </button>`;
          }).join('')}
        </div>
      </div>
    </div>
    <div class="deck-split-col">
      <div class="card result-card">
        <div class="chart-header">
          <h3>Predicted log₁₀ S vs Solvent Lipophilicity (cLogP) / 溶解度与溶剂疏水常数相关性</h3>
          <span class="badge">${esc(label('drug', c.q.drug_id))} · T = ${c.q.temperature}°C</span>
        </div>
        ${chart([
          {x: items.filter(x=>x.pair_rows===0&&x.mol_logp!=null).map(x=>x.mol_logp), y: items.filter(x=>x.pair_rows===0&&x.mol_logp!=null).map(x=>x.log_solubility), pointLabels: items.filter(x=>x.pair_rows===0&&x.mol_logp!=null).map(x=>x.name), label: 'Unobserved prediction / 虚拟筛选预测', kind: 'dots', color: '#2d8b76'},
          {x: items.filter(x=>x.pair_rows>0&&x.mol_logp!=null).map(x=>x.mol_logp), y: items.filter(x=>x.pair_rows>0&&x.mol_logp!=null).map(x=>x.log_solubility), pointLabels: items.filter(x=>x.pair_rows>0&&x.mol_logp!=null).map(x=>x.name+' ('+x.pair_rows+' obs)'), label: 'Observed in development / 开发集实测溶剂', kind: 'dots', color: '#d97706'}
        ], {xLabel: 'Solvent cLogP (Wildman-Crippen) / 溶剂疏水常数', yLabel: 'Predicted log₁₀ S', H: 265})}
        <p class="chart-caption">Click any solvent on the left to inspect its point prediction and branch decomposition. / 点击左侧任意溶剂行可直接进入单点预测与分支拆解。</p>
      </div>
    </div>
  </div>`;
}

function renderResult(){
  const c = state.current;
  if (!c) return;
  const {tab, q, r, evidence} = c;
  const e = evidence?.[0];
  let html = '';

  /* Module 01: Point Prediction & Branch Decomposition + Applicability Domain on ONE Single Screen */
  if (tab === 'predict') {
    const mInfo = state.models.find(m => m.id === q.model_id);
    const met = mInfo?.metrics;

    let decompHtml = '';
    if (r.components) {
      const entries = Object.entries(r.components);
      const etPred = r.components.ExtraTrees?.predictions?.[0];
      const pfnPred = r.components.TabPFN?.predictions?.[0];
      const pfnWeight = r.components.TabPFN?.weight ?? 0.25;
      const correction = (etPred != null && pfnPred != null) ? pfnWeight * (pfnPred - etPred) : null;

      decompHtml = `<div class="decomposition">
        <div class="small-heading">
          <span>Heterogeneous Ensemble Decomposition / 异质融合分支预测拆解</span>
          <span class="badge good">ŷ = (1−α)·f_ET + α·f_PFN</span>
        </div>
        <div class="blend-bar-wrap">
          <div class="blend-bar-track">
            ${entries.map(([name, comp], idx) => `<div class="blend-bar-seg" style="width:${comp.weight*100}%;background:${palette[idx%palette.length]}"></div>`).join('')}
          </div>
          <div class="blend-bar-labels">
            ${entries.map(([name, comp]) => `<span><strong>${esc(name)}</strong>: Weight ${fmt(comp.weight,2)} (${fmt(comp.weight*100,0)}%)</span>`).join('')}
          </div>
        </div>
        <div class="decomp-equation">
          ${entries.map(([name, comp]) => `<div class="decomp-block">
            <span>${esc(name)} (${fmt(comp.weight*100,0)}%)</span>
            <strong>${fmt(comp.predictions[0], 4)}</strong>
            <small>Weighted: ${comp.contributions[0] >= 0 ? '+' : ''}${fmt(comp.contributions[0], 4)}</small>
          </div>`).join('<span class="decomp-operator">+</span>')}
          <span class="decomp-operator">=</span>
          <div class="decomp-block highlight">
            <span>Final Fusion ŷ / 融合预测</span>
            <strong>${fmt(r.log_solubility, 4)}</strong>
            <small>${correction != null ? `TabPFN Δ: ${correction>=0?'+':''}${fmt(correction,4)}` : 'Convex Blend'}</small>
          </div>
        </div>
      </div>`;
    } else if (r.base) {
      decompHtml = `<div class="decomposition">
        <div class="small-heading">
          <span>SOLAR-H Physical Decomposition / 结构基线与温度响应分解</span>
          <span class="badge">ŷ = b(z) + γ·τ·(uᵀβ)</span>
        </div>
        <div class="decomp-equation">
          <div class="decomp-block"><span>Structural Baseline b(z) / 结构基线</span><strong>${fmt(r.base[0], 4)}</strong></div>
          <span class="decomp-operator">+</span>
          <div class="decomp-block"><span>Temperature Term / 温度调制项</span><strong>${fmt(r.temperature_component[0], 4)}</strong><small>Gain γ = ${fmt(mInfo?.temperature_gain ?? 0, 2)}</small></div>
          <span class="decomp-operator">=</span>
          <div class="decomp-block highlight"><span>Final Prediction ŷ / 最终预测</span><strong>${fmt(r.log_solubility, 4)}</strong></div>
        </div>
      </div>`;
    }

    const modelBenchHtml = met ? `<div class="model-bench-strip">
      <span><strong>${esc(short(q.model_id))}</strong> Nested 5×3 CV:</span>
      <span>Parent MAE: <b>${fmt(met.parent_macro_MAE, 4)}</b></span>
      <span>Record MAE: <b>${fmt(met.MAE, 4)}</b></span>
      <span>RMSE: <b>${fmt(met.RMSE, 4)}</b></span>
      <span>R²: <b>${fmt(met.R2, 4)}</b></span>
    </div>` : '';

    const observations = e?.observations || [];
    const obsPlot = observations.length
      ? chart([
          {x: observations.map(o=>o.temperature), y: observations.map(o=>o.log_solubility), label: `Dev Observations (${observations.length} rows) / 开发集实测点`, kind: 'dots', color: '#d97706'},
          {x: [r.temperature], y: [r.log_solubility], label: `Current Prediction (T=${r.temperature}°) / 当前预测点`, kind: 'dots', color: '#2d8b76', radius: 6}
        ], {xLabel: 'Temperature T (°C) / 温度 T', yLabel: 'log₁₀ S (mol/L)', H: 215})
      : `<div class="journal-empty">No development observations exist for <strong>${esc(label('drug', q.drug_id))} × ${esc(label('solvent', q.solvent_id))}</strong> (Cold pair / Unseen parent extrapolation).<br>开发集中暂无该药物-溶剂组合的实测记录（属于冷启动组合或未见母体外推预测）。</div>`;

    html = `<div class="deck-split-grid">
      <div class="deck-split-col">
        <div class="card result-card">
          <div class="chart-header" style="flex-direction:row;justify-content:space-between;align-items:center">
            <h3>Point Prediction &amp; Model Decomposition / 单点预测与模型分解</h3>
            <div class="result-actions">
              <button type="button" class="button outline compact" data-export="csv">${icon('download')}CSV</button>
              <button type="button" class="button outline compact" data-export="report">${icon('file')}Report</button>
            </div>
          </div>
          <div class="prediction-grid">
            ${valueCard('Predicted log₁₀ S / 对数摩尔溶解度', fmt(r.log_solubility, 4), 'log₁₀(S / mol·L⁻¹) · ' + short(q.model_id))}
            ${valueCard('Molar Concentration S = 10ʸ / 物理摩尔浓度', r.concentration == null ? 'Out of range' : r.concentration.toPrecision(4) + ' mol/L', `T = ${q.temperature} °C · Latency: ${fmt(r.elapsed_ms, 1)} ms`, true)}
          </div>
          ${decompHtml}
          ${modelBenchHtml}
        </div>
      </div>
      <div class="deck-split-col">
        <div class="card result-card">
          <div class="chart-header" style="flex-direction:row;justify-content:space-between;align-items:center">
            <h3>Applicability Domain &amp; Data Support / 适用域预警与开发集实测支撑</h3>
            <span class="badge">Development Split Only / 仅开发集</span>
          </div>
          ${e ? domainHTML(e) : ''}
          <div class="support-info">
            <span>Drug rows in Dev: <b>${e?.support?.drug_rows ?? 0}</b></span>
            <span>Solvent rows in Dev: <b>${e?.support?.solvent_rows ?? 0}</b></span>
            <span>Pair rows in Dev: <b>${e?.support?.pair_rows ?? 0}</b></span>
          </div>
          ${obsPlot}
        </div>
      </div>
    </div>`;
  }

  /* Module 03: Solvent Screening & Multi-Solvent Temperature Curves */
  else if (tab === 'screen') {
    html = renderScreenModule(c);
  }

  /* Module 02: Controlled Model Comparison & 5D Evaluation Radar */
  else if (tab === 'compare') {
    const deck = state.compareDeck || 'radar';
    const tabs = [
      {id: 'radar', en: '5D Evaluation Radar & Matrix', zh: '5维综合评价雷达与指标对照表'},
      {id: 'protocol', en: '128-Parent Paired CV Benchmark', zh: '128未见母体配对验证与胜率散点'},
      {id: 'curves', en: '61-Point Temperature Response', zh: '同条件61点连续变温响应与差值'}
    ];
    const tabsBar = deckTabsBar('compareDeck', deck, tabs);

    if (deck === 'radar') {
      html = tabsBar + `<div class="deck-pane">${renderRadarComponent()}</div>`;
    } else if (deck === 'protocol') {
      const mA = state.models.find(m => m.id === q.model_id)?.metrics || r.metrics_a;
      const mB = state.models.find(m => m.id === q.model_b)?.metrics || r.metrics_b;
      const improvement = (mB.parent_macro_MAE - mA.parent_macro_MAE) / mB.parent_macro_MAE * 100;
      const winsA = r.group_errors.a.filter((v,i) => v < r.group_errors.b[i]).length;
      const totalP = r.group_errors.ids.length;
      const pColors = r.group_errors.a.map((v,i) => v < r.group_errors.b[i] ? '#2d8b76' : '#d97706');

      html = tabsBar + `<div class="deck-split-grid">
        <div class="deck-split-col">
          <div class="card result-card">
            <div class="chart-header">
              <h3>Shared 5×3 Nested CV Benchmark / 统一嵌套分组验证表现对比</h3>
              <span class="badge good">${esc(short(q.model_id))} wins on ${winsA} / ${totalP} unseen parents (${fmt(winsA/totalP*100,1)}%) · Parent MAE ${improvement>=0?'−':'+'}${fmt(Math.abs(improvement),2)}%</span>
            </div>
            ${metricsTable(r.metrics_a, r.metrics_b, q.model_id, q.model_b)}
            <div class="prediction-grid" style="margin-top:8px">
              ${valueCard(`${short(q.model_id)} @ T=${q.temperature}°`, fmt(r.a.log_solubility, 4), `S = ${r.a.concentration?.toPrecision(4)} mol/L`)}
              ${valueCard(`${short(q.model_b)} @ T=${q.temperature}°`, fmt(r.b.log_solubility, 4), `Δ(B − A) = ${fmt(r.difference, 4)} log₁₀`, true)}
            </div>
          </div>
        </div>
        <div class="deck-split-col">
          <div class="card result-card">
            <div class="chart-header">
              <h3>128 Unseen Drug Parents Paired Error Scatter / 128个未见药物母体逐一配对误差散点</h3>
              <span class="badge">Points above diagonal y=x favor ${esc(short(q.model_id))}</span>
            </div>
            ${chart([
              {x: r.group_errors.a, y: r.group_errors.b, pointColors: pColors, pointLabels: r.group_errors.ids.map(pid=>'Parent '+pid), label: `Teal: ${short(q.model_id)} lower MAE (${winsA}) · Amber: ${short(q.model_b)} lower (${totalP-winsA})`, kind: 'dots', color: '#2d8b76'}
            ], {xLabel: short(q.model_id) + ' Parent MAE', yLabel: short(q.model_b) + ' Parent MAE', identity: true, H: 255})}
          </div>
        </div>
      </div>`;
    } else {
      const series = [r.curve_a, r.curve_b].map((curve, i) => ({
        x: curve.temperatures,
        y: transform(curve.lines[0].values),
        label: short(curve.model_id),
        color: palette[i]
      }));
      if (state.showObservations && e?.observations?.length) {
        series.push({
          x: e.observations.map(o=>o.temperature),
          y: transform(e.observations.map(o=>o.log_solubility)),
          label: `Dev Observations (${e.observations.length})`,
          kind: 'dots',
          color: '#64748b'
        });
      }
      html = tabsBar + `<div class="deck-split-grid">
        <div class="deck-split-col">
          <div class="card result-card">
            <div class="chart-header">
              <h3>Temperature Response Curves (${esc(label('drug', q.drug_id))} × ${esc(label('solvent', q.solvent_id))})</h3>
              ${chartToolbar()}
            </div>
            ${chart(series, {yLabel: state.unit==='raw' ? 'S = 10ʸ (mol/L)' : 'Predicted log₁₀ S', H: 250})}
          </div>
        </div>
        <div class="deck-split-col">
          <div class="card result-card">
            <div class="chart-header">
              <h3>Response Difference Curve (B − A) / 模型响应差值曲线</h3>
              <span class="badge">${esc(short(q.model_b))} − ${esc(short(q.model_id))} · At T=${q.temperature}°: Δ = ${fmt(r.difference,4)}</span>
            </div>
            ${chart([
              {x: r.curve_a.temperatures, y: r.curve_b.lines[0].values.map((v,i)=>v-r.curve_a.lines[0].values[i]), label: `${short(q.model_b)} − ${short(q.model_id)} (log₁₀ S)`, color: '#d97706'}
            ], {yLabel: 'Difference B − A (log₁₀ S)', H: 250})}
          </div>
        </div>
      </div>`;
    }
  }

  $('output').innerHTML = html;
  window.StudioLanguage.normalize($('output'));
  attachChartInteractivity($('output'));
  bindResultActions();
}

function bindResultActions(){
  if ($('observations-toggle')) {
    $('observations-toggle').onchange = e => { state.showObservations = e.target.checked; renderResult(); };
  }
  document.querySelectorAll('#output [data-export]').forEach(b => b.onclick = () => exportCurrent(b.dataset.export));
  document.querySelectorAll('#output [data-unit]').forEach(b => b.onclick = () => { state.unit = b.dataset.unit; renderResult(); });
  document.querySelectorAll('#output [data-sfilter]').forEach(b => b.onclick = () => { state.screenFilter = b.dataset.sfilter; renderResult(); });
  document.querySelectorAll('#output [data-ssort]').forEach(b => b.onclick = () => { state.screenSort = b.dataset.ssort; renderResult(); });
  document.querySelectorAll('#output [data-deck]').forEach(b => {
    b.onclick = () => {
      const d = b.dataset.deck, v = b.dataset.deckVar;
      state[v] = d;
      syncFormVisibility();
      if (state.tab === 'screen') run();
      else renderResult();
    };
  });
  document.querySelectorAll('#output [data-pick-solvent]').forEach(b => {
    b.onclick = () => {
      const sid = b.dataset.pickSolvent, q = state.current.q;
      $('drug').value = q.drug_id;
      $('solvent').value = sid;
      $('model').value = q.model_id;
      $('temperature').value = q.temperature;
      $('temperature-slider').value = q.temperature;
      updateModels();
      structures();
      switchView('predict');
    };
  });
  if (state.tab === 'compare' && (state.compareDeck === 'radar' || !state.current)) {
    bindRadarEvents($('output'));
  }
}

function resultRows(tab, q, r){
  const common = {model: short(q.model_id), model_id: q.model_id, drug: label('drug', q.drug_id), drug_id: q.drug_id};
  if (tab === 'predict') {
    return [{...common, solvent: label('solvent', q.solvent_id), solvent_id: q.solvent_id, temperature: q.temperature, predicted_log10: r.log_solubility, concentration_mol_L: r.concentration}];
  }
  if (tab === 'screen' && state.screenSubTab === 'ranking') {
    return (r.results || []).map(x => ({...common, solvent: x.name, solvent_id: x.solvent_id, temperature: q.temperature, predicted_log10: x.log_solubility, concentration_mol_L: x.concentration, dev_pair_obs: x.pair_rows, solvent_cLogP: x.mol_logp}));
  }
  const curves = tab === 'compare' ? [r.curve_a, r.curve_b] : [r];
  return curves.flatMap(curve => (curve.lines || []).flatMap(line => curve.temperatures.map((t, i) => ({
    ...common, model: short(curve.model_id), model_id: curve.model_id, solvent: line.name, solvent_id: line.solvent_id, temperature: t, predicted_log10: line.values[i]
  }))));
}

async function run(event){
  event?.preventDefault();
  if (!state.catalog) return;
  let q;
  try { q = readConditions(); } catch(e) { $('error').textContent = e.message; return; }

  cancelRun();
  state.stale = false;
  const token = state.request, tab = state.tab, controller = new AbortController();
  state.controller = controller;
  $('run').disabled = true;
  window.StudioLanguage.btn($('run-label'), 'Computing… / 计算中…');
  $('error').textContent = '';
  $('output').setAttribute('aria-busy', 'true');

  /* If switching to compare radar tab, render radar immediately while fetching A vs B in background */
  if (tab === 'compare' && state.compareDeck === 'radar' && state.models.length) {
    const tabs = [
      {id: 'radar', en: '5D Evaluation Radar & Matrix', zh: '5维综合评价雷达与指标对照表'},
      {id: 'protocol', en: '128-Parent Paired CV Benchmark', zh: '128未见母体配对验证与胜率散点'},
      {id: 'curves', en: '61-Point Temperature Response', zh: '同条件61点连续变温响应与差值'}
    ];
    $('output').innerHTML = deckTabsBar('compareDeck', 'radar', tabs) + `<div class="deck-pane">${renderRadarComponent()}</div>`;
    window.StudioLanguage.normalize($('output'));
    bindRadarEvents($('output'));
  }

  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    if (tab === 'screen' && state.screenSubTab === 'ranking') {
      const r = await api('/api/screen', {model_id: q.model_id, drug_id: q.drug_id, temperature: q.temperature}, controller.signal);
      if (token !== state.request) return;
      state.current = {tab, q, r, evidence: [{domain:{status:'screening'}}], time: new Date().toISOString(), rows: resultRows(tab, q, r)};
    } else if (tab === 'screen' && state.screenSubTab === 'explore') {
      const [r, evidence] = await Promise.all([
        api('/api/curve', q, controller.signal),
        Promise.all(q.solvent_ids.map(id => api('/api/evidence?' + new URLSearchParams({drug_id: q.drug_id, solvent_id: id, temperature: q.temperature}), null, controller.signal)))
      ]);
      if (token !== state.request) return;
      state.current = {tab, q, r, evidence, time: new Date().toISOString(), rows: resultRows(tab, q, r)};
    } else {
      const path = tab === 'predict' ? '/api/predict' : '/api/compare';
      const [r, evidence] = await Promise.all([
        api(path, q, controller.signal),
        Promise.all(q.solvent_ids.map(id => api('/api/evidence?' + new URLSearchParams({drug_id: q.drug_id, solvent_id: id, temperature: q.temperature}), null, controller.signal)))
      ]);
      if (token !== state.request) return;
      state.current = {tab, q, r, evidence, time: new Date().toISOString(), rows: resultRows(tab, q, r)};
    }
    state.unit = 'log';
    renderResult();
  } catch(e) {
    if (token !== state.request) return;
    $('error').textContent = e.name === 'AbortError' ? 'Inference timed out / 计算超时' : e.message;
  } finally {
    clearTimeout(timeout);
    if (token === state.request) {
      $('run').disabled = false;
      window.StudioLanguage.btn($('run-label'), views[tab][1]);
      $('output').removeAttribute('aria-busy');
      state.controller = null;
    }
  }
}

function csvCell(v){
  if (v == null) return '""';
  let s = String(v);
  if (typeof v === 'string' && /^[=+@\t\r-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function csvText(rows){
  const keys = [...new Set(rows.flatMap(Object.keys))];
  return keys.map(csvCell).join(',') + '\r\n' + rows.map(r => keys.map(k => csvCell(r[k])).join(',')).join('\r\n');
}
function downloadFile(content, name, type){
  const url = URL.createObjectURL(new Blob([content], {type}));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCurrent(type){
  const c = state.current;
  if (!c) return;
  if (type === 'csv') {
    downloadFile('\uFEFF' + csvText(c.rows), 'SOLAR_' + c.tab + '.csv', 'text/csv;charset=utf-8');
  } else {
    const copy = $('output').cloneNode(true);
    copy.querySelectorAll('button,.result-actions,.deck-tabs-bar').forEach(el => el.remove());
    const htmlDoc = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>SOLAR Experiment Report</title><body style="font:14px/1.6 system-ui,sans-serif;max-width:960px;margin:32px auto;padding:0 20px"><h1>SOLAR Studio · COMP6133 Experiment Report</h1><p>Drug: ${esc(label('drug',c.q.drug_id))} · Solvent: ${esc(label('solvent',c.q.solvent_id))} · T = ${c.q.temperature} · Model: ${esc(short(c.q.model_id))}</p>${copy.innerHTML}</body></html>`;
    downloadFile(htmlDoc, 'SOLAR_' + c.tab + '_report.html', 'text/html;charset=utf-8');
  }
  toast('Exported file downloaded / 导出文件已生成');
}

async function loadDiagnostics(modelId){
  const box = $('diag-body');
  if (!box) return;
  box.innerHTML = '<div class="loading-label"><span class="spinner"></span>Loading OOF residuals…</div>';
  try {
    const d = state.diagCache[modelId] || (state.diagCache[modelId] = await api('/api/model_diagnostics/' + encodeURIComponent(modelId)));
    if (!$('diag-body')) return;
    box.innerHTML = `<div class="diag-kpis">
      <div class="diag-kpi"><span>Median AE (P50)</span><strong>${fmt(d.quantiles.p50_ae,3)}</strong></div>
      <div class="diag-kpi"><span>P75 Abs Error</span><strong>${fmt(d.quantiles.p75_ae,3)}</strong></div>
      <div class="diag-kpi"><span>P90 Abs Error</span><strong>${fmt(d.quantiles.p90_ae,3)}</strong></div>
      <div class="diag-kpi"><span>Mean Bias (y−ŷ)</span><strong>${fmt(d.quantiles.bias,4)}</strong></div>
    </div>
    <div class="evidence-grid">
      <div>
        <h4 style="font-size:11.5px;margin-bottom:4px">OOF Residual Histogram (y − ŷ)</h4>
        ${histogram(d.residual_histogram)}
      </div>
      <div>
        <h4 style="font-size:11.5px;margin-bottom:4px">Predicted vs Observed (128 Parents)</h4>
        ${chart([{x: d.scatter.map(p=>p.y), y: d.scatter.map(p=>p.pred), pointLabels: d.scatter.map(p=>'Parent '+p.parent), label: short(modelId), kind: 'dots', color: '#2d8b76'}], {xLabel: 'Observed log₁₀ S', yLabel: 'Predicted log₁₀ S', H: 165})}
      </div>
    </div>`;
    attachChartInteractivity(box);
  } catch(e) {
    if ($('diag-body')) $('diag-body').innerHTML = `<p class="error-message">${esc(e.message)}</p>`;
  }
}

/* Module 04: Courseware-Aligned Model Improvement, Ablation, Mechanism & 14-Model Evidence */
function renderInsights(sort='parent_macro_MAE'){
  const d = state.insights;
  if (!d) {
    $('insights-content').innerHTML = '<div class="card">Loading benchmark evidence…</div>';
    return;
  }
  const s = d.summary;
  const deck = state.insightsDeck || 'ablation';
  const tabs = [
    {id: 'ablation', en: '1. Improvement Chain & Ablation (15% Rubric)', zh: '模型改进链、受控消融与配对Bootstrap区间'},
    {id: 'mechanism', en: '2. TreeSHAP, Temp Slope & Solubility Cliff', zh: 'TreeSHAP特征归因、温度悖论纠偏与误差分层'},
    {id: 'leaderboard', en: '3. 14-Model Leaderboard & Data Partition', zh: '14模型完整榜单与母体分组嵌套验证协议'}
  ];
  const tabsBar = `<div class="deck-tabs-bar" role="tablist">
    ${tabs.map(t => `<button type="button" class="deck-tab ${deck === t.id ? 'active' : ''}" data-ideck="${t.id}" role="tab" aria-selected="${deck === t.id}">
      <span class="btn-stack"><span lang="en" class="btn-text-en">${t.en}</span><span lang="zh-CN" class="btn-text-zh">${t.zh}</span></span>
    </button>`).join('')}
  </div>`;

  let paneHtml = '';

  /* Sub-Tab 1: Progressive Improvement Chain, Feature Pilot, & Blend Sensitivity */
  if (deck === 'ablation') {
    const wSeries = [{
      x: REPORT_EVIDENCE.weightSensitivity.map(p => p.w),
      y: REPORT_EVIDENCE.weightSensitivity.map(p => p.mae),
      pointLabels: REPORT_EVIDENCE.weightSensitivity.map(p => `${p.label}: Parent MAE ${p.mae}`),
      label: 'OOF Parent Macro MAE across TabPFN blend weight α',
      color: '#2d8b76'
    }];

    paneHtml = `<div class="deck-split-grid">
      <div class="deck-split-col">
        <div class="card result-card">
          <div class="chart-header">
            <h3>Step-by-Step Model Improvement Chain &amp; Paired Bootstrap 95% CI / 模型渐进改进链与配对置信区间</h3>
            <span class="badge good">128 Unseen Parents · 1,507 Rows · 5×3 Nested CV (3-Seed Mean)</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Stage / 阶段</th>
                  <th>Model &amp; Design / 模型与技术方案</th>
                  <th>Parent MAE ↓</th>
                  <th>Record MAE ↓</th>
                  <th>RMSE ↓</th>
                  <th>R² ↑</th>
                  <th>vs Basic (95% Paired CI)</th>
                </tr>
              </thead>
              <tbody>
                ${REPORT_EVIDENCE.ablationChain.map(row => `<tr class="${row.highlight ? 'highlight' : ''}">
                  <td><strong>${esc(row.stage)}</strong></td>
                  <td><strong>${esc(row.name)}</strong><br><small style="color:#64748b;font-size:9.5px">${esc(row.features)}</small></td>
                  <td class="${row.highlight ? 'cell-best' : ''}">${fmt(row.parent_mae, 4)}</td>
                  <td class="${row.highlight ? 'cell-best' : ''}">${fmt(row.mae, 4)}</td>
                  <td class="${row.highlight ? 'cell-best' : ''}">${fmt(row.rmse, 4)}</td>
                  <td class="${row.highlight ? 'cell-best' : ''}">${fmt(row.r2, 4)}</td>
                  <td><strong>${esc(row.delta_vs_basic)}</strong><br><small style="font-size:9px;color:#475569">${esc(row.ci_vs_basic)}</small></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="small-heading" style="margin-top:10px">3-Fold Tree Representation &amp; Parent-Equal Weighting Pilot / 树分支特征交互与母体等权消融筛查</div>
          <div class="model-bars">
            ${REPORT_EVIDENCE.treePilot.map((p, idx) => `<div class="model-bar ${idx===3?'proposed':''}">
              <span>${esc(p.label)}</span>
              <span class="model-bar-track"><i style="width:${(p.mae / 0.75) * 100}%"></i></span>
              <span><strong>${fmt(p.mae, 4)}</strong></span>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="deck-split-col">
        <div class="card result-card">
          <div class="chart-header">
            <h3>Convex Fusion Weight α Sensitivity &amp; 3-Seed Stability / 融合权重α敏感性曲线与多种子稳健性</h3>
            <span class="badge">ŷ = (1−α)·f_ET + α·f_PFN · Residual corr r = 0.909 (15.0% sign disagreement)</span>
          </div>
          ${chart(wSeries, {xLabel: 'TabPFN Weight α (0 = Pure ExtraTrees, 1 = Pure TabPFN)', yLabel: 'OOF Parent Macro MAE ↓', H: 185})}
          <div class="small-heading" style="margin-top:8px">3-Seed Reproducibility Breakdown (Seeds 17, 42, 2026) / 三随机种子稳定性核验 (极差仅 0.0055)</div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Random Seed</th>
                  <th>Main Fusion Parent MAE ↓</th>
                  <th>Main Fusion R² ↑</th>
                  <th>Rich ExtraTrees MAE</th>
                  <th>TabPFN Single MAE</th>
                  <th>SOLAR-H MAE</th>
                </tr>
              </thead>
              <tbody>
                ${REPORT_EVIDENCE.seedStability.map(row => `<tr>
                  <td><strong>${esc(row.seed)}</strong></td>
                  <td class="cell-best">${fmt(row.fusion_parent_mae, 4)}</td>
                  <td class="cell-best">${fmt(row.fusion_r2, 4)}</td>
                  <td>${fmt(row.et_mae, 4)}</td>
                  <td>${fmt(row.pfn_mae, 4)}</td>
                  <td>${fmt(row.solar_mae, 4)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* Sub-Tab 2: TreeSHAP Attribution, Simpson's Paradox Temperature Slope, Solubility Cliff & Residual Diagnostics */
  else if (deck === 'mechanism') {
    const ct = REPORT_EVIDENCE.causalTemp;
    paneHtml = `<div class="deck-split-grid">
      <div class="deck-split-col">
        <div class="card result-card">
          <div class="chart-header">
            <h3>TreeSHAP Feature Group Attribution (665 Active Features) / 树分支四类特征组全局归因</h3>
            <span class="badge good">Drug Structure (45.9%) + Explicit Interactions (42.6%) = 88.5%</span>
          </div>
          <div class="rmc-dim-list" style="margin-bottom:12px">
            ${REPORT_EVIDENCE.shapGroups.map(g => `<div class="rmc-dim-row">
              <div class="rmc-dim-meta">
                <span class="rmc-dim-name"><strong>${esc(g.group)}</strong></span>
                <span class="rmc-dim-val">Mean |SHAP|: ${fmt(g.val, 4)} <small>(${g.pct}%)</small></span>
              </div>
              <div class="rmc-bar-track" style="height:8px">
                <div class="rmc-bar-fill" style="width:${g.pct}%;background:${g.color}"></div>
              </div>
            </div>`).join('')}
          </div>

          <div class="chart-header" style="margin-top:8px">
            <h3>Within-Pair Fixed-Effects Temperature Analysis (Simpson's Paradox Reversal) / 组合内固定效应破除温度辛普森悖论</h3>
            <span class="badge">${esc(ct.subset)}</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Regression Specification / 回归设定</th>
                  <th>Slope β (log₁₀ S / °C)</th>
                  <th>95% Cluster CI</th>
                  <th>Physical &amp; Statistical Meaning / 机理结论</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Pooled OLS (总体混合回归)</strong></td>
                  <td style="color:#dc2626;font-weight:700">−0.00746</td>
                  <td>${ct.pooled_ci}</td>
                  <td>Spurious negative slope: refractory drugs tested at higher T / 难溶药物偏向高温测定导致混杂假负斜率</td>
                </tr>
                <tr class="highlight">
                  <td><strong>Within-Pair Fixed Effects (组合内固定效应)</strong></td>
                  <td class="cell-best">+0.01538 ★</td>
                  <td><strong>${ct.within_ci}</strong></td>
                  <td>True endothermic dissolution: +3.6% molar solubility per +1°C (Robust R² = 0.540) / 吸热促溶真实正斜率</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="deck-split-col">
        <div class="card result-card">
          <div class="chart-header">
            <h3>Stratified Error by Target Solubility Zone ("Solubility Cliff") / 目标溶解度分层误差与极端难溶悬崖</h3>
            <span class="badge">Moderate Zone (−2 &lt; y ≤ 0, 54.7% rows): MAE = 0.4653</span>
          </div>
          <div class="table-scroll" style="margin-bottom:10px">
            <table>
              <thead>
                <tr>
                  <th>Target Solubility Zone (log₁₀ S)</th>
                  <th>Rows / Parents</th>
                  <th>Main Fusion MAE ↓</th>
                  <th>Signed Bias (ŷ − y)</th>
                  <th>SOLAR-H MAE</th>
                </tr>
              </thead>
              <tbody>
                ${REPORT_EVIDENCE.solubilityBands.map((b, i) => `<tr class="${i===2?'highlight':''}">
                  <td><strong>${esc(b.band)}</strong></td>
                  <td>${b.rows} / ${b.parents}</td>
                  <td class="${i===2?'cell-best':''}">${fmt(b.fusion_mae, 4)}</td>
                  <td>${esc(b.fusion_bias)}</td>
                  <td>${fmt(b.solar_mae, 4)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="chart-header" style="flex-direction:row;justify-content:space-between;align-items:center">
            <h3>Interactive OOF Residual Diagnostics / 嵌套验证折外残差诊断</h3>
            <div class="diag-controls">
              <select id="diag-model" aria-label="Diagnostic model">${state.models.map(m => `<option value="${esc(m.id)}">${esc(short(m.id))}</option>`).join('')}</select>
            </div>
          </div>
          <div id="diag-body"></div>
        </div>
      </div>
    </div>`;
  }

  /* Sub-Tab 3: Complete 14-Model Leaderboard & ChargeParent Data Partition */
  else {
    const groupMatch = m => state.leaderboardGroup === 'all' ? true :
      state.leaderboardGroup === 'main' ? m.group.startsWith('Main') || m.group.startsWith('New') :
      state.leaderboardGroup === 'solar' ? m.group.startsWith('SOLAR') :
      state.leaderboardGroup === 'neural' ? m.group.startsWith('Neural') : m.group.startsWith('Classical');
    const models = [...state.models].filter(groupMatch).sort((a,b) => sort === 'R2' ? b.metrics[sort] - a.metrics[sort] : a.metrics[sort] - b.metrics[sort]);

    paneHtml = `<div class="deck-split-grid">
      <div class="deck-split-col">
        <article class="card leaderboard-card">
          <div class="leaderboard-toolbar">
            <div class="leaderboard-pills">
              <button type="button" class="pill-btn ${state.leaderboardGroup==='all'?'active':''}" data-lgroup="all">All (${state.models.length})</button>
              <button type="button" class="pill-btn ${state.leaderboardGroup==='main'?'active':''}" data-lgroup="main">Fusion</button>
              <button type="button" class="pill-btn ${state.leaderboardGroup==='solar'?'active':''}" data-lgroup="solar">SOLAR</button>
              <button type="button" class="pill-btn ${state.leaderboardGroup==='classical'?'active':''}" data-lgroup="classical">Tree / Linear</button>
              <button type="button" class="pill-btn ${state.leaderboardGroup==='neural'?'active':''}" data-lgroup="neural">Neural</button>
            </div>
            <div class="leaderboard-sort-wrap">
              <label for="leaderboard-sort">Sort:</label>
              <select id="leaderboard-sort">
                <option value="parent_macro_MAE">Parent MAE ↓</option>
                <option value="MAE">Record MAE ↓</option>
                <option value="RMSE">RMSE ↓</option>
                <option value="R2">R² ↑</option>
                <option value="inference_ms_per_row">Speed ↓</option>
              </select>
            </div>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Model / 模型</th>
                  <th>Parent MAE ↓</th>
                  <th>Record MAE ↓</th>
                  <th>RMSE ↓</th>
                  <th>R² ↑</th>
                  <th>ms/row</th>
                </tr>
              </thead>
              <tbody>
                ${models.map((m, idx) => `<tr class="${m.id===state.defaultModel?'highlight':''}">
                  <td>${idx + 1}</td>
                  <td><strong>${esc(short(m.id))}</strong>${m.id===state.defaultModel?' <span class="badge good">Main ★</span>':''}</td>
                  ${['parent_macro_MAE','MAE','RMSE','R2','inference_ms_per_row'].map(k => {
                    const best = k === 'R2' ? Math.max(...models.map(x=>x.metrics[k])) : Math.min(...models.map(x=>x.metrics[k]));
                    return `<td class="${m.metrics[k]===best?'cell-best':''}">${fmt(m.metrics[k], k==='inference_ms_per_row'?2:4)}</td>`;
                  }).join('')}
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <div class="deck-split-col">
        <article class="card result-card">
          <div class="chart-header">
            <h3>Dataset Standardization &amp; Strict Parent-Grouped Split (7% Rubric) / 数据清洗标准化与零泄漏母体划分</h3>
            <span class="badge good">Parent Overlap = ${d.protocol.parent_overlap} (Zero Leakage ✓)</span>
          </div>
          <div class="split-bar"><span style="width:${s.development_rows/s.total_rows*100}%"></span><span style="flex:1"></span></div>
          <div class="split-legend">
            <div>Development Set (79.1%)<strong>${s.development_rows} rows · ${s.development_parents} ChargeParents</strong></div>
            <div>Frozen Holdout Set (20.9%)<strong>${s.holdout_rows} rows · ${s.holdout_parents} ChargeParents</strong></div>
          </div>
          <div class="stat-inline">
            <div><strong>${s.total_rows}</strong><span>Total Rows / 总记录</span></div>
            <div><strong>${s.drug_count} / 168</strong><span>Drug Names / SMILES</span></div>
            <div><strong>${s.parent_count}</strong><span>ChargeParents / 母体数</span></div>
            <div><strong>${s.solvent_count}</strong><span>Solvents / 工业溶剂</span></div>
          </div>
          <div class="protocol-steps" style="margin:10px 0">
            <div class="protocol-step"><strong>ChargeParent</strong>Strip salts &amp; stereo / 剥离盐型与立体异构</div>
            <span>→</span>
            <div class="protocol-step"><strong>5 Outer × 3 Inner</strong>Parent-grouped CV / 母体分组嵌套验证</div>
            <span>→</span>
            <div class="protocol-step"><strong>3 Seeds</strong>2026, 17, 42 Mean / 三种子均值汇报</div>
          </div>
          <h4 style="font-size:11.5px;margin:8px 0 4px">Development Set Temperature Distribution (−59.5°C ~ 130.0°C)</h4>
          ${histogram(d.temperature.histogram)}
        </article>
      </div>
    </div>`;
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

  if (deck === 'mechanism') {
    const diagSel = $('diag-model');
    if (diagSel) {
      diagSel.value = state.diagModel || state.defaultModel;
      diagSel.onchange = e => {
        state.diagModel = e.target.value;
        loadDiagnostics(e.target.value);
      };
      loadDiagnostics(state.diagModel || state.defaultModel);
    }
  }

  if (deck === 'leaderboard') {
    const lSort = $('leaderboard-sort');
    if (lSort) {
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

function histogram(bins){
  const max = Math.max(...bins.map(b => b.count), 1), W = 520, H = 155, L = 34, B = 24, T = 16, bw = (W - L - 12) / bins.length;
  return `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" xmlns="http://www.w3.org/2000/svg">` +
    bins.map((b, i) => {
      const h = b.count / max * (H - B - T);
      return `<rect x="${L+i*bw+2}" y="${H-B-h}" width="${bw-4}" height="${h}" rx="2.5" fill="#76a897"><title>${fmt(b.min,1)} ~ ${fmt(b.max,1)}: ${b.count} rows</title></rect>` +
             `<text x="${L+(i+0.5)*bw}" y="${H-B-h-4}" font-size="8.5" fill="#475569" text-anchor="middle">${b.count}</text>` +
             (i % 2 === 0 ? `<text x="${L+i*bw}" y="${H-7}" font-size="8.5" fill="#64748b" text-anchor="middle">${fmt(b.min,0)}</text>` : '');
    }).join('') +
    `<path d="M${L} ${H-B}H${W-10}" stroke="#cbd5e1"/></svg>`;
}

function parseCSV(text){
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  const pushField = () => { row.push(field.trim()); field = ''; closed = false; };
  const pushRow = () => { pushField(); if (row.some(x => x !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else field += ch;
    } else if (ch === '"') {
      if (field.trim() || closed) throw new Error('Invalid CSV quotation / CSV引号格式错误');
      field = ''; quoted = true;
    } else if (ch === ',') pushField();
    else if (ch === '\n') pushRow();
    else if (ch === '\r') { if (text[i+1] === '\n') i++; pushRow(); }
    else { if (closed && ch.trim()) throw new Error('Delimiter must follow quote'); field += ch; }
  }
  if (quoted) throw new Error('Unclosed quote in CSV');
  if (field || row.length) pushRow();
  if (rows.length < 2) throw new Error('Provide headers (drug,solvent,temperature) and at least 1 row');
  return rows;
}

function batchExample(){
  const drug = state.catalog.drugs.find(x => x.name === 'Lovastatin') || state.catalog.drugs[0];
  const solvents = ['Acetone', 'Butyl Acetate', '1-Octanol', 'Ethanol'].map(n => state.catalog.solvents.find(x => x.name === n)).filter(Boolean);
  return 'drug,solvent,temperature\n' + solvents.flatMap(s => [25, 40].map(t => [csvCell(drug.name), csvCell(s.name), t].join(','))).join('\n');
}

async function runBatch(){
  const token = ++state.batchRequest;
  $('batch-error').textContent = '';
  let rows, source;
  try {
    const text = $('batch-input').value.replace(/^\uFEFF/, '');
    const parsed = parseCSV(text), head = parsed.shift().map(h => h.toLowerCase());
    const indices = ['drug', 'solvent', 'temperature'].map(k => head.indexOf(k));
    if (indices.some(i => i < 0)) throw new Error('Headers must include: drug, solvent, temperature');
    if (parsed.length > 100) throw new Error('Max 100 rows per batch');
    source = parsed.map(row => ({drug: row[indices[0]], solvent: row[indices[1]], temperature: row[indices[2]]}));
    const resolve = (items, s) => items.find(x => x.id.toLowerCase() === s.toLowerCase() || x.name.toLowerCase() === s.toLowerCase())?.id || s;
    rows = source.map(r => ({drug_id: resolve(state.catalog.drugs, r.drug), solvent_id: resolve(state.catalog.solvents, r.solvent), temperature: r.temperature.trim() === '' ? null : Number(r.temperature)}));
  } catch(e) {
    $('batch-error').textContent = e.message;
    return;
  }

  $('batch-run').disabled = true;
  const model = $('batch-model').value;
  try {
    const r = await api('/api/batch', {model_id: model, rows});
    if (token !== state.batchRequest) return;
    const results = r.results.map((x, i) => ({...source[i], ...x, model: short(model), model_id: model}));
    const okVals = results.filter(x => x.status === 'ok').map(x => x.log_solubility).sort((a,b) => a - b);
    const bMean = okVals.length ? okVals.reduce((a,b)=>a+b,0) / okVals.length : null;
    const bMed = okVals.length ? okVals[Math.floor(okVals.length/2)] : null;
    const summaryHtml = okVals.length ? `<div class="batch-summary">
      <div class="batch-stat"><span>Min log₁₀ S</span><strong>${fmt(okVals[0],3)}</strong></div>
      <div class="batch-stat"><span>Median log₁₀ S</span><strong>${fmt(bMed,3)}</strong></div>
      <div class="batch-stat"><span>Mean log₁₀ S</span><strong>${fmt(bMean,3)}</strong></div>
      <div class="batch-stat"><span>Max log₁₀ S</span><strong>${fmt(okVals.at(-1),3)}</strong></div>
    </div>` : '';

    $('batch-output').innerHTML = `<div class="card">
      <div class="card-heading">
        <h3>Batch Results (${esc(short(model))}) / 批量推理结果</h3>
        <div class="action-row">
          <span class="badge good">Valid: ${r.success_count}</span>
          ${r.error_count ? `<span class="badge warn">Errors Isolated: ${r.error_count}</span>` : ''}
          <button class="button outline compact" id="batch-download">${icon('download')}Export CSV / 导出</button>
        </div>
      </div>
      ${summaryHtml}
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Drug / 药物</th>
              <th>Solvent / 溶剂</th>
              <th>T (°C)</th>
              <th>log₁₀ S</th>
              <th>S = 10ʸ (mol/L)</th>
              <th>Status / 状态</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(x => `<tr class="${x.status==='error'?'batch-error-row':''}">
              <td>${x.row}</td>
              <td><strong>${esc(x.drug)}</strong></td>
              <td>${esc(x.solvent)}</td>
              <td>${esc(x.temperature)}</td>
              <td>${x.status==='ok' ? fmt(x.log_solubility, 4) : '—'}</td>
              <td>${x.status==='ok' && x.concentration != null ? x.concentration.toPrecision(4) : '—'}</td>
              <td>${x.status==='ok' ? '<span class="badge good">OK</span>' : esc(x.error)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
    window.StudioLanguage.normalize($('batch-output'));
    $('batch-download').onclick = () => downloadFile('\uFEFF' + csvText(results), 'SOLAR_batch.csv', 'text/csv;charset=utf-8');
  } catch(e) {
    if (token === state.batchRequest) $('batch-error').textContent = e.message;
  } finally {
    if (token === state.batchRequest) $('batch-run').disabled = false;
  }
}

function bindUI(){
  $('conditions').onsubmit = run;
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => switchView(b.dataset.view));
  $('reset').onclick = () => { resetConditions(); run(); };

  $('conditions').addEventListener('change', e => {
    if (['drug-search', 'solvent-search'].includes(e.target.id)) return;
    if (e.target.id === 'model') updateModels();
    if (['drug', 'solvent'].includes(e.target.id)) structures();
    if (e.target.id === 'temperature') $('temperature-slider').value = e.target.value;
    run();
  });

  $('conditions').addEventListener('input', e => {
    if (e.target.id === 'temperature-slider') $('temperature').value = e.target.value;
  });

  $('drug-search').oninput = e => {
    const term = e.target.value.toLowerCase(), prev = $('drug').value;
    const items = state.catalog.drugs.filter(r => (r.name + ' ' + r.smiles).toLowerCase().includes(term));
    $('drug').innerHTML = items.map(option).join('') || '<option value="">No match</option>';
    if (items.some(r => r.id === prev)) $('drug').value = prev;
    structures();
  };

  $('solvent-search').oninput = e => {
    const term = e.target.value.toLowerCase(), prev = $('solvent').value;
    const items = state.catalog.solvents.filter(r => (r.name + ' ' + r.smiles).toLowerCase().includes(term));
    $('solvent').innerHTML = items.map(option).join('') || '<option value="">No match</option>';
    if (items.some(r => r.id === prev)) $('solvent').value = prev;
    structures();
  };

  document.querySelectorAll('[data-inspect]').forEach(b => b.onclick = () => openMolModal(b.dataset.inspect));
  document.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => {
    const r = selected(b.dataset.copy, $(b.dataset.copy).value);
    if (r?.smiles) navigator.clipboard?.writeText(r.smiles).then(() => toast('Copied SMILES: ' + r.smiles)).catch(() => toast(r.smiles));
  });
  $('mol-dialog-close').onclick = () => $('mol-dialog').close();
  $('mol-dialog').addEventListener('click', e => {
    if (e.target === $('mol-dialog')) {
      const box = e.target.getBoundingClientRect();
      if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) e.target.close();
    }
  });

  $('batch-model').innerHTML = modelOptions();
  $('batch-model').value = state.defaultModel;
  $('batch-example').onclick = () => { $('batch-input').value = batchExample(); runBatch(); };
  $('batch-sweep').onclick = () => {
    const d = selected('drug', $('drug').value)?.name || 'Lovastatin', s = selected('solvent', $('solvent').value)?.name || 'Acetone';
    const temps = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    $('batch-input').value = 'drug,solvent,temperature\n' + temps.map(t => [csvCell(d), csvCell(s), t].join(',')).join('\n');
    runBatch();
  };
  $('batch-template').onclick = () => downloadFile('\uFEFF' + batchExample(), 'SOLAR_template.csv', 'text/csv;charset=utf-8');
  $('batch-run').onclick = runBatch;
  $('batch-file').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100000) { $('batch-error').textContent = 'File exceeds 100 KB'; return; }
    $('batch-input').value = await file.text();
    runBatch();
  };
}

async function init(){
  hydrateIcons();
  $('run').disabled = true;
  try {
    const [catalog, registry, insights] = await Promise.all([api('/api/catalog'), api('/api/models'), api('/api/insights')]);
    state.catalog = catalog;
    state.models = registry.models;
    state.insights = insights;
    state.defaultModel = registry.default;
    state.comparator = registry.comparator;

    for (const [id, rows] of [['drug', catalog.drugs], ['solvent', catalog.solvents], ['multi', catalog.solvents]]) {
      $(id).innerHTML = rows.map(option).join('');
    }
    $('model').innerHTML = modelOptions();

    const presets = [
      ['Lovastatin', 'Acetone', 25, 'Sec 9.3 Flagship'],
      ['Erythritol', 'Acetone', 13.2, 'Sec 7 TreeSHAP'],
      ['Lovastatin', 'Butyl Acetate', 25, 'Sec 7 T-Curve']
    ].map(([dn, sn, t, tag]) => ({
      d: catalog.drugs.find(x => x.name.toLowerCase() === dn.toLowerCase()),
      s: catalog.solvents.find(x => x.name.toLowerCase() === sn.toLowerCase()),
      t, tag
    })).filter(p => p.d && p.s);

    $('preset-chips').innerHTML = presets.map((p, i) =>
      `<button type="button" class="preset-chip" data-preset="${i}">${esc(p.d.name)} × ${esc(p.s.name)} (${p.t}°)</button>`
    ).join('');

    document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
      const p = presets[Number(b.dataset.preset)];
      if (!p) return;
      $('drug-search').value = '';
      $('solvent-search').value = '';
      $('drug').innerHTML = state.catalog.drugs.map(option).join('');
      $('solvent').innerHTML = state.catalog.solvents.map(option).join('');
      $('drug').value = p.d.id;
      $('solvent').value = p.s.id;
      $('temperature').value = p.t;
      $('temperature-slider').value = p.t;
      structures();
      run();
    });

    $('solvent-chips').innerHTML = ['Acetone', 'Butyl Acetate', 'Ethyl ether', '1-Octanol']
      .map(n => catalog.solvents.find(s => s.name === n))
      .filter(Boolean)
      .map((s, idx) => `<label class="solvent-chip"><input type="checkbox" value="${esc(s.id)}" ${idx<2?'checked':''}>${esc(s.name)}</label>`)
      .join('');

    $('temperature-slider').min = catalog.temperature_min;
    $('temperature-slider').max = catalog.temperature_max;
    $('stat-mae').textContent = fmt(state.models.find(m => m.id === state.defaultModel)?.metrics.parent_macro_MAE, 4);

    bindUI();
    resetConditions();
    $('service-status').classList.add('ready');
    $('service-status').innerHTML = `<i></i>${state.models.length} models ready / 就绪`;
    switchView('predict');
  } catch(e) {
    $('error').textContent = 'Init error: ' + e.message;
  }
}
init();
