// 이번 주 식단 짜기 (AI 없이 내장 레시피로) + 필요한 장보기 계산
const PLAN_MEALS = ['아침', '점심', '저녁'];
const PLAN_ICON = { 아침: '🌅', 점심: '🍱', 저녁: '🌙' };
const PLAN_TAGS = ['속편한', '고단백', '다이어트', '든든한', '매콤한', '국물', '간단한끼', '한식', '양식', '중식', '일식', '분식'];

const planDays = () => [...Array(7)].map((_, i) => addDays(today(), i));
const isWeekday = (k) => { const d = parse(k).getDay(); return d >= 1 && d <= 5; };
const shortDate = (k) => { const d = parse(k); return `${d.getMonth() + 1}/${d.getDate()} (${WD[d.getDay()]})`; };

// 요일(0=일)별로 집밥 먹는 끼니 — 처음엔 평일 점심 도시락 + 매일 저녁
function planPattern() {
  if (!db.settings.planPattern) {
    const p = {};
    for (let wd = 0; wd < 7; wd++) p[wd] = { 아침: false, 점심: wd >= 1 && wd <= 5, 저녁: true };
    db.settings.planPattern = p;
  }
  return db.settings.planPattern;
}

// 같은 seed면 같은 결과, '다시 짜기'는 seed를 바꿔 다른 조합
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 한 끼가 되는지 ──
const CARB_WORDS = ['밥', '면', '빵', '떡', '우동', '국수', '파스타', '감자', '고구마', '오트밀', '또띠아', '만두', '누룽지', '쌀', '단호박'];
const hasCarb = (r) => r.i.some(([n]) => CARB_WORDS.some(c => normName(n).includes(c)));
// 차·과일 컵처럼 끼니가 아닌 것
const isSnack = (r) => (r.tag || []).includes('간식') || /차$|주스|스무디|라떼/.test(r.n) || r.k < 120 || mealRecipe(r).p < 8; // 단백질이 거의 없으면 간식
// 국·반찬·구이처럼 그것만으론 한 끼가 안 되는 메뉴는 밥 반 공기를 곁들여요
function needsRice(r) {
  const t = r.tag || [];
  if (hasCarb(r) || ['아침', '불 없이', '불없이', '샐러드', '쉐이크'].some(x => t.includes(x))) return false;
  return ['국', '반찬', '구이', '볶음', '조림'].some(x => t.includes(x)) || r.k < 300;
}
function mealRecipe(r) { return needsRice(r) ? { ...r, i: [...r.i, ['밥', '반 공기']], k: r.k + 150, p: r.p + 3 } : r; }
// 식단 칸의 값: 'r123'(레시피) 또는 'c:직접 적은 메뉴'
const planR = (key) => key && key[0] === 'r' ? RECIPES[+key.slice(1)] : null;
function planName(key) {
  if (!key) return '';
  if (key.startsWith('c:')) return key.slice(2);
  const r = planR(key);
  return r ? r.n + (needsRice(r) ? ' + 밥 반 공기' : '') : '';
}

function slotFits(r, meal, day) {
  const tags = r.tag || [];
  if (tags.includes('상비반찬') || isSnack(r)) return false; // 반찬·차만으로는 한 끼가 안 됨
  if (tags.includes('쉐이크')) return false;            // 쉐이크는 내가 고른 끼니에만
  if (meal === '아침') return tags.includes('아침') || tags.includes('불 없이') || r.t <= 7;
  // 요거트 볼·토스트 같은 아침 메뉴는 주말이나 저녁의 가벼운 한 끼로만
  if (tags.includes('아침') && (r.k < 200 || (meal === '점심' && isWeekday(day)))) return false;
  if (meal === '점심' && isWeekday(day)) return !!r.d; // 평일 점심은 도시락 가능한 메뉴만
  return true;
}
// 메뉴의 주 단백질 종류 (재료 전체에서 찾음) — 한 주에 골고루 돌리기 위해
const PROTEIN_GROUPS = [['닭', '닭'], ['소고기', '소고기'], ['다진고기', '고기'], ['돼지', '돼지고기'], ['햄', '햄·소시지'], ['소시지', '햄·소시지'],
  ['연어', '생선'], ['생선', '생선'], ['고등어', '생선'], ['대구', '생선'], ['오징어', '오징어'], ['새우', '새우'], ['참치', '참치'], ['어묵', '어묵'],
  ['두부', '두부'], ['두유', '두부'], ['메추리알', '달걀'], ['달걀', '달걀'], ['요거트', '유제품'], ['코티지', '유제품'], ['우유', '유제품']];
function mainIngredient(r) {
  for (const [k, g] of PROTEIN_GROUPS) if (r.i.some(([n]) => normName(n).includes(k))) return g;
  return normName(r.i[0][0]);
}

// ── 냉장고 재고를 따라가며 식단 짜기 ──
// 한 끼씩 채울 때마다 쓴 만큼 '가상 냉장고'에서 빼서, 두부 1모로 두부 메뉴를 세 번 넣는 일을 막는다.
function planStock() {
  return db.fridge.filter(f => !(f.exp && f.exp < today())).map(f => ({ name: f.name, qty: +f.qty || 0, unit: f.unit, exp: f.exp, uses: 0 }));
}
const sameUnit = (u, stockUnit) => u === stockUnit || (u === '공기' && stockUnit === '개');
function stockUse(stock, name, amount) {
  // 쌀이 있으면 밥은 지어 먹으면 되니 떨어지지 않는 걸로
  if (normName(name) === '밥') { const rice = stock.find(x => normName(x.name).includes('쌀') && x.qty > 0); if (rice) return { st: rice, take: 0 }; }
  const st = stock.find(x => covers(x.name, name) && x.qty > 0.05);
  if (!st) return null;
  const q = parseQty(amount);
  if (sameUnit(q.u, st.unit)) return q.n <= st.qty + 0.05 ? { st, take: q.n } : null; // 양이 모자라면 없는 걸로
  return st.uses < (q.u === '조금' ? 5 : 2) ? { st, take: 0 } : null;                // 단위가 달라 못 재면 2번까지
}
function coverage(r, stock) {
  let have = 0, urgent = false;
  const items = [], miss = [];
  for (const [n, a] of r.i) {
    const u = stockUse(stock, n, a);
    if (!u) { miss.push(n); continue; }
    have++;
    items.push(u.st);
    if (u.st.exp && diffDays(u.st.exp, today()) <= 3) urgent = true;
  }
  return { have, total: r.i.length, ratio: r.i.length ? have / r.i.length : 0, urgent, items, miss, main: !miss.includes(r.i[0][0]) };
}
function consumeStock(r, stock) {
  for (const [n, a] of r.i) {
    const u = stockUse(stock, n, a);
    if (!u) continue;
    if (u.take) u.st.qty -= u.take; else u.st.uses++;
  }
}

// slots: [{ day, meal }] → 각 칸에 레시피 키('r'+번호), 사야 할 재료 수, 바꿀 후보 목록
// 1순위: 냉장고 재료로 다 되는 메뉴 → 거의 되는 메뉴. 고른 태그는 그다음으로 반영
function buildPlan(slots, seed, wantTags = [], wishes = []) {
  const rand = seededRandom(seed);
  const stock = planStock();
  const used = {}, mains = {}, byDay = {};
  // 먹고 싶다고 한 메뉴는 맞는 끼니에 먼저 자리를 잡는다
  const fixed = {};
  // 쉐이크로 고른 끼니는 쉐이크로
  const shakeIdx = RECIPES.findIndex(r => (r.tag || []).includes('쉐이크'));
  slots.forEach((s, i) => { if (s.shake && shakeIdx >= 0) fixed[i] = 'r' + shakeIdx; });
  for (const w of wishes.filter(w => w.type === 'recipe')) {
    const ri = RECIPES.findIndex(r => r.n === w.name);
    if (ri < 0) continue;
    let si = slots.findIndex((s, i) => fixed[i] == null && slotFits(RECIPES[ri], s.meal, s.day));
    if (si < 0) si = slots.findIndex((s, i) => fixed[i] == null);
    if (si >= 0) fixed[si] = 'r' + ri;
  }
  const wishIngs = wishes.filter(w => w.type === 'ing').map(w => ({ name: w.name, done: false }));
  const touched = new Set(); // 이번 식단에 이미 한 번 쓴 냉장고 재료
  return slots.map((s, si) => {
    const dayIdx = diffDays(s.day, today());
    const scored = RECIPES.map((r, i) => ({ r, key: 'r' + i }))
      .filter(c => fixed[si] ? c.key === fixed[si] : slotFits(c.r, s.meal, s.day) && !recipeBlocked(c.r))
      .map(c => {
        const m = mealRecipe(c.r), cov = coverage(m, stock);
        // 냉장고가 1순위: 있는 재료를 많이 쓰고, 아직 안 쓴 재료를 쓰고, 사야 할 게 적은 메뉴
        const missing = cov.total - cov.have, fresh = cov.items.filter(st => !touched.has(st)).length;
        // 채소는 냉장고의 다른 채소로 바꿔 써도 되니 덜 깎아요
        const hasVeg = stock.some(x => x.qty > 0.05 && ingredientGroup(x.name) === '채소');
        const missPenalty = cov.miss.reduce((a, n) => a + (hasVeg && ingredientGroup(n) === '채소' ? 4 : 12), 0);
        let score = cov.have * 10 + fresh * 18 - missPenalty + (missing === 0 ? 15 : 0) + (cov.main && cov.have ? 15 : 0) + rand() * 4 + c.r.p / 10;
        if (cov.urgent) score += Math.max(0, 20 - dayIdx * 4);          // 임박 재료는 앞쪽 날에
        if (wantTags.length) {                                          // 고른 스타일은 그다음
          const labels = recipeTags(c.r), hit = wantTags.filter(t => labels.includes(t)).length;
          score += hit === wantTags.length ? 8 : hit * 3;
        }
        score += Math.min(recipeLikeScore(c.r), 3) * 3;                   // 좋아하는 메뉴·재료·맛
        for (const w of wishIngs) if (!w.done && recipeHasIng(c.r, w.name)) score += 30; // 먹고 싶은 재료
        const u = used[c.key] || 0;
        score -= u >= 2 ? 100 : u * 8;                                   // 한 주에 같은 메뉴 최대 2번
        if ((byDay[s.day] || []).includes(c.key)) score -= 100;
        if ((byDay[addDays(s.day, -1)] || []).includes(c.key) || (byDay[addDays(s.day, -2)] || []).includes(c.key)) score -= 45; // 이틀 안에 같은 메뉴 X
        const mc = mains[mainIngredient(c.r)] || 0;
        score -= mc >= 3 ? 40 : mc * 4;                                  // 같은 단백질은 한 주에 3번까지
        return { ...c, cov, score };
      })
      .sort((a, b) => b.score - a.score);
    const pick = scored[0];
    if (!pick) return { ...s, key: null, alts: [], missing: 0 };
    for (const st of pick.cov.items) touched.add(st);
    consumeStock(mealRecipe(pick.r), stock);
    for (const w of wishIngs) if (recipeHasIng(pick.r, w.name)) w.done = true;
    used[pick.key] = (used[pick.key] || 0) + 1;
    mains[mainIngredient(pick.r)] = (mains[mainIngredient(pick.r)] || 0) + 1;
    (byDay[s.day] ||= []).push(pick.key);
    const alts = fixed[si] ? [pick.key, ...RECIPES.map((r, i) => ({ r, key: 'r' + i })).filter(c => c.key !== pick.key && slotFits(c.r, s.meal, s.day) && !recipeBlocked(c.r)).slice(0, 11).map(c => c.key)] : scored.slice(0, 12).map(x => x.key);
    return { ...s, key: pick.key, wished: !!fixed[si], missing: pick.cov.total - pick.cov.have, alts };
  });
}

// 메뉴를 바꾼 뒤 각 칸이 냉장고로 되는지 다시 계산
function recheckPlan(plan) {
  const stock = planStock();
  for (const s of plan) {
    const r0 = planR(s.key);
    if (!r0) { s.missing = 0; continue; }
    const r = mealRecipe(r0), cov = coverage(r, stock);
    s.missing = cov.total - cov.have;
    consumeStock(r, stock);
  }
}

// ── 분량 계산 ──
function parseQty(a) {
  a = String(a);
  const paren = a.match(/\((\d+(?:\.\d+)?)\s*(g|ml)\)/);
  if (paren) return { n: +paren[1], u: paren[2] };
  const fr = a.match(/(\d+)\s*\/\s*(\d+)\s*([가-힣a-zA-Z]*)/);
  if (fr) return { n: +fr[1] / +fr[2], u: fr[3] || '개' };
  const num = a.match(/(\d+(?:\.\d+)?)\s*([가-힣a-zA-Z]*)/);
  if (num) return { n: +num[1], u: num[2] || '개' };
  if (/반/.test(a)) return { n: 0.5, u: a.replace(/반\s*/, '').trim() || '개' };
  if (/한\s*줌/.test(a)) return { n: 1, u: '줌' };
  return { n: 0, u: '조금' };
}
const COUNT_UNITS = ['개', '모', '팩', '송이', '토막', '장', '캔', '봉', '통', '마리', '인분'];
function buyLabel(name, sums) {
  const n = (u) => sums[u] || 0;
  const ceil = (v) => Math.max(1, Math.ceil(v - 0.05));
  switch (normName(name)) {
    case '달걀': { const c = n('개'); return c <= 10 ? '10구 1판' : c <= 15 ? '15구 1판' : '30구 1판'; }
    case '메추리알': return '깐 메추리알 1팩';
    case '두부': return `${ceil(n('모'))}모`;
    case '연두부': case '순두부': return `${ceil(n('팩') + n('봉'))}팩`;
    case '닭가슴살': return `${ceil(n('팩'))}팩`;
    case '닭안심': return n('조각') > 5 ? '1kg' : '500g';
    case '소고기': return `${Math.ceil((n('g') || 100) / 100) * 100}g`;
    case '새우': return '냉동 1봉';
    case '참치캔': return `${ceil(n('캔'))}캔`;
    case '그릭요거트': return `${ceil(n('통') + n('g') / 150 + n('숟') / 10)}통`;
    case '우유': case '저지방우유': { const ml = n('컵') * 180 + n('ml'); return ml <= 900 ? '900ml 1개' : `900ml ${Math.ceil(ml / 900)}개`; }
    case '두유': return `${ceil(n('팩'))}팩`;
    case '밥': return `${ceil(n('공기'))}공기 분량 (햇반 또는 쌀)`;
    case '대파': case '시금치': case '미나리': return '1단';
    case '양배추': return '1/4통';
    case '양상추': return '1통';
    case '버섯': case '방울토마토': case '블루베리': return '1팩';
    case '오트밀': case '들깨가루': case '김': return '1봉';
    case '치즈': return '슬라이스 1팩';
    case '코티지치즈': return '1통';
    case '단백질파우더': return '1통';
    default: {
      const unit = Object.keys(sums).find(u => COUNT_UNITS.includes(u));
      if (unit) return `${ceil(n(unit))}${unit}`;
      if (n('g')) return `${Math.ceil(n('g') / 100) * 100}g`;
      return '1개';
    }
  }
}

// 식단 → 장보기 목록 (냉장고에 이미 있는 건 빼고)
function planShopping(plan) {
  const need = new Map(); // 정규화 이름 → { name, sums, recipes:Set, meals }
  for (const s of plan) {
    const r0 = planR(s.key);
    if (!r0) continue;
    const r = mealRecipe(r0);
    for (const [name, amount] of r.i) {
      const k = normName(name);
      const e = need.get(k) || { name, sums: {}, recipes: new Set(), meals: 0 };
      const q = parseQty(amount);
      e.sums[q.u] = (e.sums[q.u] || 0) + q.n;
      e.recipes.add(r.n); e.meals++;
      need.set(k, e);
    }
  }
  const out = [];
  for (const e of need.values()) {
    if (ANY_ING[normName(e.name)]) continue; // 냉장고 털이 재료는 사지 않음
    if (normName(e.name) === '밥' && db.fridge.some(x => normName(x.name).includes('쌀'))) continue;
    const f = fridgeHas(e.name);
    if (f) {
      if (e.sums[f.unit] == null) continue;           // 단위가 달라 비교가 어려우면 있는 걸로 침
      e.sums[f.unit] -= f.qty;
      if (e.sums[f.unit] <= 0.05) continue;           // 냉장고 것으로 충분
      Object.keys(e.sums).forEach(u => { if (u !== f.unit) delete e.sums[u]; });
    }
    const rs = [...e.recipes];
    out.push({ name: e.name, qty: buyLabel(e.name, e.sums), reason: `${rs.slice(0, 2).join('·')}${rs.length > 2 ? ` 외 ${rs.length - 2}개` : ''} · ${e.meals}끼`, meals: e.meals, on: !db.shopping.some(x => !x.done && nameMatch(x.name, e.name)) });
  }
  return out.sort((a, b) => b.meals - a.meals);
}

// ── 화면 ──
function openPlanner() {
  const days = planDays(), pat = planPattern();
  const sel = {}; // 'day|meal' → true
  for (const d of days) for (const m of PLAN_MEALS) if (pat[parse(d).getDay()][m]) sel[`${d}|${m}`] = pat[parse(d).getDay()][m];
  let seed = Date.now() % 100000, plan = null, shop = [];
  let want = [...(db.settings.planTags || [])];
  let wishes = [], wishQ = ''; // [{ type: 'recipe'|'ing', name }]
  const panel = openSheet('');

  const count = () => Object.values(sel).filter(Boolean).length;
  const drawPick = () => {
    panel.innerHTML = sheetHeader('이번 주 식단 짜기') + `
      <section class="card">
        <p class="small muted" style="margin:0 0 10px">집에서 먹을 끼니를 눌러 주세요. 한 번 더 누르면 🥤 쉐이크로 대신해요(하루 한 번까지). 평일 점심은 도시락 메뉴로 골라요.</p>
        <table class="plan-grid"><thead><tr><th></th>${PLAN_MEALS.map(m => `<th>${PLAN_ICON[m]} ${m}</th>`).join('')}</tr></thead>
        <tbody>${days.map(d => `<tr><th class="${parse(d).getDay() % 6 === 0 ? 'we' : ''}">${shortDate(d)}</th>${PLAN_MEALS.map(m => `<td><button class="pg ${sel[`${d}|${m}`] ? 'on' : ''} ${sel[`${d}|${m}`] === 'shake' ? 'shake' : ''}" data-x="cell" data-k="${d}|${m}" aria-label="${shortDate(d)} ${m}">${sel[`${d}|${m}`] === 'shake' ? '🥤' : sel[`${d}|${m}`] ? CHECK_SVG : ''}</button></td>`).join('')}</tr>`).join('')}</tbody></table>
        <div class="chips" style="margin-top:12px">
          <button class="chip" data-x="preset" data-v="lunchdinner">평일 점심 + 매일 저녁</button>
          <button class="chip" data-x="preset" data-v="dinner">매일 저녁</button>
          <button class="chip" data-x="preset" data-v="all">전부</button>
          <button class="chip" data-x="preset" data-v="none">비우기</button>
        </div>
      </section>
      <section class="card">
        <div class="card-h" style="margin-bottom:6px"><h2>😋 이번 주에 먹고 싶은 거 있어요?</h2><span class="meta">선택</span></div>
        <p class="small muted" style="margin:0 0 10px">메뉴를 고르면 식단에 꼭 넣고, 재료를 적으면 그 재료로 만드는 메뉴를 넣어요.</p>
        ${wishes.length ? `<div class="chips" style="margin-bottom:10px">${wishes.map((w, i) => `<span class="taste-chip wish">${w.type === 'ing' ? '🥕 ' : '🍽 '}${esc(w.name)}<button data-x="unwish" data-i="${i}" aria-label="${esc(w.name)} 빼기">×</button></span>`).join('')}</div>` : ''}
        <input id="wishInput" class="input" placeholder="예: 떡볶이, 카레, 연어" value="${esc(wishQ)}" autocomplete="off">
        <div id="wishSuggest">${wishSuggestHtml()}</div>
      </section>
      <section class="card">
        <div class="card-h" style="margin-bottom:6px"><h2>먹고 싶은 스타일</h2><span class="meta">선택</span></div>
        <p class="small muted" style="margin:0 0 10px">냉장고 재료로 되는 메뉴가 1순위이고, 고른 태그는 그다음으로 반영해요. 안 고르면 전체에서 골라요.</p>
        <div class="chips">${PLAN_TAGS.map(t => `<button class="chip ${want.includes(t) ? 'on' : ''}" data-x="want" data-v="${t}">${t}</button>`).join('')}</div>
      </section>
      <button class="btn primary block" data-x="build" ${count() ? '' : 'disabled'}>식단 짜기 (${count()}끼)</button>`;
  };

  function wishSuggestHtml() {
    const q = wishQ.replace(/\s+/g, '');
    if (!q) return '';
    // 직접 고른 메뉴는 싫어요여도 넣어 주되, 못 먹는 것(알레르기)은 끝까지 막는다
    const hits = RECIPES.filter(r => r.n.replace(/\s+/g, '').includes(q) && !String(recipeBlocked(r) || '').startsWith('못 먹는') && !wishes.some(w => w.name === r.n)).slice(0, 5);
    return `<div class="suggest">${hits.map(r => `<button data-x="wish" data-t="recipe" data-n="${esc(r.n)}"><span>🍽 ${esc(r.n)}</span><small class="num">${r.p}g · ${r.k}kcal</small></button>`).join('')}
      <button data-x="wish" data-t="ing" data-n="${esc(wishQ.trim())}"><span>🥕 '${esc(wishQ.trim())}' 들어간 메뉴 넣기</span><small>재료</small></button></div>`;
  }
  panel.addEventListener('input', (e) => {
    if (e.target.id !== 'wishInput') return;
    wishQ = e.target.value;
    panel.querySelector('#wishSuggest').innerHTML = wishSuggestHtml();
  });

  const drawResult = () => {
    const g = goals();
    const byDay = days.map(d => ({ d, slots: plan.filter(s => s.day === d) })).filter(x => x.slots.length);
    const n = shop.filter(i => i.on).length;
    const ok = plan.filter(s => s.key && !s.missing).length, need = plan.filter(s => s.key && s.missing).length;
    panel.innerHTML = sheetHeader('이번 주 식단', '<button class="link" data-x="back">끼니 수정</button>', '<button class="link" data-x="close">닫기</button>') + `
      <div class="plan-summary"><span class="ok">🧊 장 안 보고 가능 <b class="num">${ok}</b>끼</span><span class="need">🛒 장 봐야 <b class="num">${need}</b>끼</span></div>
      ${fridgeUseHtml(plan)}
      <section class="card">
        ${byDay.map(({ d, slots }) => {
          const p = slots.reduce((a, s) => a + (planR(s.key) ? mealRecipe(planR(s.key)).p : 0), 0);
          return `<div class="plan-day"><div class="row-between"><b>${shortDate(d)}</b><span class="small muted num">단백질 ${n0(p)}g${slots.length === 3 ? ` / ${g.protein}g` : ''}</span></div>
            ${slots.map(s => { const r = planR(s.key), m = r && mealRecipe(r), mine = s.key && s.key.startsWith('c:'); return `<div class="plan-slot"><span class="ps-meal">${PLAN_ICON[s.meal]} ${s.meal}</span>
              <span class="ps-name">${s.wished ? '<span class="wish-star">⭐</span>' : ''}${s.key ? esc(planName(s.key)) : '맞는 메뉴 없음'}<small class="num">${m ? ` ${m.p}g · ${m.k}kcal` : ''}</small>${mine ? '<span class="ps-badge ok">직접 넣음</span>' : r ? (s.missing ? `<span class="ps-badge need">+${s.missing}개 사야 해요</span>` : '<span class="ps-badge ok">냉장고 재료로 OK</span>') : ''}</span>
              <span class="ps-btns"><button class="btn sm" data-x="swap" data-k="${s.day}|${s.meal}">바꾸기</button><button class="btn sm" data-x="mine" data-k="${s.day}|${s.meal}">직접</button></span></div>`; }).join('')}</div>`;
        }).join('')}
        <button class="btn block sm" data-x="reroll" style="margin-top:6px">🔀 전부 다시 짜기</button>
      </section>
      <div class="section-title">필요한 장보기 <span class="muted">(냉장고에 있는 건 뺐어요)</span></div>
      <section class="card">${shop.length ? shop.map((it, i) => `<div class="shop-item" data-i="${i}">
        <button class="check ${it.on ? 'on' : ''}" data-x="toggle" aria-label="${esc(it.name)} 담기">${CHECK_SVG}</button>
        <div class="info"><div class="name">${esc(it.name)} <span class="muted small">${esc(it.qty)}</span></div><div class="src">${esc(it.reason)}</div></div></div>`).join('') : '<p class="empty">냉장고 재료로 충분해요 🎉</p>'}
        <p class="small muted" style="margin:8px 0 0">양념(간장·소금·참기름 등)은 목록에서 뺐어요.</p>
      </section>
      <button class="btn primary block" data-x="save">식단 저장${n ? ` + 장보기 ${n}개 담기` : ''}</button>`;
  };

  const build = () => {
    const slots = [];
    for (const d of days) for (const m of PLAN_MEALS) if (sel[`${d}|${m}`]) slots.push({ day: d, meal: m, shake: sel[`${d}|${m}`] === 'shake' });
    plan = buildPlan(slots, seed, want, wishes);
    shop = planShopping(plan);
    drawResult();
  };

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const x = b.dataset.x;
    if (x === 'close') return closeSheet();
    if (x === 'cell') {
      const k = b.dataset.k, v = sel[k], day = k.split('|')[0];
      const shakeToday = PLAN_MEALS.some(m => `${day}|${m}` !== k && sel[`${day}|${m}`] === 'shake');
      sel[k] = !v ? true : v === true && !shakeToday ? 'shake' : false;
      drawPick();
    }
    else if (x === 'wish') {
      wishes.push({ type: b.dataset.t, name: b.dataset.n });
      wishQ = ''; drawPick();
    }
    else if (x === 'unwish') { wishes.splice(+b.dataset.i, 1); drawPick(); }
    else if (x === 'want') { const t = b.dataset.v; want = want.includes(t) ? want.filter(v => v !== t) : [...want, t]; drawPick(); }
    else if (x === 'preset') {
      for (const d of days) for (const m of PLAN_MEALS) {
        const wd = parse(d).getDay(), v = b.dataset.v;
        sel[`${d}|${m}`] = v === 'all' || (v === 'dinner' && m === '저녁') || (v === 'lunchdinner' && (m === '저녁' || (m === '점심' && wd >= 1 && wd <= 5)));
      }
      drawPick();
    }
    else if (x === 'build') {
      // 고른 끼니를 요일 패턴으로 기억
      const p = {};
      for (const d of days) p[parse(d).getDay()] = Object.fromEntries(PLAN_MEALS.map(m => [m, sel[`${d}|${m}`] === 'shake' ? 'shake' : !!sel[`${d}|${m}`]]));
      db.settings.planPattern = p; db.settings.planTags = want; save();
      build();
    }
    else if (x === 'back') drawPick();
    else if (x === 'reroll') { seed += 7919; build(); }
    else if (x === 'swap') {
      const s = plan.find(v => `${v.day}|${v.meal}` === b.dataset.k);
      const sameDay = plan.filter(v => v.day === s.day && v !== s).map(v => v.key);
      const alts = s.alts.filter(k => !sameDay.includes(k));
      if (alts.length) { s.key = alts[(alts.indexOf(s.key) + 1) % alts.length]; recheckPlan(plan); shop = planShopping(plan); drawResult(); }
    }
    else if (x === 'mine') {
      const s = plan.find(v => `${v.day}|${v.meal}` === b.dataset.k);
      openPlanSlotEdit(s.day, s.meal, (key) => {
        if (key === undefined) return;
        if (!s.alts.length && planR(s.key)) s.alts = [s.key];
        s.key = key; s.wished = false; recheckPlan(plan); shop = planShopping(plan); drawResult();
      }, true);
    }
    else if (x === 'toggle') { const it = shop[+b.closest('[data-i]').dataset.i]; it.on = !it.on; drawResult(); }
    else if (x === 'save') {
      const daysMap = {};
      for (const s of plan) if (s.key) (daysMap[s.day] ||= {})[s.meal] = s.key;
      db.plan = { created: today(), days: daysMap };
      const added = shop.filter(i => i.on && addShopping(i.name, '이번 주 식단', i.qty)).length;
      save(); closeSheet(); render();
      toast(`식단을 저장했어요${added ? ` · 장보기 ${added}개 담았어요` : ''}`);
    }
  });
  drawPick();
}

// 식단 결과: 냉장고 재료가 이번 식단에 들어갔는지
function fridgeUseHtml(plan) {
  const items = db.fridge.filter(f => !(f.exp && f.exp < today()) && !['생수', '주스'].some(w => normName(f.name).includes(w)));
  if (!items.length) return '';
  const recs = plan.map(s => planR(s.key)).filter(Boolean).map(mealRecipe);
  const rows = items.map(f => {
    const rice = normName(f.name).includes('쌀'); // 쌀은 '밥'이 들어간 메뉴에 쓰여요
    const n = recs.filter(r => r.i.some(([x]) => covers(f.name, x) || (rice && normName(x) === '밥'))).length;
    const none = !n && !recipesForIng(f.name).length;
    return { f, n, none };
  }).sort((a, b) => (a.n > 0) - (b.n > 0) || (a.f.exp || '9').localeCompare(b.f.exp || '9'));
  const usedN = rows.filter(x => x.n).length;
  return `<section class="card"><div class="card-h"><h2>🧊 냉장고 재료 쓰임</h2><span class="meta num">${usedN}/${rows.length}개 사용</span></div>
    <div class="chips">${rows.map(({ f, n, none }) => `<span class="fu-chip ${n ? 'used' : none ? 'none' : ''}">${n ? '✓ ' : ''}${esc(f.name)}${n > 1 ? ` ×${n}` : ''}${none ? ' · 레시피 없음' : ''}</span>`).join('')}</div>
    ${rows.some(x => !x.n && !x.none) ? '<p class="small muted" style="margin:8px 0 0">회색은 이번 식단엔 안 들어간 재료예요. 끼니를 늘리거나 ‘바꾸기’로 넣을 수 있어요.</p>' : ''}
    ${rows.some(x => x.none) ? '<p class="small muted" style="margin:4px 0 0">‘레시피 없음’ 재료는 Claude에게 알려 주면 레시피를 넣어 드려요.</p>' : ''}</section>`;
}

// 저장된 식단 중 오늘 이후 것
function upcomingPlan() {
  const days = db.plan?.days || {};
  return Object.keys(days).filter(d => d >= today()).sort().map(d => ({ d, meals: days[d] }));
}

// 요리 추천 탭 맨 위 카드
function renderPlanCard() {
  const up = upcomingPlan();
  if (!up.length) return `<button class="big-action" data-action="openPlanner" style="width:100%;margin-bottom:12px;background:var(--kitchen);color:#fff"><span class="ic">🗓</span><b>이번 주 식단 짜기</b><span style="color:rgba(255,255,255,.9)">요일별로 집밥 끼니를 고르면 메뉴와 장보기를 자동으로 짜 줘요 (무료)</span></button>`;
  return `<section class="card"><div class="card-h"><h2>🗓 이번 주 식단</h2><button class="link small" data-action="openPlanner">다시 짜기</button></div>
    ${up.slice(0, 7).map(({ d, meals }) => `<div class="plan-day compact"><b class="small">${d === today() ? '오늘' : shortDate(d)}</b>
      ${PLAN_MEALS.map(m => planSlotRow(d, m, meals[m], true)).join('')}</div>`).join('')}
    <p class="small muted" style="margin:8px 0 0">✎를 누르면 그 끼니를 직접 바꾸거나 내가 먹을 메뉴를 적을 수 있어요.</p>
  </section>`;
}

// 저장된 식단 한 칸: 레시피면 누르면 레시피, 직접 적은 메뉴면 글자만. ✎로 바꾸기
function planSlotRow(day, m, key, showEmpty = false) {
  if (!key && !(showEmpty && m !== '아침')) return '';
  const r = planR(key), mr = r && mealRecipe(r);
  const done = r && peekDay(day).meals.some(x => x.src === 'recipe' && x.name === r.n);
  const body = `<span class="ps-meal">${PLAN_ICON[m]} ${m}</span><span class="ps-name">${key ? esc(planName(key)) : '<span class="muted">비어 있어요</span>'}${mr ? `<small class="num"> ${mr.p}g</small>` : ''}</span>`;
  return `<div class="plan-slot-wrap">${r ? `<button class="plan-slot link-row" data-action="planRecipe" data-key="${key}" data-meal="${m}">${body}${done ? '<span class="ok-badge">완료</span>' : '<span class="chev">›</span>'}</button>` : `<div class="plan-slot">${body}</div>`}
    <button class="x-btn ps-edit" data-action="planSlotEdit" data-date="${day}" data-meal="${m}" aria-label="${m} 직접 바꾸기">${key ? '✎' : '＋'}</button></div>`;
}
// 한 끼 직접 넣기: 레시피 검색 또는 아무 메뉴나 적기
function openPlanSlotEdit(day, meal, done, keepSheet = false) {
  let q = '';
  const host = keepSheet ? document.createElement('div') : null;
  const panel = keepSheet ? host : openSheet('', { onClose: () => render() });
  if (keepSheet) { host.className = 'sheet open'; host.style.zIndex = 70; host.innerHTML = '<div class="backdrop"></div><div class="panel"></div>'; document.body.appendChild(host); }
  const box = keepSheet ? host.querySelector('.panel') : panel;
  const finish = (key) => { if (keepSheet) host.remove(); else closeSheet(); done(key); };
  const list = () => {
    const t = q.replace(/\s+/g, '');
    const hits = t ? RECIPES.map((r, i) => ({ r, i })).filter(x => x.r.n.replace(/\s+/g, '').includes(t) && !(x.r.tag || []).includes('상비반찬')).slice(0, 6) : [];
    return `${hits.map(x => `<button data-y="pick" data-k="r${x.i}"><span>🍽 ${esc(x.r.n)}</span><small class="num">${x.r.p}g · ${x.r.k}kcal</small></button>`).join('')}
      ${q.trim() ? `<button data-y="pick" data-k="c:${esc(q.trim())}"><span>✏️ ‘${esc(q.trim())}’ 그대로 넣기</span><small>직접</small></button>` : ''}`;
  };
  const draw = () => {
    box.innerHTML = sheetHeader(`${shortDate(day)} ${meal}`, '', '<button class="link" data-y="cancel">취소</button>') + `
      <section class="card"><p class="small muted" style="margin:0 0 8px">레시피를 찾거나, 먹을 메뉴를 그대로 적어요. 예: 그릭요거트 + 아보카도, 회사 식당, 순대 반 접시</p>
        <input id="slotQ" class="input" placeholder="메뉴 이름" autocomplete="off" value="${esc(q)}">
        <div class="suggest" id="slotList">${list()}</div></section>
      <div class="btn-row"><button class="btn" data-y="pick" data-k="">이 끼니 비우기</button></div>`;
    const inp = box.querySelector('#slotQ'); inp.focus();
  };
  box.addEventListener('input', (e) => { if (e.target.id === 'slotQ') { q = e.target.value; box.querySelector('#slotList').innerHTML = list(); } });
  box.addEventListener('keydown', (e) => { if (e.target.id === 'slotQ' && e.key === 'Enter' && q.trim()) finish('c:' + q.trim()); });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-y]'); if (!b) return;
    if (b.dataset.y === 'cancel') { if (keepSheet) host.remove(); else closeSheet(); return; }
    if (b.dataset.y === 'pick') finish(b.dataset.k || null);
  });
  if (keepSheet) host.querySelector('.backdrop').onclick = () => host.remove();
  draw();
}
function editSavedSlot(day, meal) {
  openPlanSlotEdit(day, meal, (key) => {
    db.plan = db.plan || { created: today(), days: {} };
    const d = db.plan.days[day] = db.plan.days[day] || {};
    if (key) d[meal] = key; else delete d[meal];
    save(); render(); toast(key ? '식단에 넣었어요' : '이 끼니를 비웠어요');
  });
}

// 홈: 선택한 날의 식단
function renderTodayPlan(day) {
  const meals = db.plan?.days?.[day];
  if (!meals) return '';
  const rows = PLAN_MEALS.filter(m => meals[m]).map(m => planSlotRow(day, m, meals[m])).join('');
  return `<section class="card"><div class="card-h"><h2>${day === today() ? '오늘' : dateLabel(day)}의 식단</h2><button class="link small" data-action="kitchen" data-sub="recipes">이번 주 ›</button></div>${rows}</section>`;
}
