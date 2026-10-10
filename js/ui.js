// 공통 UI 도우미: 이스케이프, 토스트, 바텀시트, 확인창, 진행 막대, 사진 표시
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n0 = (v) => Math.round(+v || 0).toLocaleString('ko-KR');
const n1 = (v) => { const x = Math.round((+v || 0) * 10) / 10; return Number.isInteger(x) ? String(x) : x.toFixed(1); };
const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let toastTimer;
function toast(msg, action) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('show'); action.run(); };
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), action ? 4500 : 2400);
}

// ── 바텀시트 ──
let sheetCleanup = null;
function openSheet(html, { onClose } = {}) {
  const s = $('#sheet');
  s.innerHTML = `<div class="backdrop"></div><div class="panel">${html}</div>`;
  s.setAttribute('aria-hidden', 'false');
  // rAF로 미루면 그 사이에 닫힌 시트가 나중에 다시 열릴 수 있어 강제 리플로 후 바로 연다
  void s.offsetHeight;
  s.classList.add('open');
  s.querySelector('.backdrop').onclick = () => closeSheet();
  s.onclick = (e) => { if (e.target.closest('[data-x="close"]')) closeSheet(); };
  sheetCleanup = onClose || null;
  hydratePhotos(s);
  return s.querySelector('.panel');
}
function closeSheet() {
  const s = $('#sheet');
  if (!s.classList.contains('open')) return;
  s.classList.remove('open');
  s.setAttribute('aria-hidden', 'true');
  const fn = sheetCleanup; sheetCleanup = null;
  setTimeout(() => { if (!s.classList.contains('open')) s.innerHTML = ''; }, 300);
  fn && fn();
}
function sheetHeader(title, right = '', left = '<button class="link" data-x="close">닫기</button>') {
  return `<div class="sheet-h">${left}<h3>${esc(title)}</h3>${right || '<span style="min-width:48px"></span>'}</div>`;
}

// 확인창 (Promise<boolean>)
function ask(title, msg, yes = '확인', no = '취소', danger = false) {
  return new Promise(resolve => {
    const box = document.createElement('div');
    box.className = 'sheet open';
    box.style.zIndex = 70;
    box.innerHTML = `<div class="backdrop"></div><div class="panel" style="padding-top:20px">
      <h3 style="margin:0 0 6px;font-size:18px">${esc(title)}</h3>
      ${msg ? `<p class="muted" style="margin:0 0 18px">${esc(msg)}</p>` : ''}
      <div class="btn-row"><button class="btn" data-v="0">${esc(no)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-v="1">${esc(yes)}</button></div>
    </div>`;
    document.body.appendChild(box);
    const done = (v) => { box.remove(); resolve(v); };
    box.querySelector('.backdrop').onclick = () => done(false);
    box.querySelectorAll('[data-v]').forEach(b => b.onclick = () => done(b.dataset.v === '1'));
  });
}

// ── 진행 막대 ──
function goalBar({ label, value, goal, unit, color, mode = 'reach' }) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  const left = goal - value;
  let note;
  if (mode === 'limit') note = left >= 0 ? `${n0(left)}${unit} 남았어요` : `${n0(-left)}${unit} 넘었어요`;
  else note = left > 0 ? `${n0(left)}${unit} 더 먹으면 달성` : '목표 달성!';
  const over = mode === 'limit' && left < 0;
  return `<div class="goal">
    <div class="goal-top"><span class="lbl">${label}</span><span><b class="num">${n0(value)}</b><span class="of num"> / ${n0(goal)}${unit}</span></span></div>
    <div class="bar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="${label}"><i style="width:${pct}%;--c:${over ? 'var(--warn)' : color}"></i></div>
    <div class="goal-note ${over ? 'over' : ''}">${note}</div>
  </div>`;
}

// ── 사진 표시 (img[data-photo] 에 IndexedDB 사진 채우기) ──
async function hydratePhotos(root = document) {
  for (const img of $$('img[data-photo]', root)) {
    if (img.src) continue;
    const src = await photos.get(img.dataset.photo);
    if (src) img.src = src;
  }
}

// 파일 선택창 열기 → File[]
function pickImages({ multiple = false, capture = false } = {}) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = multiple;
    if (capture) inp.setAttribute('capture', 'environment');
    inp.className = 'vh';
    document.body.appendChild(inp);
    inp.onchange = () => { resolve([...inp.files]); inp.remove(); };
    inp.click();
  });
}

function loadingCard(msg) {
  return `<div class="card loading-card"><div class="spinner"></div><div>${esc(msg)}</div><div class="small">보통 10~30초 걸려요</div></div>`;
}
