/* SOLAR Studio v5.0 — Visualization & Interactive Charting Engine (Radar, Curves, Scatter, Histograms) */
'use strict';
(() => {
  const {state, palette, getModelColor} = window.SOLARStore;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (v, n = 4) => Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v).toFixed(n) : '—';
  const short = id => (state.models.find(m => m.id === id)?.name || id).split(' / ')[0];

  const chartRegistry = new Map();
  let chartSeq = 0;

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

    const gridLabels = levels.map(frac =>
      `<text x="${cx + 5}" y="${(cy - frac * R + 3).toFixed(1)}" fill="#94a3b8" font-size="8.5" font-family="var(--mono)">${Math.round(frac * 100)}</text>`
    ).join('');

    const spokes = angles.map(th =>
      `<line x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(th)).toFixed(1)}" y2="${(cy + R * Math.sin(th)).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2" />`
    ).join('');

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

      const dots = pts.map((p, i) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${color}" stroke="#ffffff" stroke-width="1.5" class="radar-dot" data-model="${esc(id)}" data-axis="${i}" data-score="${p.s.score}" data-raw="${esc(p.s.formatted)}" data-name="${esc(short(id))}" data-label="${esc(p.s.labelEn)} (${esc(p.s.labelZh)})" />`
      ).join('');

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

  function axisText(value) {
    const text = String(value), i = text.indexOf(' / ');
    return i < 0 ? esc(text) : esc(text.slice(0, i)) + ` · ${esc(text.slice(i + 3))}`;
  }

  function chart(series, {xLabel = 'Temperature T (°C) / 温度 T', yLabel = 'log₁₀ S (mol/L)', identity = false, id = '', H = 235} = {}) {
    const valid = series.map(s => ({
      ...s,
      points: s.x.map((x, i) => [Number(x), Number(s.y[i]), s.pointLabels?.[i], s.pointColors?.[i]])
                 .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
    })).filter(s => s.points.length);
    const pts = valid.flatMap(s => s.points);
    if (!pts.length) return '<p class="chart-caption">No plottable values / 暂无可绘制数据</p>';

    let xmin = Math.min(...pts.map(p => p[0])), xmax = Math.max(...pts.map(p => p[0]));
    let ymin = Math.min(...pts.map(p => p[1])), ymax = Math.max(...pts.map(p => p[1]));
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

    let svg = `<svg class="plot" data-cid="${cid}" ${id ? 'id="' + esc(id) + '"' : ''} viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" style="font-family:system-ui,sans-serif"><rect width="${W}" height="${H}" fill="white"/>`;
    for (let i = 0; i <= 4; i++) {
      const y = ymin + (ymax - ymin) * i / 4, x = xmin + (xmax - xmin) * i / 4;
      svg += `<path d="M${L} ${Y(y)}H${W - R}" stroke="#eef2f3"/>` +
             `<text x="${L - 8}" y="${Y(y) + 3.5}" text-anchor="end" fill="#64748b" font-size="9.5">${tick(y)}</text>` +
             `<text x="${X(x)}" y="${H - B + 16}" text-anchor="middle" fill="#64748b" font-size="9.5">${x.toFixed(1)}</text>`;
    }
    if (identity) svg += `<path d="M${X(0)} ${Y(0)}L${X(xmax)} ${Y(ymax)}" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4 4"/>`;
    valid.forEach((s, j) => {
      const c = s.color || palette[j % palette.length];
      if (s.kind !== 'dots') {
        svg += `<polyline fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round" points="${s.points.map(p => X(p[0]) + ',' + Y(p[1])).join(' ')}"/>`;
      }
      s.points.forEach(p => {
        const pc = p[3] || c;
        const r = s.radius || (s.kind === 'dots' ? 4.2 : 3.2);
        svg += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${r}" fill="${pc}" stroke="${s.kind === 'dots' ? '#fff' : 'none'}" stroke-width="1" opacity="${s.kind === 'dots' ? '0.88' : '0'}"><title>${esc(p[2] || s.label)} · X=${fmt(p[0], 2)} · Y=${fmt(p[1], 4)}</title></circle>`;
      });
    });
    svg += `<line class="chart-crosshair" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="#34796e" stroke-width="1" stroke-dasharray="3 3" opacity="0"/><g class="chart-highlights"></g>`;
    svg += `<text x="${(L + W - R) / 2}" y="${H - 10}" text-anchor="middle" font-size="10" fill="#475569">${axisText(xLabel)}</text>` +
           `<text transform="translate(14 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" font-size="10" fill="#475569">${axisText(yLabel)}</text></svg>`;
    return `<div class="chart-wrap">${svg}<div class="chart-tooltip" hidden></div></div>` +
           `<div class="legend">${valid.map((s, j) => `<span><i class="${s.kind === 'dots' ? 'dot' : ''}" style="background:${s.color || palette[j % palette.length]}"></i>${esc(s.label)}</span>`).join('')}</div>`;
  }

  function histogram(bins, {H = 145, color = '#76a897'} = {}) {
    const max = Math.max(...bins.map(b => b.count), 1), W = 520, L = 34, B = 24, T = 16, bw = (W - L - 12) / bins.length;
    return `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" xmlns="http://www.w3.org/2000/svg">` +
      bins.map((b, i) => {
        const h = b.count / max * (H - B - T);
        return `<rect x="${L + i * bw + 2}" y="${H - B - h}" width="${bw - 4}" height="${h}" rx="2.5" fill="${color}"><title>${fmt(b.min, 2)} ~ ${fmt(b.max, 2)}: ${b.count}</title></rect>` +
               `<text x="${L + (i + 0.5) * bw}" y="${H - B - h - 4}" font-size="8.5" fill="#475569" text-anchor="middle">${b.count}</text>` +
               (i % 2 === 0 ? `<text x="${L + i * bw}" y="${H - 7}" font-size="8.5" fill="#64748b" text-anchor="middle">${fmt(b.min, 1)}</text>` : '');
      }).join('') +
      `<path d="M${L} ${H - B}H${W - 10}" stroke="#cbd5e1"/></svg>`;
  }

  function buildValueHistogram(values, numBins = 10, opts = {}) {
    if (!values || !values.length) return '';
    const mn = Math.min(...values), mx = Math.max(...values);
    const span = Math.max(mx - mn, 1e-4), bw = span / numBins;
    const bins = Array.from({length: numBins}, (_, k) => ({
      min: mn + k * bw,
      max: mn + (k + 1) * bw,
      count: 0
    }));
    values.forEach(v => {
      const idx = Math.min(numBins - 1, Math.max(0, Math.floor((v - mn) / bw)));
      bins[idx].count++;
    });
    return histogram(bins, opts);
  }

  function attachChartInteractivity(root = document) {
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
        const title = hits[0].p[2] ? esc(hits[0].p[2]) : (identity ? `X = ${fmt(hits[0].p[0], 3)}` : `T = ${fmt(hits[0].p[0], 2)}`);
        tip.innerHTML = `<div class="tt-title">${title}</div>` +
          hits.map(h => `<div class="tt-row"><span><i class="tt-dot" style="background:${h.c}"></i>${esc(h.s.label.split(' / ')[0])}</span><strong>${fmt(h.p[1], 4)}</strong></div>`).join('');
        tip.hidden = false;
        const px = (e.clientX - rect.left) + 12, py = (e.clientY - rect.top) - 10;
        tip.style.left = Math.min(px, rect.width - tip.offsetWidth - 6) + 'px';
        tip.style.top = Math.max(4, Math.min(py, rect.height - tip.offsetHeight - 4)) + 'px';
      });
      svg.addEventListener('mouseleave', () => { tip.hidden = true; cross.setAttribute('opacity', '0'); hi.innerHTML = ''; });
    });
  }

  function buildRadarMatrixHTML(selectedIds) {
    const {MODEL_TAKEAWAYS} = window.SOLARStore;
    if (!selectedIds || selectedIds.length === 0) {
      return `<div class="radar-empty-hint">Select at least 1 model above / 请在上方勾选至少 1 个模型</div>`;
    }
    const allRanked = [...state.models].sort((a, b) => (a.metrics?.parent_macro_MAE || 99) - (b.metrics?.parent_macro_MAE || 99));
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
              <td><span class="badge ${rank === 1 ? 'good' : ''}">#${rank}</span></td>
              <td><span class="radar-chip-dot" style="background:${color};display:inline-block;margin-right:5px"></span><strong>${esc(short(m.id))}</strong></td>
              <td class="${met.parent_macro_MAE === bestParent ? 'cell-best' : ''}">${fmt(met.parent_macro_MAE, 4)}</td>
              <td class="${met.MAE === bestMAE ? 'cell-best' : ''}">${fmt(met.MAE, 4)}</td>
              <td class="${met.RMSE === bestRMSE ? 'cell-best' : ''}">${fmt(met.RMSE, 4)}</td>
              <td class="${met.R2 === bestR2 ? 'cell-best' : ''}">${fmt(met.R2, 4)}</td>
              <td class="${met.inference_ms_per_row === bestSpeed ? 'cell-best' : ''}">${spd}</td>
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
    const selectedIds = state.radarSelected || [state.defaultModel, state.comparator];
    const sortedModels = [...state.models].sort((a, b) => (a.metrics?.parent_macro_MAE || 99) - (b.metrics?.parent_macro_MAE || 99));

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
        <span class="badge" id="radar-count-badge" style="margin-left:auto">${selectedIds.length} / ${state.models.length} selected</span>
      </div>

      <div class="radar-chips-bar">
        <div class="radar-chips-container" id="radar-chips-container">
          ${sortedModels.map((m, idx) => {
            const isAct = selectedIds.includes(m.id);
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
          <div class="radar-svg-wrapper" id="radar-svg-wrapper">${buildRadarSVG(selectedIds)}</div>
          <div class="radar-tooltip" id="radar-tooltip"></div>
          <div class="radar-axis-guide">
            <span>Normalized 0–100 scale (outer ring = best) · 5×3 Nested Parent-Grouped CV</span>
          </div>
        </div>
        <div class="radar-matrix-panel" id="radar-matrix-panel">
          ${buildRadarMatrixHTML(selectedIds)}
        </div>
      </div>
    </div>`;
  }

  function bindRadarEvents(container, {onApplyPair, onPersist, onToast} = {}) {
    const root = container?.querySelector('#radar-comparison-card') || container;
    if (!root) return;

    function updateRadarDisplay() {
      onPersist?.();
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
          else onToast?.('Keep at least 1 model selected / 请至少保留 1 个模型');
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
        const mEl = document.getElementById('model'), mbEl = document.getElementById('model-b');
        if (preset === 'pair') state.radarSelected = [mEl?.value || state.defaultModel, mbEl?.value || state.comparator];
        else if (preset === 'top3') state.radarSelected = ['TabPFN_ExtraTreesBlend', 'TabPFN_TwoTreeBlend', 'AdaptiveHybrid'];
        else if (preset === 'arch4') state.radarSelected = ['TabPFN_ExtraTreesBlend', 'AdaptiveHybrid', 'ExtraTrees', 'TabM'];
        else if (preset === 'tree_vs_nn') state.radarSelected = ['TabPFN_ExtraTreesBlend', 'ExtraTrees', 'RandomForest', 'TabM', 'RealMLP'];
        else if (preset === 'all') state.radarSelected = state.models.map(m => m.id);
        updateRadarDisplay();
      };
    });

    function bindMatrixActions() {
      root.querySelectorAll('.radar-apply-compare-btn').forEach(btn => {
        btn.onclick = () => {
          const {pairA, pairB} = btn.dataset;
          if (pairA && pairB) onApplyPair?.(pairA, pairB);
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

  window.SOLARCharts = Object.freeze({
    RADAR_AXES,
    computeModelRadarScores,
    buildRadarSVG,
    buildRadarMatrixHTML,
    renderRadarComponent,
    bindRadarEvents,
    chart,
    histogram,
    buildValueHistogram,
    attachChartInteractivity
  });
})();
