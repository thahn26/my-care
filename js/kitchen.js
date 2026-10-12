// 주방: 냉장고 · 요리 추천 · 장보기
const LOCS = ['냉장', '냉동', '실온'];
const UNITS = ['개', '팩', '모', '봉', '캔', '병', '통', '단', 'g', 'kg', 'ml', 'L', '줄', '송이'];
// 레시피 태그 (여러 개 골라 조합)
const TAG_CHIPS = ['바로 가능', '속편한', '고단백', '다이어트', '든든한', '매콤한', '국물', '도시락', '10분', '전자레인지', '아침', '건강식', '간단한끼', '한식', '양식', '중식', '일식', '분식', '반찬'];
function recipeTags(r) {
  const tg = r.tag || [], t = new Set();
  if (tg.includes('속편한')) t.add('속편한');
  if (r.p >= 20 || tg.includes('고단백')) t.add('고단백');
  if (r.k <= 400 || tg.includes('다이어트')) t.add('다이어트');
  if (r.k >= 550 || tg.includes('든든')) t.add('든든한');
  if (tg.includes('매콤')) t.add('매콤한');
  if (tg.includes('국')) t.add('국물');
  if (r.d) t.add('도시락');
  if (r.t <= 10) t.add('10분');
  if (tg.includes('전자레인지')) t.add('전자레인지');
  if (tg.includes('아침')) t.add('아침');
  for (const [key, label] of [['건강식', '건강식'], ['간단', '간단한끼'], ['한식', '한식'], ['양식', '양식'], ['중식', '중식'], ['일식', '일식'], ['분식', '분식']]) if (tg.includes(key)) t.add(label);
  if (tg.includes('반찬') || tg.includes('상비반찬')) t.add('반찬');
  return [...t];
}

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
    return `<div class="shelf ${cls}"><span class="shelf-lbl">${ZONES[z]}</span><div class="shelf-items">${items.map(f => fridgeChip(f)).join('')}${items.length ? '' : `<button class="fi add" data-action="quickAdd" data-loc="${loc}" aria-label="${ZONES[z]}에 재료 추가">＋</button>`}</div></div>`;
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
        <div class="shelf"><span class="shelf-lbl">냉동실 ❄️</span><div class="shelf-items">${by('freezer').map(f => fridgeChip(f)).join('')}${by('freezer').length ? '' : '<button class="fi add" data-action="quickAdd" data-loc="냉동" aria-label="냉동실에 재료 추가">＋</button>'}</div></div>
        <div class="fz-front"><span class="fz-handle"></span></div>
      </div>
    </div>
    <div class="fr-feet" aria-hidden="true"><i></i><i></i></div>
    <div class="pantry">
      <div class="shelf-items">${pantry.map(f => fridgeChip(f)).join('')}<button class="fi add" data-action="quickAdd" data-loc="실온" aria-label="실온 선반에 재료 추가">＋</button></div>
      <div class="plank"></div><span class="shelf-lbl">실온 선반</span>
    </div>
  </div>`;
}

function renderFridge() {
  const view = db.ui.fridgeView || 'art';
  const soon = db.fridge.filter(f => f.exp && diffDays(f.exp, today()) <= 5).length;
  return `
  <div class="big-actions">
    <button class="big-action" data-action="quickAdd" style="background:var(--kitchen);color:#fff"><span class="ic">🧺</span><b>빠른 추가</b><span style="color:rgba(255,255,255,.9)">그림을 톡톡 눌러 담기</span></button>
    <button class="big-action" data-action="editItem"><span class="ic">✏️</span><b>직접 입력</b><span>이름·수량·유통기한 입력</span></button>
  </div>
  <div class="row-between" style="margin-bottom:10px">
    <div class="seg" style="margin:0;flex:none">
      <button class="${view === 'art' ? 'on' : ''}" data-action="fridgeView" data-v="art" style="padding:6px 12px">냉장고</button>
      <button class="${view === 'list' ? 'on' : ''}" data-action="fridgeView" data-v="list" style="padding:6px 12px">목록</button>
    </div>
    <span class="small muted num">전체 ${db.fridge.length}개${soon ? ` · <b style="color:var(--danger)">임박 ${soon}</b>` : ''}</span>
  </div>
  ${view === 'art' ? renderFridgeArt() + (db.fridge.length ? '' : '<p class="small muted" style="text-align:center;margin:8px 0 0">냉장고가 비어 있어요. ‘빠른 추가’로 재료를 톡톡 담아 보세요.</p>') : renderFridgeList()}
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
    }).join('')}</ul>` : `<p class="empty">${db.fridge.length ? '이 칸은 비어 있어요' : '냉장고가 비어 있어요.<br>‘빠른 추가’로 재료를 톡톡 담아 보세요.'}</p>`}
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

// ── 요리 추천 ──
function recipeView(r, ai = false) {
  // 내장 레시피와 AI 레시피를 같은 모양으로
  if (ai) return { name: r.name, k: r.kcal, p: r.protein, t: r.minutes, tags: r.lunchTip ? ['도시락'] : [], labels: recipeTags({ k: r.kcal, p: r.protein, t: r.minutes, d: r.lunchTip, tag: [] }), ing: r.ingredients.map(i => [i.name, i.amount]), s: r.seasoning, st: r.steps, tip: r.lunchTip, why: r.why, ai: true };
  return { name: r.n, k: r.k, p: r.p, t: r.t, tags: r.tag, labels: recipeTags(r), ing: r.i, s: r.s, st: r.st, tip: r.d || '', why: '', ai: false, raw: r };
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
    <div class="name">${v.ai ? '✨ ' : ''}${esc(v.name)}${v.raw && taste().likeRecipes.includes(v.raw.n) ? ' <span class="liked">♥</span>' : ''}</div>
    <div class="facts num"><span><b>${n0(v.k)}</b>kcal</span><span>단백질 <b>${n1(v.p)}</b>g</span><span>${v.t}분</span>${sc.urgent ? '<span style="color:var(--danger);font-weight:700">임박 재료 사용</span>' : ''}</div>
    <div class="r-tags">${(v.labels || []).filter(t => !['10분'].includes(t)).slice(0, 5).map(t => `<span class="r-tag ${t === '매콤한' ? 'hot' : t === '속편한' ? 'calm' : ''}">${t}</span>`).join('')}</div>
    ${db.fridge.length ? `<div class="have"><span class="muted">재료 ${sc.have}/${sc.total}</span><div class="bar"><i style="width:${sc.ratio * 100}%"></i></div></div>
    ${sc.missing.length ? `<div class="missing">없는 재료: ${sc.missing.map(esc).join(', ')}</div>` : '<div class="missing" style="color:var(--ok);font-weight:600">지금 바로 만들 수 있어요</div>'}` : ''}
  </button>`;
}
function renderRecipes() {
  const sel = db.ui.recipeTags || [];
  let list = RECIPES.map((r, i) => ({ v: recipeView(r), key: 'r' + i }));
  for (const t of sel) list = t === '바로 가능' ? list.filter(x => scoreRecipe(x.v).ratio === 1) : list.filter(x => x.v.labels.includes(t));
  // 냉장고 재료를 많이 쓰는 순 → 유통기한 임박 → 단백질
  const hidden = list.filter(x => recipeBlocked(x.v.raw));
  list = list.filter(x => !recipeBlocked(x.v.raw));
  list.sort((a, b) => {
    const sa = scoreRecipe(a.v), sb = scoreRecipe(b.v);
    return (sb.ratio - sa.ratio) || (recipeLikeScore(b.v.raw) - recipeLikeScore(a.v.raw)) || (sb.have - sa.have) || (sb.urgent - sa.urgent) || (b.v.p - a.v.p);
  });
  const ai = db.aiRecipes || [];
  return `
  ${renderPlanCard()}
  ${db.settings.apiKey ? '<button class="big-action ai" data-action="aiRecipes" style="width:100%;margin-bottom:12px"><span class="ic">✨</span><b>AI에게 맞춤 추천받기</b><span>냉장고 재료 · 오늘 남은 칼로리 · 부족한 단백질을 반영해요</span></button>' : ''}
  ${ai.length ? `<section class="card"><div class="card-h"><h2>AI 추천</h2><button class="link small" data-action="clearAiRecipes">지우기</button></div>
    ${ai.map((r, i) => recipeRow(recipeView(r, true), 'a' + i)).join('')}</section>` : ''}
  <div class="tag-filter">${TAG_CHIPS.map(t => `<button class="chip ${sel.includes(t) ? 'on' : ''}" data-action="recipeTag" data-v="${t}">${t}</button>`).join('')}</div>
  <div class="row-between" style="margin:2px 4px 10px"><span class="small muted num">${sel.length ? `${sel.join(' + ')} · ` : ''}${list.length}개</span>${sel.length ? '<button class="link small" data-action="recipeTagClear">태그 지우기</button>' : ''}</div>
  ${!db.fridge.length ? '<p class="small muted" style="margin:0 4px 10px">냉장고에 재료를 넣으면 있는 재료가 많은 요리부터 보여 드려요.</p>' : ''}
  <section class="card">${list.length ? list.map(x => recipeRow(x.v, x.key)).join('') : '<p class="empty">조건에 맞는 레시피가 없어요</p>'}</section>
  ${hidden.length ? `<button class="link small" data-action="toggleHidden" style="display:block;margin:0 4px 10px">${db.ui.showHidden ? '▾' : '▸'} 내 입맛 때문에 뺀 레시피 ${hidden.length}개</button>
  ${db.ui.showHidden ? `<section class="card faded">${hidden.map(x => recipeRow(x.v, x.key)).join('')}</section>` : ''}` : ''}
  <p class="small muted" style="margin:0 4px">모든 레시피는 속 편한 고단백 다이어트식이에요. 숟 = 밥숟가락, 컵 = 종이컵(약 180ml).</p>`;
}
function recipeByKey(key) {
  if (key[0] === 'a') { const r = db.aiRecipes[+key.slice(1)]; return r && recipeView(r, true); }
  const r = RECIPES[+key.slice(1)]; return r && recipeView(r);
}

function openRecipe(key, meal) {
  const v = recipeByKey(key);
  if (!v) return;
  const sc = scoreRecipe(v);
  const panel = openSheet(sheetHeader(v.name) + `
    <section class="card">
      <div class="facts num" style="display:flex;gap:14px;font-size:15px"><span><b>${n0(v.k)}</b>kcal</span><span>단백질 <b>${n1(v.p)}</b>g</span><span>${v.t}분</span></div>
      ${v.why ? `<p class="small muted" style="margin:8px 0 0">${esc(v.why)}</p>` : ''}
      ${tasteRow(v)}
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
    if (b.dataset.x === 'like' || b.dataset.x === 'dislike') {
      const t = taste(), n = v.raw.n;
      if (b.dataset.x === 'like') { toggleIn(t.likeRecipes, n); t.dislikeRecipes = t.dislikeRecipes.filter(x => x !== n); }
      else { toggleIn(t.dislikeRecipes, n); t.likeRecipes = t.likeRecipes.filter(x => x !== n); }
      save(); render();
      const liked = t.likeRecipes.includes(n), disliked = t.dislikeRecipes.includes(n);
      const card = panel.querySelector('.taste-row').parentElement;
      card.querySelectorAll('.taste-row, .taste-row + p').forEach(el => el.remove());
      card.insertAdjacentHTML('beforeend', tasteRow(v));
      toast(liked ? '좋아요 한 메뉴로 저장했어요' : disliked ? '싫어요 — 추천·식단에서 뺄게요' : '보통으로 되돌렸어요');
      return;
    }
    if (b.dataset.x === 'shop') {
      const added = sc.missing.filter(n => addShopping(n, `레시피: ${v.name}`)).length;
      save(); closeSheet(); render();
      toast(added ? `${added}개를 장보기에 담았어요` : '이미 장보기 목록에 있어요');
    }
    if (b.dataset.x === 'cook') openCooked(v, meal);
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
function openCooked(v, meal) {
  const uses = v.ing.map(([n, a]) => { const f = fridgeHas(n); return f ? { f, take: Math.min(f.qty, parseAmount(a, f.unit)), mode: 'some' } : null; }).filter(Boolean);
  for (const u of uses) if (u.f.qty - u.take <= 0) u.mode = 'all';
  let mealType = meal || mealTypeNow(), logMeal = true;
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
  const unstocked = done.filter(s => !s.stocked).length;
  const row = (s) => `<div class="shop-item ${s.done ? 'done' : ''}">
    <button class="check ${s.done ? 'on' : ''}" data-action="shopToggle" data-id="${s.id}" aria-label="${s.done ? '안 산 것으로' : '샀어요'}">${CHECK_SVG}</button>
    <div class="info"><div class="name">${esc(s.name)} ${s.qty ? `<span class="muted small">${esc(s.qty)}</span>` : ''}</div>${s.src ? `<div class="src">${esc(s.src)}</div>` : ''}</div>
    <button class="x-btn" data-action="shopDel" data-id="${s.id}" aria-label="삭제">×</button></div>`;
  return `
  <div class="big-actions">
    <button class="big-action" data-action="openPlanner" style="background:var(--kitchen);color:#fff"><span class="ic">🗓</span><b>이번 주 식단 짜고 장보기</b><span style="color:rgba(255,255,255,.9)">요일별 끼니를 고르면 자동 계산</span></button>
    <button class="big-action" data-action="stockBought"><span class="ic">🧊</span><b>산 것 냉장고로</b><span>${unstocked ? `체크한 ${unstocked}개를 한 번에` : '산 것을 체크하면 한 번에 넣어요'}</span></button>
  </div>
  ${db.settings.apiKey ? '<button class="big-action ai" data-action="aiShopping" style="width:100%;margin-bottom:12px"><span class="ic">✨</span><b>AI 장보기 추천</b><span>냉장고와 단백질 목표를 보고 AI가 목록 작성</span></button>' : ''}
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
  // 샀으면 바로 냉장고에 넣을 수 있게
  if (s.stocked) return;
  toast(`${s.name} 샀어요`, { label: '냉장고에 넣기', run: () => { stockShopping([s]); } });
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

// ── 빠른 추가 (그림을 눌러 냉장고에 담기) ──
// [이름, 기본 단위, 기본 보관, 분류]
const QUICK = [
  ['대파', '단', '냉장', '채소'], ['양파', '개', '실온', '채소'], ['마늘', '봉', '냉장', '채소'], ['당근', '개', '냉장', '채소'],
  ['오이', '개', '냉장', '채소'], ['애호박', '개', '냉장', '채소'], ['브로콜리', '송이', '냉장', '채소'], ['양배추', '통', '냉장', '채소'],
  ['양상추', '통', '냉장', '채소'], ['시금치', '단', '냉장', '채소'], ['버섯', '팩', '냉장', '채소'], ['파프리카', '개', '냉장', '채소'],
  ['토마토', '개', '냉장', '채소'], ['방울토마토', '팩', '냉장', '채소'], ['감자', '개', '실온', '채소'], ['고구마', '개', '실온', '채소'],
  ['무', '개', '냉장', '채소'], ['콩나물', '봉', '냉장', '채소'], ['단호박', '개', '실온', '채소'], ['아보카도', '개', '실온', '과일'],
  ['바나나', '송이', '실온', '과일'], ['사과', '개', '냉장', '과일'], ['귤', '개', '냉장', '과일'], ['딸기', '팩', '냉장', '과일'],
  ['블루베리', '팩', '냉동', '과일'], ['레몬', '개', '냉장', '과일'],
  ['닭가슴살', '팩', '냉동', '고기·생선'], ['닭안심', '팩', '냉장', '고기·생선'], ['소고기', '팩', '냉장', '고기·생선'], ['돼지고기', '팩', '냉장', '고기·생선'],
  ['연어', '토막', '냉장', '고기·생선'], ['고등어', '토막', '냉장', '고기·생선'], ['흰살생선', '토막', '냉동', '고기·생선'], ['새우', '봉', '냉동', '고기·생선'],
  ['오징어', '마리', '냉동', '고기·생선'], ['훈제연어', '팩', '냉장', '고기·생선'], ['햄', '개', '냉장', '고기·생선'], ['소시지', '봉', '냉장', '고기·생선'],
  ['달걀', '개', '냉장', '달걀·두부·유제품'], ['메추리알', '팩', '냉장', '달걀·두부·유제품'], ['두부', '모', '냉장', '달걀·두부·유제품'], ['연두부', '팩', '냉장', '달걀·두부·유제품'],
  ['순두부', '봉', '냉장', '달걀·두부·유제품'], ['우유', '개', '냉장', '달걀·두부·유제품'], ['무가당 두유', '팩', '냉장', '달걀·두부·유제품'], ['그릭요거트', '통', '냉장', '달걀·두부·유제품'],
  ['치즈', '장', '냉장', '달걀·두부·유제품'], ['코티지치즈', '통', '냉장', '달걀·두부·유제품'], ['버터', '개', '냉장', '달걀·두부·유제품'],
  ['햇반', '개', '실온', '밥·면·빵'], ['쌀', '봉', '실온', '밥·면·빵'], ['식빵', '봉', '실온', '밥·면·빵'], ['통밀빵', '봉', '실온', '밥·면·빵'],
  ['두부면', '팩', '냉장', '밥·면·빵'], ['칼국수면', '봉', '냉장', '밥·면·빵'], ['라면', '개', '실온', '밥·면·빵'], ['만두', '봉', '냉동', '밥·면·빵'], ['오트밀', '봉', '실온', '밥·면·빵'],
  ['다진 고기', '팩', '냉장', '고기·생선'], ['베이컨', '팩', '냉장', '고기·생선'], ['닭', '팩', '냉장', '고기·생선'], ['어묵', '봉', '냉장', '고기·생선'], ['멸치', '봉', '냉동', '고기·생선'],
  ['부추', '단', '냉장', '채소'], ['깻잎', '봉', '냉장', '채소'], ['숙주', '봉', '냉장', '채소'], ['청경채', '봉', '냉장', '채소'],
  ['떡볶이떡', '봉', '냉장', '밥·면·빵'], ['떡국떡', '봉', '냉동', '밥·면·빵'], ['파스타면', '봉', '실온', '밥·면·빵'], ['소면', '봉', '실온', '밥·면·빵'], ['우동면', '개', '냉장', '밥·면·빵'], ['당면', '봉', '실온', '밥·면·빵'], ['또띠아', '봉', '냉동', '밥·면·빵'],
  ['김치', '통', '냉장', '기타'], ['단무지', '개', '냉장', '기타'], ['토마토소스', '병', '실온', '기타'], ['카레', '개', '실온', '기타'], ['진미채', '봉', '냉장', '기타'], ['미역', '봉', '실온', '기타'], ['참치캔', '캔', '실온', '기타'], ['견과류', '봉', '실온', '기타'], ['김', '봉', '실온', '기타'],
  ['단백질 파우더', '통', '실온', '기타'], ['들깨가루', '봉', '냉장', '기타'], ['꿀', '병', '실온', '기타'], ['주스', '개', '냉장', '기타'], ['생수', '병', '실온', '기타'],
];
const QUICK_CATS = ['전체', '채소', '과일', '고기·생선', '달걀·두부·유제품', '밥·면·빵', '기타'];
function quickInfo(name) { return QUICK.find(q => q[0] === name) || QUICK.find(q => nameMatch(q[0], name)); }

// 냉장고에 넣기: 같은 이름·보관·단위가 있으면 수량을 합치고 유통기한은 더 이른 날짜로
function putInFridge({ name, qty = 1, unit, loc }) {
  const info = quickInfo(name);
  unit = unit || info?.[1] || '개';
  loc = loc || info?.[2] || '냉장';
  const exp = guessExp(name, loc);
  const same = db.fridge.find(f => f.name === name && f.loc === loc && f.unit === unit);
  if (same) {
    same.qty = Math.round((same.qty + qty) * 10) / 10;
    if (exp && (!same.exp || exp < same.exp)) { same.exp = exp; same.expEst = true; }
    return same;
  }
  const staple = db.fridge.some(f => f.staple && nameMatch(f.name, name));
  const it = { id: uid(), name, qty, unit, loc, exp, expEst: !!exp, staple, added: today() };
  db.fridge.push(it);
  return it;
}
function markBought(name) { for (const s of db.shopping) if (!s.done && nameMatch(s.name, name)) { s.done = true; s.stocked = true; } }

function openQuickAdd(presetLoc) {
  let cat = '전체', q = '', locMode = presetLoc || '자동';
  const picked = new Map(); // 이름 → 개수
  const panel = openSheet('');
  const listHtml = () => {
    const items = QUICK.filter(it => (cat === '전체' || it[3] === cat) && (!q || it[0].includes(q)));
    const custom = q && !QUICK.some(it => it[0] === q) ? `<button class="fi qa" data-x="pick" data-n="${esc(q)}"><span class="fi-art">${artOf(q)}</span><span class="fi-name">${esc(q)}</span><span class="qa-plus">＋ 새로</span></button>` : '';
    return items.map(([n]) => `<button class="fi qa ${picked.get(n) ? 'on' : ''}" data-x="pick" data-n="${esc(n)}"><span class="fi-art">${artOf(n)}</span><span class="fi-name">${esc(n)}</span>${picked.get(n) ? `<span class="qa-count">${picked.get(n)}</span>` : ''}</button>`).join('') + custom;
  };
  const trayHtml = () => {
    const total = [...picked.values()].reduce((a, b) => a + b, 0);
    return picked.size ? `<div class="qa-tray">${[...picked].map(([n, c]) => `<span class="qa-chip">${esc(n)} ${c}${esc(quickInfo(n)?.[1] || '개')}<button data-x="minus" data-n="${esc(n)}" aria-label="${esc(n)} 하나 빼기">−</button></span>`).join('')}</div>
      <button class="btn primary block" data-x="done">냉장고에 넣기 (${picked.size}종 ${total}개)</button>` : '<p class="small muted" style="text-align:center;margin:6px 0">그림을 누를 때마다 1개씩 담겨요</p>';
  };
  const draw = () => {
    panel.innerHTML = sheetHeader('빠른 추가', '', '<button class="link" data-x="close">닫기</button>') + `
      <div class="field" style="margin-bottom:10px"><input id="qaSearch" class="input" placeholder="찾기 또는 새 재료 이름" value="${esc(q)}" autocomplete="off"></div>
      <div class="seg" style="margin-bottom:10px">${['자동', ...LOCS].map(l => `<button data-x="loc" data-v="${l}" class="${l === locMode ? 'on' : ''}">${l === '자동' ? '보관 자동' : l}</button>`).join('')}</div>
      <div class="chips scroll" style="margin-bottom:10px">${QUICK_CATS.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-x="cat" data-v="${c}">${c}</button>`).join('')}</div>
      <div class="qa-grid" id="qaGrid">${listHtml()}</div>
      <div class="qa-foot" id="qaFoot">${trayHtml()}</div>`;
  };
  const refresh = () => { panel.querySelector('#qaGrid').innerHTML = listHtml(); panel.querySelector('#qaFoot').innerHTML = trayHtml(); };
  panel.addEventListener('input', (e) => { if (e.target.id === 'qaSearch') { q = e.target.value.trim(); refresh(); } });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const x = b.dataset.x;
    if (x === 'close') return closeSheet();
    if (x === 'cat') { cat = b.dataset.v; draw(); }
    else if (x === 'loc') { locMode = b.dataset.v; draw(); }
    else if (x === 'pick') { const n = b.dataset.n; picked.set(n, (picked.get(n) || 0) + 1); refresh(); }
    else if (x === 'minus') { const n = b.dataset.n, c = (picked.get(n) || 0) - 1; c > 0 ? picked.set(n, c) : picked.delete(n); refresh(); }
    else if (x === 'done') {
      for (const [n, c] of picked) { putInFridge({ name: n, qty: c, loc: locMode === '자동' ? null : locMode }); markBought(n); }
      save(); closeSheet(); fridgeAnim = false; render();
      toast(`${picked.size}가지를 냉장고에 넣었어요 · 유통기한은 추정값이라 재료를 눌러 고칠 수 있어요`);
    }
  });
  draw();
}

// 장보기에서 산 것 → 냉장고
// 장보기 수량 글자 → 냉장고 수량 ('10구 1판' → 달걀 10개, '900ml 1개' → 1개, '3공기 분량' → 햇반 3개)
function shopQty(s) {
  const t = String(s.qty || '');
  const eggs = t.match(/(\d+)\s*구/);
  if (eggs) return { qty: +eggs[1], unit: '개' };
  const rice = t.match(/(\d+)\s*공기/);
  if (rice) return { qty: +rice[1], unit: '개', name: '햇반' };
  const cnt = t.match(/(\d+(?:\.\d+)?)\s*(개|모|팩|봉|캔|통|단|송이|토막|병|장|마리)/);
  if (cnt) return { qty: +cnt[1], unit: cnt[2] };
  return { qty: 1, unit: null };
}
function stockShopping(list) {
  let n = 0;
  for (const s of list) {
    const q = shopQty(s), info = quickInfo(q.name || s.name);
    putInFridge({ name: q.name || info?.[0] || s.name, qty: q.qty, unit: q.unit || info?.[1] || '개' });
    s.done = true; s.stocked = true; n++;
  }
  save(); render();
  toast(n ? `${n}개를 냉장고에 넣었어요` : '냉장고에 넣을 산 것이 없어요');
}
function stockBought() {
  const list = db.shopping.filter(s => s.done && !s.stocked);
  if (!list.length) return toast('장보기 목록에서 산 것을 먼저 체크해 주세요');
  stockShopping(list);
}
