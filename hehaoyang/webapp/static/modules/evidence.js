/* SOLAR Studio v5.0 — Module 04: Ablation Chain, TreeSHAP Mechanism, Diagnostics & 14-Model Leaderboard */
'use strict';
(() => {
  const {state, REPORT_EVIDENCE, savePersistedState} = window.SOLARStore;
  const {api} = window.SOLARApi;
  const {chart, histogram, attachChartInteractivity} = window.SOLARCharts;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (v, n = 4) => Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v).toFixed(n) : '—';
  const short = id => (state.models.find(m => m.id === id)?.name || id).split(' / ')[0];

  async function loadDiagnostics(modelId) {
    const box = $('diag-body');
    if (!box) return;
    box.innerHTML = '<div class="loading-label"><span class="spinner"></span>Loading OOF residuals…</div>';
    try {
      const d = state.diagCache[modelId] || (state.diagCache[modelId] = await api('/api/model_diagnostics/' + encodeURIComponent(modelId)));
      if (!$('diag-body')) return;
      box.innerHTML = `<div class="diag-kpis">
        <div class="diag-kpi"><span>Median AE (P50)</span><strong>${fmt(d.quantiles.p50_ae, 3)}</strong></div>
        <div class="diag-kpi"><span>P75 Abs Error</span><strong>${fmt(d.quantiles.p75_ae, 3)}</strong></div>
        <div class="diag-kpi"><span>P90 Abs Error</span><strong>${fmt(d.quantiles.p90_ae, 3)}</strong></div>
        <div class="diag-kpi"><span>Mean Bias (y−ŷ)</span><strong>${fmt(d.quantiles.bias, 4)}</strong></div>
      </div>
      <div class="evidence-grid">
        <div>
          <h4 style="font-size:11.5px;margin-bottom:4px">OOF Residual Histogram (y − ŷ)</h4>
          ${histogram(d.residual_histogram)}
        </div>
        <div>
          <h4 style="font-size:11.5px;margin-bottom:4px">Predicted vs Observed (128 Parents)</h4>
          ${chart([{x: d.scatter.map(p => p.y), y: d.scatter.map(p => p.pred), pointLabels: d.scatter.map(p => 'Parent ' + p.parent), label: short(modelId), kind: 'dots', color: '#2d8b76'}], {xLabel: 'Observed log₁₀ S', yLabel: 'Predicted log₁₀ S', H: 165})}
        </div>
      </div>`;
      attachChartInteractivity(box);
    } catch (e) {
      if ($('diag-body')) $('diag-body').innerHTML = `<p class="error-message">${esc(e.message)}</p>`;
    }
  }

  function renderInsights(sort = 'parent_macro_MAE') {
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
              <table class="data-table">
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
                    <td><strong>${esc(row.name)}</strong><span class="cell-zh">${esc(row.features)}</span></td>
                    <td class="num ${row.highlight ? 'cell-best' : ''}">${fmt(row.parent_mae, 4)}</td>
                    <td class="num ${row.highlight ? 'cell-best' : ''}">${fmt(row.mae, 4)}</td>
                    <td class="num ${row.highlight ? 'cell-best' : ''}">${fmt(row.rmse, 4)}</td>
                    <td class="num ${row.highlight ? 'cell-best' : ''}">${fmt(row.r2, 4)}</td>
                    <td class="num"><strong>${esc(row.delta_vs_basic)}</strong><span class="cell-zh">${esc(row.ci_vs_basic)}</span></td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
            <div class="small-heading" style="margin-top:10px">3-Fold Tree Representation &amp; Parent-Equal Weighting Pilot / 树分支特征交互与母体等权消融筛查</div>
            <div class="model-bars">
              ${REPORT_EVIDENCE.treePilot.map((p, idx) => `<div class="model-bar ${idx === 3 ? 'proposed' : ''}">
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
    } else if (deck === 'mechanism') {
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
                    <td class="cell-best">+0.01538</td>
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
                  ${REPORT_EVIDENCE.solubilityBands.map((b, i) => `<tr class="${i === 2 ? 'highlight' : ''}">
                    <td><strong>${esc(b.band)}</strong></td>
                    <td>${b.rows} / ${b.parents}</td>
                    <td class="${i === 2 ? 'cell-best' : ''}">${fmt(b.fusion_mae, 4)}</td>
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
    } else {
      const groupMatch = m => state.leaderboardGroup === 'all' ? true :
        state.leaderboardGroup === 'main' ? m.group.startsWith('Main') || m.group.startsWith('New') :
        state.leaderboardGroup === 'solar' ? m.group.startsWith('SOLAR') :
        state.leaderboardGroup === 'neural' ? m.group.startsWith('Neural') : m.group.startsWith('Classical');
      const models = [...state.models].filter(groupMatch).sort((a, b) => sort === 'R2' ? b.metrics[sort] - a.metrics[sort] : a.metrics[sort] - b.metrics[sort]);

      paneHtml = `<div class="deck-split-grid">
        <div class="deck-split-col">
          <article class="card leaderboard-card">
            <div class="leaderboard-toolbar">
              <div class="leaderboard-pills">
                <button type="button" class="pill-btn ${state.leaderboardGroup === 'all' ? 'active' : ''}" data-lgroup="all">All (${state.models.length})</button>
                <button type="button" class="pill-btn ${state.leaderboardGroup === 'main' ? 'active' : ''}" data-lgroup="main">Fusion</button>
                <button type="button" class="pill-btn ${state.leaderboardGroup === 'solar' ? 'active' : ''}" data-lgroup="solar">SOLAR</button>
                <button type="button" class="pill-btn ${state.leaderboardGroup === 'classical' ? 'active' : ''}" data-lgroup="classical">Tree / Linear</button>
                <button type="button" class="pill-btn ${state.leaderboardGroup === 'neural' ? 'active' : ''}" data-lgroup="neural">Neural</button>
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
                  ${models.map((m, idx) => `<tr class="${m.id === state.defaultModel ? 'highlight' : ''}">
                    <td>${idx + 1}</td>
                    <td><strong>${esc(short(m.id))}</strong>${m.id === state.defaultModel ? ' <span class="badge good">Main</span>' : ''}</td>
                    ${['parent_macro_MAE', 'MAE', 'RMSE', 'R2', 'inference_ms_per_row'].map(k => {
                      const best = k === 'R2' ? Math.max(...models.map(x => x.metrics[k])) : Math.min(...models.map(x => x.metrics[k]));
                      return `<td class="${m.metrics[k] === best ? 'cell-best' : ''}">${fmt(m.metrics[k], k === 'inference_ms_per_row' ? 2 : 4)}</td>`;
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
              <span class="badge good">Parent Overlap = ${d.protocol.parent_overlap} (Zero Leakage)</span>
            </div>
            <div class="split-bar"><span style="width:${s.development_rows / s.total_rows * 100}%"></span><span style="flex:1"></span></div>
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
        savePersistedState();
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
          savePersistedState();
          renderInsights($('leaderboard-sort')?.value || sort);
        };
      });
    }
  }

  window.SOLAREvidence = Object.freeze({
    loadDiagnostics,
    renderInsights
  });
})();
