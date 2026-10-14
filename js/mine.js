// 내 맞춤 (data/my-diet.js): 식단 기본값 설치 + 홈의 영양제·야식·체중 카드 + 식단의 쉐이크 카드
function installDiet() {
  const s = db.settings;
  if ((s.myDietV || 0) >= MY_DIET_V) return;
  const p = s.profile;
  if (!p.sex) Object.assign(p, { sex: 'f', age: 26, height: 168, weight: 62, activity: 1.375, goal: '감량' });
  if (!s.kcalGoal) s.kcalGoal = 1400;
  if (!s.proteinGoal) s.proteinGoal = 55;
  s.proteinLimit = true; // 신장 한쪽: 단백질은 '채울 목표'가 아니라 '넘지 않을 선'
  const t = taste(), add = (list, xs) => { for (const x of xs) if (!list.includes(x)) list.push(x); };
  add(t.dislikeIngs, ['오이']);
  add(t.dislikeStyles, ['매콤한']);
  add(t.likeIngs, ['닭', '돼지고기', '소고기', '생선', '달걀']);
  add(t.likeRecipes, ['가벼운 마제소바', '순한 카레우동', '닭가슴살 채소 카레', '간장 떡볶이 (곤약떡 반반)', '낫또 달걀 덮밥', '그릭요거트 과일 볼']);
  if (!db.favorites.some(f => f.name.includes('단백질 쉐이크'))) db.favorites.unshift({ id: uid(), name: '단백질 쉐이크 (식사 대용)', kcal: 200, protein: 19, servings: 1 });
  s.myDietV = MY_DIET_V;
  save();
}

// ── 영양제 ──
function suppData() {
  if (!db.supp) db.supp = { slots: structuredClone(MY_SUPP), log: {}, blood: '', ironAlt: false };
  return db.supp;
}
// 그날 빼는 영양제와 이유
function suppSkip(item, k) {
  const s = suppData();
  if (/비오틴/.test(item) && s.blood) { const n = diffDays(s.blood, k); if (n >= 0 && n <= 3) return n === 0 ? '오늘 혈액검사' : `혈액검사 ${n}일 전`; }
  if (/철분/.test(item) && s.ironAlt && diffDays(k, s.ironAlt) % 2) return '이틀에 한 번';
  return null;
}
function renderSuppCard(k) {
  const s = suppData(), log = s.log[k] || {}, can = k <= today();
  const all = s.slots.flatMap(sl => sl.items.filter(it => !suppSkip(it, k)));
  const done = all.filter(it => log[it]).length;
  const bloodSoon = s.blood && diffDays(s.blood, today()) >= 0 && diffDays(s.blood, today()) <= 3;
  return `<section class="card"><div class="card-h"><h2>💊 영양제</h2><span class="meta num">${done}/${all.length}</span><button class="link small" data-action="suppEdit">편집</button></div>
    ${bloodSoon ? `<p class="alert-line warn">⚠️ ${dateLabel(s.blood)} 혈액검사 — 비오틴은 쉬고, 철분제 먹는다고 말하기</p>` : ''}
    ${s.slots.map(sl => `<div class="supp-row"><span class="supp-when">${esc(sl.label)}</span><div class="chips">${sl.items.map(it => {
      const why = suppSkip(it, k);
      return `<button class="chip ${log[it] ? 'on' : ''} ${why ? 'off' : ''}" data-action="suppCheck" data-v="${esc(it)}" data-date="${k}" ${why || !can ? 'disabled' : ''}>${log[it] ? '✓ ' : ''}${esc(it)}${why ? ` · ${esc(why)}` : ''}</button>`;
    }).join('')}</div></div>`).join('')}
  </section>`;
}
function openSuppEdit() {
  const s = suppData();
  const panel = openSheet('', { onClose: () => render() });
  const draw = () => {
    panel.innerHTML = sheetHeader('영양제', '<button class="link strong" data-x="close">완료</button>', '<span style="min-width:48px"></span>') + `
      ${s.slots.map((sl, si) => `<section class="card"><div class="card-h"><h2>${esc(sl.label)}</h2></div>
        <div class="chips">${sl.items.map((it, ii) => `<span class="taste-chip">${esc(it)}<button data-x="del" data-s="${si}" data-i="${ii}" aria-label="${esc(it)} 빼기">×</button></span>`).join('')}</div>
        <div class="taste-add" style="margin-top:8px"><input class="input" id="suppAdd${si}" placeholder="예: 판시딜"><button class="btn sm" data-x="add" data-s="${si}">추가</button></div></section>`).join('')}
      <section class="card"><div class="card-h"><h2>혈액검사 날짜</h2></div>
        <div class="taste-add"><input class="input" id="suppBlood" type="date" value="${s.blood || ''}"><button class="btn sm" data-x="blood">저장</button></div>
        <p class="small muted" style="margin:6px 0 0">넣으면 검사 3일 전부터 비오틴을 자동으로 빼요.</p></section>
      <section class="card"><label class="row-between"><span>철분 이틀에 한 번 <span class="small muted">(속이 쓰릴 때)</span></span><input id="suppIron" type="checkbox" ${s.ironAlt ? 'checked' : ''} style="width:22px;height:22px;-webkit-appearance:auto;appearance:auto"></label></section>
      <section class="card"><div class="card-h"><h2>기억해 둘 것</h2></div><ul class="how-list small">${MY_SUPP_NOTES.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <p class="small" style="margin:10px 0 2px"><b>신장내과에서 물어볼 것</b></p><ul class="how-list small">${MY_SUPP_ASK.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>`;
  };
  panel.addEventListener('change', (e) => { if (e.target.id === 'suppIron') { s.ironAlt = e.target.checked ? today() : false; save(); toast(s.ironAlt ? '오늘부터 철분은 이틀에 한 번' : '철분 매일로 돌렸어요'); } });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    const x = b.dataset.x;
    if (x === 'close') return closeSheet();
    if (x === 'del') { s.slots[+b.dataset.s].items.splice(+b.dataset.i, 1); save(); draw(); }
    if (x === 'add') { const inp = panel.querySelector('#suppAdd' + b.dataset.s), v = inp.value.trim(); if (v) { s.slots[+b.dataset.s].items.push(v); save(); draw(); } }
    if (x === 'blood') { s.blood = panel.querySelector('#suppBlood').value; save(); toast(s.blood ? '검사 3일 전부터 비오틴을 빼요' : '검사 날짜를 지웠어요'); }
  });
  draw();
}

// ── 야식 당길 때 (밤 9시 이후) ──
function renderSnackCard() {
  if (cur !== today() || (new Date().getHours() < 21 && !db.ui.snackOpen)) return '';
  const S = MY_SNACKS, row = ([n, k]) => `<li><span>${esc(n)}</span><span class="muted num">${k}kcal</span></li>`;
  return `<section class="card snack-card"><div class="card-h"><h2>🌙 야식 당길 때</h2>${db.ui.snackOpen && new Date().getHours() < 21 ? '<button class="link small" data-action="snackOpen">닫기</button>' : ''}</div>
    <p class="small" style="margin:0 0 8px">${S.rules.map(esc).join(' · ')}</p>
    <div class="grid-2"><div><b class="small">🍯 달달한 게 당기면</b><ul class="snack-list">${S.sweet.map(row).join('')}</ul></div>
    <div><b class="small">🍜 짭짤·매콤한 게 당기면</b><ul class="snack-list">${S.savory.map(row).join('')}</ul></div></div></section>`;
}

// ── 체중 ──
function weightGoalNow(k = today()) {
  const g = MY_WEIGHT.goals.find(([d]) => d >= k) || MY_WEIGHT.goals[MY_WEIGHT.goals.length - 1];
  return { date: g[0], kg: g[1] };
}
function renderWeightCard() {
  const w = db.weights || {}, ks = Object.keys(w).sort(), last = ks[ks.length - 1];
  const g = weightGoalNow(), lastKg = last ? w[last] : MY_WEIGHT.start[1];
  // 작은 그래프: 시작 ~ 마지막 목표일, 목표선은 점선
  const [d0, w0] = MY_WEIGHT.start, dEnd = MY_WEIGHT.goals[MY_WEIGHT.goals.length - 1][0];
  const span = Math.max(1, diffDays(dEnd, d0)), W = 300, H = 90, lo = 55, hi = 64;
  const X = (d) => 8 + (diffDays(d, d0) / span) * (W - 16), Y = (kg) => 6 + (hi - kg) / (hi - lo) * (H - 18);
  const goalPts = [[d0, w0], ...MY_WEIGHT.goals].map(([d, kg]) => `${X(d).toFixed(1)},${Y(kg).toFixed(1)}`).join(' ');
  const pts = ks.filter(d => d >= d0).map(d => `${X(d).toFixed(1)},${Y(w[d]).toFixed(1)}`);
  return `<section class="card"><div class="card-h"><h2>⚖️ 체중</h2><span class="meta">${dateLabel(g.date).split(' (')[0]}까지 ${g.kg}kg · D-${Math.max(0, diffDays(g.date, today()))}</span></div>
    <div class="row-between" style="margin-bottom:6px"><span><b class="num" style="font-size:22px">${n1(lastKg)}</b>kg <span class="small muted">${last ? dateLabel(last) : '시작'}</span></span>
      <span class="small ${lastKg <= g.kg ? '' : 'muted'}">${lastKg <= g.kg ? '목표 달성 🎉' : `${n1(lastKg - g.kg)}kg 남았어요`}</span></div>
    <svg class="wt-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="체중과 목표선">
      <polyline points="${goalPts}" class="wt-goal"/>
      ${MY_WEIGHT.goals.map(([d, kg]) => `<circle cx="${X(d)}" cy="${Y(kg)}" r="3" class="wt-gdot"/><text x="${Math.min(X(d), W - 30)}" y="${Y(kg) + 14}" class="wt-lbl">${kg}kg</text>`).join('')}
      ${pts.length > 1 ? `<polyline points="${pts.join(' ')}" class="wt-line"/>` : ''}
      ${pts.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="2.5" class="wt-dot"/>`).join('')}
    </svg>
    <div class="taste-add" style="margin-top:8px"><input class="input" id="wtInput" inputmode="decimal" placeholder="오늘 체중 (kg)" value="${w[today()] ?? ''}"><button class="btn sm" data-action="wtSave">기록</button></div>
    <p class="small muted" style="margin:6px 0 0">점선은 목표선(10월 말 60kg, 11월 말 57kg). 아침 화장실 다녀온 뒤 같은 조건에서 재요.</p></section>`;
}

// ── 쉐이크 (식단 탭) ──
function renderShakeCard() {
  const open = !!db.ui.shakeOpen;
  return `<section class="card"><div class="card-h"><button class="row-between" style="flex:1" data-action="shakeOpen"><h2 style="margin:0">🥤 단백질 쉐이크</h2><span class="chev">${open ? '▾' : '▸'}</span></button></div>
    <button class="btn block sm" data-action="shakeLog">${mealTypeNow() === '간식' ? '저녁' : mealTypeNow()}을 쉐이크로 기록 (약 200kcal · 19g)</button>
    ${open ? `<ul class="how-list small" style="margin-top:10px">${SHAKE_RULES.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="small muted" style="margin:6px 0 0">이번 주 식단 짜기에서 끼니를 두 번 누르면 쉐이크로 대신할 수 있어요.</p>` : ''}</section>`;
}
function logShake() {
  const type = mealTypeNow() === '간식' ? '저녁' : mealTypeNow();
  const fav = db.favorites.find(f => f.name.includes('단백질 쉐이크'));
  const kcal = fav ? fav.kcal : 200, protein = fav ? fav.protein : 19;
  dayData(cur).meals.push({ id: uid(), type, name: fav ? fav.name : '단백질 쉐이크 (식사 대용)', servings: 1, kcal, protein, base: { kcal, protein }, unit: '', photo: null, memo: '', src: 'fav', at: Date.now() });
  save(); render();
  const t = dayTotals(cur);
  toast(t.protein > goals().protein ? `기록했어요 · 오늘 단백질 ${n0(t.protein)}g로 ${goals().protein}g를 넘었어요` : `${type}을 쉐이크로 기록했어요`);
}

function mineAction(a, b) {
  switch (a) {
    case 'suppCheck': { const s = suppData(), l = s.log[b.dataset.date] = s.log[b.dataset.date] || {}; l[b.dataset.v] ? delete l[b.dataset.v] : (l[b.dataset.v] = true); save(); render(); return true; }
    case 'suppEdit': openSuppEdit(); return true;
    case 'snackOpen': db.ui.snackOpen = !db.ui.snackOpen; render(); return true;
    case 'shakeOpen': db.ui.shakeOpen = !db.ui.shakeOpen; save(); render(); return true;
    case 'shakeLog': logShake(); return true;
    case 'wtSave': {
      const v = parseFloat(($('#wtInput')?.value || '').replace(',', '.'));
      if (!(v > 30 && v < 200)) { toast('체중을 숫자로 적어 주세요'); return true; }
      (db.weights = db.weights || {})[today()] = v; db.settings.profile.weight = v; save(); render(); toast('체중을 기록했어요');
      return true;
    }
  }
  return false;
}
