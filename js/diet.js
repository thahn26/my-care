// 홈 · 식단 화면
const MEALS = ['아침', '점심', '저녁', '간식'];
const MEAL_ICON = { 아침: '🍳', 점심: '🍱', 저녁: '🍲', 간식: '🍎' };

// ── 홈 ──
function ringSvg(rows) {
  const C = 66, W = 12, gap = 2;
  return `<svg class="rings" viewBox="0 0 132 132" role="img" aria-label="오늘 달성률">${rows.map((r, i) => {
    const rad = C - W / 2 - i * (W + gap), len = 2 * Math.PI * rad, v = Math.max(0, Math.min(1, r.v));
    return `<circle cx="66" cy="66" r="${rad}" stroke="${r.c}" stroke-width="${W}" opacity=".16"/>` +
      (v > 0 ? `<circle cx="66" cy="66" r="${rad}" stroke="${r.c}" stroke-width="${W}" stroke-dasharray="${len * v} ${len}" transform="rotate(-90 66 66)"/>` : '');
  }).join('')}</svg>`;
}

function weekChart(metric) {
  const g = goals(), goal = metric === 'kcal' ? g.kcal : g.protein, unit = metric === 'kcal' ? 'kcal' : 'g';
  const days = [...Array(7)].map((_, i) => addDays(today(), i - 6));
  const H = 64, top = 1.4; // 목표의 140%까지 표시
  const cols = days.map(k => {
    const v = dayTotals(k)[metric], ratio = goal ? v / goal : 0;
    const h = Math.max(v > 0 ? 4 : 0, Math.min(ratio, top) / top * H);
    const over = metric === 'kcal' && ratio > 1;
    const goalY = H - (1 / top) * H;
    return `<button class="week-col ${k === cur ? 'sel' : ''}" data-action="goto" data-date="${k}" aria-label="${dateLabel(k)} ${n0(v)}${unit}">
      <span class="wd ${k === today() ? 'today' : ''}">${k === today() ? '오늘' : WD[parse(k).getDay()]}</span>
      <span class="plot"><i class="gl" style="top:${goalY}px"></i>${h ? `<i class="b" style="height:${h}px;background:${over ? 'var(--warn)' : metric === 'kcal' ? 'var(--kcal)' : 'var(--protein)'}"></i>` : '<i class="b" style="height:2px;background:var(--fill)"></i>'}</span>
    </button>`;
  }).join('');
  const sv = dayTotals(cur)[metric];
  return `<div class="chart-cap"><span>${dateLabel(cur)} · <b class="num">${n0(sv)}${unit}</b> (목표의 ${goal ? Math.round(sv / goal * 100) : 0}%)</span><span class="goal-line">목표</span></div>
    <div class="week">${cols}</div>
    ${metric === 'kcal' ? '<p class="small muted" style="margin:8px 2px 0">주황색 막대는 목표 칼로리를 넘은 날이에요.</p>' : ''}`;
}

function renderHome() {
  const g = goals(), t = dayTotals(cur), d = peekDay(cur);
  const metric = db.ui.weekMetric || 'kcal';
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const soon = db.fridge.filter(f => f.exp && diffDays(f.exp, today()) <= 3).sort((a, b) => a.exp.localeCompare(b.exp));
  const shopLeft = db.shopping.filter(s => !s.done).length;
  const st = streak();

  return `
  ${isIOS && !standalone && !db.ui.installHidden ? `<section class="card install">
    <div style="font-size:26px">📲</div>
    <div><b>홈 화면에 추가해서 앱처럼 쓰세요</b><div class="small muted">Safari 아래쪽 공유 버튼 → ‘홈 화면에 추가’. 추가해야 기록이 안전하게 보관돼요.</div></div>
    <button class="x-btn" data-action="hideInstall" aria-label="닫기">×</button></section>` : ''}

  ${!g.hasProfile && !db.settings.kcalGoal ? `<section class="card"><button class="setup-cta" data-action="settings">
    <span class="ic">🎯</span><span><b>내 정보 넣고 목표 정하기</b><br><span class="small muted">키·체중·나이로 하루 칼로리와 단백질 목표를 계산해 드려요</span></span></button></section>` : ''}

  <section class="card">
    <div class="hero">
      ${ringSvg([
        { v: t.kcal / g.kcal, c: t.kcal > g.kcal ? 'var(--warn)' : 'var(--kcal)' },
        { v: t.protein / g.protein, c: 'var(--protein)' },
        { v: (d.water || 0) / g.water, c: 'var(--water)' },
      ])}
      <div class="legend">
        <div class="legend-item" style="--c:${t.kcal > g.kcal ? 'var(--warn)' : 'var(--kcal)'}"><span class="dot"></span><span class="k">칼로리</span><span class="v num">${n0(t.kcal)}<small> / ${n0(g.kcal)}kcal</small></span></div>
        <div class="legend-item" style="--c:var(--protein)"><span class="dot"></span><span class="k">단백질</span><span class="v num">${n0(t.protein)}<small> / ${g.protein}g</small></span></div>
        <div class="legend-item" style="--c:var(--water)"><span class="dot"></span><span class="k">물</span><span class="v num">${d.water || 0}<small> / ${g.water}잔</small></span></div>
      </div>
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn sm" data-action="addMeal" data-type="${mealTypeNow()}">＋ ${mealTypeNow()} 기록</button>
      <button class="btn sm" data-action="water" data-v="${(d.water || 0) + 1}">💧 물 한 잔</button>
    </div>
  </section>

  ${renderTodayPlan(cur)}

  ${soon.length ? `<section class="card">
    <div class="card-h"><h2>유통기한 임박</h2><button class="link small" data-action="kitchen" data-sub="fridge">냉장고 ›</button></div>
    <div class="alert-list">${soon.slice(0, 5).map(f => { const dd = dday(f.exp); return `<div class="alert-item"><span><b>${esc(f.name)}</b> <span class="small muted">${n1(f.qty)}${esc(f.unit)}</span></span><span class="dday ${dd.cls}">${dd.text}</span></div>`; }).join('')}</div>
    <button class="btn block sm" style="margin-top:10px" data-action="kitchen" data-sub="recipes">이 재료로 만들 요리 보기</button>
  </section>` : ''}

  <section class="card">
    <div class="card-h"><h2>최근 7일</h2></div>
    <div class="seg" style="margin-bottom:8px">
      <button class="${metric === 'kcal' ? 'on' : ''}" data-action="weekMetric" data-v="kcal">칼로리</button>
      <button class="${metric === 'protein' ? 'on' : ''}" data-action="weekMetric" data-v="protein">단백질</button>
    </div>
    ${weekChart(metric)}
  </section>

  <section class="card">
    <div class="row-between"><span>🔥 연속 기록</span><b class="num">${st}일</b></div>
    <div class="row-between" style="margin-top:10px"><button class="link" data-action="kitchen" data-sub="shop">🛒 장보기 목록</button><b class="num">${shopLeft}개 남음</b></div>
  </section>`;
}

// ── 식단 ──
const CUP_SVG = '<svg viewBox="0 0 24 30"><path class="liquid" d="M5.3 11h13.4l-1.3 14.2a1.6 1.6 0 0 1-1.6 1.5H8.2a1.6 1.6 0 0 1-1.6-1.5z"/><path class="glass" d="M4 4h16l-1.8 21.4a2.4 2.4 0 0 1-2.4 2.2H8.2a2.4 2.4 0 0 1-2.4-2.2z"/></svg>';

function renderDiet() {
  const g = goals(), d = peekDay(cur), t = dayTotals(cur), w = d.water || 0;
  const cupCount = Math.max(g.water, w + (w >= g.water ? 1 : 0));
  return `
  <section class="card">
    ${goalBar({ label: '칼로리', value: t.kcal, goal: g.kcal, unit: 'kcal', color: 'var(--kcal)', mode: 'limit' })}
    ${goalBar({ label: '단백질', value: t.protein, goal: g.protein, unit: 'g', color: 'var(--protein)' })}
  </section>
  <section class="card">
    <div class="card-h"><h2>물</h2><span class="meta num">${w} / ${g.water}잔</span></div>
    <div class="cups">${[...Array(cupCount)].map((_, i) => `<button class="cup ${i < w ? 'on' : ''}" data-action="water" data-v="${i + 1}" aria-label="물 ${i + 1}잔">${CUP_SVG}</button>`).join('')}</div>
  </section>
  ${MEALS.map(type => mealCard(type, d)).join('')}`;
}

function mealCard(type, d) {
  const items = d.meals.filter(m => m.type === type);
  const kcal = items.reduce((a, m) => a + (+m.kcal || 0), 0);
  return `<section class="card meal-card">
    <div class="card-h"><h2>${type} ${items.length ? `<span class="meta num">${n0(kcal)}kcal</span>` : ''}</h2>
      <button class="add-btn" data-action="addMeal" data-type="${type}" aria-label="${type} 추가">＋</button></div>
    ${items.length ? `<ul class="meal-list">${items.map(m => `<li><button class="meal-item" data-action="editMeal" data-id="${m.id}">
      <span class="thumb">${m.photo ? `<img data-photo="${m.photo}" alt="">` : MEAL_ICON[type]}</span>
      <span class="info"><span class="name">${esc(m.name)}</span>
      <span class="sub num">${+m.servings && +m.servings !== 1 ? n1(m.servings) + '인분 · ' : ''}${m.kcal !== '' && m.kcal != null ? n0(m.kcal) + 'kcal' : '칼로리 미입력'} · 단백질 ${n1(m.protein)}g${m.src === 'ai' ? ' · AI' : m.src === 'recipe' ? ' · 레시피' : ''}</span></span>
      <span class="chev">›</span></button></li>`).join('')}</ul>` : `<p class="empty" style="padding:6px 0 2px;text-align:left">아직 기록이 없어요</p>`}
  </section>`;
}

// ── 식사 추가·수정 시트 ──
function searchFoods(q) {
  q = q.trim().replace(/\s+/g, '');
  if (!q) return [];
  const fav = db.favorites.filter(f => f.name.replace(/\s+/g, '').includes(q)).map(f => ({ name: f.name, unit: '즐겨찾기', kcal: f.base?.kcal ?? f.kcal, protein: f.base?.protein ?? f.protein, fav: true }));
  const hits = FOODS.filter(([n]) => n.replace(/\s+/g, '').includes(q))
    .sort((a, b) => (b[0].startsWith(q) - a[0].startsWith(q)) || a[0].length - b[0].length)
    .map(([name, unit, kcal, protein]) => ({ name, unit, kcal, protein }));
  return [...fav, ...hits].slice(0, 7);
}

function openMeal(type, id) {
  const day = dayData(cur);
  const orig = id ? day.meals.find(x => x.id === id) : null;
  const m = orig ? { ...orig } : { type: type || mealTypeNow(), name: '', servings: 1, kcal: '', protein: '', base: null, unit: '', photo: null, memo: '', src: '' };
  let newPhoto = null, photoRemoved = false, aiNote = '', suggestions = [], busy = false;

  const panel = openSheet('');
  const sync = () => {
    const v = (s) => panel.querySelector(s)?.value ?? '';
    m.name = v('#mName').trim(); m.memo = v('#mMemo').trim();
    m.kcal = v('#mKcal') === '' ? '' : Math.round(+v('#mKcal'));
    m.protein = v('#mProt') === '' ? '' : Math.round(+v('#mProt') * 10) / 10;
  };
  const photoHtml = () => {
    if (newPhoto) return `<div class="photo-pick"><img src="${newPhoto}" alt="식사 사진"><button class="rm" data-x="rmPhoto" aria-label="사진 지우기">×</button></div>`;
    if (m.photo && !photoRemoved) return `<div class="photo-pick"><img data-photo="${m.photo}" alt="식사 사진"><button class="rm" data-x="rmPhoto" aria-label="사진 지우기">×</button></div>`;
    return `<button class="photo-pick" data-x="photo">📷 사진 찍기 / 앨범에서 고르기</button>`;
  };
  const isFav = () => db.favorites.some(f => f.name === m.name);

  function draw() {
    panel.innerHTML = sheetHeader(orig ? '식사 수정' : '식사 추가', '<button class="link strong" data-x="save">저장</button>', '<button class="link" data-x="close">취소</button>') + `
      <div class="seg">${MEALS.map(t => `<button data-x="type" data-t="${t}" class="${t === m.type ? 'on' : ''}">${t}</button>`).join('')}</div>
      ${!orig && db.favorites.length ? `<div class="field"><span>자주 먹는 메뉴</span><div class="chips scroll">${db.favorites.map(f => `<button class="chip" data-x="fav" data-id="${f.id}">${esc(f.name)}</button>`).join('')}</div></div>` : ''}
      <div class="field"><span>사진</span>${photoHtml()}</div>
      <div class="field"><span>메뉴</span><input id="mName" autocomplete="off" enterkeyhint="done" placeholder="예: 현미밥, 닭가슴살, 된장찌개" value="${esc(m.name)}">
        <div id="mSuggest">${suggestions.length ? `<div class="suggest">${suggestions.map((s, i) => `<button data-x="pick" data-i="${i}"><span>${s.fav ? '★ ' : ''}${esc(s.name)} <small>${esc(s.unit)}</small></span><small class="num">${s.kcal}kcal · ${n1(s.protein)}g</small></button>`).join('')}</div>` : ''}</div></div>
      <div class="field"><span>양 ${m.unit ? `<span class="muted">(1인분 = ${esc(m.unit)})</span>` : ''}</span>
        <div class="stepper"><button data-x="minus" aria-label="줄이기">−</button><b id="mServ" class="num">${n1(m.servings)}인분</b><button data-x="plus" aria-label="늘리기">＋</button></div></div>
      <div class="two">
        <label class="field"><span>칼로리 (kcal)</span><input id="mKcal" inputmode="numeric" placeholder="자동 또는 직접" value="${m.kcal}"></label>
        <label class="field"><span>단백질 (g)</span><input id="mProt" inputmode="decimal" placeholder="자동 또는 직접" value="${m.protein}"></label>
      </div>
      ${db.settings.apiKey ? `<button class="btn ai block" data-x="ai" ${busy ? 'disabled' : ''} style="margin-bottom:14px">${busy ? '<span class="spinner"></span> AI가 보고 있어요…' : '✨ AI로 칼로리·단백질 추정'}</button>` : ''}
      ${aiNote ? `<div class="ai-note">${aiNote}</div>` : ''}
      <label class="field"><span>메모</span><input id="mMemo" placeholder="선택" value="${esc(m.memo || '')}"></label>
      <div class="btn-row"><button class="btn" data-x="toggleFav">${isFav() ? '★ 자주 먹는 메뉴에서 빼기' : '☆ 자주 먹는 메뉴로 저장'}</button></div>
      ${orig ? '<button class="btn danger block" style="margin-top:8px" data-x="del">이 기록 삭제</button>' : ''}`;
    hydratePhotos(panel);
  }
  const setNums = () => {
    if (m.base) { m.kcal = Math.round(m.base.kcal * m.servings); m.protein = Math.round(m.base.protein * m.servings * 10) / 10; }
    panel.querySelector('#mKcal').value = m.kcal; panel.querySelector('#mProt').value = m.protein;
    panel.querySelector('#mServ').textContent = `${n1(m.servings)}인분`;
  };

  panel.addEventListener('input', (e) => {
    if (e.target.id === 'mName') {
      suggestions = searchFoods(e.target.value);
      panel.querySelector('#mSuggest').innerHTML = suggestions.length ? `<div class="suggest">${suggestions.map((s, i) => `<button data-x="pick" data-i="${i}"><span>${s.fav ? '★ ' : ''}${esc(s.name)} <small>${esc(s.unit)}</small></span><small class="num">${s.kcal}kcal · ${n1(s.protein)}g</small></button>`).join('')}</div>` : '';
    } else if (e.target.id === 'mKcal' || e.target.id === 'mProt') {
      sync();
      const s = +m.servings || 1;
      m.base = { kcal: (+m.kcal || 0) / s, protein: (+m.protein || 0) / s };
      if (m.src === '' || m.src === 'dict') m.src = 'manual';
    }
  });

  panel.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const x = b.dataset.x;
    if (x === 'close') return closeSheet();
    sync();
    if (x === 'type') { m.type = b.dataset.t; draw(); }
    else if (x === 'pick') {
      const s = suggestions[+b.dataset.i];
      m.name = s.name; m.servings = 1; m.base = { kcal: s.kcal, protein: s.protein }; m.unit = s.fav ? '' : s.unit; m.src = 'dict';
      m.kcal = s.kcal; m.protein = s.protein; suggestions = [];
      draw();
    }
    else if (x === 'fav') {
      const f = db.favorites.find(v => v.id === b.dataset.id);
      Object.assign(m, { name: f.name, servings: f.servings || 1, kcal: f.kcal, protein: f.protein, base: f.base || { kcal: f.kcal / (f.servings || 1), protein: f.protein / (f.servings || 1) }, unit: '', src: 'dict' });
      draw();
    }
    else if (x === 'minus' || x === 'plus') {
      m.servings = Math.max(0.5, Math.min(10, (+m.servings || 1) + (x === 'plus' ? 0.5 : -0.5)));
      if (!m.base && (m.kcal !== '' || m.protein !== '')) m.base = { kcal: (+m.kcal || 0), protein: (+m.protein || 0) };
      setNums();
    }
    else if (x === 'photo') {
      const [file] = await pickImages();
      if (!file) return;
      try { newPhoto = await compressImage(file, 1280); photoRemoved = false; draw(); }
      catch (err) { toast(err.message); }
    }
    else if (x === 'rmPhoto') { newPhoto = null; photoRemoved = true; draw(); }
    else if (x === 'ai') {
      const photo = newPhoto || (m.photo && !photoRemoved ? await photos.get(m.photo) : null);
      if (!photo && !m.name) return toast('사진을 넣거나 메뉴명을 먼저 적어 주세요');
      busy = true; draw();
      try {
        const r = await aiEstimateMeal({ photo, name: m.name });
        if (!m.name) m.name = r.name;
        m.servings = 1; m.unit = ''; m.kcal = r.kcal; m.protein = Math.round(r.protein * 10) / 10;
        m.base = { kcal: r.kcal, protein: r.protein }; m.src = 'ai';
        aiNote = `<b>AI 추정</b> (정확도 ${esc(r.confidence)})<br>${r.items.map(it => `${esc(it.name)} ${n0(it.kcal)}kcal · ${n1(it.protein)}g`).join('<br>')}${r.comment ? `<br><span class="muted">${esc(r.comment)}</span>` : ''}`;
      } catch (err) {
        aiNote = '';
        if (err.code === 'NO_KEY') { busy = false; draw(); if (await ask('AI를 쓰려면 API 키가 필요해요', '설정에서 Anthropic API 키를 넣으면 사진만으로 칼로리를 추정할 수 있어요.', '설정 열기', '나중에')) { closeSheet(); openSettings(); } return; }
        toast(err.message);
      }
      busy = false; draw();
    }
    else if (x === 'toggleFav') {
      if (!m.name) return toast('메뉴명을 먼저 적어 주세요');
      const i = db.favorites.findIndex(f => f.name === m.name);
      if (i >= 0) { db.favorites.splice(i, 1); toast('자주 먹는 메뉴에서 뺐어요'); }
      else { db.favorites.unshift({ id: uid(), name: m.name, kcal: +m.kcal || 0, protein: +m.protein || 0, servings: m.servings, base: m.base }); toast('자주 먹는 메뉴에 저장했어요'); }
      save(); draw();
    }
    else if (x === 'del') {
      if (!(await ask('이 기록을 삭제할까요?', '', '삭제', '취소', true))) return;
      if (orig.photo) photos.del(orig.photo);
      day.meals = day.meals.filter(v => v.id !== orig.id);
      save(); closeSheet(); render(); toast('삭제했어요');
    }
    else if (x === 'save') {
      const hasPhoto = newPhoto || (m.photo && !photoRemoved);
      if (!m.name && !hasPhoto) return toast('메뉴명이나 사진 중 하나는 있어야 해요');
      if (!m.name) m.name = '사진 기록';
      if (newPhoto) {
        const pid = uid();
        try { await photos.put(pid, newPhoto); } catch (err) { return toast('사진을 저장하지 못했어요'); }
        if (orig?.photo) photos.del(orig.photo);
        m.photo = pid;
      } else if (photoRemoved && orig?.photo) { photos.del(orig.photo); m.photo = null; }
      const rec = { id: orig?.id || uid(), type: m.type, name: m.name, servings: m.servings, kcal: m.kcal === '' ? 0 : m.kcal, protein: m.protein === '' ? 0 : m.protein, base: m.base, unit: m.unit, photo: m.photo || null, memo: m.memo, src: m.src, at: orig?.at || Date.now() };
      if (orig) day.meals[day.meals.findIndex(v => v.id === orig.id)] = rec; else day.meals.push(rec);
      save(); closeSheet(); render();
      toast(orig ? '수정했어요' : `${m.type}에 기록했어요`);
    }
  });

  draw();
}
