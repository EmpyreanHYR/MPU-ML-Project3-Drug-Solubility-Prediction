/* SOLAR Studio v5.0 — Central State Store, LocalStorage Persistence & Verified Report Evidence */
'use strict';
(() => {
  const STORAGE_KEY = 'solar-studio-state-v5';

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

  function icon(name) {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[name] || icons.info}"/></svg>`;
  }

  function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => {
      el.innerHTML = icon(el.dataset.icon);
    });
  }

  const palette = ['#2d8b76', '#d97706', '#2563eb', '#dc2626', '#7c3aed', '#0284c7'];

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
        ci_vs_basic: '[−0.1219, −0.0082]',
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
        stage: 'F · Proposed Main',
        name: 'ExtraTrees–TabPFN Fusion (0.75 ET + 0.25 TabPFN) / 本文主融合模型',
        features: '869D Interaction + q=1 + OOF Convex Fusion',
        parent_mae: 0.6668,
        mae: 0.6510,
        rmse: 0.8842,
        r2: 0.5234,
        delta_vs_basic: '−0.0801 (−10.73%)',
        ci_vs_basic: '[−0.1366, −0.0276]',
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
      {band: '(−2.0, 0.0] · Moderate Solubility (54.7% 主力工业区间)', rows: 824, parents: 110, fusion_mae: 0.4653, fusion_bias: '−0.1197 (Near zero)', solar_mae: 0.5514},
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
    resultsCache: {
      predict: null,
      compare: null,
      screen_ranking: null,
      screen_explore: null
    },
    stale: false,
    showObservations: true,
    unit: 'log',
    defaultModel: 'TabPFN_ExtraTreesBlend',
    comparator: 'AdaptiveHybrid',
    batchRequest: 0,
    batchInitialized: false,
    molCache: {},
    evidenceCache: {},
    molReq: 0,
    screenFilter: 'all',
    screenSort: 'desc',
    screenSubTab: 'ranking',
    radarFocusAxis: null,
    radarSort: null,
    diagCache: {},
    diagModel: 'TabPFN_ExtraTreesBlend',
    leaderboardGroup: 'all',
    radarSelected: ['TabPFN_ExtraTreesBlend', 'AdaptiveHybrid', 'ExtraTrees', 'TabM'],
    compareDeck: 'radar',
    insightsDeck: 'ablation'
  };

  function savePersistedState(inputs = {}) {
    try {
      const payload = {
        tab: state.tab,
        screenSubTab: state.screenSubTab,
        compareDeck: state.compareDeck,
        insightsDeck: state.insightsDeck,
        radarSelected: state.radarSelected,
        leaderboardGroup: state.leaderboardGroup,
        ...inputs
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) { /* Storage optional */ }
  }

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (views[parsed.tab]) state.tab = parsed.tab;
        if (['ranking', 'explore'].includes(parsed.screenSubTab)) state.screenSubTab = parsed.screenSubTab;
        if (['radar', 'protocol', 'curves'].includes(parsed.compareDeck)) state.compareDeck = parsed.compareDeck;
        if (['ablation', 'mechanism', 'leaderboard'].includes(parsed.insightsDeck)) state.insightsDeck = parsed.insightsDeck;
        if (Array.isArray(parsed.radarSelected) && parsed.radarSelected.length) state.radarSelected = parsed.radarSelected;
        return parsed;
      }
    } catch (_) { /* Ignore corrupt storage */ }
    return null;
  }

  window.SOLARStore = Object.freeze({
    state,
    views,
    palette,
    icons,
    icon,
    hydrateIcons,
    MODEL_COLORS,
    getModelColor,
    MODEL_TAKEAWAYS,
    REPORT_EVIDENCE,
    savePersistedState,
    loadPersistedState
  });
})();
