window.addEventListener('message', event => {
  if (event.source !== window.opener || event.data?.kind !== 'solar-notes-slide') return;
  const { position, title, notes } = event.data;
  document.querySelector('#position').textContent = position;
  document.querySelector('#title').textContent = title;
  document.querySelector('#duration').textContent = notes ? '建议时间 ' + notes.time : '';
  document.querySelector('#notes').textContent = notes?.body || '答疑备用页。数字出处见汇报页脚与 source-map.md。';
});
window.opener?.postMessage('solar-notes-ready', '*');
