/* English-first bilingual heading and button rendering, shared by static and dynamic views. */
(() => {
  'use strict';
  const split = value => {
    const text = String(value ?? '').trim();
    const boundary = text.indexOf(' / ');
    return boundary >= 0 && /[\u3400-\u9fff]/.test(text.slice(boundary + 3))
      ? [text.slice(0, boundary).trim(), text.slice(boundary + 3).trim()] : [text, ''];
  };
  const escape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function html(value) {
    const [en, zh] = split(value);
    return `<span lang="en" class="heading-en">${escape(en)}</span>` +
      (zh ? `<span lang="zh-CN" class="heading-zh">${escape(zh)}</span>` : '');
  }

  function heading(element, value) {
    if (element) element.innerHTML = html(value);
  }

  function btnHtml(value, iconSvg = '', arrowSvg = '') {
    const [en, zh] = split(value);
    const textPart = zh
      ? `<span class="btn-stack"><span lang="en" class="btn-text-en">${escape(en)}</span><span lang="zh-CN" class="btn-text-zh">${escape(zh)}</span></span>`
      : `<span class="btn-stack"><span lang="en" class="btn-text-en">${escape(en)}</span></span>`;
    return (iconSvg ? iconSvg + ' ' : '') + textPart + (arrowSvg ? ' ' + arrowSvg : '');
  }

  function btn(element, value, iconSvg = '', arrowSvg = '') {
    if (element) element.innerHTML = btnHtml(value, iconSvg, arrowSvg);
  }

  function normalize(root = document) {
    // 1. Process headings h1-h4
    root.querySelectorAll('h1,h2,h3,h4').forEach(el => {
      [...el.childNodes].forEach(node => {
        if (node.nodeType !== Node.TEXT_NODE || !split(node.textContent)[1]) return;
        const wrapper = document.createElement('span');
        wrapper.className = 'heading-copy';
        wrapper.innerHTML = html(node.textContent.trim());
        node.replaceWith(wrapper);
      });
    });

    // 2. Process bilingual buttons: English on top, smaller Chinese below
    root.querySelectorAll('button, .button, .text-button, .mode-tabs button, .pill-btn, .chart-tools button').forEach(el => {
      // If already processed or specifically ignored
      if (el.querySelector('.btn-stack') || el.classList.contains('no-bilingual-split')) return;

      // Check if button text contains " / " with Chinese
      const textNodes = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
      if (!textNodes.length) return;

      const fullText = textNodes.map(n => n.textContent).join(' ').trim();
      const [en, zh] = split(fullText);
      if (!zh) return;

      // Replace text nodes with the stacked bilingual span, keeping icons/arrows intact
      textNodes.forEach((n, idx) => {
        if (idx === 0) {
          const stack = document.createElement('span');
          stack.className = 'btn-stack';
          stack.innerHTML = `<span lang="en" class="btn-text-en">${escape(en)}</span><span lang="zh-CN" class="btn-text-zh">${escape(zh)}</span>`;
          n.replaceWith(stack);
        } else {
          n.remove();
        }
      });
    });
  }

  window.StudioLanguage = Object.freeze({heading, html, btn, btnHtml, normalize, split});
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => normalize());
  } else {
    normalize();
  }
})();
