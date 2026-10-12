// 케어 › 피부: 고민 맞춤 일주일 루틴 + 매일 '오늘 피부 고민' + 화장품 관리 + 성분 추천
const SKIN_CONCERNS = ['기미·칙칙함', '모공·유분', '주름·탄력', '요철·피부결'];
const SKIN_TODAY = ['기미·칙칙함', '모공·유분', '주름·탄력', '요철·피부결', '트러블', '건조·당김', '민감·붉은기'];
const COS_CATS = ['클렌징오일', '클렌저', '토너', '세럼·앰플', '크림', '아이크림', '선크림', '각질제거', '마스크팩', '기타'];
const COS_ICON = { 클렌징오일: '🫧', 클렌저: '🧼', 토너: '💧', '세럼·앰플': '🧪', 크림: '🫙', 아이크림: '👁️', 선크림: '☀️', 각질제거: '✨', 마스크팩: '🧖', 기타: '🧴' };
const COS_ACTIVES = ['비타민C', '나이아신아마이드', '알부틴', '트라넥삼산', '레티놀', '아데노신', '펩타이드', 'AHA', 'BHA', 'PHA', '히알루론산', '세라마이드', '시카', '판테놀'];
const COS_FUNCS = ['미백', '주름개선', '자외선차단'];
const WD_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

// 개봉 후 권장 사용 기간(개월) — 비타민C·레티놀은 산화가 빨라 6개월
function paoMonths(p) {
  if ((p.actives || []).some(a => a === '비타민C' || a === '레티놀')) return 6;
  return p.cat === '아이크림' ? 6 : 12;
}

// ── 추천 루틴 ──
// key는 '오늘 고민'에 따라 빼거나 더할 때 쓰는 이름표
function genRoutine(concerns) {
  const has = (c) => concerns.includes(c);
  const S = (key, name, cat, days = null) => ({ id: uid(), key, name, cat, days });
  const am = [S('wash', '약산성 클렌저로 세안', '클렌저'), S('toner', '토너', '토너')];
  if (has('기미·칙칙함')) am.push(S('vitc', '비타민C 세럼', '세럼·앰플'));
  if (has('모공·유분')) am.push(S('niacin', '나이아신아마이드 세럼', '세럼·앰플'));
  if (has('주름·탄력')) am.push(S('eye', '아이크림', '아이크림'));
  am.push(S('cream', has('모공·유분') ? '가벼운 수분 젤크림' : '수분크림', '크림'));
  am.push(S('sun', '선크림 (SPF50+ PA++++)', '선크림'));
  if (has('기미·칙칙함')) am.push(S('sunre', '점심에 선크림 덧바르기', '선크림'));

  const pm = [S('cleanse1', '1차 클렌징 (오일·워터)', '클렌징오일'), S('cleanse2', '2차 폼 클렌징', '클렌저'), S('toner', '토너', '토너')];
  if (has('주름·탄력')) pm.push(S('retinol', '레티놀 (콩알 크기)', '세럼·앰플', [1, 3, 5]));
  if (has('기미·칙칙함')) pm.push(S('whiten', '미백 앰플 (나이아신아마이드·트라넥삼산)', '세럼·앰플', has('주름·탄력') ? [0, 2, 4, 6] : null));
  if (has('모공·유분') || has('요철·피부결')) pm.push(S('bha', has('요철·피부결') ? (has('모공·유분') ? 'AHA·BHA 각질 케어 (화장솜)' : 'AHA·PHA 저자극 각질 케어') : 'BHA로 각질 닦기 (화장솜)', '각질제거', [2, 6]));
  if (has('모공·유분')) pm.push(S('clay', '클레이 마스크 10분', '마스크팩', [0]));
  if (has('기미·칙칙함')) pm.push(S('sheet', '미백 시트 마스크', '마스크팩', [4]));
  if (has('주름·탄력')) pm.push(S('eye', '아이크림', '아이크림'));
  pm.push(S('cream', has('주름·탄력') ? '영양 크림 (펩타이드·세라마이드)' : has('요철·피부결') ? '세라마이드 보습 크림' : '크림', '크림'));
  return { am, pm };
}

// '오늘 피부 고민'에 따라 그날만 빼고(skip) 더하는(add) 단계
const SKIN_DAILY = {
  '기미·칙칙함': { add: { am: [{ key: 'vitc', name: '비타민C 세럼', cat: '세럼·앰플' }, { key: 'sunre', name: '점심에 선크림 덧바르기', cat: '선크림' }], pm: [{ key: 'sheet', name: '미백 시트 마스크', cat: '마스크팩' }] } },
  '모공·유분': { add: { pm: [{ key: 'clay', name: '클레이 마스크 10분 (T존)', cat: '마스크팩' }] } },
  '주름·탄력': { add: { am: [{ key: 'eye', name: '아이크림', cat: '아이크림' }], pm: [{ key: 'massage', name: '크림 바를 때 탄력 마사지 1분', cat: '' }] } },
  '요철·피부결': { add: { pm: [{ key: 'bha', name: 'PHA 저자극 각질 케어 (가볍게)', cat: '각질제거' }], am: [{ key: 'barrier', name: '보습 크림 얇게 한 겹 더', cat: '크림' }] } },
  '트러블': { skip: ['retinol', 'bha', 'clay'], add: { am: [{ key: 'calm', name: '진정 토너 패드 (시카)', cat: '토너' }], pm: [{ key: 'spot', name: '트러블 부위 스팟 케어', cat: '기타' }] } },
  '건조·당김': { skip: ['bha', 'clay'], add: { am: [{ key: 'mist', name: '보습크림 한 번 더 덧바르기', cat: '크림' }], pm: [{ key: 'sleep', name: '수면팩·크림 두껍게', cat: '크림' }] } },
  '민감·붉은기': { skip: ['retinol', 'bha', 'clay', 'vitc', 'sheet'], add: { am: [{ key: 'lukewarm', name: '미지근한 물로만 가볍게 세안', cat: '' }], pm: [{ key: 'calmcream', name: '진정 크림 (판테놀·시카)', cat: '크림' }] } },
};
const SKIP_WHY = { retinol: '자극을 줄이려고', bha: '각질 제거는 쉬어요', clay: '피부가 예민해서', vitc: '자극을 줄이려고', sheet: '쉬어 가요' };

function skinData() {
  if (!db.skin) db.skin = { concerns: [...SKIN_CONCERNS], routine: null, products: [], log: {} };
  if (!db.skin.routine) db.skin.routine = genRoutine(db.skin.concerns);
  return db.skin;
}
function skinLog(k) { const s = skinData(); return s.log[k] || (s.log[k] = { concerns: null, checks: {} }); }

// 그날 실제 루틴 (요일 단계 + 오늘 고민 반영)
function routineFor(k) {
  const s = skinData(), wd = parse(k).getDay(), day = s.log[k] || { concerns: null, checks: {} };
  const con = (day.concerns || []).filter(c => c !== '없음');
  const skip = new Map();
  for (const c of con) for (const key of (SKIN_DAILY[c]?.skip || [])) if (!skip.has(key)) skip.set(key, c);
  const out = {};
  for (const t of ['am', 'pm']) {
    const list = s.routine[t].filter(st => !st.days || st.days.includes(wd)).map(st => ({ ...st, skipped: (st.key && skip.get(st.key)) || null }));
    const keys = new Set(list.map(x => x.key));
    const adds = [];
    for (const c of con) for (const a of (SKIN_DAILY[c]?.add?.[t] || [])) {
      if (keys.has(a.key) || skip.has(a.key)) continue;
      if (a.key === 'bha' && list.some(x => x.key === 'retinol' && !x.skipped)) continue; // 레티놀 날엔 각질 케어 X
      keys.add(a.key); adds.push({ ...a, id: 'd-' + a.key, added: c });
    }
    // 더하는 단계는 마무리 크림 앞에, 선크림 덧바르기만 맨 끝에
    const ci = list.findIndex(x => x.key === 'cream');
    list.splice(ci >= 0 ? ci : list.length, 0, ...adds.filter(a => a.key !== 'sunre'));
    list.push(...adds.filter(a => a.key === 'sunre'));
    out[t] = list;
  }
  return out;
}
function stepProduct(st) {
  const ps = skinData().products;
  if (st.productId) { const p = ps.find(x => x.id === st.productId); if (p) return p; }
  return st.cat ? ps.find(p => p.status === '사용중' && p.cat === st.cat) : null;
}
function skinProgress(k) {
  const r = routineFor(k), ch = skinLog(k).checks;
  const part = (t) => { const l = r[t].filter(x => !x.skipped); return { done: l.filter(x => ch[x.id]).length, total: l.length }; };
  return { am: part('am'), pm: part('pm') };
}

// ── 성분 궁합 ──
const KEY_ACTIVES = { vitc: ['비타민C'], retinol: ['레티놀'], bha: ['BHA', 'AHA'], whiten: ['나이아신아마이드', '트라넥삼산'], niacin: ['나이아신아마이드'] };
function stepActives(st) { return new Set([...(KEY_ACTIVES[st.key] || []), ...(stepProduct(st)?.actives || [])]); }
function skinAlerts(k) {
  const r = routineFor(k), act = { am: new Set(), pm: new Set() };
  for (const t of ['am', 'pm']) for (const st of r[t]) if (!st.skipped) stepActives(st).forEach(a => act[t].add(a));
  const day = new Set([...act.am, ...act.pm]), out = [];
  const acid = (s) => s.has('AHA') || s.has('BHA');
  if (act.am.has('레티놀')) out.push(['warn', '레티놀은 빛에 약해요. 아침 말고 저녁에만 써 주세요.']);
  for (const t of ['am', 'pm']) if (act[t].has('레티놀') && act[t].has('비타민C')) out.push(['warn', `${t === 'am' ? '아침' : '저녁'}에 레티놀과 비타민C를 같이 써요. 비타민C는 아침, 레티놀은 저녁으로 나눠 주세요.`]);
  if (day.has('레티놀') && acid(day)) out.push(['warn', '레티놀 쓰는 날 각질 제거(AHA·BHA)까지 하면 자극이 커요. 둘 중 하나는 다른 날로 옮겨 주세요.']);
  for (const t of ['am', 'pm']) if (act[t].has('비타민C') && acid(act[t])) out.push(['warn', '비타민C와 AHA·BHA를 같은 시간에 쓰면 따가울 수 있어요.']);
  if (act.pm.has('레티놀') || acid(act.pm)) {
    const hasSun = routineFor(addDays(k, 1)).am.some(st => !st.skipped && (st.key === 'sun' || st.cat === '선크림'));
    out.push([hasSun ? 'info' : 'warn', hasSun ? `오늘 저녁 ${act.pm.has('레티놀') ? '레티놀' : '각질 제거'} → 내일 아침 선크림 꼭 발라 주세요.` : '저녁에 레티놀·각질 제거를 하는데 아침 루틴에 선크림이 없어요.']);
  }
  return out;
}

// ── 성분 추천 ──
const SKIN_RECO = {
  '기미·칙칙함': { actives: ['비타민C', '나이아신아마이드', '알부틴', '트라넥삼산'], func: '미백', items: ['비타민C 세럼', '나이아신아마이드 앰플', '트라넥삼산 세럼', '미백 기능성 크림'], tip: '기미는 자외선이 가장 큰 원인이라 선크림을 2~3시간마다 덧바르는 게 제일 중요해요. 식약처 "미백 기능성" 표시를 확인하세요.' },
  '모공·유분': { actives: ['BHA', '나이아신아마이드'], func: null, items: ['BHA 토너', '클레이 마스크', '나이아신아마이드 세럼', '오일프리 수분크림'], tip: '각질 제거는 주 2회까지만. 너무 자주 하면 오히려 유분이 늘어요. 보습을 빼먹지 마세요.' },
  '주름·탄력': { actives: ['레티놀', '아데노신', '펩타이드'], func: '주름개선', items: ['입문용 저농도 레티놀', '아데노신 아이크림', '펩타이드 크림', '주름개선 기능성 크림'], tip: '레티놀은 주 2~3회 저녁에 소량부터. 다음 날 선크림은 필수예요. 식약처 "주름개선 기능성" 표시를 확인하세요.' },
  '요철·피부결': { actives: ['AHA', 'PHA', '레티놀', '세라마이드'], func: null, items: ['PHA 토너 (저자극 각질)', 'AHA 필링 패드', '세라마이드 크림', '저농도 레티놀'], tip: '요철은 각질 케어(주 2회)와 보습을 함께 해야 매끈해져요. 각질 케어 한 날은 다음 날 선크림 필수, 레티놀 하는 날엔 쉬어 주세요.' },
  '자외선 차단 (공통)': { actives: [], func: '자외선차단', items: ['데일리 선크림 SPF50+ PA++++', '덧바르기용 선쿠션·선스틱'], tip: '기미·주름 모두 자외선이 첫째 원인이에요. 실내에서도 매일 발라 주세요.' },
};
const searchUrl = (q) => `https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=${encodeURIComponent(q)}`;

// ── 화면 ──
function renderCare() {
  const sub = db.ui.skinTab || 'today';
  return `<div class="seg care-seg">
      <button class="on">피부</button><button disabled>두피 · 준비 중</button><button disabled>치아 · 준비 중</button>
    </div>
    <div class="seg">
      <button class="${sub === 'today' ? 'on' : ''}" data-action="skinTab" data-v="today">오늘 루틴</button>
      <button class="${sub === 'cos' ? 'on' : ''}" data-action="skinTab" data-v="cos">화장품 ${skinData().products.filter(p => p.status !== '다씀').length || ''}</button>
      <button class="${sub === 'reco' ? 'on' : ''}" data-action="skinTab" data-v="reco">추천</button>
    </div>
    ${sub === 'today' ? renderSkinToday() : sub === 'cos' ? renderCosmetics() : renderSkinReco()}`;
}

function renderSkinToday() {
  const k = cur, log = skinLog(k), r = routineFor(k), pg = skinProgress(k), alerts = skinAlerts(k);
  const askSel = db.ui.skinAskSel || [];
  const ask = log.concerns == null && k === today()
    ? `<section class="card ask-card"><div class="card-h"><h2>오늘 피부 고민 있어요?</h2></div>
        <p class="small muted" style="margin:0 0 10px">고르면 오늘 루틴을 바꿔 드려요. 없으면 추천 루틴 그대로 가요.</p>
        <div class="chips">${SKIN_TODAY.map(c => `<button class="chip ${askSel.includes(c) ? 'on' : ''}" data-action="skinAskPick" data-v="${c}">${c}</button>`).join('')}</div>
        <div class="btn-row" style="margin-top:12px"><button class="btn" data-action="skinAskNone">없음</button><button class="btn primary" data-action="skinAskApply" ${askSel.length ? '' : 'disabled'}>오늘 루틴 바꾸기${askSel.length ? ` (${askSel.length})` : ''}</button></div>
      </section>`
    : log.concerns && log.concerns.length && !log.concerns.includes('없음')
      ? `<div class="today-concern"><span>오늘 고민: <b>${log.concerns.map(esc).join(', ')}</b></span><button class="link small" data-action="skinAskReset">바꾸기</button></div>` : '';
  const list = (t) => r[t].map(st => {
    const p = stepProduct(st), on = !!log.checks[st.id];
    return `<li><button class="skin-step ${on ? 'on' : ''} ${st.skipped ? 'skipped' : ''}" data-action="skinCheck" data-id="${st.id}" ${st.skipped ? 'disabled' : ''}>
      <span class="check ${on ? 'on' : ''}">${CHECK_SVG}</span>
      <span class="info"><span class="name">${esc(st.name)}${st.days ? ` <span class="r-tag">${st.days.length === 1 ? '주 1회' : `주 ${st.days.length}회`}</span>` : ''}${st.added ? ` <span class="r-tag calm">오늘 추가</span>` : ''}</span>
      <span class="sub">${st.skipped ? `오늘은 쉬어요 · ${esc(st.skipped)}` : p ? `${COS_ICON[p.cat] || '🧴'} ${esc(p.name)}${p.status === '다씀' ? ' (다 씀)' : ''}` : st.cat ? `<span class="muted">${esc(st.cat)} 제품 없음</span>` : ''}</span></span></button></li>`;
  }).join('');
  const week = [...Array(7)].map((_, i) => addDays(k, i - parse(k).getDay())).map(d => {
    const rr = routineFor(d), special = [...rr.am, ...rr.pm].filter(st => st.days && !st.skipped);
    return `<div class="wk-day ${d === k ? 'sel' : ''}"><b>${WD_SHORT[parse(d).getDay()]}</b>${special.map(st => `<span>${esc(st.name.split(' (')[0])}</span>`).join('') || '<span class="muted">기본</span>'}</div>`;
  }).join('');
  return `${ask}
    <section class="card"><div class="card-h"><h2>🌅 아침</h2><span class="meta num">${pg.am.done}/${pg.am.total}</span></div><ul class="skin-list">${list('am')}</ul></section>
    <section class="card"><div class="card-h"><h2>🌙 저녁</h2><span class="meta num">${pg.pm.done}/${pg.pm.total}</span></div><ul class="skin-list">${list('pm')}</ul></section>
    ${alerts.length ? `<section class="card"><div class="card-h"><h2>성분 궁합</h2></div>${alerts.map(([lv, m]) => `<p class="alert-line ${lv}">${lv === 'warn' ? '⚠️' : '💡'} ${esc(m)}</p>`).join('')}</section>` : ''}
    <section class="card"><div class="card-h"><h2>이번 주 특별 케어</h2><button class="link small" data-action="skinEdit">루틴 편집</button></div><div class="wk-grid">${week}</div></section>`;
}

function renderCosmetics() {
  const ps = skinData().products;
  const using = ps.filter(p => p.status === '사용중').sort((a, b) => (cosExp(a) || '9').localeCompare(cosExp(b) || '9'));
  const stock = ps.filter(p => p.status === '재고'), done = ps.filter(p => p.status === '다씀');
  const row = (p) => {
    const exp = cosExp(p), dd = exp ? dday(exp) : null;
    return `<button class="f-item cos-item" data-action="cosEdit" data-id="${p.id}">
      <span class="cos-ic">${COS_ICON[p.cat] || '🧴'}</span>
      <span class="info"><span class="name">${p.staple ? '★ ' : ''}${esc(p.name)}</span><span class="sub">${esc(p.cat)}${(p.actives || []).length ? ' · ' + p.actives.slice(0, 3).map(esc).join(', ') : ''}${(p.funcs || []).map(f => ` · <b>${esc(f)}</b>`).join('')}</span></span>
      ${p.status === '사용중' && dd ? `<span class="dday ${dd.n < 0 ? 'past' : dd.n <= 30 ? 'soon' : ''}">${dd.n < 0 ? '기한 지남' : `D-${dd.n}`}</span>` : p.status === '재고' ? '<span class="dday">미개봉</span>' : ''}
    </button>`;
  };
  return `<button class="big-action" data-action="cosEdit" style="width:100%;margin-bottom:12px;background:var(--skin, #ff5e8a);color:#fff"><span class="ic">＋</span><b>화장품 등록</b><span style="color:rgba(255,255,255,.9)">개봉일만 넣으면 버릴 날을 계산해 줘요</span></button>
    <div class="section-title">사용 중 ${using.length}</div>
    <section class="card">${using.length ? using.map(row).join('') : '<p class="empty">쓰고 있는 화장품을 등록해 보세요</p>'}</section>
    ${stock.length ? `<div class="section-title">쟁여 둔 재고 ${stock.length}</div><section class="card">${stock.map(row).join('')}</section>` : ''}
    ${done.length ? `<button class="link small" data-action="cosShowDone" style="display:block;margin:4px">${db.ui.cosShowDone ? '▾' : '▸'} 다 쓴 화장품 ${done.length}</button>${db.ui.cosShowDone ? `<section class="card faded">${done.map(row).join('')}</section>` : ''}` : ''}
    <p class="small muted" style="margin:10px 4px 0">★ 상비 제품은 다 쓰면 장보기 목록에 자동으로 들어가요. 개봉 후 기간: 기본 12개월, 아이크림·비타민C·레티놀 6개월.</p>`;
}
function cosExp(p) {
  if (p.status === '재고') return p.exp || '';
  if (!p.opened) return '';
  const d = parse(p.opened); d.setMonth(d.getMonth() + (+p.pao || paoMonths(p)));
  return fmt(d);
}

function renderSkinReco() {
  const s = skinData(), mine = s.products.filter(p => p.status !== '다씀');
  const keys = [...s.concerns, '자외선 차단 (공통)'];
  return keys.map(c => {
    const R = SKIN_RECO[c];
    if (!R) return '';
    const owned = mine.filter(p => (p.actives || []).some(a => R.actives.includes(a)) || (R.func && (p.funcs || []).includes(R.func)) || (c.startsWith('자외선') && p.cat === '선크림'));
    return `<section class="card"><div class="card-h"><h2>${esc(c)}</h2>${owned.length ? '<span class="ok-badge">✓ 갖고 있어요</span>' : '<span class="need-badge">없어요</span>'}</div>
      ${R.actives.length ? `<p class="small" style="margin:0 0 8px">추천 성분: ${R.actives.map(a => `<b>${esc(a)}</b>`).join(' · ')}${R.func ? ` · 기능성 표시 <b>${esc(R.func)}</b>` : ''}</p>` : `<p class="small" style="margin:0 0 8px">기능성 표시 <b>${esc(R.func)}</b></p>`}
      ${owned.length ? `<p class="small muted" style="margin:0 0 8px">내 제품: ${owned.map(p => esc(p.name)).join(', ')}</p>` : ''}
      <div class="reco-list">${R.items.map(q => `<a class="reco-item" href="${searchUrl(q)}" target="_blank" rel="noopener">🔍 ${esc(q)}<span>올리브영에서 보기 ›</span></a>`).join('')}</div>
      <p class="tip" style="margin:10px 0 0">${esc(R.tip)}</p></section>`;
  }).join('') + `<p class="small muted" style="margin:0 4px">고민은 '오늘 루틴 › 루틴 편집'에서 바꿀 수 있어요. 검색은 쇼핑몰 사이트에서 열리고, 앱은 특정 제품을 광고하지 않아요.</p>`;
}

// ── 루틴 편집 ──
function openSkinEdit() {
  const s = skinData();
  const panel = openSheet('', { onClose: () => render() });
  const stepRow = (t, st, i) => `<div class="edit-step" data-t="${t}" data-i="${i}">
      <div class="row-between" style="gap:6px"><input class="input" data-f="name" value="${esc(st.name)}"><button class="x-btn" data-x="del" aria-label="단계 삭제">×</button></div>
      <div class="edit-sub">
        <select class="input" data-f="product"><option value="">제품: ${st.cat ? `${esc(st.cat)} 중 자동` : '없음'}</option>${s.products.filter(p => p.status !== '다씀').map(p => `<option value="${p.id}" ${st.productId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <div class="days"><button class="dchip ${!st.days ? 'on' : ''}" data-x="every">매일</button>${WD_SHORT.map((w, d) => `<button class="dchip ${st.days && st.days.includes(d) ? 'on' : ''}" data-x="day" data-d="${d}">${w}</button>`).join('')}</div>
      </div></div>`;
  const draw = () => {
    panel.innerHTML = sheetHeader('피부 루틴 편집', '<button class="link strong" data-x="close">완료</button>', '<span style="min-width:48px"></span>') + `
      <section class="card"><div class="card-h"><h2>내 피부 고민</h2></div>
        <div class="chips">${SKIN_CONCERNS.map(c => `<button class="chip ${s.concerns.includes(c) ? 'on' : ''}" data-x="concern" data-v="${c}">${c}</button>`).join('')}</div>
        <button class="btn block sm" data-x="regen" style="margin-top:10px">이 고민으로 추천 루틴 다시 만들기</button></section>
      ${['am', 'pm'].map(t => `<section class="card"><div class="card-h"><h2>${t === 'am' ? '🌅 아침' : '🌙 저녁'}</h2></div>
        ${s.routine[t].map((st, i) => stepRow(t, st, i)).join('')}
        <button class="btn block sm" data-x="add" data-t="${t}">＋ 단계 추가</button></section>`).join('')}
      <p class="small muted" style="margin:0 4px">요일을 고르면 그날만 나와요 (예: 레티놀 월·수·금). 제품을 비워 두면 같은 종류의 '사용 중' 화장품을 자동으로 보여 줘요.</p>`;
  };
  const stepOf = (el) => { const row = el.closest('.edit-step'); return row && s.routine[row.dataset.t][+row.dataset.i]; };
  panel.addEventListener('change', (e) => {
    const st = stepOf(e.target); if (!st) return;
    if (e.target.dataset.f === 'name') st.name = e.target.value.trim() || st.name;
    if (e.target.dataset.f === 'product') { st.productId = e.target.value || null; const p = s.products.find(x => x.id === st.productId); if (p) st.cat = p.cat; }
    save();
  });
  panel.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    const x = b.dataset.x, st = stepOf(b);
    if (x === 'close') return closeSheet();
    if (x === 'concern') { toggleIn(s.concerns, b.dataset.v); save(); draw(); }
    else if (x === 'regen') {
      if (!(await ask('추천 루틴으로 다시 만들까요?', '지금 편집한 루틴은 사라지고 고민에 맞춘 새 루틴으로 바뀌어요.', '다시 만들기'))) return;
      s.routine = genRoutine(s.concerns); save(); draw(); toast('추천 루틴을 새로 만들었어요');
    }
    else if (x === 'add') { s.routine[b.dataset.t].push({ id: uid(), key: null, name: '새 단계', cat: '', days: null }); save(); draw(); }
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

// ── 화장품 등록·수정 ──
function openCosmetic(id) {
  const s = skinData(), orig = id ? s.products.find(p => p.id === id) : null;
  const p = orig ? { ...orig, actives: [...(orig.actives || [])], funcs: [...(orig.funcs || [])] } : { name: '', cat: '토너', actives: [], funcs: [], status: '사용중', opened: today(), pao: '', exp: '', staple: false };
  const panel = openSheet('');
  const sync = () => { p.name = panel.querySelector('#cName').value.trim(); p.cat = panel.querySelector('#cCat').value; p.opened = panel.querySelector('#cOpened')?.value || p.opened; p.exp = panel.querySelector('#cExp')?.value || p.exp; p.pao = panel.querySelector('#cPao')?.value || ''; p.staple = panel.querySelector('#cStaple').checked; };
  const draw = () => {
    panel.innerHTML = sheetHeader(orig ? '화장품 수정' : '화장품 등록', '<button class="link strong" data-x="save">저장</button>', '<button class="link" data-x="close">취소</button>') + `
      <label class="field"><span>이름</span><input id="cName" placeholder="예: OO 비타민C 세럼" value="${esc(p.name)}"></label>
      <label class="field"><span>종류</span><select id="cCat">${COS_CATS.map(c => `<option ${c === p.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <div class="field"><span>주요 성분 <span class="muted">(용기 뒷면·제품명 참고, 여러 개)</span></span><div class="chips">${COS_ACTIVES.map(a => `<button class="chip ${p.actives.includes(a) ? 'on' : ''}" data-x="act" data-v="${a}">${a}</button>`).join('')}</div></div>
      <div class="field"><span>기능성 표시</span><div class="chips">${COS_FUNCS.map(f => `<button class="chip ${p.funcs.includes(f) ? 'on' : ''}" data-x="func" data-v="${f}">${f}</button>`).join('')}</div></div>
      <div class="field"><span>상태</span><div class="seg" style="margin:0">${['사용중', '재고'].map(v => `<button data-x="status" data-v="${v}" class="${p.status === v ? 'on' : ''}">${v === '사용중' ? '사용 중' : '재고 (미개봉)'}</button>`).join('')}</div></div>
      ${p.status === '재고'
        ? `<label class="field"><span>유통기한 <span class="muted">(포장에 적힌 날짜, 선택)</span></span><input id="cExp" type="date" value="${p.exp || ''}"></label>`
        : `<div class="two"><label class="field"><span>개봉일</span><input id="cOpened" type="date" value="${p.opened || today()}"></label>
           <label class="field"><span>개봉 후 (개월)</span><input id="cPao" inputmode="numeric" placeholder="자동 ${paoMonths(p)}" value="${p.pao || ''}"></label></div>`}
      <label class="field" style="display:flex;align-items:center;gap:10px"><input id="cStaple" type="checkbox" ${p.staple ? 'checked' : ''} style="width:22px;height:22px;-webkit-appearance:auto;appearance:auto"><span style="margin:0;color:var(--text);font-size:15px">★ 상비 제품 <span class="muted small">(다 쓰면 자동으로 장보기에)</span></span></label>
      ${orig && orig.status !== '다씀' ? `<div class="btn-row"><button class="btn" data-x="used">✅ 다 썼어요</button>${orig.status === '재고' ? '<button class="btn" data-x="open">개봉하기</button>' : '<button class="btn" data-x="toss">🗑 기한 지나 버려요</button>'}</div>` : ''}
      ${orig ? '<button class="btn block danger sm" style="margin-top:8px" data-x="del">삭제</button>' : ''}`;
  };
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
      if (orig) Object.assign(orig, p); else s.products.push({ ...p, id: uid(), added: today() });
      save(); closeSheet(); render(); toast(orig ? '수정했어요' : '화장품을 등록했어요');
    }
    else if (x === 'open') { Object.assign(orig, p, { status: '사용중', opened: today() }); save(); closeSheet(); render(); toast('개봉했어요. 오늘부터 사용기한을 계산해요'); }
    else if (x === 'used' || x === 'toss') { Object.assign(orig, p); closeSheet(); cosFinished(orig, x === 'toss'); }
    else if (x === 'del') { if (!(await ask('이 화장품을 삭제할까요?', '', '삭제', '취소', true))) return; s.products = s.products.filter(v => v.id !== orig.id); save(); closeSheet(); render(); }
  });
  draw();
}
async function cosFinished(p, tossed) {
  const s = skinData();
  p.status = '다씀'; p.finished = today();
  for (const st of [...s.routine.am, ...s.routine.pm]) if (st.productId === p.id) st.productId = null;
  save(); render();
  const spare = s.products.find(x => x.status === '재고' && x.cat === p.cat);
  if (spare && await ask(`재고로 있는 '${spare.name}'을(를) 개봉할까요?`, '오늘부터 사용기한을 계산해요.', '개봉하기', '나중에')) {
    spare.status = '사용중'; spare.opened = today(); save(); render();
  }
  if (p.staple) { if (addShopping(p.name, '화장품')) toast(`상비 제품이라 ${p.name}을(를) 장보기에 담았어요`); return; }
  if (!spare) toast(tossed ? '버린 걸로 정리했어요' : '다 쓴 걸로 정리했어요', { label: '장보기에 담기', run: () => { addShopping(p.name, '화장품'); save(); render(); toast('장보기에 담았어요'); } });
}
