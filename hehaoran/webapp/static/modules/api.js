/* SOLAR Studio v5.0 — Network API Client, Client-Side Cache & CSV Engine */
'use strict';
(() => {
  const {state} = window.SOLARStore;

  async function api(path, payload, signal) {
    const controller = signal ? null : new AbortController();
    const timer = controller ? setTimeout(() => controller.abort(), 90000) : null;
    try {
      const r = await fetch(path, {
        ...(payload ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)} : {}),
        signal: signal || controller.signal
      });
      let j;
      try {
        j = await r.json();
      } catch (_) {
        throw new Error('Invalid service response / 服务响应异常');
      }
      if (!r.ok) {
        const d = j.detail;
        throw new Error(
          typeof d === 'string'
            ? d
            : Array.isArray(d)
            ? 'Invalid input: ' + d.map(x => x.loc?.slice(1).join('.') + ' ' + x.msg).join('; ')
            : 'Request failed'
        );
      }
      return j;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function getMolProfile(id) {
    if (!id) return null;
    if (state.molCache[id]) return state.molCache[id];
    try {
      const p = await api('/api/molecule/' + encodeURIComponent(id));
      state.molCache[id] = p;
      return p;
    } catch (_) {
      return null;
    }
  }

  async function getEvidence(drugId, solventId, temperature, signal) {
    const key = `${drugId}|${solventId}|${Number(temperature).toFixed(4)}`;
    if (state.evidenceCache[key]) return state.evidenceCache[key];
    const res = await api('/api/evidence?' + new URLSearchParams({
      drug_id: drugId,
      solvent_id: solventId,
      temperature: String(temperature)
    }), null, signal);
    state.evidenceCache[key] = res;
    return res;
  }

  function csvCell(v) {
    if (v == null) return '""';
    let s = String(v);
    if (typeof s === 'string' && /^[=+@\t\r-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function csvText(rows) {
    const keys = [...new Set(rows.flatMap(Object.keys))];
    return keys.map(csvCell).join(',') + '\r\n' + rows.map(r => keys.map(k => csvCell(r[k])).join(',')).join('\r\n');
  }

  function downloadFile(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false, closed = false;
    const pushField = () => { row.push(field.trim()); field = ''; closed = false; };
    const pushRow = () => { pushField(); if (row.some(x => x !== '')) rows.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') { quoted = false; closed = true; }
        else field += ch;
      } else if (ch === '"') {
        if (field.trim() || closed) throw new Error('Invalid CSV quotation / CSV引号格式错误');
        field = ''; quoted = true;
      } else if (ch === ',') pushField();
      else if (ch === '\n') pushRow();
      else if (ch === '\r') { if (text[i + 1] === '\n') i++; pushRow(); }
      else {
        if (closed && ch.trim()) throw new Error('Delimiter must follow quote');
        field += ch;
      }
    }
    if (quoted) throw new Error('Unclosed quote in CSV');
    if (field || row.length) pushRow();
    if (rows.length < 2) throw new Error('Provide headers (drug,solvent,temperature) and at least 1 row');
    return rows;
  }

  window.SOLARApi = Object.freeze({
    api,
    getMolProfile,
    getEvidence,
    csvCell,
    csvText,
    downloadFile,
    parseCSV
  });
})();
