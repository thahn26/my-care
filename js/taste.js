// 내 입맛: 좋아하는·싫어하는 메뉴/재료/맛, 못 먹는 것(알레르기)
// 싫어하는 것과 못 먹는 것이 들어간 레시피는 추천·식단에서 아예 뺀다.
const TASTE_STYLES = ['속편한', '고단백', '다이어트', '든든한', '매콤한', '국물', '간단한끼', '한식', '양식', '중식', '일식', '분식'];

function taste() {
  if (!db.taste) db.taste = { likeRecipes: [], dislikeRecipes: [], likeIngs: [], dislikeIngs: [], likeStyles: [], dislikeStyles: [], allergies: [] };
  return db.taste;
}
const recipeHasIng = (r, word) => r.i.some(([n]) => nameMatch(n, word));
// 받침에 맞는 조사: 새우가 / 연근이
const iGa = (w) => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '이' : '가'; };

// 빼야 하는 레시피면 이유 문장, 아니면 null (r = RECIPES 원본)
function recipeBlocked(r) {
  const t = taste();
  const allergy = t.allergies.find(a => recipeHasIng(r, a) || String(r.s || '').includes(a));
  if (allergy) return `못 먹는 '${allergy}'${iGa(allergy)} 들어가요`;
  if (t.dislikeRecipes.includes(r.n)) return '싫어요 한 메뉴예요';
  const ing = t.dislikeIngs.find(a => recipeHasIng(r, a));
  if (ing) return `싫어하는 '${ing}'${iGa(ing)} 들어가요`;
  const labels = recipeTags(r), style = t.dislikeStyles.find(s => labels.includes(s));
  if (style) return `싫어하는 '${style}' 메뉴예요`;
  return null;
}
// 좋아하는 정도 (0~)
function recipeLikeScore(r) {
  const t = taste(), labels = recipeTags(r);
  return (t.likeRecipes.includes(r.n) ? 3 : 0) + t.likeIngs.filter(a => recipeHasIng(r, a)).length + t.likeStyles.filter(s => labels.includes(s)).length;
}
function toggleIn(list, v) { const i = list.indexOf(v); i >= 0 ? list.splice(i, 1) : list.push(v); }

// 레시피 상세의 ♥/👎 줄
function tasteRow(v) {
  if (v.ai || !v.raw) return '';
  const t = taste(), liked = t.likeRecipes.includes(v.raw.n), disliked = t.dislikeRecipes.includes(v.raw.n);
  const why = recipeBlocked(v.raw);
  return `<div class="taste-row">
      <button class="btn sm ${liked ? 'like-on' : ''}" data-x="like">${liked ? '♥ 좋아요' : '♡ 좋아요'}</button>
      <button class="btn sm ${disliked ? 'dislike-on' : ''}" data-x="dislike">👎 싫어요</button>
    </div>${why ? `<p class="small" style="margin:8px 0 0;color:var(--warn)">⚠️ ${esc(why)} — 추천·식단에서 빠져 있어요</p>` : ''}`;
}

// 설정 › 내 입맛
function openTaste() {
  const t = taste();
  const panel = openSheet('', { onClose: () => render() });
  const listBlock = (key, title, desc, ph) => `
    <section class="card">
      <div class="card-h" style="margin-bottom:4px"><h2>${title}</h2></div>
      <p class="small muted" style="margin:0 0 10px">${desc}</p>
      <div class="chips" style="margin-bottom:${t[key].length ? 10 : 0}px">${t[key].map(v => `<span class="taste-chip ${key}">${esc(v)}<button data-x="rm" data-k="${key}" data-v="${esc(v)}" aria-label="${esc(v)} 지우기">×</button></span>`).join('')}</div>
      ${ph ? `<form class="taste-add" data-k="${key}"><input class="input" placeholder="${ph}" enterkeyhint="done"><button class="btn sm primary" type="submit">추가</button></form>` : ''}
    </section>`;
  const draw = () => {
    panel.innerHTML = sheetHeader('내 입맛', '<button class="link strong" data-x="close">완료</button>', '<span style="min-width:48px"></span>') + `
      ${listBlock('allergies', '🚫 못 먹는 것', '알레르기 등. 재료나 양념에 들어간 레시피는 절대 안 나와요.', '예: 새우, 땅콩, 우유')}
      ${listBlock('dislikeIngs', '👎 싫어하는 재료', '이 재료가 들어간 레시피는 추천·식단에서 빼요.', '예: 오이, 버섯')}
      ${listBlock('likeIngs', '♥ 좋아하는 재료', '이 재료가 들어간 메뉴를 더 자주 추천해요.', '예: 연어, 두부')}
      <section class="card">
        <div class="card-h" style="margin-bottom:4px"><h2>맛·스타일</h2></div>
        <p class="small muted" style="margin:0 0 10px">누를 때마다 보통 → ♥ 좋아요 → 👎 싫어요로 바뀌어요.</p>
        <div class="chips">${TASTE_STYLES.map(s => { const st = t.likeStyles.includes(s) ? 'like' : t.dislikeStyles.includes(s) ? 'dislike' : ''; return `<button class="chip style-${st || 'none'}" data-x="style" data-v="${s}">${st === 'like' ? '♥ ' : st === 'dislike' ? '👎 ' : ''}${s}</button>`; }).join('')}</div>
      </section>
      ${listBlock('likeRecipes', '♥ 좋아요 한 메뉴', '레시피 화면의 ♡ 버튼으로 추가해요. 식단에 더 자주 넣어요.', '')}
      ${listBlock('dislikeRecipes', '👎 싫어요 한 메뉴', '레시피 화면의 👎 버튼으로 추가해요. 추천·식단에서 빠져요.', '')}`;
  };
  panel.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.closest('.taste-add'), inp = f.querySelector('input'), v = inp.value.trim(), key = f.dataset.k;
    if (!v) return;
    v.split(/[,，\s]+/).filter(Boolean).forEach(w => { if (!t[key].includes(w)) t[key].push(w); });
    // 좋아하는 재료와 싫어하는 재료가 겹치지 않게
    if (key === 'likeIngs') t.dislikeIngs = t.dislikeIngs.filter(x => !t.likeIngs.includes(x));
    if (key === 'dislikeIngs') t.likeIngs = t.likeIngs.filter(x => !t.dislikeIngs.includes(x));
    save(); draw();
    setTimeout(() => panel.querySelector(`.taste-add[data-k="${key}"] input`)?.focus(), 0);
  });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    if (b.dataset.x === 'rm') { const k = b.dataset.k; t[k] = t[k].filter(x => x !== b.dataset.v); save(); draw(); }
    if (b.dataset.x === 'style') {
      const s = b.dataset.v;
      if (t.likeStyles.includes(s)) { t.likeStyles = t.likeStyles.filter(x => x !== s); t.dislikeStyles.push(s); }
      else if (t.dislikeStyles.includes(s)) t.dislikeStyles = t.dislikeStyles.filter(x => x !== s);
      else t.likeStyles.push(s);
      save(); draw();
    }
  });
  draw();
}
