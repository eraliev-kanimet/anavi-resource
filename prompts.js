/**
 * Отметки о закрытых кадрах: что скопировано, то отмечено, и отметка переживает перезагрузку.
 *
 * Один скрипт на всю библиотеку. Своё у страницы только имя хранилища — <body data-key="…">;
 * без него отметки одного демо затирали бы отметки другого.
 */

const KEY = document.body.dataset.key;
let state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }

function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

// The old-fashioned path goes FIRST on purpose. This page lives in a sandboxed frame, where the
// async clipboard API is refused by permissions policy and its promise rejects; execCommand runs
// synchronously inside the click that triggered it and survives there.
function copyNow(text) {
  try {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.top = '0';
    box.style.left = '0';
    box.style.width = '1px';
    box.style.height = '1px';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.focus();
    box.select();
    box.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(box);
    return ok;
  } catch (e) {
    return false;
  }
}

function copy(text) {
  if (copyNow(text)) return Promise.resolve(true);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true, () => false);
  }
  return Promise.resolve(false);
}

// Neither path worked: hand the text over selected, so Ctrl+C still finishes the job.
function selectNode(el) {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) {}
}

function paint(row) {
  const id = row.dataset.id;
  const marks = state[id] || {};
  row.querySelectorAll('.acts button').forEach(b => {
    b.setAttribute('aria-pressed', marks[b.dataset.act] ? 'true' : 'false');
  });
  const done = Boolean(marks.prompt && marks.name);
  row.classList.toggle('done', done);
  // A frame that is no longer closed cannot stay opened by hand.
  if (!done) row.classList.remove('open');
}

function tally() {
  let done = 0;
  document.querySelectorAll('.row').forEach(r => { if (r.classList.contains('done')) done++; });
  const total = document.querySelectorAll('.row').length;
  document.getElementById('done').textContent = done;
  document.getElementById('meter').style.width = (done / total * 100) + '%';
  document.querySelectorAll('section').forEach(s => {
    const rows = s.querySelectorAll('.row');
    let n = 0;
    rows.forEach(r => { if (r.classList.contains('done')) n++; });
    s.querySelector('.sec-count').textContent = n + ' / ' + rows.length;
  });
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.acts button');
  if (!btn) return;
  const row = btn.closest('.row');
  const id = row.dataset.id;
  const act = btn.dataset.act;
  const text = act === 'prompt' ? row.querySelector('.prompt').textContent.trim() : row.dataset.name;
  const label = btn.dataset.label || btn.textContent;
  btn.dataset.label = label;
  copy(text).then(ok => {
    if (!ok) {
      row.classList.remove('done');
      // `.nm` and not `.file`: the folder and the extension are printed for reading and are not
      // part of the answer. Selecting the whole line handed over `products/x.png`, and the
      // generator names the file itself — its extension is whatever it decided to write.
      selectNode(act === 'prompt' ? row.querySelector('.prompt') : row.querySelector('.nm'));
      btn.textContent = 'Выделено — Ctrl+C';
      setTimeout(() => { btn.textContent = label; }, 2200);
      return;
    }
    state[id] = Object.assign({}, state[id], { [act]: true });
    save();
    paint(row);
    tally();
    filter();
    btn.textContent = 'Скопировано';
    setTimeout(() => { btn.textContent = label; }, 900);
  });
});

// Opening a closed frame is a click on the row itself. The buttons keep their own job, and a click
// inside the prompt is someone selecting the text, not asking for the row to shut.
document.addEventListener('click', e => {
  const row = e.target.closest('.row.done');
  if (!row || e.target.closest('.acts') || e.target.closest('.prompt')) return;
  row.classList.toggle('open');
});

const only = document.getElementById('only');
function filter() {
  const on = only.getAttribute('aria-pressed') === 'true';
  document.querySelectorAll('.row').forEach(r => {
    r.classList.toggle('hide', on && r.classList.contains('done'));
  });
}
only.addEventListener('click', () => {
  only.setAttribute('aria-pressed', only.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  filter();
});

const reset = document.getElementById('reset');
let armed = false;
reset.addEventListener('click', () => {
  if (!armed) {
    armed = true;
    reset.textContent = 'Точно сбросить?';
    setTimeout(() => { armed = false; reset.textContent = 'Сбросить'; }, 4000);
    return;
  }
  state = {};
  save();
  document.querySelectorAll('.row').forEach(paint);
  tally();
  filter();
  armed = false;
  reset.textContent = 'Сбросить';
});

document.querySelectorAll('.row').forEach(paint);
tally();
