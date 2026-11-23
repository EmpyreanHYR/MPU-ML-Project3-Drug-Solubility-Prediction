const deck = document.querySelector('#deck');
const slides = [...document.querySelectorAll('.slide')];
const mainCount = slides.filter(slide => !slide.classList.contains('backup')).length;
const contents = document.querySelector('#contents-dialog');
const zoom = document.querySelector('#zoom-dialog');
const video = document.querySelector('#demo-video');
const playDemo = document.querySelector('#play-demo');
const playbackMessage = document.querySelector('#demo-playback-message');
const previous = document.querySelector('#prev');
const next = document.querySelector('#next');
const progress = document.querySelector('#progress');
const fullscreen = document.querySelector('#fullscreen-button');
const pad = value => String(value).padStart(2, '0');
let active = 0;
let notesWindow;
let lastMain = 0;
let enteringVideoFullscreen = false;

function fitDeck() {
  const viewport = document.querySelector('.viewport');
  const scale = Math.min(viewport.clientWidth / 1280, viewport.clientHeight / 720);
  deck.style.setProperty('--scale', scale);
}

function showSlide(index, writeHash = true) {
  const main = index < mainCount;
  if (index !== active && slides[active].id === 'studio') {
    video.pause();
    exitVideoFullscreen();
  }
  slides[active].hidden = true;
  active = index;
  const slide = slides[active];
  slide.hidden = false;
  if (main) lastMain = active;

  const hash = '#' + slide.id;
  if (writeHash && location.hash !== hash) history.pushState(null, '', hash);
  const first = main ? 0 : mainCount;
  const total = main ? mainCount : slides.length - mainCount;
  const number = active - first + 1;
  previous.disabled = active === first;
  next.disabled = number === total;
  const label = (main ? '' : 'Q&A ') + pad(number) + ' / ' + total;
  document.querySelector('#page-count').textContent = label;
  progress.setAttribute('aria-valuemax', total);
  progress.setAttribute('aria-valuenow', number);
  progress.setAttribute('aria-valuetext', label);
  progress.firstElementChild.style.width = (number / total * 100) + '%';
  const source = document.querySelector('#slide-source');
  source.textContent = slide.dataset.source;
  source.href = 'assets/evidence/report-v2.pdf#page=' + slide.dataset.reportPage;
  [...contentsList.children].forEach((control, position) => {
    if (position === active) control.setAttribute('aria-current', 'page');
    else control.removeAttribute('aria-current');
  });
  sendNotes();
}

function step(direction) {
  const available = direction > 0 ? !next.disabled : !previous.disabled;
  if (available) showSlide(active + direction);
}

function followHash() {
  const index = slides.findIndex(slide => '#' + slide.id === location.hash);
  showSlide(index < 0 ? 0 : index, false);
}

function sendNotes() {
  if (notesWindow && !notesWindow.closed) {
    const slide = slides[active];
    notesWindow.postMessage({
      kind: 'solar-notes-slide',
      title: slide.dataset.title,
      notes: SOLAR_NOTES[slide.id] || null,
      position: document.querySelector('#page-count').textContent
    }, '*');
  }
}

function toggleNotes() {
  if (notesWindow && !notesWindow.closed) {
    notesWindow.close();
    notesWindow = null;
    return;
  }
  notesWindow = window.open('notes/presenter.html', 'solar-notes', 'popup,width=680,height=720,resizable=yes,scrollbars=yes');
}

window.addEventListener('message', event => {
  if (!notesWindow || event.source !== notesWindow) return;
  if (event.data === 'solar-notes-ready') sendNotes();
});

const contentsList = document.querySelector('#contents-list');
slides.forEach((slide, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.jump = slide.id;
  const label = index < mainCount ? pad(index + 1) : 'Backup ' + 'ABC'[index - mainCount];
  button.textContent = label + ' · ' + slide.dataset.title;
  if (index >= mainCount) button.classList.add('backup-entry');
  contentsList.append(button);
});

function showFigure(link) {
  const image = document.querySelector('#zoom-image');
  const caption = link.dataset.caption || link.closest('figure')?.querySelector('figcaption')?.textContent || 'Report figure';
  image.src = link.href;
  image.alt = link.querySelector('img')?.alt || caption;
  document.querySelector('#zoom-label').textContent = caption;
  zoom.showModal();
}

document.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const jump = event.target.closest('[data-jump]');
  if (jump) {
    const index = slides.findIndex(slide => slide.id === jump.dataset.jump);
    if (index >= 0) {
      event.preventDefault();
      if (contents.open) contents.close();
      showSlide(index);
    }
    return;
  }
  const link = event.target.closest('a.zoom');
  if (link) {
    event.preventDefault();
    showFigure(link);
  }
});

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    fullscreen.textContent = 'Use browser full screen';
  }
}

document.addEventListener('fullscreenchange', () => {
  fullscreen.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  fitDeck();
});

previous.onclick = () => step(-1);
next.onclick = () => step(1);
document.querySelector('#print-button').onclick = () => {
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  window.print();
};
fullscreen.onclick = toggleFullscreen;
document.querySelector('#contents-button').onclick = () => contents.showModal();
document.querySelector('#open-studio').onclick = () => video.pause();
function playRecording(start) {
  if (start !== undefined) video.currentTime = start;
  video.play().catch(error => {
    if (error.name !== 'AbortError') {
      playbackMessage.hidden = false;
      exitVideoFullscreen();
    }
  });
  enterVideoFullscreen();
}

async function enterVideoFullscreen() {
  if (!document.fullscreenEnabled || document.fullscreenElement === video || enteringVideoFullscreen) return;
  enteringVideoFullscreen = true;
  try {
    await video.requestFullscreen();
    if (video.ended || video.error || slides[active].id !== 'studio') exitVideoFullscreen();
  } catch {
    // Keep the inline controls when the browser disallows fullscreen.
  } finally {
    enteringVideoFullscreen = false;
  }
}

function exitVideoFullscreen() {
  if (document.fullscreenElement === video) document.exitFullscreen().catch(() => {});
}
playDemo.onclick = () => playRecording();
document.querySelectorAll('#studio button[data-start]').forEach(button => {
  button.onclick = () => playRecording(Number(button.dataset.start));
});
video.addEventListener('play', () => {
  enterVideoFullscreen();
  if (document.activeElement === playDemo) video.focus();
  playDemo.hidden = true;
  playbackMessage.hidden = true;
});
video.addEventListener('ended', () => {
  playDemo.hidden = false;
  exitVideoFullscreen();
});
video.addEventListener('error', () => {
  playbackMessage.hidden = false;
  exitVideoFullscreen();
});

document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
  const { key, target } = event;
  if (target.closest('input, textarea, select, video, .datum, [contenteditable="true"]')) return;
  if (key === ' ' && target.closest('button,a')) return;
  const actions = {
    ArrowLeft: () => step(-1),
    ArrowRight: () => step(1),
    ' ': () => step(event.shiftKey ? -1 : 1),
    Home: () => showSlide(0),
    End: () => showSlide(mainCount - 1),
    n: toggleNotes,
    f: toggleFullscreen,
    b: () => showSlide(active < mainCount ? mainCount : lastMain)
  };
  const action = key.length === 1 ? key.toLowerCase() : key;
  if (Object.hasOwn(actions, action)) {
    event.preventDefault();
    actions[action]();
  }
});

if (['/presentation/', '/presentation/index.html'].includes(location.pathname) &&
    ['127.0.0.1', 'localhost'].includes(location.hostname)) {
  document.querySelector('#open-studio').href = new URL('/', location.origin).href;
}
window.addEventListener('resize', fitDeck);
window.addEventListener('hashchange', followHash);
fitDeck();
followHash();
