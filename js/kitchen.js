// 주방: 냉장고 · 요리 추천 · 장보기
const LOCS = ['냉장', '냉동', '실온'];
const UNITS = ['개', '팩', '모', '봉', '캔', '병', '통', '단', 'g', 'kg', 'ml', 'L', '줄', '송이'];
const RECIPE_FILTERS = [['all', '추천순'], ['ready', '바로 가능'], ['lunch', '도시락'], ['morning', '아침'], ['soup', '국·죽'], ['easy', '전자레인지·불 없이']];

function renderKitchen() {
  const sub = db.ui.kitchenTab || 'fridge';
  const shopLeft = db.shopping.filter(s => !s.done).length;
  return `<div class="seg">
      <button class="${sub === 'fridge' ? 'on' : ''}" data-action="kitchen" data-sub="fridge">냉장고 ${db.fridge.length || ''}</button>
      <button class="${sub === 'recipes' ? 'on' : ''}" data-action="kitchen" data-sub="recipes">요리 추천</button>
      <button class="${sub === 'shop' ? 'on' : ''}" data-action="kitchen" data-sub="shop">장보기 ${shopLeft || ''}</button>
    </div>
    ${sub === 'fridge' ? renderFridge() : sub === 'recipes' ? renderRecipes() : renderShop()}`;
}

// ── 냉장고 ──
function sortFridge(list) {
  return [...list].sort((a, b) => (a.exp || '9999').localeCompare(b.exp || '9999') || a.name.localeCompare(b.name));
}
// ── 냉장고 그림 보기 ──
const ZONES = { top: '위칸', mid: '가운데칸', fresh: '신선칸', veg: '채소칸', door: '문칸', freezer: '냉동실', pantry: '실온 선반' };
// 냉장 재료를 어느 칸에 둘지 (위에서부터 먼저 걸리는 규칙)
const ZONE_RULES = [
  ['door', ['달걀', '계란', '메추리알', '우유', '두유', '주스', '음료', '소스', '케첩', '마요', '드레싱', '간장', '식초', '참기름', '들기름', '고추장', '쌈장', '맥주', '콜라', '사이다', '탄산', '생수']],
  ['fresh', ['닭', '소고기', '돼지', '고기', '삼겹', '목살', '안심', '등심', '생선', '연어', '고등어', '대구', '삼치', '갈치', '새우', '오징어', '조개', '전복', '햄', '베이컨', '소시지', '어묵', '게맛살']],
  ['veg', ['파', '양파', '마늘', '당근', '오이', '호박', '브로콜리', '양배추', '배추', '상추', '시금치', '버섯', '고추', '파프리카', '토마토', '감자', '무', '콩나물', '숙주', '깻잎', '미나리', '부추', '사과', '배', '귤', '딸기', '포도', '블루베리', '바나나', '키위', '레몬', '아보카도']],
  ['top', ['요거트', '요구르트', '치즈', '버터', '잼', '김치', '반찬', '두부']],
];
function zoneOf(f) {
  if (f.loc === '냉동') return 'freezer';
  if (f.loc === '실온') return 'pantry';
  const n = normName(f.name);
  for (const [z, keys] of ZONE_RULES) if (keys.some(k => n.includes(k))) return z;
  return 'mid';
}
// 재료 이름 → 일러스트 SVG (data/food-art.js, 없는 재료는 반찬통 그림)
function artId(name) {
  const n = normName(name);
  for (const [keys, id] of FOOD_ART_RULES) if (keys.some(k => n.includes(k))) return id;
  return 'container';
}
function artOf(name) {
  return `<svg viewBox="0 0 80 80" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${FOOD_ART[artId(name)]}</svg>`;
}

let fridgeAnim = false; // 냉장고 화면에 들어올 때 한 번만 문 열기
function fridgeChip(f, small = false) {
  const dd = f.exp ? dday(f.exp) : null;
  const badge = dd && dd.n <= 5 ? `<span class="fi-badge ${dd.n <= 1 ? 'red' : 'yellow'}">${dd.n < 0 ? '지남' : dd.n === 0 ? '오늘' : 'D-' + dd.n}</span>` : '';
  return `<button class="fi ${small ? 'sm' : ''}" data-action="editItem" data-id="${f.id}" aria-label="${esc(f.name)} ${n1(f.qty)}${esc(f.unit)}${dd ? ', ' + dd.text : ''}">
    <span class="fi-art">${artOf(f.name)}</span><span class="fi-name">${esc(f.name)}</span>${badge}${f.staple ? '<span class="fi-star" aria-hidden="true">★</span>' : ''}</button>`;
}
function renderFridgeArt() {
  const anim = fridgeAnim; fridgeAnim = false;
  const by = (z) => sortFridge(db.fridge.filter(f => zoneOf(f) === z));
  const shelf = (z, loc, cls = '') => {
    const items = by(z);
    return `<div class="shelf ${cls}"><span class="shelf-lbl">${ZONES[z]}</span><div class="shelf-items">${items.map(f => fridgeChip(f)).join('')}${items.length ? '' : `<button class="fi add" data-action="addTo" data-loc="${loc}" aria-label="${ZONES[z]}에 재료 추가">＋</button>`}</div></div>`;
  };
  const door = by('door'), pockets = [[], [], []];
  door.forEach((f, i) => pockets[i % 3].push(f));
  const pantry = by('pantry');
  return `<div class="fridge-wrap ${anim ? 'anim' : ''}">
    <div class="fridge">
      <div class="fr-top">
        <div class="fr-cab">
          <span class="fr-lamp" aria-hidden="true"></span>
          ${shelf('top', '냉장')}${shelf('mid', '냉장')}${shelf('fresh', '냉장', 'fresh')}${shelf('veg', '냉장', 'veg')}
          ${anim ? '<div class="fr-front" aria-hidden="true"><span class="fr-handle"></span></div>' : ''}
        </div>
        <div class="fr-door">
          <span class="door-lbl">문칸</span>
          ${pockets.map(p => `<div class="pocket">${p.map(f => fridgeChip(f, true)).join('')}</div>`).join('')}
        </div>
      </div>
      <div class="fr-freezer">
        <div class="shelf"><span class="shelf-lbl">냉동실 ❄️</span><div class="shelf-items">${by('freezer').map(f => fridgeChip(f)).join('')}${by('freezer').length ? '' : '<button class="fi add" data-action="addTo" data-loc="냉동" aria-label="냉동실에 재료 추가">＋</button>'}</div></div>
        <div class="fz-front"><span class="fz-handle"></span></div>
      </div>
    </div>
    <div class="fr-feet" aria-hidden="true"><i></i><i></i></div>
    <div class="pantry">
      <div class="shelf-items">${pantry.map(f => fridgeChip(f)).join('')}<button class="fi add" data-action="addTo" data-loc="실온" aria-label="실온 선반에 재료 추가">＋</button></div>
      <div class="plank"></div><span class="shelf-lbl">실온 선반</span>
    </div>
  </div>`;
}

function renderFridge() {
  const view = db.ui.fridgeView || 'art';
  const soon = db.fridge.filter(f => f.exp && diffDays(f.exp, today()) <= 5).length;
  return `
  <div class="big-actions">
    <button class="big-action ai" data-action="scanFridge"><span class="ic">📷</span><b>사진으로 등록</b><span>냉장고·장 본 것·영수증을 찍으면 AI가 정리</span></button>
    <button class="big-action" data-action="editItem"><span class="ic">＋</span><b>직접 추가</b><span>이름·수량·유통기한 입력</span></button>
  </div>
  <div class="row-between" style="margin-bottom:10px">
    <div class="seg" style="margin:0;flex:none">
      <button class="${view === 'art' ? 'on' : ''}" data-action="fridgeView" data-v="art" style="padding:6px 12px">냉장고</button>
      <button class="${view === 'list' ? 'on' : ''}" data-action="fridgeView" data-v="list" style="padding:6px 12px">목록</button>
    </div>
    <span class="small muted num">전체 ${db.fridge.length}개${soon ? ` · <b style="color:var(--danger)">임박 ${soon}</b>` : ''}</span>
  </div>
  ${view === 'art' ? renderFridgeArt() + (db.fridge.length ? '' : '<p class="small muted" style="text-align:center;margin:8px 0 0">냉장고가 비어 있어요. 사진을 찍으면 AI가 칸마다 정리해 줘요.</p>') : renderFridgeList()}
  <p class="small muted" style="margin:12px 4px 0">재료를 눌러 <b>★ 상비 재료</b>로 지정하면, 다 썼을 때 장보기 목록에 자동으로 들어가요.</p>`;
}

function renderFridgeList() {
  const loc = db.ui.fridgeLoc || '전체';
  const list = sortFridge(db.fridge.filter(f => loc === '전체' || f.loc === loc));
  const count = (l) => db.fridge.filter(f => f.loc === l).length;
  return `
  <div class="chips" style="margin-bottom:12px">${['전체', ...LOCS].map(l => `<button class="chip ${l === loc ? 'on' : ''}" data-action="fridgeLoc" data-v="${l}">${l} ${l === '전체' ? db.fridge.length : count(l)}</button>`).join('')}</div>
  <section class="card" style="margin:0">
    ${list.length ? `<ul class="fridge-list">${list.map(f => {
      const dd = f.exp ? dday(f.exp) : null;
      return `<li class="f-item">
        <button class="star ${f.staple ? 'on' : ''}" data-action="staple" data-id="${f.id}" aria-label="상비 재료 표시">${f.staple ? '★' : '☆'}</button>
        <span class="fi-art list">${artOf(f.name)}</span>
        <button class="info" data-action="editItem" data-id="${f.id}">
          <div class="name">${esc(f.name)}</div>
          <div class="sub num">${n1(f.qty)}${esc(f.unit)} · ${f.loc}${f.exp ? ` · ${f.exp.slice(5).replace('-', '/')}까지${f.expEst ? '<span class="est">(추정)</span>' : ''}` : ''}</div>
        </button>
        ${dd ? `<span class="dday ${dd.cls}">${dd.text}</span>` : ''}
      </li>`;
    }).join('')}</ul>` : `<p class="empty">${db.fridge.length ? '이 칸은 비어 있어요' : '냉장고가 비어 있어요.<br>사진을 찍으면 AI가 재료를 정리해 줘요.'}</p>`}
  </section>`;
}

function openItem(id, preset = {}) {
  const orig = id ? db.fridge.find(f => f.id === id) : null;
  const it = orig ? { ...orig } : { name: '', qty: 1, unit: '개', loc: '냉장', exp: '', expEst: false, staple: false, ...preset };
  const panel = openSheet('');
  let expTouched = !!orig;
  const sync = () => {
    it.name = panel.querySelector('#iName').value.trim();
    it.qty = Math.max(0, +panel.querySelector('#iQty').value || 0);
    it.unit = panel.querySelector('#iUnit').value;
    const e = panel.querySelector('#iExp').value;
    if (e !== it.exp) { it.exp = e; it.expEst = false; }
    it.staple = panel.querySelector('#iStaple').checked;
  };
  function draw() {
    panel.innerHTML = sheetHeader(orig ? '재료 수정' : '재료 추가', '<button class="link strong" data-x="save">저장</button>', '<button class="link" data-x="close">취소</button>') + `
      <label class="field"><span>재료 이름</span><input id="iName" placeholder="예: 달걀, 두부, 닭가슴살" value="${esc(it.name)}"></label>
      <div class="two">
        <label class="field"><span>수량</span><input id="iQty" inputmode="decimal" value="${it.qty}"></label>
        <label class="field"><span>단위</span><select id="iUnit">${[...new Set([it.unit, ...UNITS])].map(u => `<option ${u === it.unit ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></label>
      </div>
      <div class="field"><span>보관</span><div class="seg" style="margin:0">${LOCS.map(l => `<button data-x="loc" data-v="${l}" class="${l === it.loc ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <label class="field"><span>유통기한 ${it.expEst ? '<span class="muted">(추정값 · 포장에 적힌 날짜로 고쳐 주세요)</span>' : ''}</span><input id="iExp" type="date" value="${it.exp || ''}"></label>
      <label class="field" style="display:flex;align-items:center;gap:10px"><input id="iStaple" type="checkbox" ${it.staple ? 'checked' : ''} style="width:22px;height:22px;-webkit-appearance:auto;appearance:auto">
        <span style="margin:0;color:var(--text);font-size:15px">★ 상비 재료 <span class="muted small">(다 쓰면 자동으로 장보기에 추가)</span></span></label>
      ${orig ? `<div class="btn-row" style="margin-top:6px"><button class="btn" data-x="used">✅ 다 썼어요</button><button class="btn" data-x="thrown">🗑 버렸어요</button></div>
        <button class="btn block danger sm" style="margin-top:8px" data-x="del">잘못 넣었어요 (그냥 삭제)</button>` : ''}`;
  }
  panel.addEventListener('input', (e) => {
    if (e.target.id === 'iName' && !expTouched) {
      const g = guessExp(e.target.value, it.loc);
      if (g) { it.exp = g; it.expEst = true; panel.querySelector('#iExp').value = g; }
    }
    if (e.target.id === 'iExp') expTouched = true;
  });
  panel.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const x = b.dataset.x;
    if (x === 'close') return closeSheet();
    sync();
    if (x === 'loc') {
      it.loc = b.dataset.v;
      if (!expTouched || it.expEst) { const g = guessExp(it.name, it.loc); if (g) { it.exp = g; it.expEst = true; } }
      draw();
    } else if (x === 'save') {
      if (!it.name) return toast('재료 이름을 적어 주세요');
      if (orig) Object.assign(orig, it); else db.fridge.push({ ...it, id: uid(), added: today() });
      save(); closeSheet(); render(); toast(orig ? '수정했어요' : '냉장고에 넣었어요');
    } else if (x === 'used') { closeSheet(); usedUp(orig); }
    else if (x === 'thrown') { closeSheet(); thrownAway(orig); }
    else if (x === 'del') {
      db.fridge = db.fridge.filter(f => f.id !== orig.id); save(); closeSheet(); render(); toast('삭제했어요');
    }
  });
  draw();
}

function removeItem(item) { db.fridge = db.fridge.filter(f => f.id !== item.id); }
function usedUp(item, quiet = false) {
  removeItem(item);
  if (item.staple) {
    const added = addShopping(item.name, '상비 재료');
    save(); render();
    if (!quiet) toast(added ? `상비 재료라 ${item.name}을(를) 장보기에 담았어요` : '냉장고에서 뺐어요');
    return;
  }
  save(); render();
  if (!quiet) toast('냉장고에서 뺐어요', { label: '장보기에 담기', run: () => { addShopping(item.name, '다 쓴 재료'); save(); render(); toast('장보기에 담았어요'); } });
}
async function thrownAway(item) {
  removeItem(item); save(); render();
  if (await ask(`${item.name}, 다시 살까요?`, '장보기 목록에 넣어 둘게요.', '장보기에 담기', '안 살래요')) {
    addShopping(item.name, '버린 재료 다시 구매'); save(); render(); toast('장보기에 담았어요');
  }
}

// ── AI 사진 등록 ──
async function scanFridge() {
  if (!db.settings.apiKey) {
    if (await ask('AI 사진 등록에는 API 키가 필요해요', '설정에서 Anthropic API 키를 넣어 주세요. 키 없이도 ‘직접 추가’로 등록할 수 있어요.', '설정 열기', '나중에')) openSettings();
    return;
  }
  const files = await pickImages({ multiple: true });
  if (!files.length) return;
  const panel = openSheet(sheetHeader('사진 분석 중') + loadingCard(`사진 ${files.length}장에서 재료를 찾고 있어요`));
  let result;
  try {
    const imgs = [];
    for (const f of files.slice(0, 5)) imgs.push(await compressImage(f, 1280, 0.8));
    result = await aiScanFridge(imgs);
  } catch (err) {
    if (!$('#sheet').classList.contains('open')) return;
    panel.innerHTML = sheetHeader('사진 분석 실패') + `<div class="card"><p>${esc(err.message)}</p><button class="btn primary block" data-x="retry">다시 시도</button></div>`;
    panel.querySelector('[data-x="retry"]').onclick = () => { closeSheet(); scanFridge(); };
    panel.querySelector('[data-x="close"]').onclick = closeSheet;
    return;
  }
  if (!$('#sheet').classList.contains('open')) return;
  reviewScan(panel, result);
}

function reviewScan(panel, result) {
  const items = result.items.map(r => ({ ...r, on: true, qty: r.qty || 1, unit: r.unit || '개' }));
  const draw = () => {
    const n = items.filter(i => i.on).length;
    panel.innerHTML = sheetHeader('AI가 찾은 재료', `<button class="link strong" data-x="add" ${n ? '' : 'disabled'}>넣기</button>`) + `
      ${result.note ? `<div class="ai-note">${esc(result.note)}</div>` : ''}
      ${items.length ? `<div class="card">${items.map((it, i) => `<div class="review-item ${it.on ? '' : 'off'}" data-i="${i}">
        <div class="top-line"><button class="check ${it.on ? 'on' : ''}" data-x="toggle" aria-label="선택">${CHECK_SVG}</button><input class="input" data-f="name" value="${esc(it.name)}"></div>
        <div class="seg">${LOCS.map(l => `<button data-x="loc" data-v="${l}" class="${l === it.loc ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="three"><input class="input" data-f="qty" inputmode="decimal" value="${it.qty}" aria-label="수량"><input class="input" data-f="unit" value="${esc(it.unit)}" aria-label="단위"><input class="input" data-f="exp" type="date" value="${esc(it.exp)}" aria-label="유통기한"></div>
        ${it.expEstimated ? '<div class="small muted" style="margin-top:4px">유통기한은 추정값이에요</div>' : ''}
      </div>`).join('')}</div>` : '<p class="empty">사진에서 재료를 찾지 못했어요. 더 가까이 찍어 보세요.</p>'}
      <button class="btn primary block" data-x="add" ${n ? '' : 'disabled'}>냉장고에 넣기 (${n}개)</button>`;
  };
  panel.oninput = (e) => {
    const row = e.target.closest('[data-i]'), f = e.target.dataset.f;
    if (!row || !f) return;
    const it = items[+row.dataset.i];
    if (f === 'exp' && e.target.value !== it.exp) it.expEstimated = false;
    it[f] = f === 'qty' ? (+e.target.value || 0) : e.target.value;
  };
  panel.onclick = (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const x = b.dataset.x, row = b.closest('[data-i]'), it = row && items[+row.dataset.i];
    if (x === 'close') return closeSheet();
    if (x === 'toggle') { it.on = !it.on; draw(); }
    else if (x === 'loc') { it.loc = b.dataset.v; draw(); }
    else if (x === 'add') {
      const chosen = items.filter(i => i.on && i.name.trim());
      let bought = 0;
      for (const c of chosen) {
        const prevStaple = db.fridge.some(f => f.staple && nameMatch(f.name, c.name));
        db.fridge.push({ id: uid(), name: c.name.trim(), qty: c.qty || 1, unit: c.unit || '개', loc: c.loc, exp: c.exp || '', expEst: !!c.expEstimated, staple: prevStaple, added: today() });
        for (const s of db.shopping) if (!s.done && nameMatch(s.name, c.name)) { s.done = true; bought++; }
      }
      save(); closeSheet(); render();
      toast(`${chosen.length}개를 냉장고에 넣었어요${bought ? ` · 장보기 ${bought}개 완료` : ''}`);
    }
  };
  draw();
}

// ── 요리 추천 ──
function recipeView(r, ai = false) {
  // 내장 레시피와 AI 레시피를 같은 모양으로
  if (ai) return { name: r.name, k: r.kcal, p: r.protein, t: r.minutes, tags: r.lunchTip ? ['도시락'] : [], ing: r.ingredients.map(i => [i.name, i.amount]), s: r.seasoning, st: r.steps, tip: r.lunchTip, why: r.why, ai: true };
  return { name: r.n, k: r.k, p: r.p, t: r.t, tags: r.tag, ing: r.i, s: r.s, st: r.st, tip: r.d || '', why: '', ai: false };
}
// 유통기한이 지난 재료는 '있는 재료'로 치지 않는다
function fridgeHas(name) { return db.fridge.find(f => covers(f.name, name) && !(f.exp && f.exp < today())); }
function scoreRecipe(v) {
  const have = v.ing.filter(([n]) => fridgeHas(n));
  const missing = v.ing.filter(([n]) => !fridgeHas(n)).map(([n]) => n);
  const urgent = have.some(([n]) => { const f = fridgeHas(n); return f?.exp && diffDays(f.exp, today()) <= 3; });
  return { have: have.length, total: v.ing.length, missing, urgent, ratio: v.ing.length ? have.length / v.ing.length : 0 };
}
function recipeRow(v, key) {
  const sc = scoreRecipe(v);
  return `<button class="recipe" data-action="recipe" data-key="${key}">
    <div class="name">${v.ai ? '✨ ' : ''}${esc(v.name)}</div>
    <div class="facts num"><span><b>${n0(v.k)}</b>kcal</span><span>단백질 <b>${n1(v.p)}</b>g</span><span>${v.t}분</span>${v.tip ? '<span class="tag-lunch">도시락 OK</span>' : ''}${sc.urgent ? '<span style="color:var(--danger);font-weight:700">임박 재료 사용</span>' : ''}</div>
    ${db.fridge.length ? `<div class="have"><span class="muted">재료 ${sc.have}/${sc.total}</span><div class="bar"><i style="width:${sc.ratio * 100}%"></i></div></div>
    ${sc.missing.length ? `<div class="missing">없는 재료: ${sc.missing.map(esc).join(', ')}</div>` : '<div class="missing" style="color:var(--ok);font-weight:600">지금 바로 만들 수 있어요</div>'}` : ''}
  </button>`;
}
function renderRecipes() {
  const f = db.ui.recipeFilter || 'all';
  let list = RECIPES.map((r, i) => ({ v: recipeView(r), key: 'r' + i }));
  const tagHas = (v, ...t) => v.tags.some(x => t.includes(x));
  if (f === 'ready') list = list.filter(x => scoreRecipe(x.v).ratio === 1);
  if (f === 'lunch') list = list.filter(x => x.v.tip);
  if (f === 'morning') list = list.filter(x => tagHas(x.v, '아침'));
  if (f === 'soup') list = list.filter(x => tagHas(x.v, '국', '죽'));
  if (f === 'easy') list = list.filter(x => tagHas(x.v, '전자레인지', '불 없이'));
  list.sort((a, b) => {
    const sa = scoreRecipe(a.v), sb = scoreRecipe(b.v);
    return (sb.ratio - sa.ratio) || (sb.urgent - sa.urgent) || (b.v.p - a.v.p);
  });
  const ai = db.aiRecipes || [];
  return `
  <button class="big-action ai" data-action="aiRecipes" style="width:100%;margin-bottom:12px"><span class="ic">✨</span><b>AI에게 맞춤 추천받기</b><span>냉장고 재료 · 오늘 남은 칼로리 · 부족한 단백질을 반영해요</span></button>
  ${ai.length ? `<section class="card"><div class="card-h"><h2>AI 추천</h2><button class="link small" data-action="clearAiRecipes">지우기</button></div>
    ${ai.map((r, i) => recipeRow(recipeView(r, true), 'a' + i)).join('')}</section>` : ''}
  <div class="chips scroll" style="margin-bottom:12px">${RECIPE_FILTERS.map(([k, l]) => `<button class="chip ${k === f ? 'on' : ''}" data-action="recipeFilter" data-v="${k}">${l}</button>`).join('')}</div>
  ${!db.fridge.length ? '<p class="small muted" style="margin:0 4px 10px">냉장고에 재료를 넣으면 있는 재료가 많은 요리부터 보여 드려요.</p>' : ''}
  <section class="card">${list.length ? list.map(x => recipeRow(x.v, x.key)).join('') : '<p class="empty">조건에 맞는 레시피가 없어요</p>'}</section>
  <p class="small muted" style="margin:0 4px">모든 레시피는 속 편한 고단백 다이어트식이에요. 숟 = 밥숟가락, 컵 = 종이컵(약 180ml).</p>`;
}
function recipeByKey(key) {
  if (key[0] === 'a') { const r = db.aiRecipes[+key.slice(1)]; return r && recipeView(r, true); }
  const r = RECIPES[+key.slice(1)]; return r && recipeView(r);
}

function openRecipe(key) {
  const v = recipeByKey(key);
  if (!v) return;
  const sc = scoreRecipe(v);
  const panel = openSheet(sheetHeader(v.name) + `
    <section class="card">
      <div class="facts num" style="display:flex;gap:14px;font-size:15px"><span><b>${n0(v.k)}</b>kcal</span><span>단백질 <b>${n1(v.p)}</b>g</span><span>${v.t}분</span></div>
      ${v.why ? `<p class="small muted" style="margin:8px 0 0">${esc(v.why)}</p>` : ''}
    </section>
    <section class="card"><div class="card-h"><h2>재료</h2><span class="meta">${db.fridge.length ? `냉장고에 ${sc.have}/${sc.total}` : ''}</span></div>
      <ul class="ing-list">${v.ing.map(([n, a]) => { const has = fridgeHas(n); return `<li><span>${db.fridge.length ? (has ? '<span class="ok">✓</span> ' : '<span class="no">✗</span> ') : ''}${esc(n)}</span><span class="muted">${esc(a)}</span></li>`; }).join('')}</ul>
      ${v.s ? `<p class="small muted" style="margin:6px 0 0">양념: ${esc(v.s)}</p>` : ''}
    </section>
    <section class="card"><div class="card-h"><h2>만드는 법</h2></div>
      <ol class="steps">${v.st.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      ${v.tip ? `<div class="tip">🍱 <b>도시락 팁</b> ${esc(v.tip)}</div>` : ''}
    </section>
    ${sc.missing.length ? `<button class="btn block" data-x="shop" style="margin-bottom:8px">🛒 없는 재료 장보기에 담기 (${sc.missing.length})</button>` : ''}
    <button class="btn primary block" data-x="cook">🍳 이걸로 요리했어요</button>`);
  panel.onclick = (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    if (b.dataset.x === 'close') return closeSheet();
    if (b.dataset.x === 'shop') {
      const added = sc.missing.filter(n => addShopping(n, `레시피: ${v.name}`)).length;
      save(); closeSheet(); render();
      toast(added ? `${added}개를 장보기에 담았어요` : '이미 장보기 목록에 있어요');
    }
    if (b.dataset.x === 'cook') openCooked(v);
  };
}

// '요리했어요' → 쓴 재료 정리 + 식단 기록
function parseAmount(a, unit) {
  const fr = String(a).match(/(\d+)\s*\/\s*(\d+)/);
  if (fr) return Math.round(+fr[1] / +fr[2] * 100) / 100;
  const m = String(a).match(/(\d+(?:\.\d+)?)\s*(개|모|팩|캔|봉|장|g|ml)?/);
  if (m && (!m[2] || m[2] === unit)) return +m[1];
  if (/반/.test(a)) return 0.5;
  return 1;
}
function openCooked(v) {
  const uses = v.ing.map(([n, a]) => { const f = fridgeHas(n); return f ? { f, take: Math.min(f.qty, parseAmount(a, f.unit)), mode: 'some' } : null; }).filter(Boolean);
  for (const u of uses) if (u.f.qty - u.take <= 0) u.mode = 'all';
  let mealType = mealTypeNow(), logMeal = true;
  const panel = openSheet('');
  const draw = () => {
    panel.innerHTML = sheetHeader('요리 완료', '<button class="link strong" data-x="done">완료</button>', '<button class="link" data-x="close">취소</button>') + `
      ${uses.length ? `<section class="card"><div class="card-h"><h2>쓴 재료</h2><span class="meta">냉장고에서 빼요</span></div>
        ${uses.map((u, i) => `<div class="review-item" data-i="${i}">
          <div class="row-between" style="margin-bottom:8px"><b>${esc(u.f.name)}</b><span class="muted small num">지금 ${n1(u.f.qty)}${esc(u.f.unit)}</span></div>
          <div class="seg" style="margin:0">
            <button data-x="mode" data-v="none" class="${u.mode === 'none' ? 'on' : ''}">안 씀</button>
            <button data-x="mode" data-v="some" class="${u.mode === 'some' ? 'on' : ''}">${n1(u.take)}${esc(u.f.unit)} 씀</button>
            <button data-x="mode" data-v="all" class="${u.mode === 'all' ? 'on' : ''}">다 씀</button>
          </div></div>`).join('')}</section>` : '<p class="small muted">냉장고에서 뺄 재료가 없어요.</p>'}
      <section class="card">
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><input type="checkbox" data-x="log" ${logMeal ? 'checked' : ''} style="width:22px;height:22px">
          <span><b>오늘 식단에 기록</b> <span class="muted small num">${n0(v.k)}kcal · 단백질 ${n1(v.p)}g</span></span></label>
        <div class="seg" style="margin:0;${logMeal ? '' : 'opacity:.4;pointer-events:none'}">${MEALS.map(t => `<button data-x="meal" data-v="${t}" class="${t === mealType ? 'on' : ''}">${t}</button>`).join('')}</div>
      </section>`;
  };
  panel.onclick = (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const x = b.dataset.x, row = b.closest('[data-i]');
    if (x === 'close') return closeSheet();
    if (x === 'mode') { uses[+row.dataset.i].mode = b.dataset.v; draw(); }
    else if (x === 'meal') { mealType = b.dataset.v; draw(); }
    else if (x === 'log') { logMeal = b.checked; draw(); }
    else if (x === 'done') {
      const restock = [];
      for (const u of uses) {
        if (u.mode === 'none') continue;
        const left = u.mode === 'all' ? 0 : Math.round((u.f.qty - u.take) * 10) / 10;
        if (left > 0) u.f.qty = left;
        else { removeItem(u.f); if (u.f.staple && addShopping(u.f.name, '상비 재료')) restock.push(u.f.name); }
      }
      if (logMeal) dayData(today()).meals.push({ id: uid(), type: mealType, name: v.name, servings: 1, kcal: v.k, protein: v.p, base: { kcal: v.k, protein: v.p }, unit: '', photo: null, memo: '', src: 'recipe', at: Date.now() });
      save(); closeSheet(); render();
      toast(`${logMeal ? `${mealType}에 기록했어요` : '냉장고를 정리했어요'}${restock.length ? ` · ${restock.join(', ')} 장보기에 추가` : ''}`);
    }
  };
  draw();
}

const AI_RECIPE_ASKS = ['점심 도시락용', '아침에 5분 안에', '저녁 가볍게', '전자레인지만', '국물 있는 걸로', '단백질 최대한 많이'];
function openAiRecipeAsk() {
  const picked = new Set();
  const panel = openSheet('');
  const draw = () => {
    panel.innerHTML = sheetHeader('AI 맞춤 추천') + `
      <section class="card"><p class="small muted" style="margin:0 0 10px">냉장고 재료 ${db.fridge.length}개와 오늘 먹은 양을 보고 속 편한 고단백 다이어트 레시피 3개를 만들어 드려요.</p>
        <div class="field"><span>원하는 조건 (선택)</span><div class="chips">${AI_RECIPE_ASKS.map(a => `<button class="chip ${picked.has(a) ? 'on' : ''}" data-x="pick" data-v="${a}">${a}</button>`).join('')}</div></div>
        <label class="field" style="margin:0"><span>직접 적기 (선택)</span><input id="aiExtra" placeholder="예: 닭가슴살 말고 다른 단백질로"></label>
      </section>
      <button class="btn ai block" data-x="go">✨ 추천받기</button>`;
  };
  panel.onclick = async (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    if (b.dataset.x === 'close') return closeSheet();
    if (b.dataset.x === 'pick') { const v = b.dataset.v; picked.has(v) ? picked.delete(v) : picked.add(v); const ex = panel.querySelector('#aiExtra').value; draw(); panel.querySelector('#aiExtra').value = ex; }
    if (b.dataset.x === 'go') {
      const extra = [...picked, panel.querySelector('#aiExtra').value.trim()].filter(Boolean).join(', ');
      panel.innerHTML = sheetHeader('추천 만드는 중') + loadingCard('냉장고를 보고 레시피를 고르고 있어요');
      panel.querySelector('[data-x="close"]').onclick = closeSheet;
      try {
        const r = await aiRecipes(extra);
        db.aiRecipes = r.recipes; db.ui.kitchenTab = 'recipes'; save();
        closeSheet(); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
        toast(`AI가 레시피 ${r.recipes.length}개를 추천했어요`);
      } catch (err) {
        if (err.code === 'NO_KEY') { closeSheet(); if (await ask('AI 추천에는 API 키가 필요해요', '설정에서 Anthropic API 키를 넣어 주세요.', '설정 열기', '나중에')) openSettings(); return; }
        panel.innerHTML = sheetHeader('추천 실패') + `<div class="card"><p>${esc(err.message)}</p></div>`;
        panel.querySelector('[data-x="close"]').onclick = closeSheet;
      }
    }
  };
  draw();
}

// ── 장보기 ──
function renderShop() {
  const left = db.shopping.filter(s => !s.done), done = db.shopping.filter(s => s.done);
  const row = (s) => `<div class="shop-item ${s.done ? 'done' : ''}">
    <button class="check ${s.done ? 'on' : ''}" data-action="shopToggle" data-id="${s.id}" aria-label="${s.done ? '안 산 것으로' : '샀어요'}">${CHECK_SVG}</button>
    <div class="info"><div class="name">${esc(s.name)} ${s.qty ? `<span class="muted small">${esc(s.qty)}</span>` : ''}</div>${s.src ? `<div class="src">${esc(s.src)}</div>` : ''}</div>
    <button class="x-btn" data-action="shopDel" data-id="${s.id}" aria-label="삭제">×</button></div>`;
  return `
  <div class="big-actions">
    <button class="big-action ai" data-action="aiShopping"><span class="ic">✨</span><b>이번 주 장보기 추천</b><span>냉장고와 단백질 목표를 보고 AI가 목록 작성</span></button>
    <button class="big-action" data-action="scanFridge"><span class="ic">🧾</span><b>영수증으로 넣기</b><span>산 것을 찍으면 냉장고로 한 번에</span></button>
  </div>
  <form class="card" id="shopForm" style="display:flex;gap:8px;padding:10px">
    <input class="input" id="shopInput" placeholder="살 것 직접 추가 (예: 두부 2모)" enterkeyhint="done" style="flex:1">
    <button class="btn primary sm" type="submit">추가</button>
  </form>
  <section class="card">${left.length ? left.map(row).join('') : '<p class="empty">살 것이 없어요 🎉</p>'}</section>
  ${done.length ? `<div class="row-between" style="margin:16px 4px 8px"><span class="small muted">산 것 ${done.length}</span><button class="link small" data-action="shopClear">모두 지우기</button></div>
  <section class="card">${done.map(row).join('')}</section>` : ''}`;
}

function addShopFromInput(text) {
  const t = text.trim();
  if (!t) return;
  const m = t.match(/^(.*?)\s+(\d.*)$/);
  const ok = m ? addShopping(m[1], '', m[2]) : addShopping(t);
  save(); render();
  if (!ok) toast('이미 목록에 있어요');
  setTimeout(() => $('#shopInput')?.focus(), 0);
}

async function toggleShop(id) {
  const s = db.shopping.find(x => x.id === id);
  if (!s) return;
  s.done = !s.done; save(); render();
  if (!s.done) return;
  // 샀으면 냉장고에 넣을지 물어보기
  const qtyNum = parseFloat(s.qty) || 1;
  const unitGuess = (String(s.qty).match(/[가-힣a-zA-Z]+/) || ['개'])[0];
  toast(`${s.name} 샀어요`, { label: '냉장고에 넣기', run: () => {
    const staple = db.fridge.some(f => f.staple && nameMatch(f.name, s.name));
    openItem(null, { name: s.name, qty: qtyNum, unit: UNITS.includes(unitGuess) ? unitGuess : '개', exp: guessExp(s.name, '냉장'), expEst: true, staple });
  } });
}

async function aiShopping() {
  if (!db.settings.apiKey) {
    if (await ask('AI 장보기 추천에는 API 키가 필요해요', '설정에서 Anthropic API 키를 넣어 주세요.', '설정 열기', '나중에')) openSettings();
    return;
  }
  const panel = openSheet(sheetHeader('장보기 목록 만드는 중') + loadingCard('냉장고와 목표를 보고 이번 주 장보기를 짜고 있어요'));
  let r;
  try { r = await aiWeeklyShopping(); }
  catch (err) {
    panel.innerHTML = sheetHeader('추천 실패') + `<div class="card"><p>${esc(err.message)}</p></div>`;
    panel.querySelector('[data-x="close"]').onclick = closeSheet;
    return;
  }
  if (!$('#sheet').classList.contains('open')) return;
  const items = r.items.map(i => ({ ...i, on: !db.shopping.some(s => !s.done && nameMatch(s.name, i.name)) }));
  const draw = () => {
    const n = items.filter(i => i.on).length;
    panel.innerHTML = sheetHeader('이번 주 장보기 추천') + `
      ${r.summary ? `<div class="ai-note">${esc(r.summary)}</div>` : ''}
      <section class="card">${items.map((it, i) => `<div class="shop-item" data-i="${i}">
        <button class="check ${it.on ? 'on' : ''}" data-x="toggle">${CHECK_SVG}</button>
        <div class="info"><div class="name">${esc(it.name)} <span class="muted small">${esc(it.qty)}</span></div><div class="src">${esc(it.reason)}</div></div></div>`).join('')}</section>
      <button class="btn primary block" data-x="add" ${n ? '' : 'disabled'}>장보기에 담기 (${n}개)</button>`;
  };
  panel.onclick = (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    if (b.dataset.x === 'close') return closeSheet();
    if (b.dataset.x === 'toggle') { const it = items[+b.closest('[data-i]').dataset.i]; it.on = !it.on; draw(); }
    if (b.dataset.x === 'add') {
      const n = items.filter(i => i.on && addShopping(i.name, 'AI 추천', i.qty)).length;
      save(); closeSheet(); render(); toast(`${n}개를 장보기에 담았어요`);
    }
  };
  draw();
}
