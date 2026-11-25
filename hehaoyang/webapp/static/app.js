/* SOLAR Studio v5.0 — Core Application Controller & View Router (Modular Architecture) */
'use strict';
(() => {
  const {state, views, palette, icon, hydrateIcons, savePersistedState, loadPersistedState} = window.SOLARStore;
  const {api, getMolProfile, getEvidence, csvCell, csvText, downloadFile, parseCSV} = window.SOLARApi;
  const {renderRadarComponent, bindRadarEvents, chart, buildValueHistogram, attachChartInteractivity} = window.SOLARCharts;
  const {renderInsights} = window.SOLAREvidence;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (v, n = 4) => Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v).toFixed(n) : '—';
  const short = id => (state.models.find(m => m.id === id)?.name || id).split(' / ')[0];
  const label = (side, id) => state.catalog?.[side === 'drug' ? 'drugs' : 'solvents'].find(x => x.id === id)?.name || id;
  const selected = (side, id) => state.catalog?.[side === 'drug' ? 'drugs' : 'solvents'].find(x => x.id === id);
  const transform = ys => state.unit === 'raw' ? ys.map(v => 10 ** v) : ys;

  let toastTimer;
  function toast(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3200);
  }

  function option(r) { return `<option value="${esc(r.id)}">${esc(r.name)}</option>`; }

  function modelOptions(exclude = '') {
    return [...new Set(state.models.map(m => m.group))].map(group =>
      `<optgroup label="${esc(group)}">${state.models.filter(m => m.group === group && m.id !== exclude).map(option).join('')}</optgroup>`
    ).join('');
  }

  function persistCurrentInputs() {
    savePersistedState({
      model_id: $('model')?.value,
      model_b: $('model-b')?.value,
      drug_id: $('drug')?.value,
      solvent_id: $('solvent')?.value,
      temperature: Number($('temperature')?.value),
      tmin: Number($('tmin')?.value),
      tmax: Number($('tmax')?.value)
    });
  }

  /* Out-of-Distribution (OOD) Real-time Check & Visual Alert */
  function checkOODWarning(evidenceObj = null) {
    const box = $('ood-warning');
    if (!box || !state.catalog) return;
    const t = Number($('temperature').value);
    const tMinCat = state.catalog.temperature_min ?? -59.5;
    const tMaxCat = state.catalog.temperature_max ?? 130.0;

    if (!Number.isFinite(t)) { box.hidden = true; return; }

    if (t < tMinCat || t > tMaxCat) {
      box.className = 'ood-warning-box ood-critical';
      box.innerHTML = `<strong>Out-of-Distribution (OOD) Warning / 超出训练集分布警告</strong>` +
        `<span>T = ${t}°C is outside the development training domain [${tMinCat}°C, ${tMaxCat}°C]. Extrapolation confidence is very low; predictions are for reference only.<br>该温度超出模型开发训练集范围 [${tMinCat}°C, ${tMaxCat}°C]，外推预测置信度极低，结果仅供参考。</span>`;
      box.hidden = false;
      return;
    }

    const ev = evidenceObj || state.current?.evidence?.[0];
    if (ev && ev.domain) {
      if (!ev.domain.parent_seen) {
        box.className = 'ood-warning-box ood-amber';
        box.innerHTML = `<strong>ℹ Unseen Drug Parent / 未见药物母体外推</strong>` +
          `<span>This drug parent is absent from the 128 development parents (zero-shot scaffold generalization).<br>该药物母体不在开发集 128 个训练母体中，当前属于未见母体零样本外推预测。</span>`;
        box.hidden = false;
        return;
      }
      if (ev.domain.pair_seen && !ev.domain.pair_temperature_in_range && ev.range?.min != null) {
        box.className = 'ood-warning-box ood-amber';
        box.innerHTML = `<strong>ℹ Pair Temperature Extrapolation / 组合温区外推提示</strong>` +
          `<span>T = ${t}°C is outside this pair's observed range [${ev.range.min}°C, ${ev.range.max}°C] in development data.<br>当前温度超出该药物-溶剂组合在开发集中的实测温区 [${ev.range.min}°C, ${ev.range.max}°C]。</span>`;
        box.hidden = false;
        return;
      }
    }
    box.hidden = true;
  }

  function updateModels() {
    const prev = $('model-b').value;
    $('model-b').innerHTML = modelOptions($('model').value);
    if ([...$('model-b').options].some(o => o.value === prev)) $('model-b').value = prev;
    else if ($('model-b').querySelector(`option[value="${state.comparator}"]`)) $('model-b').value = state.comparator;
    const m = state.models.find(m => m.id === $('model').value);
    if (!m) return;
    $('model-hint').textContent = m.id === state.defaultModel ? 'MAIN · 0.6668' : 'MAE ' + fmt(m.metrics.parent_macro_MAE, 3);
  }

  function renderMolProps(side, p) {
    const el = $(side + '-props');
    if (!el) return;
    if (!p) { el.innerHTML = ''; return; }
    const pr = p.properties;
    el.innerHTML = `<span class="mol-prop-chip"><strong>${esc(p.formula)}</strong></span>` +
      `<span class="mol-prop-chip">MW <strong>${fmt(pr.MolWt, 1)}</strong></span>` +
      `<span class="mol-prop-chip">cLogP <strong>${fmt(pr.MolLogP, 2)}</strong></span>` +
      `<span class="mol-prop-chip">TPSA <strong>${fmt(pr.TPSA, 1)}</strong></span>` +
      (side === 'drug' ? `<span class="mol-prop-chip ${p.lipinski_violations === 0 ? 'ro5-ok' : 'ro5-warn'}">${p.lipinski_violations === 0 ? 'Lipinski OK' : 'Ro5: ' + p.lipinski_violations}</span>` : '');
  }

  function updatePairMatch(dp, sp) {
    const pill = $('pair-match-pill');
    if (!pill) return;
    if (!dp || !sp) { pill.hidden = true; return; }
    const dLogP = Math.abs(dp.properties.MolLogP - sp.properties.MolLogP);
    pill.className = 'pair-match-pill' + (dLogP <= 1.5 ? '' : ' warn');
    pill.innerHTML = `ΔcLogP ${fmt(dLogP, 2)}`;
    pill.hidden = false;
  }

  function structures() {
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

  async function openMolModal(side) {
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
      <div class="mol-detail-stat"><span>MolWt (g/mol)</span><strong>${fmt(pr.MolWt, 2)}</strong></div>
      <div class="mol-detail-stat"><span>cLogP (Crippen)</span><strong>${fmt(pr.MolLogP, 3)}</strong></div>
      <div class="mol-detail-stat"><span>TPSA (Å²)</span><strong>${fmt(pr.TPSA, 2)}</strong></div>
      <div class="mol-detail-stat"><span>HBD / HBA</span><strong>${pr.HBD} / ${pr.HBA}</strong></div>
      <div class="mol-detail-stat"><span>Rotatable Bonds</span><strong>${pr.RotatableBonds}</strong></div>
      <div class="mol-detail-stat"><span>Rings (Aromatic)</span><strong>${pr.RingCount} (${pr.AromaticRings})</strong></div>
      <div class="mol-detail-stat"><span>Heavy Atoms</span><strong>${pr.HeavyAtomCount}</strong></div>
      <div class="mol-detail-stat"><span>Fraction Csp³</span><strong>${fmt(pr.FractionCSP3, 3)}</strong></div>
      <div class="mol-detail-stat"><span>Lipinski Ro5</span><strong>${p.lipinski_violations === 0 ? 'Pass (0 viol.)' : p.lipinski_violations + ' violations'}</strong></div>
    </div>`;
    $('mol-dialog').showModal();
  }

  function cancelRun() {
    state.request++;
    state.controller?.abort();
    state.controller = null;
    $('run').disabled = false;
    if (views[state.tab]?.[1]) window.StudioLanguage.btn($('run-label'), views[state.tab][1]);
    $('output').removeAttribute('aria-busy');
  }

  function syncFormVisibility() {
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

  function getModeKey(tab = state.tab) {
    if (tab === 'screen') return 'screen_' + state.screenSubTab;
    return tab;
  }

  function renderPendingState() {
    const tab = state.tab;
    const drugName = label('drug', $('drug')?.value);
    const solventName = label('solvent', $('solvent')?.value);
    const modelName = short($('model')?.value);
    const tempVal = $('temperature')?.value || 25;
    const tMin = $('tmin')?.value || 10;
    const tMax = $('tmax')?.value || 45;
    const runBtnText = views[tab]?.[1] || 'Run / 运行';

    let tabsBar = '';
    let modeDescEn = '';
    let modeDescZh = '';

    if (tab === 'screen') {
      const tabs = [
        {id: 'ranking', en: '49-Solvent Ranking, Top-5 & Distribution', zh: '49种全溶剂排序、Top-5推荐与分布直方图'},
        {id: 'explore', en: 'Multi-Solvent T-Response Curves', zh: '多溶剂61点连续变温响应曲线'}
      ];
      tabsBar = deckTabsBar('screenSubTab', state.screenSubTab, tabs);
      if (state.screenSubTab === 'ranking') {
        modeDescEn = `Ready to screen all 49 industrial solvents for <strong>${esc(drugName)}</strong> at <strong>T = ${esc(tempVal)} °C</strong> using <strong>${esc(modelName)}</strong>.`;
        modeDescZh = `已选择药物 <strong>${esc(drugName)}</strong>（温度 <strong>T = ${esc(tempVal)} °C</strong>，模型 <strong>${esc(modelName)}</strong>）。切换内容不会自动计算，请点击左侧 <strong>「运行筛选与曲线」</strong> 按钮开始计算全部 49 种溶剂溶解度。`;
      } else {
        const checkedSolvents = [...document.querySelectorAll('#solvent-chips input:checked')].map(el => label('solvent', el.value));
        const allSolvents = [...new Set([solventName, ...checkedSolvents])].filter(Boolean);
        modeDescEn = `Ready to compute 61-point temperature response curves (<strong>${esc(tMin)}°C ~ ${esc(tMax)}°C</strong>) for <strong>${esc(drugName)}</strong> across <strong>${allSolvents.length} solvents</strong> (${esc(allSolvents.join(', '))}).`;
        modeDescZh = `已配置 <strong>${esc(drugName)}</strong> 在 <strong>${allSolvents.length} 种溶剂</strong>（${esc(allSolvents.join('、'))}）下 <strong>${esc(tMin)}°C ~ ${esc(tMax)}°C</strong> 的连续变温区间。请点击左侧 <strong>「运行筛选与曲线」</strong> 按钮开始计算。`;
      }
    } else if (tab === 'compare') {
      const deck = state.compareDeck || 'radar';
      const tabs = [
        {id: 'radar', en: '5D Evaluation Radar & Matrix', zh: '5维综合评价雷达与指标对照表'},
        {id: 'protocol', en: '128-Parent Paired CV Benchmark', zh: '128未见母体配对验证与胜率散点'},
        {id: 'curves', en: '61-Point Temperature Response', zh: '同条件61点连续变温响应与差值'}
      ];
      tabsBar = deckTabsBar('compareDeck', deck, tabs);
      if (deck === 'radar') {
        $('output').innerHTML = tabsBar + `<div class="deck-pane">${renderRadarComponent()}</div>`;
        window.StudioLanguage.normalize($('output'));
        bindResultActions();
        return;
      }
      const modelBName = short($('model-b')?.value);
      modeDescEn = `Ready to compare <strong>${esc(modelName)}</strong> vs <strong>${esc(modelBName)}</strong> on <strong>${esc(drugName)} × ${esc(solventName)}</strong> (T = ${esc(tempVal)}°C, range ${esc(tMin)}°C ~ ${esc(tMax)}°C).`;
      modeDescZh = `已选定主模型 <strong>${esc(modelName)}</strong> 与对照基线 <strong>${esc(modelBName)}</strong>（条件：<strong>${esc(drugName)} × ${esc(solventName)}</strong>）。请点击左侧 <strong>「运行对照」</strong> 按钮执行计算。`;
    } else {
      modeDescEn = `Ready to predict conditional solubility for <strong>${esc(drugName)} × ${esc(solventName)}</strong> at <strong>T = ${esc(tempVal)} °C</strong> using <strong>${esc(modelName)}</strong>.`;
      modeDescZh = `已选择 <strong>${esc(drugName)} × ${esc(solventName)}</strong>（温度 <strong>${esc(tempVal)} °C</strong>，模型 <strong>${esc(modelName)}</strong>）。请点击左侧 <strong>「运行预测」</strong> 按钮开始计算。`;
    }

    $('output').innerHTML = tabsBar + `<div class="card pending-run-card">
      <div class="pending-run-icon">${icon('play')}</div>
      <div class="pending-run-body">
        <div class="pending-run-header">
          <span class="badge warn">Manual Run Mode / 手动触发计算模式</span>
          <h3>Awaiting Execution<span class="heading-zh">等待点击运行计算</span></h3>
        </div>
        <p class="pending-desc-en">${modeDescEn}</p>
        <p class="pending-desc-zh">${modeDescZh}</p>
        <div class="pending-param-chips">
          <span class="badge">Model: ${esc(modelName)}</span>
          <span class="badge">Drug: ${esc(drugName)}</span>
          ${!(tab === 'screen' && state.screenSubTab === 'ranking') ? `<span class="badge">Solvent: ${esc(solventName)}</span>` : `<span class="badge">Scope: All 49 Catalog Solvents</span>`}
          <span class="badge">T = ${esc(tempVal)} °C</span>
        </div>
        <div class="pending-run-actions">
          <span class="pending-hint">Click <strong>${esc(runBtnText)}</strong> to start inference</span>
          <button type="button" class="button compact" id="pending-trigger-run">${icon('play')}<span>${esc(runBtnText)}</span></button>
        </div>
      </div>
    </div>`;
    window.StudioLanguage.normalize($('output'));
    bindResultActions();
    if ($('pending-trigger-run')) {
      $('pending-trigger-run').onclick = () => $('run').click();
    }
  }

  function renderPendingOrCurrent() {
    if (state.tab === 'compare' && state.compareDeck === 'radar' && state.models.length) {
      const tabs = [
        {id: 'radar', en: '5D Evaluation Radar & Matrix', zh: '5维综合评价雷达与指标对照表'},
        {id: 'protocol', en: '128-Parent Paired CV Benchmark', zh: '128未见母体配对验证与胜率散点'},
        {id: 'curves', en: '61-Point Temperature Response', zh: '同条件61点连续变温响应与差值'}
      ];
      $('output').innerHTML = deckTabsBar('compareDeck', 'radar', tabs) + `<div class="deck-pane">${renderRadarComponent()}</div>`;
      window.StudioLanguage.normalize($('output'));
      bindResultActions();
      return;
    }
    const cached = state.resultsCache[getModeKey()];
    if (cached) {
      state.current = cached;
      renderResult();
    } else {
      state.current = null;
      renderPendingState();
    }
  }

  function switchView(tab) {
    if (!views[tab]) return;
    cancelRun();
    state.tab = tab;
    state.unit = 'log';
    $('error').textContent = '';
    persistCurrentInputs();

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
    const [titleEn, ...titleZh] = String(views[tab][0]).split(' / ');
    $('page-title').innerHTML = `<span class="crumb-en">${esc(titleEn)}</span>` +
      (titleZh.length ? `<span class="crumb-zh">${esc(titleZh.join(' / '))}</span>` : '');

    if (isExperiment) {
      window.StudioLanguage.btn($('run-label'), views[tab][1]);
      syncFormVisibility();
      checkOODWarning();
      if (tab === 'predict' && !state.resultsCache.predict) {
        run();
      } else {
        renderPendingOrCurrent();
      }
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
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
  }

  function resetConditions() {
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
    checkOODWarning();
  }

  function readConditions() {
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

  function valueCard(title, value, note, alt = false) {
    return `<div class="prediction-value${alt ? ' alt' : ''}"><span>${esc(title)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`;
  }

  function domainHTML(e) {
    const d = e.domain;
    const badge = (yes, a, b) => `<span class="badge ${yes ? 'good' : 'warn'}">${icon(yes ? 'check' : 'info')}${yes ? a : b}</span>`;
    const rangeStr = e.range?.min != null ? ` [${e.range.min} ~ ${e.range.max}°C]` : '';
    return `<div class="domain-strip">
      ${badge(d.parent_seen, 'Parent Seen in Dev / 开发集已见母体', 'Unseen Drug Parent / 未见药物母体外推')}
      ${badge(d.pair_seen, `Pair Observations: ${e.support.pair_rows} rows${rangeStr} / 组合实测 ${e.support.pair_rows} 条`, 'Unobserved Pair / 该药物-溶剂组合无实测')}
      ${badge(d.temperature_in_range && (!d.pair_seen || d.pair_temperature_in_range), 'Within Observed T-Range / 位于实测温区内', 'Temperature Extrapolation (OOD) / 温度区间外推预警')}
    </div>`;
  }

  function chartToolbar() {
    return `<div class="chart-tools">
      <label class="observations-toggle"><input id="observations-toggle" type="checkbox" ${state.showObservations ? 'checked' : ''}>Dev Obs / 实测点</label>
      <button type="button" data-unit="log" class="${state.unit === 'log' ? 'active' : ''}">log₁₀ S</button>
      <button type="button" data-unit="raw" class="${state.unit === 'raw' ? 'active' : ''}">S = 10ʸ (mol/L)</button>
      <button type="button" data-export="csv">CSV ↓</button>
    </div>`;
  }

  /* Divergent A/B bars: each metric gets one track, the winner extends left of
     centre. A table tells you 0.6668 vs 0.7164; this tells you by how much, at
     a glance, without reading a single number. */
  function metricsTable(a, b, idA, idB) {
    const mA = state.models?.find(m => m.id === idA || m.id === a?.model)?.metrics || a;
    const mB = state.models?.find(m => m.id === idB || m.id === b?.model)?.metrics || b;
    const rows = [
      ['Parent Macro MAE ↓ (Primary / 首要母体指标)', 'parent_macro_MAE', 'mae'],
      ['Record MAE ↓ (逐行平均绝对误差)', 'MAE', 'mae'],
      ['Global RMSE ↓ (全局均方根误差)', 'RMSE', 'mae'],
      ['Explained Variance R² ↑ (决定系数)', 'R2', 'r2'],
      ['Training Fit Time (s) ↓ (训练耗时)', 'fit_seconds', 'ms'],
      ['Inference Latency (ms/row) ↓ (单行推理耗时)', 'inference_ms_per_row', 'ms']
    ];
    const winsA = rows.filter(([, key, kind]) => {
      const vA = Number(mA[key]), vB = Number(mB[key]);
      return Number.isFinite(vA) && Number.isFinite(vB) && (kind === 'r2' ? vA > vB : vA < vB);
    }).length;
    return `<div class="ab-compare">
      <div class="ab-compare-head">
        <span class="ab-side ab-side-a">${esc(short(idA))}<b>${winsA}/${rows.length}</b></span>
        <span class="ab-compare-mid">vs / 对比</span>
        <span class="ab-side ab-side-b">${esc(short(idB))}<b>${rows.length - winsA}/${rows.length}</b></span>
      </div>
      <div class="ab-rows">
        ${rows.map(([title, key, kind]) => {
          const vA = Number(mA[key]), vB = Number(mB[key]);
          if (!Number.isFinite(vA) || !Number.isFinite(vB)) {
            return `<div class="ab-row"><span class="ab-row-label">${title}</span><span class="ab-row-na">n/a</span></div>`;
          }
          const aWins = kind === 'r2' ? vA > vB : vA < vB;
          const diff = Math.abs(vA - vB) / Math.max(Math.abs(vA), Math.abs(vB)) * 100;
          const span = Math.min(100, diff * 2.4);
          return `<div class="ab-row${aWins ? ' is-a' : ' is-b'}">
            <span class="ab-row-label">${title}</span>
            <span class="ab-track">
              <i class="ab-bar ab-bar-a" style="width:${aWins ? span : 0}%"></i>
              <i class="ab-bar ab-bar-b" style="width:${aWins ? 0 : span}%"></i>
            </span>
            <span class="ab-vals">
              <b class="ab-val-a">${fmt(vA, 4)}</b>
              <span class="ab-delta">${aWins ? '−' : '+'}${fmt(diff, 1)}%</span>
              <b class="ab-val-b">${fmt(vB, 4)}</b>
            </span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  function deckTabsBar(deckVar, activeDeck, tabs) {
    return `<div class="deck-tabs-bar" role="tablist">
      ${tabs.map(t => `<button type="button" class="deck-tab ${activeDeck === t.id ? 'active' : ''}" data-deck="${t.id}" data-deck-var="${deckVar}" role="tab" aria-selected="${activeDeck === t.id}">
        <span class="btn-stack"><span lang="en" class="btn-text-en">${t.en}</span><span lang="zh-CN" class="btn-text-zh">${t.zh}</span></span>
      </button>`).join('')}
    </div>`;
  }

  function renderScreenModule(c) {
    const tabs = [
      {id: 'ranking', en: '49-Solvent Ranking, Top-5 & Distribution', zh: '49种全溶剂排序、Top-5推荐与分布直方图'},
      {id: 'explore', en: 'Multi-Solvent T-Response Curves', zh: '多溶剂61点连续变温响应曲线'}
    ];
    const tabsBar = deckTabsBar('screenSubTab', state.screenSubTab, tabs);

    if (state.screenSubTab === 'explore') {
      const {q, r, evidence} = c;
      if (!r.lines) return tabsBar + `<div class="card loading-card"><div class="loading-label"><span class="spinner"></span>Loading temperature curves…</div></div>`;
      const series = r.lines.flatMap((l, i) => [
        {x: r.temperatures, y: transform(l.values), label: l.name, color: palette[i % palette.length]},
        ...(state.showObservations && evidence[i]?.observations?.length
          ? [{x: evidence[i].observations.map(o => o.temperature), y: transform(evidence[i].observations.map(o => o.log_solubility)), label: l.name + ' (Obs)', kind: 'dots', color: palette[i % palette.length]}]
          : [])
      ]);
      return tabsBar + `<div class="deck-split-grid">
        <div class="deck-split-col">
          <div class="card result-card">
            <div class="chart-header">
              <h3>Multi-Solvent Temperature Response (61 Points) / 多溶剂连续变温响应 (${esc(label('drug', q.drug_id))})</h3>
              ${chartToolbar()}
            </div>
            ${chart(series, {yLabel: state.unit === 'raw' ? 'S = 10ʸ (mol/L)' : 'Predicted log₁₀ S', H: 250})}
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
                      <td><strong style="color:${palette[i % palette.length]}">●</strong> <strong>${esc(l.name)}</strong></td>
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
    const sorted = [...filtered].sort((a, b) => state.screenSort === 'desc' ? b.log_solubility - a.log_solubility : a.log_solubility - b.log_solubility);
    const vals = items.map(x => x.log_solubility), minV = Math.min(...vals), maxV = Math.max(...vals), span = Math.max(maxV - minV, 1e-6);
    const obsCount = items.filter(x => x.pair_rows > 0).length;
    const med = [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)];
    const top5 = [...items].sort((a, b) => b.log_solubility - a.log_solubility).slice(0, 5);

    const top5Banner = `<div class="top5-solvents-strip">
      <div class="top5-strip-header">
        <span><strong>Top-5 Recommended Solvents / 最佳溶解度溶剂 Top-5 推荐卡片</strong> (${esc(label('drug', c.q.drug_id))} @ T = ${c.q.temperature}°C)</span>
        <button type="button" class="button outline compact" data-export="csv">${icon('download')}Export 49 Solvents CSV / 导出筛选结果</button>
      </div>
      <div class="top5-solvents-grid">
        ${top5.map((x, idx) => `<button type="button" class="top5-solvent-card" data-pick-solvent="${esc(x.solvent_id)}" title="Inspect in Point Prediction / 点击跳转单点预测">
          <div class="top5-card-top">
            <span class="top5-rank">#${idx + 1}</span>
            <span class="screen-badge ${x.pair_rows > 0 ? 'obs' : ''}">${x.pair_rows > 0 ? x.pair_rows + ' obs' : 'pred'}</span>
          </div>
          <strong class="top5-name">${esc(x.name)}</strong>
          <div class="top5-val">log₁₀ S: <b>${fmt(x.log_solubility, 3)}</b></div>
          <small class="top5-meta">S = ${x.concentration ? x.concentration.toPrecision(3) : '—'} mol/L · cLogP ${fmt(x.mol_logp, 2)}</small>
        </button>`).join('')}
      </div>
    </div>`;

    return tabsBar + top5Banner + `<div class="deck-split-grid">
      <div class="deck-split-col">
        <div class="card result-card">
          <div class="batch-summary">
            <div class="batch-stat"><span>Best / 最高 log₁₀ S</span><strong>${fmt(maxV, 3)}</strong></div>
            <div class="batch-stat"><span>Median / 中位 log₁₀ S</span><strong>${fmt(med, 3)}</strong></div>
            <div class="batch-stat"><span>Lowest / 最低 log₁₀ S</span><strong>${fmt(minV, 3)}</strong></div>
            <div class="batch-stat"><span>Observed / 已有实测</span><strong>${obsCount} / ${items.length}</strong></div>
          </div>
          <div class="screen-toolbar">
            <div class="screen-filters">
              <button type="button" class="pill-btn ${state.screenFilter === 'all' ? 'active' : ''}" data-sfilter="all">All (${items.length})</button>
              <button type="button" class="pill-btn ${state.screenFilter === 'obs' ? 'active' : ''}" data-sfilter="obs">Observed (${obsCount})</button>
              <button type="button" class="pill-btn ${state.screenFilter === 'unobs' ? 'active' : ''}" data-sfilter="unobs">Unobserved (${items.length - obsCount})</button>
            </div>
            <div class="screen-filters">
              <button type="button" class="pill-btn ${state.screenSort === 'desc' ? 'active' : ''}" data-ssort="desc">High→Low ↓</button>
              <button type="button" class="pill-btn ${state.screenSort === 'asc' ? 'active' : ''}" data-ssort="asc">Low→High ↑</button>
            </div>
          </div>
          <div class="screen-list">
            ${sorted.map((x, idx) => {
              const pct = Math.max(4, ((x.log_solubility - minV) / span) * 100);
              return `<button type="button" class="screen-row" data-pick-solvent="${esc(x.solvent_id)}" title="Click to inspect in Point Prediction / 点击跳转单点预测">
                <span class="screen-rank">${idx + 1}</span>
                <span class="screen-name">${esc(x.name)}</span>
                <span class="screen-bar-track"><span class="screen-bar-fill ${x.pair_rows > 0 ? 'observed' : ''}" style="width:${pct}%"></span></span>
                <span class="screen-val">${fmt(x.log_solubility, 3)}</span>
                <span class="screen-badge ${x.pair_rows > 0 ? 'obs' : ''}">${x.pair_rows > 0 ? x.pair_rows + ' obs' : 'pred'}</span>
              </button>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="deck-split-col">
        <div class="card result-card">
          <div class="chart-header">
            <h3>Predicted log₁₀ S vs Solvent Lipophilicity (cLogP) / 溶解度与溶剂疏水常数相关性</h3>
            <span class="badge">${esc(label('drug', c.q.drug_id))} · T = ${c.q.temperature}°C · ${r.cached ? 'Cache Hit' : fmt(r.elapsed_ms, 1) + ' ms'}</span>
          </div>
          ${chart([
            {x: items.filter(x => x.pair_rows === 0 && x.mol_logp != null).map(x => x.mol_logp), y: items.filter(x => x.pair_rows === 0 && x.mol_logp != null).map(x => x.log_solubility), pointLabels: items.filter(x => x.pair_rows === 0 && x.mol_logp != null).map(x => x.name), label: 'Unobserved prediction / 虚拟筛选预测', kind: 'dots', color: '#2d8b76'},
            {x: items.filter(x => x.pair_rows > 0 && x.mol_logp != null).map(x => x.mol_logp), y: items.filter(x => x.pair_rows > 0 && x.mol_logp != null).map(x => x.log_solubility), pointLabels: items.filter(x => x.pair_rows > 0 && x.mol_logp != null).map(x => x.name + ' (' + x.pair_rows + ' obs)'), label: 'Observed in development / 开发集实测溶剂', kind: 'dots', color: '#d97706'}
          ], {xLabel: 'Solvent cLogP (Wildman-Crippen) / 溶剂疏水常数', yLabel: 'Predicted log₁₀ S', H: 190})}
          <div class="small-heading" style="margin-top:8px">49-Solvent Predicted log₁₀ S Distribution Histogram / 49种溶剂预测溶解度分布直方图</div>
          ${buildValueHistogram(vals, 10, {H: 115, color: '#34796e'})}
        </div>
      </div>
    </div>`;
  }

  function renderResult() {
    const c = state.current;
    if (!c) return;
    const {tab, q, r, evidence} = c;
    const e = evidence?.[0];
    checkOODWarning(e);
    let html = '';

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
              ${entries.map(([name, comp], idx) => `<div class="blend-bar-seg" style="width:${comp.weight * 100}%;background:${palette[idx % palette.length]}"></div>`).join('')}
            </div>
            <div class="blend-bar-labels">
              ${entries.map(([name, comp]) => `<span><strong>${esc(name)}</strong>: Weight ${fmt(comp.weight, 2)} (${fmt(comp.weight * 100, 0)}%)</span>`).join('')}
            </div>
          </div>
          <div class="decomp-equation">
            ${entries.map(([name, comp]) => `<div class="decomp-block">
              <span>${esc(name)} (${fmt(comp.weight * 100, 0)}%)</span>
              <strong>${fmt(comp.predictions[0], 4)}</strong>
              <small>Weighted: ${comp.contributions[0] >= 0 ? '+' : ''}${fmt(comp.contributions[0], 4)}</small>
            </div>`).join('<span class="decomp-operator">+</span>')}
            <span class="decomp-operator">=</span>
            <div class="decomp-block highlight">
              <span>Final Fusion ŷ / 融合预测</span>
              <strong>${fmt(r.log_solubility, 4)}</strong>
              <small>${correction != null ? `TabPFN Δ: ${correction >= 0 ? '+' : ''}${fmt(correction, 4)}` : 'Convex Blend'}</small>
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
            {x: observations.map(o => o.temperature), y: observations.map(o => o.log_solubility), label: `Dev Observations (${observations.length} rows) / 开发集实测点`, kind: 'dots', color: '#d97706'},
            {x: [r.temperature], y: [r.log_solubility], label: `Current Prediction (T=${r.temperature}°) / 当前预测点`, kind: 'dots', color: '#2d8b76', radius: 6}
          ], {xLabel: 'Temperature T (°C) / 温度 T', yLabel: 'log₁₀ S (mol/L)', H: 215})
        : `<div class="journal-empty">No development observations exist for <strong>${esc(label('drug', q.drug_id))} × ${esc(label('solvent', q.solvent_id))}</strong> (Cold pair / Unseen parent extrapolation).<br>开发集中暂无该药物-溶剂组合的实测记录（属于冷启动组合或未见母体外推预测）。</div>`;

      const latencyNote = r.cached ? `Cache Hit (${fmt(r.elapsed_ms, 2)} ms)` : `Latency: ${fmt(r.elapsed_ms, 1)} ms`;

      html = `<div class="deck-split-grid">
        <div class="deck-split-col">
          <div class="result-card">
            <div class="chart-header" style="flex-direction:row;justify-content:space-between;align-items:center">
              <h3>Point Prediction &amp; Model Decomposition<span class="heading-zh">单点预测与模型分解</span></h3>
              <div class="result-actions">
                <button type="button" class="button outline compact" data-export="csv">${icon('download')}CSV</button>
                <button type="button" class="button outline compact" data-export="report">${icon('file')}Report</button>
              </div>
            </div>
            <div class="prediction-grid">
              ${valueCard('Predicted log₁₀ S / 对数摩尔溶解度', fmt(r.log_solubility, 4), 'log₁₀(S / mol·L⁻¹) · ' + short(q.model_id))}
              ${valueCard('Molar Concentration S = 10ʸ / 物理摩尔浓度', r.concentration == null ? 'Out of range' : r.concentration.toPrecision(4), `mol/L · T = ${q.temperature} °C · ${latencyNote}`, true)}
            </div>
            ${decompHtml}
            ${modelBenchHtml}
          </div>
        </div>
        <div class="deck-split-col">
          <div class="card">
            <div class="chart-header" style="flex-direction:row;justify-content:space-between;align-items:center">
              <h3>Applicability Domain &amp; Data Support<span class="heading-zh">适用域预警与开发集实测支撑</span></h3>
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
    } else if (tab === 'screen') {
      html = renderScreenModule(c);
    } else if (tab === 'compare') {
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
        const winsA = r.group_errors.a.filter((v, i) => v < r.group_errors.b[i]).length;
        const totalP = r.group_errors.ids.length;
        const pColors = r.group_errors.a.map((v, i) => v < r.group_errors.b[i] ? '#2d8b76' : '#d97706');

        html = tabsBar + `<div class="deck-split-grid">
          <div class="deck-split-col">
            <div class="card result-card">
              <div class="chart-header">
                <h3>Shared 5×3 Nested CV Benchmark / 统一嵌套分组验证表现对比</h3>
                <span class="badge good">${esc(short(q.model_id))} wins on ${winsA} / ${totalP} unseen parents (${fmt(winsA / totalP * 100, 1)}%) · Parent MAE ${improvement >= 0 ? '−' : '+'}${fmt(Math.abs(improvement), 2)}%</span>
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
                {x: r.group_errors.a, y: r.group_errors.b, pointColors: pColors, pointLabels: r.group_errors.ids.map(pid => 'Parent ' + pid), label: `Teal: ${short(q.model_id)} lower MAE (${winsA}) · Amber: ${short(q.model_b)} lower (${totalP - winsA})`, kind: 'dots', color: '#2d8b76'}
              ], {xLabel: short(q.model_id) + ' Parent MAE', yLabel: short(q.model_b) + ' Parent MAE', identity: true, H: 255})}
            </div>
          </div>
        </div>`;
      } else {
        // flag a curve that does not react to temperature at all: it is a real
        // model property worth showing, not something to paper over
        const flatCurves = [r.curve_a, r.curve_b].filter(curve => {
          const v = curve.lines[0].values;
          return Math.max(...v) - Math.min(...v) < 1e-6;
        });
        const series = [r.curve_a, r.curve_b].map((curve, i) => ({
          x: curve.temperatures,
          y: transform(curve.lines[0].values),
          label: short(curve.model_id),
          color: palette[i]
        }));
        if (state.showObservations && e?.observations?.length) {
          series.push({
            x: e.observations.map(o => o.temperature),
            y: transform(e.observations.map(o => o.log_solubility)),
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
              ${chart(series, {yLabel: state.unit === 'raw' ? 'S = 10ʸ (mol/L)' : 'Predicted log₁₀ S', H: 250})}
              ${flatCurves.length ? `<p class="flat-curve-note">
                <strong>Temperature-insensitive model / 温度不敏感模型:</strong>
                ${flatCurves.map(c => esc(short(c.model_id))).join('、')} outputs the same value across the whole range.
                This is a property of the model, not the chart — its temperature term contributes nothing.
                / 该模型在整个温度区间输出恒定值，说明其温度项未起作用。
              </p>` : ''}
            </div>
          </div>
          <div class="deck-split-col">
            <div class="card result-card">
              <div class="chart-header">
                <h3>Response Difference Curve (B − A) / 模型响应差值曲线</h3>
                <span class="badge">${esc(short(q.model_b))} − ${esc(short(q.model_id))} · At T=${q.temperature}°: Δ = ${fmt(r.difference, 4)}</span>
              </div>
              ${chart([
                {x: r.curve_a.temperatures, y: r.curve_b.lines[0].values.map((v, i) => v - r.curve_a.lines[0].values[i]), label: `${short(q.model_b)} − ${short(q.model_id)} (log₁₀ S)`, color: '#d97706'}
              ], {yLabel: 'Difference B − A (log₁₀ S)', H: 250})}
            </div>
          </div>
        </div>`;
      }
    }

    const staleBanner = state.stale ? `<div class="stale-notice-bar">
      <span><strong>Parameters Modified / 实验参数已更改</strong> — Showing previous results. Click <strong>${esc(views[tab]?.[1] || 'Run')}</strong> on the left to execute new computation. / 当前显示上次计算结果，请点击左侧「运行」按钮重新计算。</span>
      <button type="button" class="button compact" id="stale-trigger-run">${icon('play')}<span>${esc(views[tab]?.[1] || 'Run / 运行')}</span></button>
    </div>` : '';

    $('output').innerHTML = staleBanner + html;
    window.StudioLanguage.normalize($('output'));
    attachChartInteractivity($('output'));
    bindResultActions();
    if ($('stale-trigger-run')) {
      $('stale-trigger-run').onclick = () => $('run').click();
    }
  }

  function bindResultActions() {
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
        persistCurrentInputs();
        syncFormVisibility();
        renderPendingOrCurrent();
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
        state.stale = true;
        switchView('predict');
      };
    });
    if (state.tab === 'compare' && (state.compareDeck === 'radar' || !state.current)) {
      bindRadarEvents($('output'), {
        onApplyPair: (pairA, pairB) => {
          $('model').value = pairA;
          updateModels();
          $('model-b').value = pairB;
          state.stale = true;
          toast('Selected model pair updated — click Run Comparison to compute / 已加载模型对，点击左侧运行对照即可计算');
        },
        onPersist: persistCurrentInputs,
        onToast: toast
      });
    }
  }

  function resultRows(tab, q, r) {
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

  function renderLoadingSkeleton() {
    return `<div class="card loading-card">
      <div class="loading-label"><span class="spinner"></span>Running inference &amp; checking applicability domain… / 正在执行模型推理并核验数据适用域…</div>
      <div class="skeleton big"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>`;
  }

  async function run(event) {
    event?.preventDefault();
    if (!state.catalog) return;
    let q;
    try { q = readConditions(); } catch (e) { $('error').textContent = e.message; return; }

    persistCurrentInputs();
    checkOODWarning();
    cancelRun();
    state.stale = false;
    const token = state.request, tab = state.tab, controller = new AbortController();
    state.controller = controller;
    $('run').disabled = true;
    window.StudioLanguage.btn($('run-label'), 'Computing… / 计算中…');
    $('error').textContent = '';
    $('output').setAttribute('aria-busy', 'true');

    if (tab === 'compare' && state.compareDeck === 'radar' && state.models.length) {
      const tabs = [
        {id: 'radar', en: '5D Evaluation Radar & Matrix', zh: '5维综合评价雷达与指标对照表'},
        {id: 'protocol', en: '128-Parent Paired CV Benchmark', zh: '128未见母体配对验证与胜率散点'},
        {id: 'curves', en: '61-Point Temperature Response', zh: '同条件61点连续变温响应与差值'}
      ];
      $('output').innerHTML = deckTabsBar('compareDeck', 'radar', tabs) + `<div class="deck-pane">${renderRadarComponent()}</div>`;
      window.StudioLanguage.normalize($('output'));
      bindRadarEvents($('output'), {
        onApplyPair: (pairA, pairB) => { $('model').value = pairA; updateModels(); $('model-b').value = pairB; run(); },
        onPersist: persistCurrentInputs,
        onToast: toast
      });
    } else {
      $('output').innerHTML = renderLoadingSkeleton();
    }

    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      if (tab === 'screen' && state.screenSubTab === 'ranking') {
        const r = await api('/api/screen', {model_id: q.model_id, drug_id: q.drug_id, temperature: q.temperature}, controller.signal);
        if (token !== state.request) return;
        state.current = {tab, q, r, evidence: [{domain: {status: 'screening'}}], time: new Date().toISOString(), rows: resultRows(tab, q, r)};
      } else if (tab === 'screen' && state.screenSubTab === 'explore') {
        const [r, evidence] = await Promise.all([
          api('/api/curve', q, controller.signal),
          Promise.all(q.solvent_ids.map(id => getEvidence(q.drug_id, id, q.temperature, controller.signal)))
        ]);
        if (token !== state.request) return;
        state.current = {tab, q, r, evidence, time: new Date().toISOString(), rows: resultRows(tab, q, r)};
      } else {
        const path = tab === 'predict' ? '/api/predict' : '/api/compare';
        const [r, evidence] = await Promise.all([
          api(path, q, controller.signal),
          Promise.all(q.solvent_ids.map(id => getEvidence(q.drug_id, id, q.temperature, controller.signal)))
        ]);
        if (token !== state.request) return;
        state.current = {tab, q, r, evidence, time: new Date().toISOString(), rows: resultRows(tab, q, r)};
      }
      state.resultsCache[getModeKey(tab)] = state.current;
      state.stale = false;
      state.unit = 'log';
      renderResult();
    } catch (e) {
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

  function exportCurrent(type) {
    const c = state.current;
    if (!c) return;
    if (type === 'csv') {
      downloadFile('\uFEFF' + csvText(c.rows), 'SOLAR_' + c.tab + '.csv', 'text/csv;charset=utf-8');
    } else {
      const copy = $('output').cloneNode(true);
      copy.querySelectorAll('button,.result-actions,.deck-tabs-bar').forEach(el => el.remove());
      const htmlDoc = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>SOLAR Experiment Report</title><body style="font:14px/1.6 system-ui,sans-serif;max-width:960px;margin:32px auto;padding:0 20px"><h1>SOLAR Studio · COMP6133 Experiment Report</h1><p>Drug: ${esc(label('drug', c.q.drug_id))} · Solvent: ${esc(label('solvent', c.q.solvent_id))} · T = ${c.q.temperature} · Model: ${esc(short(c.q.model_id))}</p>${copy.innerHTML}</body></html>`;
      downloadFile(htmlDoc, 'SOLAR_' + c.tab + '_report.html', 'text/html;charset=utf-8');
    }
    toast('Exported file downloaded / 导出文件已生成');
  }

  function batchExample() {
    const drug = state.catalog.drugs.find(x => x.name === 'Lovastatin') || state.catalog.drugs[0];
    const solvents = ['Acetone', 'Butyl Acetate', '1-Octanol', 'Ethanol'].map(n => state.catalog.solvents.find(x => x.name === n)).filter(Boolean);
    return 'drug,solvent,temperature\n' + solvents.flatMap(s => [25, 40].map(t => [csvCell(drug.name), csvCell(s.name), t].join(','))).join('\n');
  }

  async function runBatch() {
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
    } catch (e) {
      $('batch-error').textContent = e.message;
      return;
    }

    $('batch-run').disabled = true;
    $('batch-output').innerHTML = renderLoadingSkeleton();
    const model = $('batch-model').value;
    try {
      const r = await api('/api/batch', {model_id: model, rows});
      if (token !== state.batchRequest) return;
      const results = r.results.map((x, i) => ({...source[i], ...x, model: short(model), model_id: model}));
      const okVals = results.filter(x => x.status === 'ok').map(x => x.log_solubility).sort((a, b) => a - b);
      const bMean = okVals.length ? okVals.reduce((a, b) => a + b, 0) / okVals.length : null;
      const bMed = okVals.length ? okVals[Math.floor(okVals.length / 2)] : null;
      const summaryHtml = okVals.length ? `<div class="batch-summary">
        <div class="batch-stat"><span>Min log₁₀ S</span><strong>${fmt(okVals[0], 3)}</strong></div>
        <div class="batch-stat"><span>Median log₁₀ S</span><strong>${fmt(bMed, 3)}</strong></div>
        <div class="batch-stat"><span>Mean log₁₀ S</span><strong>${fmt(bMean, 3)}</strong></div>
        <div class="batch-stat"><span>Max log₁₀ S</span><strong>${fmt(okVals.at(-1), 3)}</strong></div>
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
              ${results.map(x => `<tr class="${x.status === 'error' ? 'batch-error-row' : ''}">
                <td>${x.row}</td>
                <td><strong>${esc(x.drug)}</strong></td>
                <td>${esc(x.solvent)}</td>
                <td>${esc(x.temperature)}</td>
                <td>${x.status === 'ok' ? fmt(x.log_solubility, 4) : '—'}</td>
                <td>${x.status === 'ok' && x.concentration != null ? x.concentration.toPrecision(4) : '—'}</td>
                <td>${x.status === 'ok' ? '<span class="badge good">OK</span>' : esc(x.error)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
      window.StudioLanguage.normalize($('batch-output'));
      $('batch-download').onclick = () => downloadFile('\uFEFF' + csvText(results), 'SOLAR_batch.csv', 'text/csv;charset=utf-8');
    } catch (e) {
      if (token === state.batchRequest) $('batch-error').textContent = e.message;
    } finally {
      if (token === state.batchRequest) $('batch-run').disabled = false;
    }
  }

  function bindUI() {
    $('conditions').onsubmit = run;
    document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => switchView(b.dataset.view));
    $('reset').onclick = () => {
      resetConditions();
      state.stale = true;
      persistCurrentInputs();
      renderPendingOrCurrent();
    };

    $('conditions').addEventListener('change', e => {
      if (['drug-search', 'solvent-search'].includes(e.target.id)) return;
      if (e.target.id === 'model') updateModels();
      if (['drug', 'solvent'].includes(e.target.id)) structures();
      if (e.target.id === 'temperature') $('temperature-slider').value = e.target.value;
      checkOODWarning();
      state.stale = true;
      persistCurrentInputs();
      renderPendingOrCurrent();
    });

    $('conditions').addEventListener('input', e => {
      if (e.target.id === 'temperature-slider') $('temperature').value = e.target.value;
      if (['temperature', 'temperature-slider', 'tmin', 'tmax'].includes(e.target.id)) {
        checkOODWarning();
        state.stale = true;
        renderPendingOrCurrent();
      }
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

  async function init() {
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
        ['Lovastatin', 'Acetone', 25],
        ['Erythritol', 'Acetone', 13.2],
        ['Lovastatin', 'Butyl Acetate', 25]
      ].map(([dn, sn, t]) => ({
        d: catalog.drugs.find(x => x.name.toLowerCase() === dn.toLowerCase()),
        s: catalog.solvents.find(x => x.name.toLowerCase() === sn.toLowerCase()),
        t
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
        checkOODWarning();
        state.stale = true;
        persistCurrentInputs();
        renderPendingOrCurrent();
      });

      $('solvent-chips').innerHTML = ['Acetone', 'Butyl Acetate', 'Ethyl ether', '1-Octanol']
        .map(n => catalog.solvents.find(s => s.name === n))
        .filter(Boolean)
        .map((s, idx) => `<label class="solvent-chip"><input type="checkbox" value="${esc(s.id)}" ${idx < 2 ? 'checked' : ''}>${esc(s.name)}</label>`)
        .join('');

      $('temperature-slider').min = catalog.temperature_min;
      $('temperature-slider').max = catalog.temperature_max;
      $('stat-mae').textContent = fmt(state.models.find(m => m.id === state.defaultModel)?.metrics.parent_macro_MAE, 4);

      bindUI();
      resetConditions();

      const saved = loadPersistedState();
      if (saved) {
        if (saved.model_id && state.models.some(m => m.id === saved.model_id)) $('model').value = saved.model_id;
        updateModels();
        if (saved.model_b && state.models.some(m => m.id === saved.model_b)) $('model-b').value = saved.model_b;
        if (saved.drug_id && catalog.drugs.some(d => d.id === saved.drug_id)) $('drug').value = saved.drug_id;
        if (saved.solvent_id && catalog.solvents.some(s => s.id === saved.solvent_id)) $('solvent').value = saved.solvent_id;
        if (Number.isFinite(saved.temperature)) {
          $('temperature').value = saved.temperature;
          $('temperature-slider').value = saved.temperature;
        }
        if (Number.isFinite(saved.tmin)) $('tmin').value = saved.tmin;
        if (Number.isFinite(saved.tmax)) $('tmax').value = saved.tmax;
        structures();
      }

      $('service-status').classList.add('ready');
      $('service-status').innerHTML = `<i></i>${state.models.length} models ready / 就绪`;
      switchView(state.tab || 'predict');
    } catch (e) {
      $('error').textContent = 'Init error: ' + e.message;
    }
  }

  init();
})();
