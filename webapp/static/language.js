/* English-first bilingual heading rendering, shared by static and dynamic views. */
(() => {
  'use strict';
  const split = value => {
    const text = String(value ?? '');
    const boundary = text.indexOf(' / ');
    return boundary >= 0 && /[\u3400-\u9fff]/.test(text.slice(boundary + 3))
      ? [text.slice(0, boundary), text.slice(boundary + 3)] : [text, ''];
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
  function normalize(root = document) {
    root.querySelectorAll('h1,h2,h3,h4').forEach(el => {
      [...el.childNodes].forEach(node => {
        if (node.nodeType !== Node.TEXT_NODE || !split(node.textContent)[1]) return;
        const wrapper = document.createElement('span');
        wrapper.className = 'heading-copy';
        wrapper.innerHTML = html(node.textContent.trim());
        node.replaceWith(wrapper);
      });
    });
  }
  window.StudioLanguage = Object.freeze({heading, html, normalize});
  normalize();
})();
