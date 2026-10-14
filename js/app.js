// 화면 전환 · 공통 이벤트 · 설정 · 백업
const APP_VERSION = '1.6.2';
let tab = (() => { try { return sessionStorage.getItem('tab') || 'home'; } catch (e) { return 'home'; } })();
let cur = today();

const TITLES = { home: 'MY 관리', diet: '식단', kitchen: '주방', care: '케어' };

function render() {
  $('#title').textContent = TITLES[tab];
  const dated = tab === 'home' || tab === 'diet' || tab === 'care';
  $('#dateRow').hidden = !dated;
  $('#dateLabel').textContent = cur === today() ? `오늘 · ${dateLabel(cur)}` : dateLabel(cur);
  $('#todayBtn').hidden = cur === today();
  $('#nextBtn').disabled = cur >= today();
  $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const view = $('#view');
  view.innerHTML = tab === 'home' ? renderHome() : tab === 'diet' ? renderDiet() : tab === 'care' ? renderCare() : renderKitchen();
  hydratePhotos(view);
}

function setTab(t) {
  if (t === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  tab = t;
  if (t === 'kitchen' && (db.ui.kitchenTab || 'fridge') === 'fridge') fridgeAnim = true;
  try { sessionStorage.setItem('tab', t); } catch (e) {}
  render();
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (!b || b.closest('#sheet')) return;
  const a = b.dataset.action;
  switch (a) {
    case 'tab': setTab(b.dataset.tab); break;
    case 'prev': cur = addDays(cur, -1); render(); break;
    case 'next': if (cur < today()) { cur = addDays(cur, 1); render(); } break;
    case 'today': cur = today(); render(); break;
    case 'goto': cur = b.dataset.date; render(); break;
    case 'weekMetric': db.ui.weekMetric = b.dataset.v; save(); render(); break;
    case 'hideInstall': db.ui.installHidden = true; save(); render(); break;
    case 'settings': openSettings(); break;
    case 'water': {
      const d = dayData(cur), v = +b.dataset.v;
      d.water = d.water === v ? v - 1 : v;
      save(); render(); break;
    }
    case 'addMeal': openMeal(b.dataset.type); break;
    case 'editMeal': openMeal(null, b.dataset.id); break;
    case 'kitchen':
      if (b.dataset.sub === 'fridge' && db.ui.kitchenTab !== 'fridge' && tab === 'kitchen') fridgeAnim = true;
      db.ui.kitchenTab = b.dataset.sub || db.ui.kitchenTab; save();
      if (tab !== 'kitchen') setTab('kitchen'); else render();
      break;
    case 'fridgeView':
      if (b.dataset.v === 'art' && db.ui.fridgeView === 'list') fridgeAnim = true;
      db.ui.fridgeView = b.dataset.v; save(); render(); break;
    case 'fridgeLoc': db.ui.fridgeLoc = b.dataset.v; save(); render(); break;
    case 'editItem': openItem(b.dataset.id); break;
    case 'staple': {
      const f = db.fridge.find(x => x.id === b.dataset.id);
      f.staple = !f.staple; save(); render();
      toast(f.staple ? `${f.name}: 상비 재료로 지정했어요` : '상비 재료에서 뺐어요');
      break;
    }
    case 'quickAdd': openQuickAdd(b.dataset.loc); break;
    case 'stockBought': stockBought(); break;
    case 'openPlanner': openPlanner(); break;
    case 'planRecipe': openRecipe(b.dataset.key, b.dataset.meal); break;
    case 'planSlotEdit': editSavedSlot(b.dataset.date, b.dataset.meal); break;
    case 'recipeTag': {
      const t = b.dataset.v, cur2 = db.ui.recipeTags || [];
      db.ui.recipeTags = cur2.includes(t) ? cur2.filter(x => x !== t) : [...cur2, t];
      save(); render(); break;
    }
    case 'toggleHidden': db.ui.showHidden = !db.ui.showHidden; save(); render(); break;
    case 'recipeIngClear': db.ui.recipeIng = ''; save(); render(); break;
    case 'recipeTagClear': db.ui.recipeTags = []; save(); render(); break;
    case 'recipe': openRecipe(b.dataset.key); break;
    case 'aiRecipes': openAiRecipeAsk(); break;
    case 'clearAiRecipes': db.aiRecipes = []; save(); render(); break;
    case 'shopToggle': toggleShop(b.dataset.id); break;
    case 'shopDel': db.shopping = db.shopping.filter(s => s.id !== b.dataset.id); save(); render(); break;
    case 'shopClear': db.shopping = db.shopping.filter(s => !s.done); save(); render(); break;
    case 'aiShopping': aiShopping(); break;
    default: skinAction(a, b) || mineAction(a, b);
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'shopForm') { e.preventDefault(); addShopFromInput($('#shopInput').value); }
});

// ── 설정 ──
function openSettings() {
  const s = db.settings, p = s.profile;
  const panel = openSheet('', { onClose: () => render() });
  const autoInfo = () => {
    const auto = autoGoals(s.profile);
    return auto ? `자동 계산: <b class="num">${n0(auto.kcal)}kcal · 단백질 ${auto.protein}g</b><br><span class="muted">하루 소비 칼로리 약 ${n0(auto.tdee)}kcal 기준${p.goal === '감량' ? '에서 500kcal를 뺐어요' : p.goal === '근육' ? '에 250kcal를 더했어요' : ''}.</span>` : '<span class="muted">위 정보를 모두 넣으면 목표를 자동으로 계산해요.</span>';
  };
  const curGoal = () => { const g = goals(); return `칸을 비워 두면 자동 계산값을 써요. 지금 목표: ${n0(g.kcal)}kcal · ${g.protein}g`; };
  const refresh = () => {
    const auto = autoGoals(s.profile);
    panel.querySelector('#autoInfo').innerHTML = autoInfo();
    panel.querySelector('#curGoal').textContent = curGoal();
    panel.querySelector('[data-s="kcalGoal"]').placeholder = auto ? '자동 ' + auto.kcal : '1800';
    panel.querySelector('[data-s="proteinGoal"]').placeholder = auto ? '자동 ' + auto.protein : '90';
  };
  const draw = () => {
    const auto = autoGoals(s.profile);
    const ym = today().slice(0, 7), u = db.aiUsage[ym] || { calls: 0, cost: 0 };
    panel.innerHTML = sheetHeader('설정', '<button class="link strong" data-x="close">완료</button>', '<span style="min-width:48px"></span>') + `
      <div class="section-title">내 정보</div>
      <section class="card">
        <div class="field"><span>성별</span><div class="seg" style="margin:0">
          <button data-x="sex" data-v="f" class="${p.sex === 'f' ? 'on' : ''}">여성</button><button data-x="sex" data-v="m" class="${p.sex === 'm' ? 'on' : ''}">남성</button></div></div>
        <div class="three">
          <label class="field"><span>나이</span><input data-p="age" inputmode="numeric" value="${esc(p.age)}" placeholder="세"></label>
          <label class="field"><span>키 (cm)</span><input data-p="height" inputmode="decimal" value="${esc(p.height)}"></label>
          <label class="field"><span>체중 (kg)</span><input data-p="weight" inputmode="decimal" value="${esc(p.weight)}"></label>
        </div>
        <label class="field"><span>활동량</span><select data-p="activity">${ACTIVITY.map(([v, l]) => `<option value="${v}" ${+p.activity === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <div class="field" style="margin:0"><span>목표</span><div class="seg" style="margin:0">
          ${[['감량', '체중 감량'], ['유지', '유지'], ['근육', '근육 늘리기']].map(([v, l]) => `<button data-x="goal" data-v="${v}" class="${p.goal === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      </section>

      <div class="section-title">하루 목표</div>
      <section class="card">
        <p class="small" id="autoInfo" style="margin:0 0 12px">${autoInfo()}</p>
        <div class="two">
          <label class="field"><span>칼로리 (kcal)</span><input data-s="kcalGoal" inputmode="numeric" value="${s.kcalGoal || ''}" placeholder="${auto ? '자동 ' + auto.kcal : '1800'}"></label>
          <label class="field"><span>단백질 (g)</span><input data-s="proteinGoal" inputmode="numeric" value="${s.proteinGoal || ''}" placeholder="${auto ? '자동 ' + auto.protein : '90'}"></label>
        </div>
        <div class="row-between"><span>물 (잔)</span><div class="stepper"><button data-x="water" data-d="-1">−</button><b class="num">${s.waterGoal}잔</b><button data-x="water" data-d="1">＋</button></div></div>
        <p class="small muted" id="curGoal" style="margin:10px 0 0">${curGoal()}</p>
      </section>

      <div class="section-title">AI (선택 · 유료)</div>
      <section class="card">
        <p class="small" style="margin:0 0 10px">API 키 없이도 모든 기본 기능은 무료로 써요. 키를 넣으면 <b>칼로리 사진 추정 · AI 맞춤 레시피 · AI 장보기 추천</b> 버튼이 추가로 나타나요.</p>
        <label class="field"><span>Anthropic API 키</span><input data-s="apiKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(s.apiKey)}" placeholder="sk-ant-로 시작하는 키"></label>
        <label class="field"><span>AI 모델</span><select data-s="aiModel">${AI_MODELS.map(([id, l]) => `<option value="${id}" ${s.aiModel === id ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <p class="small muted" style="margin:0 0 8px">키는 이 아이폰에만 저장되고 백업 파일에는 들어가지 않아요. AI 버튼을 누를 때만 사진·재료 목록이 Anthropic으로 전송돼요.</p>
        <p class="small muted" style="margin:0 0 8px">키 발급: console.anthropic.com → API Keys. 쓴 만큼만 요금이 나가요.</p>
        <div class="row-between small"><span>이번 달 사용</span><b class="num">${u.calls}회 · 약 $${u.cost.toFixed(2)}</b></div>
      </section>

      <div class="section-title">내 입맛</div>
      <section class="card"><button class="setup-cta" data-x="taste"><span class="ic">😋</span><span><b>좋아하는 것 · 싫어하는 것 · 못 먹는 것</b><br><span class="small muted">${tasteSummary()}</span></span></button></section>

      <div class="section-title">데이터</div>
      <section class="card">
        <p class="small muted" style="margin:0 0 10px">기록은 이 기기에만 저장돼요. 폰을 바꾸거나 앱을 지우기 전에 백업해 두세요.</p>
        <div class="btn-row"><button class="btn" data-x="export">백업 내보내기</button><button class="btn" data-x="import">백업 불러오기</button></div>
        <button class="btn danger block" style="margin-top:8px" data-x="reset">모든 기록 지우기</button>
      </section>
      <p class="small muted" style="text-align:center">MY 관리 ${APP_VERSION}</p>`;
  };
  panel.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.p) { p[t.dataset.p] = t.dataset.p === 'activity' ? +t.value : t.value.trim(); }
    else if (t.dataset.s) {
      const k = t.dataset.s;
      if (k === 'kcalGoal' || k === 'proteinGoal') s[k] = +t.value > 0 ? Math.round(+t.value) : null;
      else s[k] = t.value.trim();
    } else return;
    save(); refresh();
  });
  panel.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const x = b.dataset.x;
    if (x === 'sex') { p.sex = b.dataset.v; save(); draw(); }
    else if (x === 'goal') { p.goal = b.dataset.v; save(); draw(); }
    else if (x === 'water') { s.waterGoal = Math.max(1, Math.min(20, s.waterGoal + +b.dataset.d)); save(); draw(); }
    else if (x === 'taste') { closeSheet(); setTimeout(openTaste, 320); }
    else if (x === 'export') exportBackup();
    else if (x === 'import') importBackup();
    else if (x === 'reset') {
      if (!(await ask('모든 기록을 지울까요?', '식단, 냉장고, 장보기, 사진이 모두 지워지고 되돌릴 수 없어요.', '모두 지우기', '취소', true))) return;
      const key = db.settings.apiKey;
      db = freshDb(); db.settings.apiKey = key; save(); await photos.clear();
      closeSheet(); render(); toast('모든 기록을 지웠어요');
    }
  });
  draw();
}

async function exportBackup() {
  const data = structuredClone(db);
  data.settings.apiKey = '';
  const blob = new Blob([JSON.stringify({ app: 'MY 관리', version: 1, exportedAt: new Date().toISOString(), data, photos: await photos.all() })], { type: 'application/json' });
  const name = `MY관리_백업_${today()}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function importBackup() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json'; inp.className = 'vh';
  document.body.appendChild(inp);
  inp.onchange = async () => {
    const f = inp.files[0]; inp.remove();
    if (!f) return;
    let j;
    try { j = JSON.parse(await f.text()); if (!j.data || !j.data.days) throw 0; }
    catch (e) { return toast('MY 관리 백업 파일이 아니에요'); }
    if (!(await ask('백업으로 바꿀까요?', `${(j.exportedAt || '').slice(0, 10)} 백업으로 지금 기록을 모두 바꿔요.`, '바꾸기', '취소', true))) return;
    const key = db.settings.apiKey;
    db = normalize(j.data); db.settings.apiKey = db.settings.apiKey || key; save();
    await photos.clear();
    for (const [id, src] of Object.entries(j.photos || {})) await photos.put(id, src);
    closeSheet(); render(); toast('백업을 불러왔어요');
  };
  inp.click();
}

// 날짜가 바뀐 채로 앱을 다시 열면 오늘로
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && cur > today()) { cur = today(); render(); }
});
let lastDay = today();
setInterval(() => { if (today() !== lastDay) { if (cur === lastDay) cur = today(); lastDay = today(); render(); } }, 60000);

if (tab === 'kitchen' && (db.ui.kitchenTab || 'fridge') === 'fridge') fridgeAnim = true;
installDiet();
render();
// 오프라인 지원 (개발용 localhost에서는 옛 파일이 남지 않게 끔)
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

function tasteSummary() {
  const t = taste(), parts = [];
  if (t.allergies.length) parts.push(`못 먹는 것 ${t.allergies.length}`);
  if (t.dislikeIngs.length + t.dislikeRecipes.length + t.dislikeStyles.length) parts.push(`싫어요 ${t.dislikeIngs.length + t.dislikeRecipes.length + t.dislikeStyles.length}`);
  if (t.likeIngs.length + t.likeRecipes.length + t.likeStyles.length) parts.push(`좋아요 ${t.likeIngs.length + t.likeRecipes.length + t.likeStyles.length}`);
  return parts.length ? parts.join(' · ') : '아직 없어요. 저장하면 추천과 식단에 반영돼요.';
}
