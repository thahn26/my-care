// 케어 › 피부: 내 맞춤 요일별 루틴(아침·점심·저녁) + 오늘 피부 고민 + 피코·레티놀 일정 + 화장대 + 살 것 + 디바이스
// 내 제품·루틴·규칙 데이터는 data/my-skin.js
const SKIN_TODAY = Object.keys(MY_TODAY);
const COS_CATS = ['클렌징오일', '클렌저', '토너·에센스', '세럼·앰플', '크림', '아이크림', '선크림', '베이스', '각질제거', '마스크팩', '바디', '두피', '디바이스', '기타'];
const CAT_ART = { 클렌징오일: 'pump', 클렌저: 'tube', '토너·에센스': 'bottle', '세럼·앰플': 'dropper', 크림: 'jar', 아이크림: 'tube', 선크림: 'tube', 베이스: 'foundation', 각질제거: 'padjar', 마스크팩: 'sheet', 바디: 'pump', 두피: 'pump', 디바이스: 'wand', 기타: 'bottle' };
const COS_PALETTE = ['#f7b3c6', '#a8d8ef', '#bfe3a4', '#f5e3b0', '#dccdf3', '#f8c99b', '#9fded0', '#f3d9df'];
const COS_ACTIVES = ['비타민C', '나이아신아마이드', '알부틴', '트라넥삼산', '레티놀', '아데노신', '펩타이드', 'AHA', 'BHA', 'PHA', '우레아', '히알루론산', '세라마이드', '시카', '판테놀'];
const COS_FUNCS = ['미백', '주름개선', '자외선차단'];
const WD_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
const TIMES = [['am', '🌅 아침'], ['noon', '☀️ 점심'], ['pm', '🌙 저녁']];
const TK = TIMES.map(t => t[0]);
const hasTag = (st, ...tags) => (st.tags || []).some(t => tags.includes(t));

// 개봉 후 권장 사용 기간(개월) — 비타민C·레티놀은 산화가 빨라 6개월
function paoMonths(p) {
  if ((p.actives || []).some(a => a === '비타민C' || a === '레티놀')) return 6;
  return p.cat === '아이크림' ? 6 : 12;
}

// ── 데이터 ──
function skinData() {
  if (!db.skin) db.skin = { concerns: [], routine: null, products: [], log: {} };
  const s = db.skin;
  s.pico = s.pico || []; s.buy = s.buy || {}; s.devLog = s.devLog || {};
  if (!s.myV) {
    for (const p of s.products) if (p.cat === '토너') p.cat = '토너·에센스';
    installMine(s); save();
  }
  return s;
}
function skinLog(k) { const s = skinData(); return s.log[k] || (s.log[k] = { concerns: null, checks: {} }); }

// 내 화장품을 화장대에 넣고 내 루틴으로 바꾸기 (처음 한 번)
function installMine(s) {
  for (const c of MY_COS) {
    if (s.products.some(x => x.id === 'my-' + c.sid || normName(x.name) === normName(c.name))) continue;
    s.products.push({ id: 'my-' + c.sid, sid: c.sid, name: c.name, cat: c.cat, actives: c.actives || [], funcs: c.funcs || [], status: '사용중', opened: '', pao: '', exp: '', staple: false, added: today(), art: c.art, color: c.c, cap: c.k || '', note: c.note || '', rest: !!c.rest });
  }
  s.myV = 1;
  s.routine = myRoutine();
}
function seedId(sid) {
  const ps = (db.skin || {}).products || [];
  const p = ps.find(x => x.id === 'my-' + sid) || ps.find(x => x.sid === sid);
  return p ? p.id : null;
}
function myRoutine() {
  const mk = (st) => ({ id: uid(), key: st.key, name: st.name, short: st.short || '', cat: st.cat || '', days: st.days || null, productId: st.p ? seedId(st.p) : null, how: st.how || '', opt: !!st.opt, tags: st.tags || [], retinol: !!st.retinol });
  return Object.fromEntries(TK.map(t => [t, MY_ROUTINE[t].map(mk)]));
}

// ── 피코·레티놀 일정 ──
function picoInfo(k) {
  const s = skinData(), skip = new Map(), add = { am: [], noon: [], pm: [] };
  let main = null;
  for (const p of s.pico) {
    const d = diffDays(k, p), hit = PICO_RULES.filter(R => d >= R.from && d <= R.to);
    if (!hit.length) continue;
    for (const R of hit) {
      for (const t of R.skip) if (!skip.has(t)) skip.set(t, R.label);
      for (const t of TK) add[t].push(...((R.add || {})[t] || []).map(a => ({ ...a, added: R.label })));
    }
    if (!main || Math.abs(d) < Math.abs(main.d)) main = { d, date: p, label: hit[0].label, tips: hit.map(R => R.tip) };
  }
  return main ? { ...main, skip, add } : null;
}
function retinolDays(k) {
  const st = skinData().retinolStart;
  if (!st || k < st) return null;
  const w = Math.floor(diffDays(k, st) / 7);
  return w < 2 ? [0] : w < 4 ? [0, 4] : [0, 2, 4];
}
function retinolPlan() {
  const st = skinData().retinolStart;
  if (!st) return null;
  const days = retinolDays(today()) || [0];
  return { week: Math.max(1, Math.floor(diffDays(today(), st) / 7) + 1), text: days.map(d => WD_SHORT[d]).join('·') + `요일 (주 ${days.length}회)` };
}

// ── 그날 실제 루틴 (요일 + 피코 일정 + 레티놀 + 오늘 고민) ──
function routineFor(k) {
  const s = skinData(), wd = parse(k).getDay(), day = s.log[k] || {};
  const con = (day.concerns || []).filter(c => MY_TODAY[c]);
  const pico = picoInfo(k), rdays = retinolDays(k);
  const skipT = new Map(pico ? pico.skip : []), skipK = new Map();
  for (const c of con) {
    for (const t of MY_TODAY[c].skip || []) if (!skipT.has(t)) skipT.set(t, c);
    for (const key of MY_TODAY[c].skipKeys || []) skipK.set(key, c);
  }
  const why = (st) => skipK.get(st.key) || (st.tags || []).map(t => skipT.get(t)).find(Boolean) || null;
  const out = {};
  for (const t of TK) {
    out[t] = (s.routine[t] || [])
      .filter(st => st.retinol ? !!rdays && rdays.includes(wd) : (!st.days || st.days.includes(wd)))
      .map(st => ({ ...st, skipped: why(st) }));
  }
  // 레티놀 하는 밤엔 갈바닉·각질 제거를 쉬어요
  if (out.pm.some(x => !x.skipped && hasTag(x, 'retinol'))) for (const x of out.pm) if (!x.skipped && hasTag(x, 'galv', 'exfo')) x.skipped = '레티놀 하는 날';

  const adds = { am: [], noon: [], pm: [] };
  if (pico) for (const t of TK) adds[t].push(...pico.add[t]);
  for (const c of con) for (const t of TK) adds[t].push(...((MY_TODAY[c].add || {})[t] || []).map(a => ({ ...a, added: c })));
  for (const t of TK) {
    const list = out[t], keys = new Set(list.filter(x => !x.skipped).map(x => x.key));
    let exfoOn = list.some(x => !x.skipped && hasTag(x, 'exfo', 'retinol'));
    const exfoDay = list.some(x => !x.skipped && hasTag(x, 'exfo'));
    const mid = [], end = [], first = [];
    for (const a of adds[t]) {
      if (keys.has(a.key)) continue;
      if ((a.tags || []).some(g => skipT.has(g))) continue;
      if (hasTag(a, 'exfo')) { if (exfoOn) continue; exfoOn = true; }
      if (hasTag(a, 'mask') && exfoDay) continue;
      keys.add(a.key);
      const st = { id: 'd-' + a.key, key: a.key, name: a.name, cat: a.cat || '', productId: a.p ? seedId(a.p) : null, how: a.how || '', tags: a.tags || [], added: a.added };
      (a.first ? first : a.end ? end : mid).push(st);
    }
    const ci = list.findIndex(x => x.key === 'cream');
    list.splice(ci >= 0 ? ci : list.length, 0, ...mid);
    const bi = list.findIndex(x => x.key === 'body');
    list.splice(bi >= 0 ? bi : list.length, 0, ...end);
    list.unshift(...first);
  }
  return out;
}
function stepProduct(st) {
  const ps = skinData().products;
  if (st.productId) { const p = ps.find(x => x.id === st.productId); return p && p.status !== '다씀' ? p : null; }
  const use = ps.filter(p => p.status === '사용중' && !p.rest);
  if (hasTag(st, 'retinol')) return use.find(p => (p.actives || []).includes('레티놀')) || null;
  if (!st.cat) return null;
  const same = use.filter(p => p.cat === st.cat);
  const prefer = st.key === 'sunre' ? /스틱|쿠션/ : st.key === 'body' ? /로션|우레아|SA|크림/ : null;
  return (prefer && same.find(p => prefer.test(p.name))) || same[0] || null;
}
function skinProgress(k) {
  const r = routineFor(k), ch = skinLog(k).checks;
  const part = (t) => { const l = r[t].filter(x => !x.skipped && !x.opt); return { done: l.filter(x => ch[x.id]).length, total: l.length }; };
  return { am: part('am'), noon: part('noon'), pm: part('pm') };
}

// ── 성분 궁합 ──
function stepActives(st) {
  const a = new Set(stepProduct(st)?.actives || []);
  if (hasTag(st, 'retinol')) a.add('레티놀');
  return a;
}
function skinAlerts(k) {
  const r = routineFor(k), act = { am: new Set(), pm: new Set() };
  for (const t of ['am', 'pm']) for (const st of r[t]) if (!st.skipped) stepActives(st).forEach(a => act[t].add(a));
  const day = new Set([...act.am, ...act.pm]), out = [];
  const acid = (s) => s.has('AHA') || s.has('BHA');
  if (act.am.has('레티놀')) out.push(['warn', '레티놀은 빛에 약해요. 아침 말고 저녁에만 써 주세요.']);
  for (const t of ['am', 'pm']) if (act[t].has('레티놀') && act[t].has('비타민C')) out.push(['warn', `${t === 'am' ? '아침' : '저녁'}에 레티놀과 비타민C를 같이 써요. 비타민C는 아침, 레티놀은 저녁으로 나눠 주세요.`]);
  if (day.has('레티놀') && acid(day)) out.push(['warn', '레티놀 쓰는 날 각질 제거(AHA·BHA)까지 하면 자극이 커요. 둘 중 하나는 다른 날로 옮겨 주세요.']);
  const exfoPm = r.pm.some(x => !x.skipped && hasTag(x, 'exfo'));
  if (act.pm.has('레티놀') || exfoPm) {
    const hasSun = routineFor(addDays(k, 1)).am.some(st => !st.skipped && (st.key === 'sun' || st.cat === '선크림'));
    out.push([hasSun ? 'info' : 'warn', hasSun ? `오늘 저녁 ${act.pm.has('레티놀') ? '레티놀' : '각질 제거'} → 내일 아침 선크림 꼭, 점심 덧바르기까지.` : '저녁에 레티놀·각질 제거를 하는데 아침 루틴에 선크림이 없어요.']);
  }
  return out;
}

// ── 그림 ──
function cosArtSvg(p, cls = '') {
  const art = COS_ART[p.art] ? p.art : (CAT_ART[p.cat] || 'bottle');
  let h = 0; for (const ch of p.name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = p.color || COS_PALETTE[h % COS_PALETTE.length];
  return `<svg class="ca ${cls}" viewBox="0 0 80 80" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" style="--c:${esc(c)};--k:${esc(p.cap || '#f2f2f5')}" aria-hidden="true">${COS_ART[art]}</svg>`;
}

// ── 화면 ──
function renderCare() {
  const sub = ['today', 'vanity', 'buy'].includes(db.ui.skinTab) ? db.ui.skinTab : 'today';
  const s = skinData(), left = MY_BUY.filter(b => s.buy[b.id] !== 'done').length;
  return `<div class="seg care-seg">
      <button class="on">피부</button><button disabled>두피 · 준비 중</button><button disabled>치아 · 준비 중</button>
    </div>
    <div class="seg">
      <button class="${sub === 'today' ? 'on' : ''}" data-action="skinTab" data-v="today">루틴</button>
      <button class="${sub === 'vanity' ? 'on' : ''}" data-action="skinTab" data-v="vanity">화장대 ${s.products.filter(p => p.status !== '다씀').length || ''}</button>
      <button class="${sub === 'buy' ? 'on' : ''}" data-action="skinTab" data-v="buy">살 것 ${left || ''}</button>
    </div>
    ${sub === 'today' ? renderSkinToday() : sub === 'vanity' ? renderVanity() : renderBuy()}`;
}

// 루틴에서 보고 있는 날 (위 날짜를 바꾸면 그 날로)
function skinSel() { const u = db.ui.skinSel; return u && u.base === cur ? u.date : cur; }
function weekOf(k) { const st = addDays(k, -parse(k).getDay()); return [...Array(7)].map((_, i) => addDays(st, i)); }

function renderSkinToday() {
  const k = skinSel(), log = skinLog(k), r = routineFor(k), pg = skinProgress(k), alerts = skinAlerts(k);
  const canCheck = k <= today(), pico = picoInfo(k), week = weekOf(k), rp = retinolPlan();
  const askSel = db.ui.skinAskSel || [];
  const dayRow = `<div class="skin-days">${week.map(d => `<button class="${d === k ? 'on' : ''} ${d === today() ? 'today' : ''}" data-action="skinDay" data-date="${d}"><b>${WD_SHORT[parse(d).getDay()]}</b><span class="num">${parse(d).getDate()}</span>${picoInfo(d)?.d === 0 ? '<i class="pico-dot"></i>' : ''}</button>`).join('')}</div>`;
  const banner = pico ? `<section class="card pico-card"><div class="card-h"><h2>💉 ${esc(pico.label)}</h2><span class="meta">${pico.d === 0 ? '오늘' : pico.d < 0 ? `시술 D${pico.d}` : `시술 +${pico.d}일`}</span></div>${pico.tips.map(t => `<p class="small" style="margin:0 0 4px">${esc(t)}</p>`).join('')}</section>` : '';
  const ask = log.concerns == null && k === today()
    ? `<section class="card ask-card"><div class="card-h"><h2>오늘 피부 고민 있어요?</h2></div>
        <p class="small muted" style="margin:0 0 10px">고르면 오늘 루틴을 바꿔 드려요. 없으면 내 루틴 그대로 가요.</p>
        <div class="chips">${SKIN_TODAY.map(c => `<button class="chip ${askSel.includes(c) ? 'on' : ''}" data-action="skinAskPick" data-v="${c}">${c}</button>`).join('')}</div>
        <div class="btn-row" style="margin-top:12px"><button class="btn" data-action="skinAskNone">없음</button><button class="btn primary" data-action="skinAskApply" ${askSel.length ? '' : 'disabled'}>오늘 루틴 바꾸기${askSel.length ? ` (${askSel.length})` : ''}</button></div>
      </section>`
    : log.concerns && log.concerns.length && !log.concerns.includes('없음')
      ? `<div class="today-concern"><span>오늘 고민: <b>${log.concerns.map(esc).join(', ')}</b></span>${k === today() ? '<button class="link small" data-action="skinAskReset">바꾸기</button>' : ''}</div>` : '';
  const list = (t) => { let n = 0; return r[t].map(st => {
    const p = stepProduct(st), on = !!log.checks[st.id];
    const num = st.skipped ? '–' : ++n;
    const tag = st.retinol ? `<span class="r-tag">${esc(rp ? rp.text : '')}</span>` : st.days ? `<span class="r-tag">${st.days.map(d => WD_SHORT[d]).join('·')}</span>` : '';
    return `<li><button class="skin-step ${on ? 'on' : ''} ${st.skipped ? 'skipped' : ''}" data-action="skinCheck" data-id="${st.id}" data-date="${k}" ${st.skipped || !canCheck ? 'disabled' : ''}>
      <span class="check ${on ? 'on' : ''}">${CHECK_SVG}</span>
      <span class="info"><span class="name"><span class="st-no">${num}</span>${esc(st.name)} ${tag}${st.opt ? ' <span class="r-tag">선택</span>' : ''}${st.added ? ` <span class="r-tag calm">${esc(st.added)}</span>` : ''}</span>
      ${st.skipped ? `<span class="sub">오늘은 쉬어요 · ${esc(st.skipped)}</span>` : `
      <span class="st-prod">${p ? `${cosArtSvg(p, 'mini')}<span>${esc(p.name)}</span>` : st.cat ? `<span class="need">${esc(st.cat)} 없음 · 살 것 확인</span>` : ''}</span>
      ${st.how ? `<span class="st-how">${esc(st.how)}</span>` : ''}`}</span></button></li>`;
  }).join(''); };
  const sec = (t, label) => r[t].length ? `<section class="card"><div class="card-h"><h2>${label}</h2><span class="meta num">${pg[t].done}/${pg[t].total}</span></div><ul class="skin-list">${list(t)}</ul></section>` : '';
  const special = week.map(d => {
    const rr = routineFor(d), sp = [...rr.am, ...rr.pm].filter(st => (st.days || st.retinol) && !st.skipped);
    return `<button class="wk-day ${d === k ? 'sel' : ''}" data-action="skinDay" data-date="${d}"><b>${WD_SHORT[parse(d).getDay()]}</b>${picoInfo(d)?.d === 0 ? '<span class="pico">피코</span>' : ''}${sp.map(st => `<span>${esc(st.short || st.name.split(' — ')[0])}</span>`).join('') || '<span class="muted">기본</span>'}</button>`;
  }).join('');
  return `${dayRow}${banner}${ask}
    ${!canCheck ? `<p class="small muted" style="margin:0 4px 10px">${dateLabel(k)} 루틴 미리 보기예요. 체크는 그날 할 수 있어요.</p>` : ''}
    ${sec('am', '🌅 아침')}${sec('noon', '☀️ 점심')}${sec('pm', '🌙 저녁')}
    ${alerts.length ? `<section class="card"><div class="card-h"><h2>성분 궁합</h2></div>${alerts.map(([lv, m]) => `<p class="alert-line ${lv}">${lv === 'warn' ? '⚠️' : '💡'} ${esc(m)}</p>`).join('')}</section>` : ''}
    <section class="card"><div class="card-h"><h2>요일별 특별 케어</h2><button class="link small" data-action="skinEdit">루틴 편집</button></div><div class="wk-grid">${special}</div>
      <p class="small muted" style="margin:8px 0 0">각질 제거는 월·수·토 주 3번만, 사이사이 쉬는 날을 둬요. 요일을 누르면 그날 루틴을 볼 수 있어요.</p></section>
    ${renderSkinPlan()}`;
}

function renderSkinPlan() {
  const s = skinData(), rp = retinolPlan();
  const hasRet = s.products.some(p => p.status !== '다씀' && (p.actives || []).includes('레티놀'));
  return `<section class="card"><div class="card-h"><h2>💉 피코 토닝 일정</h2></div>
      ${s.pico.length ? `<ul class="plain-list">${[...s.pico].sort().map(d => { const n = diffDays(d, today()); return `<li><span>${dateLabel(d)}</span><span class="muted small">${n > 0 ? `D-${n}` : n === 0 ? '오늘' : `${-n}일 지남`}</span><button class="x-btn" data-action="picoDel" data-date="${d}" aria-label="피코 일정 삭제">×</button></li>`; }).join('')}</ul>` : ''}
      <div class="taste-add"><input id="picoDate" type="date" class="input" value="${addDays(today(), 7)}"><button class="btn sm" data-action="picoAdd">추가</button></div>
      <p class="small muted" style="margin:8px 0 0">날짜를 넣으면 시술 1주 전부터 2주 뒤까지 각질 제거·레티놀·디바이스를 자동으로 빼요. 회차마다 넣어 주세요.</p></section>
    <section class="card"><div class="card-h"><h2>🌙 레티놀</h2>${rp ? `<span class="meta">${rp.week}주차</span>` : ''}</div>
      ${rp ? `<p class="small" style="margin:0 0 8px">지금은 <b>${esc(rp.text)}</b> 저녁에 써요. 2주마다 하루씩 늘려요 (일 → 일·목 → 일·화·목). 각질이 일어나면 '오늘 피부 고민'에서 <b>각질·건조</b>를 눌러 그날은 쉬어요.</p>
        <button class="link small danger" data-action="retinolStop">레티놀 그만두기</button>`
      : `<p class="small" style="margin:0 0 8px">피코 회복(시술 후 2주)이 끝나고 시작해요.${hasRet ? '' : " 레티놀은 '살 것'에 있어요."}</p>
        <button class="btn sm block" data-action="retinolStart">오늘부터 레티놀 시작</button>`}
    </section>`;
}

// ── 화장대 ──
const VZ = {
  mirror: ['토너·에센스', '세럼·앰플', '아이크림'],
  top: ['크림', '선크림', '베이스'],
  clean: ['클렌징오일', '클렌저'],
  mask: ['각질제거', '마스크팩'],
  dev: ['디바이스'],
  bath: ['바디', '두피', '기타'],
};
function zoneOfCos(p) { for (const [z, cats] of Object.entries(VZ)) if (cats.includes(p.cat)) return z; return 'bath'; }
function todayProductIds() {
  const r = routineFor(today()), ids = new Set();
  for (const t of TK) for (const st of r[t]) if (!st.skipped && !st.opt) { const p = stepProduct(st); if (p) ids.add(p.id); }
  return ids;
}
// 화장대 그림 아래 이름: 브랜드 빼고 짧게
function shortCos(n) { const w = String(n).split(' '); return w.length > 1 ? w.slice(1).join(' ') : n; }
function cosChip(p, used) {
  const exp = cosExp(p), dd = exp ? dday(exp) : null;
  const badge = p.status === '재고' ? '<span class="fi-badge new">새것</span>'
    : p.rest ? '<span class="fi-badge rest">쉬는 중</span>'
    : dd && dd.n <= 30 ? `<span class="fi-badge ${dd.n < 0 ? 'red' : 'yellow'}">${dd.n < 0 ? '지남' : 'D-' + dd.n}</span>` : '';
  return `<button class="fi ci" data-action="cosOpen" data-id="${p.id}" aria-label="${esc(p.name)}">
    <span class="fi-art">${cosArtSvg(p)}</span><span class="fi-name">${esc(shortCos(p.name))}</span>${badge}${used.has(p.id) ? '<span class="ci-today" title="오늘 루틴에 써요"></span>' : ''}</button>`;
}

function renderVanity() {
  const s = skinData(), view = db.ui.vanityView || 'art';
  const live = s.products.filter(p => p.status !== '다씀');
  const noOpen = live.filter(p => p.status === '사용중' && !p.opened && p.cat !== '디바이스').length;
  return `<div class="row-between" style="margin-bottom:10px">
      <div class="seg" style="margin:0;padding:2px">
        <button class="${view === 'art' ? 'on' : ''}" data-action="vanityView" data-v="art" style="padding:6px 12px">화장대</button>
        <button class="${view === 'list' ? 'on' : ''}" data-action="vanityView" data-v="list" style="padding:6px 12px">목록</button>
      </div>
      <button class="btn sm skin-btn" data-action="cosOpen">＋ 화장품 넣기</button>
    </div>
    ${view === 'art' ? renderVanityArt(live) : renderCosmetics()}
    ${noOpen ? `<p class="small muted" style="margin:10px 4px 0">💡 개봉일을 모르는 제품이 ${noOpen}개 있어요. 눌러서 개봉일을 넣으면 버릴 날을 알려 줘요. 12개월이 지났거나 냄새·색이 변했으면 버려요.</p>` : ''}
    ${renderDevices()}`;
}
function renderVanityArt(live) {
  const used = todayProductIds();
  const by = (z) => live.filter(p => zoneOfCos(p) === z).sort((a, b) => COS_CATS.indexOf(a.cat) - COS_CATS.indexOf(b.cat));
  const items = (z, cat) => `${by(z).map(p => cosChip(p, used)).join('')}<button class="fi add" data-action="cosOpen" data-cat="${cat}" aria-label="여기에 화장품 넣기">＋</button>`;
  const drawer = (z, label, cat) => `<div class="drawer"><div class="dr-in"><div class="shelf-items">${items(z, cat)}</div></div><div class="dr-front"><span>${label}</span><i class="knob"></i></div></div>`;
  return `<div class="vanity">
    <div class="vn-mirror"><div class="vn-glass">
      <span class="vn-bulbs" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="vn-shine" aria-hidden="true"></span>
      <div class="shelf-items">${items('mirror', '세럼·앰플')}</div>
    </div><div class="vn-ledge">거울 선반 · 토너·세럼</div></div>
    <div class="vn-desk">
      <div class="vn-top"><div class="shelf-items">${items('top', '크림')}</div></div>
      <div class="vn-plank">크림 · 선크림 · 베이스</div>
      <div class="vn-cab">${drawer('clean', '클렌징', '클렌저')}${drawer('mask', '마스크 · 각질', '마스크팩')}${drawer('dev', '디바이스', '디바이스')}</div>
    </div>
    <div class="vn-feet" aria-hidden="true"><i></i><i></i></div>
    <div class="pantry bath"><div class="shelf-items">${items('bath', '바디')}</div><div class="plank"></div><span class="shelf-lbl">욕실 선반 · 바디 · 두피</span></div>
    <p class="small muted" style="text-align:center;margin:8px 0 0"><span class="ci-today inline"></span> 오늘 루틴에 쓰는 제품 · 누르면 수정·삭제</p>
  </div>`;
}

function renderCosmetics() {
  const ps = skinData().products;
  const using = ps.filter(p => p.status === '사용중').sort((a, b) => COS_CATS.indexOf(a.cat) - COS_CATS.indexOf(b.cat));
  const stock = ps.filter(p => p.status === '재고'), done = ps.filter(p => p.status === '다씀');
  const row = (p) => {
    const exp = cosExp(p), dd = exp ? dday(exp) : null;
    return `<button class="f-item cos-item" data-action="cosOpen" data-id="${p.id}">
      <span class="fi-art list">${cosArtSvg(p)}</span>
      <span class="info"><span class="name">${p.staple ? '★ ' : ''}${esc(p.name)}</span><span class="sub">${esc(p.cat)}${(p.actives || []).length ? ' · ' + p.actives.slice(0, 3).map(esc).join(', ') : ''}${(p.funcs || []).map(f => ` · <b>${esc(f)}</b>`).join('')}${p.rest ? ' · 쉬는 중' : ''}</span></span>
      ${p.status === '사용중' && dd ? `<span class="dday ${dd.n < 0 ? 'past' : dd.n <= 30 ? 'soon' : ''}">${dd.n < 0 ? '기한 지남' : `D-${dd.n}`}</span>` : p.status === '재고' ? '<span class="dday">미개봉</span>' : p.status === '사용중' && p.cat !== '디바이스' && !p.opened ? '<span class="dday">개봉일?</span>' : ''}
    </button>`;
  };
  return `<section class="card">${using.length ? using.map(row).join('') : '<p class="empty">쓰고 있는 화장품을 넣어 보세요</p>'}</section>
    ${stock.length ? `<div class="section-title">쟁여 둔 재고 ${stock.length}</div><section class="card">${stock.map(row).join('')}</section>` : ''}
    ${done.length ? `<button class="link small" data-action="cosShowDone" style="display:block;margin:4px">${db.ui.cosShowDone ? '▾' : '▸'} 다 쓴 화장품 ${done.length}</button>${db.ui.cosShowDone ? `<section class="card faded">${done.map(row).join('')}</section>` : ''}` : ''}
    <p class="small muted" style="margin:10px 4px 0">★ 상비 제품은 다 쓰면 장보기에 자동으로 들어가요. 개봉 후 기간: 기본 12개월, 아이크림·비타민C·레티놀 6개월.</p>`;
}
function cosExp(p) {
  if (p.cat === '디바이스') return '';
  if (p.status === '재고') return p.exp || '';
  if (!p.opened) return '';
  const d = parse(p.opened); d.setMonth(d.getMonth() + (+p.pao || paoMonths(p)));
  return fmt(d);
}

// ── 디바이스 ──
function deviceGuide(p) { return MY_DEVICES[p.sid] || null; }
function deviceWeek(p, k = today()) {
  const s = skinData();
  let plan = 0, used = 0, next = null;
  for (const d of weekOf(k)) {
    const r = routineFor(d), steps = [...r.am, ...r.pm].filter(st => !st.skipped && stepProduct(st)?.id === p.id);
    if (steps.length) { plan++; if (!next && d >= today()) next = d; }
    const ch = (s.log[d] || {}).checks || {};
    if (steps.some(st => ch[st.id]) || (s.devLog[p.id] || []).includes(d)) used++;
  }
  return { plan, used, next };
}
function renderDevices() {
  const s = skinData(), devs = s.products.filter(p => p.cat === '디바이스' && p.status !== '다씀');
  if (!devs.length) return '';
  return `<div class="section-title" style="margin-top:18px">내 디바이스 활용</div><section class="card">${devs.map(p => {
    const g = deviceGuide(p), w = deviceWeek(p), log = s.devLog[p.id] || [], last = log[log.length - 1];
    const status = g?.every ? (last ? `마지막 ${dateLabel(last)} · 다음 ${dday(addDays(last, g.every)).text}` : '아직 기록 없음')
      : `이번 주 ${w.used}/${w.plan}회${w.next ? ` · 다음 ${w.next === today() ? '오늘' : WD_SHORT[parse(w.next).getDay()] + '요일'}` : ''}`;
    return `<button class="f-item cos-item" data-action="devOpen" data-id="${p.id}"><span class="fi-art list">${cosArtSvg(p)}</span>
      <span class="info"><span class="name">${esc(p.name)}</span><span class="sub">${g ? esc(g.when) + ' · ' : ''}${esc(status)}</span></span><span class="chev">›</span></button>`;
  }).join('')}</section>`;
}
function openDevice(id) {
  const s = skinData(), p = s.products.find(x => x.id === id);
  if (!p) return;
  const panel = openSheet('', { onClose: () => render() });
  const draw = () => {
    const g = deviceGuide(p), w = deviceWeek(p), log = s.devLog[p.id] || [], last = log[log.length - 1];
    panel.innerHTML = sheetHeader(p.name, '<button class="link" data-x="edit">수정</button>') + `
      <div class="dev-hero">${cosArtSvg(p)}</div>
      ${g ? `<section class="card"><div class="card-h"><h2>언제</h2><span class="meta">${esc(g.when)}</span></div><p class="small" style="margin:0">${esc(g.good)}</p></section>
      <section class="card"><div class="card-h"><h2>이렇게 써요</h2></div><ol class="how-list">${g.how.map(h => `<li>${esc(h)}</li>`).join('')}</ol></section>
      <section class="card"><div class="card-h"><h2>이럴 땐 쉬어요</h2></div><ul class="how-list dont">${g.dont.map(h => `<li>${esc(h)}</li>`).join('')}</ul></section>`
      : `<section class="card"><p class="small" style="margin:0">${esc(p.note || '사용법 메모를 수정에서 적어 둘 수 있어요.')}</p></section>`}
      <section class="card"><div class="card-h"><h2>기록</h2><span class="meta">${g?.every ? '' : `이번 주 ${w.used}/${w.plan}회`}</span></div>
        <p class="small muted" style="margin:0 0 10px">${last ? `마지막 사용 ${dateLabel(last)}${g?.every ? ` · 다음은 ${dateLabel(addDays(last, g.every))}` : ''}` : '아직 기록이 없어요.'}${g && !g.every ? ' 루틴에서 체크해도 기록돼요.' : ''}</p>
        <button class="btn block ${log.includes(today()) ? '' : 'primary'}" data-x="used">${log.includes(today()) ? '오늘 기록 취소' : '오늘 썼어요'}</button></section>`;
  };
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'edit') { closeSheet(); setTimeout(() => openCosmetic(id), 320); }
    if (b.dataset.x === 'used') {
      const l = s.devLog[p.id] = s.devLog[p.id] || [], i = l.indexOf(today());
      i >= 0 ? l.splice(i, 1) : l.push(today()); l.sort();
      save(); draw(); if (i < 0) toast('기록했어요');
    }
  });
  draw();
}

// ── 살 것 ──
function shopLink([q, where]) {
  const url = where === 'oy' ? `https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=${encodeURIComponent(q)}` : `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`;
  return `<a class="reco-item" href="${url}" target="_blank" rel="noopener">🔍 ${esc(q)}<span>${where === 'oy' ? '올리브영' : '네이버쇼핑'}에서 보기 ›</span></a>`;
}
function renderBuy() {
  const s = skinData(), st = s.buy;
  const todo = MY_BUY.filter(b => st[b.id] !== 'done'), done = MY_BUY.filter(b => st[b.id] === 'done');
  const finished = s.products.filter(p => p.status === '다씀' && p.finished && diffDays(today(), p.finished) <= 30 && !s.products.some(q => q !== p && q.status !== '다씀' && q.cat === p.cat));
  return `${finished.length ? `<section class="card"><div class="card-h"><h2>최근 다 쓴 것</h2></div>${finished.map(p => `<div class="row-between small" style="padding:4px 0"><span>${esc(p.name)}</span><button class="link small" data-action="cosRebuy" data-id="${p.id}">장보기에 담기</button></div>`).join('')}</section>` : ''}
    ${todo.map((b, i) => `<section class="card buy-item">
      <div class="card-h"><h2>${i + 1}. ${esc(b.name)}</h2><span class="when-badge ${b.when === '지금' ? 'now' : ''}">${esc(b.when)}</span></div>
      <p class="small" style="margin:0 0 8px">${esc(b.why)}</p>
      <div class="reco-list">${b.picks.map(shopLink).join('')}</div>
      <div class="btn-row" style="margin-top:10px"><button class="btn sm" data-action="buyCart" data-id="${b.id}" ${st[b.id] === 'cart' ? 'disabled' : ''}>${st[b.id] === 'cart' ? '🛒 장보기에 있어요' : '🛒 장보기에 담기'}</button><button class="btn sm primary" data-action="buyDone" data-id="${b.id}">샀어요 → 화장대</button></div>
    </section>`).join('') || '<section class="card"><p class="empty">살 것을 다 샀어요 🎉</p></section>'}
    <section class="card"><div class="card-h"><h2>🙅 안 사도 되는 것</h2></div>${MY_NOBUY.map(([n, w]) => `<p class="small" style="margin:0 0 6px"><b>${esc(n)}</b> <span class="muted">— ${esc(w)}</span></p>`).join('')}</section>
    ${done.length ? `<div class="section-title">산 것 ${done.length}</div><section class="card faded">${done.map(b => `<div class="row-between small" style="padding:4px 0"><span>✓ ${esc(b.name)}</span><button class="link small" data-action="buyUndo" data-id="${b.id}">되돌리기</button></div>`).join('')}</section>` : ''}
    <p class="small muted" style="margin:6px 4px 0">검색은 쇼핑몰 사이트에서 열려요. 테스터로 먼저 확인하고 사는 걸 추천해요.</p>`;
}

// ── 버튼 처리 (app.js에서 넘겨받음) ──
function skinAction(a, b) {
  const s = skinData();
  switch (a) {
    case 'skinTab': db.ui.skinTab = b.dataset.v; save(); render(); return true;
    case 'skinDay': db.ui.skinSel = { base: cur, date: b.dataset.date }; render(); return true;
    case 'skinAskPick': { const v = b.dataset.v, l = db.ui.skinAskSel || []; db.ui.skinAskSel = l.includes(v) ? l.filter(x => x !== v) : [...l, v]; render(); return true; }
    case 'skinAskNone': skinLog(today()).concerns = ['없음']; db.ui.skinAskSel = []; save(); render(); toast('내 루틴 그대로 갈게요'); return true;
    case 'skinAskApply': skinLog(today()).concerns = [...(db.ui.skinAskSel || [])]; db.ui.skinAskSel = []; save(); render(); toast('오늘 고민에 맞게 루틴을 바꿨어요'); return true;
    case 'skinAskReset': db.ui.skinAskSel = [...(skinLog(today()).concerns || [])]; skinLog(today()).concerns = null; save(); render(); return true;
    case 'skinCheck': { const c = skinLog(b.dataset.date || cur).checks; c[b.dataset.id] ? delete c[b.dataset.id] : (c[b.dataset.id] = true); save(); render(); return true; }
    case 'skinEdit': openSkinEdit(); return true;
    case 'picoAdd': {
      const v = $('#picoDate')?.value;
      if (!v) { toast('날짜를 골라 주세요'); return true; }
      if (!s.pico.includes(v)) s.pico.push(v);
      s.pico.sort(); save(); render(); toast(`피코 ${dateLabel(v)}을 넣었어요. 전후 루틴이 자동으로 바뀌어요`); return true;
    }
    case 'picoDel': s.pico = s.pico.filter(d => d !== b.dataset.date); save(); render(); return true;
    case 'retinolStart': {
      const busy = picoInfo(today());
      ask('오늘부터 레티놀을 시작할까요?', `${busy ? `지금은 ${busy.label}이라 그 기간엔 자동으로 쉬어요. ` : ''}일요일 저녁 주 1회부터 시작해서 2주마다 늘려요.`, '시작하기').then(ok => {
        if (ok) { s.retinolStart = today(); save(); render(); toast('레티놀 일정을 넣었어요'); }
      });
      return true;
    }
    case 'retinolStop': ask('레티놀을 그만둘까요?', '루틴에서 레티놀 단계가 빠져요.', '그만두기', '취소', true).then(ok => { if (ok) { s.retinolStart = null; save(); render(); } }); return true;
    case 'vanityView': db.ui.vanityView = b.dataset.v; save(); render(); return true;
    case 'cosOpen': case 'cosEdit': {
      const p = b.dataset.id && s.products.find(x => x.id === b.dataset.id);
      if (p && p.cat === '디바이스') openDevice(p.id);
      else openCosmetic(b.dataset.id, b.dataset.cat ? { cat: b.dataset.cat } : null);
      return true;
    }
    case 'devOpen': openDevice(b.dataset.id); return true;
    case 'cosShowDone': db.ui.cosShowDone = !db.ui.cosShowDone; save(); render(); return true;
    case 'cosRebuy': { const p = s.products.find(x => x.id === b.dataset.id); if (p && addShopping(p.name, '화장품')) { save(); toast('장보기에 담았어요'); } else toast('이미 장보기에 있어요'); return true; }
    case 'buyCart': { const it = MY_BUY.find(x => x.id === b.dataset.id); addShopping(it.name, '화장품'); s.buy[it.id] = 'cart'; save(); render(); toast('장보기에 담았어요 (주방 › 장보기)'); return true; }
    case 'buyDone': {
      const it = MY_BUY.find(x => x.id === b.dataset.id);
      openCosmetic(null, { name: it.picks[0][0].replace(/ SPF50\+$/, ''), cat: it.cat, actives: [...(it.actives || [])] }, () => {
        s.buy[it.id] = 'done'; markBought(it.name);
      });
      return true;
    }
    case 'buyUndo': delete s.buy[b.dataset.id]; save(); render(); return true;
  }
  return false;
}

// ── 루틴 편집 ──
function openSkinEdit() {
  const s = skinData();
  const panel = openSheet('', { onClose: () => render() });
  const stepRow = (t, st, i) => `<div class="edit-step" data-t="${t}" data-i="${i}">
      <div class="row-between" style="gap:6px"><input class="input" data-f="name" value="${esc(st.name)}"><button class="x-btn" data-x="del" aria-label="단계 삭제">×</button></div>
      <div class="edit-sub">
        <select class="input" data-f="product"><option value="">제품: ${st.cat ? `${esc(st.cat)} 중 자동` : '없음'}</option>${s.products.filter(p => p.status !== '다씀').map(p => `<option value="${p.id}" ${st.productId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <textarea class="input" data-f="how" rows="2" placeholder="바르는 법 메모">${esc(st.how || '')}</textarea>
        ${st.retinol ? '<p class="small muted" style="margin:0">요일은 레티놀 시작일에 맞춰 자동으로 늘어나요.</p>' : `<div class="days"><button class="dchip ${!st.days ? 'on' : ''}" data-x="every">매일</button>${WD_SHORT.map((w, d) => `<button class="dchip ${st.days && st.days.includes(d) ? 'on' : ''}" data-x="day" data-d="${d}">${w}</button>`).join('')}</div>`}
      </div></div>`;
  const draw = () => {
    panel.innerHTML = sheetHeader('피부 루틴 편집', '<button class="link strong" data-x="close">완료</button>', '<span style="min-width:48px"></span>') + `
      ${TIMES.map(([t, label]) => `<section class="card"><div class="card-h"><h2>${label}</h2></div>
        ${(s.routine[t] || []).map((st, i) => stepRow(t, st, i)).join('')}
        <button class="btn block sm" data-x="add" data-t="${t}">＋ 단계 추가</button></section>`).join('')}
      <button class="btn block sm" data-x="reset">내 맞춤 루틴으로 되돌리기</button>
      <p class="small muted" style="margin:10px 4px 0">요일을 고르면 그날만 나와요. 제품을 비워 두면 같은 종류의 '사용 중' 화장품을 자동으로 보여 줘요. 피코 일정·오늘 고민에 따라 쉬는 건 앱이 알아서 해요.</p>`;
  };
  const stepOf = (el) => { const row = el.closest('.edit-step'); return row && s.routine[row.dataset.t][+row.dataset.i]; };
  panel.addEventListener('change', (e) => {
    const st = stepOf(e.target); if (!st) return;
    const f = e.target.dataset.f;
    if (f === 'name') st.name = e.target.value.trim() || st.name;
    if (f === 'how') st.how = e.target.value.trim();
    if (f === 'product') { st.productId = e.target.value || null; const p = s.products.find(x => x.id === st.productId); if (p) st.cat = p.cat; }
    save();
  });
  panel.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    const x = b.dataset.x, st = stepOf(b);
    if (x === 'close') return closeSheet();
    if (x === 'reset') {
      if (!(await ask('내 맞춤 루틴으로 되돌릴까요?', '편집한 내용은 사라지고 처음 추천한 요일별 루틴으로 돌아가요.', '되돌리기'))) return;
      s.routine = myRoutine(); save(); draw(); toast('내 맞춤 루틴으로 되돌렸어요');
    }
    else if (x === 'add') { const t = b.dataset.t; (s.routine[t] = s.routine[t] || []).push({ id: uid(), key: null, name: '새 단계', cat: '', days: null, tags: [] }); save(); draw(); }
    else if (x === 'del') { const row = b.closest('.edit-step'); s.routine[row.dataset.t].splice(+row.dataset.i, 1); save(); draw(); }
    else if (x === 'every') { st.days = null; save(); draw(); }
    else if (x === 'day') {
      const d = +b.dataset.d, days = st.days ? [...st.days] : [];
      const i = days.indexOf(d); i >= 0 ? days.splice(i, 1) : days.push(d);
      st.days = days.length && days.length < 7 ? days.sort() : null; save(); draw();
    }
  });
  draw();
}

// ── 화장품 넣기·수정 ──
function openCosmetic(id, preset, onSaved) {
  const s = skinData(), orig = id ? s.products.find(p => p.id === id) : null;
  const p = orig ? { ...orig, actives: [...(orig.actives || [])], funcs: [...(orig.funcs || [])] }
    : { name: '', cat: '토너·에센스', actives: [], funcs: [], status: '사용중', opened: today(), pao: '', exp: '', staple: false, note: '', ...(preset || {}) };
  const panel = openSheet('');
  const val = (sel) => { const el = panel.querySelector(sel); return el ? el.value : null; };
  const sync = () => {
    p.name = val('#cName').trim(); p.cat = val('#cCat');
    if (val('#cOpened') != null) p.opened = val('#cOpened');
    if (val('#cExp') != null) p.exp = val('#cExp');
    if (val('#cPao') != null) p.pao = val('#cPao');
    p.note = val('#cNote').trim(); p.staple = panel.querySelector('#cStaple').checked;
  };
  const draw = () => {
    const dev = p.cat === '디바이스';
    panel.innerHTML = sheetHeader(orig ? '화장품 수정' : '화장대에 넣기', '<button class="link strong" data-x="save">저장</button>', '<button class="link" data-x="close">취소</button>') + `
      <div class="dev-hero">${cosArtSvg(p)}</div>
      <label class="field"><span>이름</span><input id="cName" placeholder="예: OO 비타민C 세럼" value="${esc(p.name)}"></label>
      <label class="field"><span>종류 <span class="muted">(화장대 자리가 정해져요)</span></span><select id="cCat">${COS_CATS.map(c => `<option ${c === p.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      ${dev ? '' : `<div class="field"><span>주요 성분 <span class="muted">(용기 뒷면·제품명 참고, 여러 개)</span></span><div class="chips">${COS_ACTIVES.map(a => `<button class="chip ${p.actives.includes(a) ? 'on' : ''}" data-x="act" data-v="${a}">${a}</button>`).join('')}</div></div>
      <div class="field"><span>기능성 표시</span><div class="chips">${COS_FUNCS.map(f => `<button class="chip ${p.funcs.includes(f) ? 'on' : ''}" data-x="func" data-v="${f}">${f}</button>`).join('')}</div></div>
      <div class="field"><span>상태</span><div class="seg" style="margin:0">${['사용중', '재고'].map(v => `<button data-x="status" data-v="${v}" class="${p.status === v ? 'on' : ''}">${v === '사용중' ? '사용 중' : '재고 (미개봉)'}</button>`).join('')}</div></div>
      ${p.status === '재고'
        ? `<label class="field"><span>유통기한 <span class="muted">(포장에 적힌 날짜, 선택)</span></span><input id="cExp" type="date" value="${p.exp || ''}"></label>`
        : `<div class="two"><label class="field"><span>개봉일 <span class="muted">(모르면 비워 두기)</span></span><input id="cOpened" type="date" value="${p.opened || ''}"></label>
           <label class="field"><span>개봉 후 (개월)</span><input id="cPao" inputmode="numeric" placeholder="자동 ${paoMonths(p)}" value="${p.pao || ''}"></label></div>`}`}
      <label class="field"><span>메모 <span class="muted">(바르는 법·주의)</span></span><input id="cNote" value="${esc(p.note || '')}"></label>
      ${dev ? '<input id="cStaple" type="checkbox" hidden>' : `<label class="field" style="display:flex;align-items:center;gap:10px"><input id="cStaple" type="checkbox" ${p.staple ? 'checked' : ''} style="width:22px;height:22px;-webkit-appearance:auto;appearance:auto"><span style="margin:0;color:var(--text);font-size:15px">★ 상비 제품 <span class="muted small">(다 쓰면 자동으로 장보기에)</span></span></label>`}
      ${orig && orig.status !== '다씀' && !dev ? `<div class="btn-row"><button class="btn" data-x="used">✅ 다 썼어요</button>${orig.status === '재고' ? '<button class="btn" data-x="open">개봉하기</button>' : '<button class="btn" data-x="toss">🗑 기한 지나 버려요</button>'}</div>` : ''}
      ${orig ? '<button class="btn block danger sm" style="margin-top:8px" data-x="del">화장대에서 빼기 (삭제)</button>' : ''}`;
  };
  panel.addEventListener('change', (e) => { if (e.target.id === 'cCat') { sync(); if (!orig || !orig.sid) p.art = CAT_ART[p.cat]; draw(); } });
  panel.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    const x = b.dataset.x;
    if (x === 'close') return closeSheet();
    sync();
    if (x === 'act') { toggleIn(p.actives, b.dataset.v); draw(); }
    else if (x === 'func') { toggleIn(p.funcs, b.dataset.v); draw(); }
    else if (x === 'status') { p.status = b.dataset.v; draw(); }
    else if (x === 'save') {
      if (!p.name) return toast('이름을 적어 주세요');
      if (orig) Object.assign(orig, p); else s.products.push({ ...p, art: p.art || CAT_ART[p.cat], id: uid(), added: today() });
      onSaved && onSaved();
      save(); closeSheet(); render(); toast(orig ? '수정했어요' : '화장대에 넣었어요');
    }
    else if (x === 'open') { Object.assign(orig, p, { status: '사용중', opened: today() }); save(); closeSheet(); render(); toast('개봉했어요. 오늘부터 사용기한을 계산해요'); }
    else if (x === 'used' || x === 'toss') { Object.assign(orig, p); closeSheet(); cosFinished(orig, x === 'toss'); }
    else if (x === 'del') { if (!(await ask('화장대에서 뺄까요?', '이 제품을 쓰던 루틴 단계는 남고 제품만 비어요.', '빼기', '취소', true))) return; s.products = s.products.filter(v => v.id !== orig.id); save(); closeSheet(); render(); }
  });
  draw();
}
async function cosFinished(p, tossed) {
  const s = skinData();
  p.status = '다씀'; p.finished = today();
  save(); render();
  const spare = s.products.find(x => x.status === '재고' && x.cat === p.cat);
  if (spare && await ask(`재고로 있는 '${spare.name}'을(를) 개봉할까요?`, '오늘부터 사용기한을 계산해요.', '개봉하기', '나중에')) {
    spare.status = '사용중'; spare.opened = today();
    for (const t of TK) for (const st of s.routine[t] || []) if (st.productId === p.id) st.productId = spare.id;
    save(); render();
  }
  if (p.staple) { if (addShopping(p.name, '화장품')) toast(`상비 제품이라 ${p.name}을(를) 장보기에 담았어요`); return; }
  if (!spare) toast(tossed ? '버린 걸로 정리했어요' : '다 쓴 걸로 정리했어요', { label: '장보기에 담기', run: () => { addShopping(p.name, '화장품'); save(); render(); toast('장보기에 담았어요'); } });
}
