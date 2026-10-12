// 데이터 저장(localStorage: 기록, IndexedDB: 사진)과 날짜·목표 계산
const KEY = 'my-care-v1';

const DEFAULT_SETTINGS = {
  profile: { sex: '', age: '', height: '', weight: '', activity: 1.375, goal: '감량' },
  kcalGoal: null,      // null이면 프로필로 자동 계산
  proteinGoal: null,
  waterGoal: 8,
  apiKey: '',
  aiModel: 'claude-opus-5-5',
};

function freshDb() {
  return {
    v: 1,
    settings: structuredClone(DEFAULT_SETTINGS),
    days: {},         // 'YYYY-MM-DD': { meals: [], water: 0 }
    favorites: [],    // { id, name, kcal, protein, servings }
    fridge: [],       // { id, name, qty, unit, loc, exp, expEst, staple, added }
    shopping: [],     // { id, name, qty, src, done }
    aiRecipes: [],    // 마지막 AI 추천 결과
    aiUsage: {},      // 'YYYY-MM': { calls, cost }
    ui: {},
  };
}

function normalize(d) {
  const base = freshDb();
  if (!d || typeof d !== 'object') return base;
  return {
    ...base,
    ...d,
    settings: { ...base.settings, ...(d.settings || {}), profile: { ...base.settings.profile, ...((d.settings || {}).profile || {}) } },
    days: d.days || {},
    favorites: d.favorites || [],
    fridge: d.fridge || [],
    shopping: d.shopping || [],
    aiRecipes: d.aiRecipes || [],
    aiUsage: d.aiUsage || {},
    ui: d.ui || {},
  };
}

let db = (() => {
  try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return freshDb(); }
})();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('저장 공간이 부족해요. 오래된 사진을 지워 주세요.'); }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── 날짜 ──
const WD = '일월화수목금토';
function fmt(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parse(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
const today = () => fmt(new Date());
function addDays(k, n) { const d = parse(k); d.setDate(d.getDate() + n); return fmt(d); }
function diffDays(a, b) { return Math.round((parse(a) - parse(b)) / 864e5); }
function dateLabel(k) { const d = parse(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; }
function dday(k) {
  const n = diffDays(k, today());
  if (n < 0) return { text: `${-n}일 지남`, cls: 'past', n };
  if (n === 0) return { text: '오늘까지', cls: 'urgent', n };
  return { text: `D-${n}`, cls: n <= 2 ? 'urgent' : n <= 5 ? 'soon' : '', n };
}

function dayData(k) { return db.days[k] || (db.days[k] = { meals: [], water: 0 }); }
function peekDay(k) { return db.days[k] || { meals: [], water: 0 }; }

function dayTotals(k) {
  const d = peekDay(k);
  return d.meals.reduce((a, m) => ({ kcal: a.kcal + (+m.kcal || 0), protein: a.protein + (+m.protein || 0) }), { kcal: 0, protein: 0 });
}
function hasRecord(k) { const d = db.days[k]; return !!d && (d.meals.length > 0 || d.water > 0); }
function streak() {
  let n = 0, k = today();
  if (!hasRecord(k)) k = addDays(k, -1);
  while (hasRecord(k)) { n++; k = addDays(k, -1); }
  return n;
}

// ── 목표 (Mifflin-St Jeor) ──
const ACTIVITY = [
  [1.2, '거의 안 움직임'],
  [1.375, '가벼운 활동 (주 1~3회 운동)'],
  [1.55, '보통 (주 3~5회 운동)'],
  [1.725, '많이 움직임 (거의 매일 운동)'],
];
function autoGoals(p) {
  const w = +p.weight, h = +p.height, a = +p.age;
  if (!w || !h || !a || !p.sex) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * (+p.activity || 1.375);
  let kcal = p.goal === '감량' ? tdee - 500 : p.goal === '근육' ? tdee + 250 : tdee;
  kcal = Math.max(kcal, p.sex === 'm' ? 1500 : 1200);
  const perKg = p.goal === '감량' ? 1.6 : p.goal === '근육' ? 1.8 : 1.2;
  return { kcal: Math.round(kcal / 50) * 50, protein: Math.round(w * perKg / 5) * 5, tdee: Math.round(tdee) };
}
function goals() {
  const s = db.settings, auto = autoGoals(s.profile);
  return {
    kcal: s.kcalGoal || auto?.kcal || 1800,
    protein: s.proteinGoal || auto?.protein || 90,
    water: s.waterGoal || 8,
    isAuto: !s.kcalGoal && !!auto,
    hasProfile: !!auto,
  };
}
function mealTypeNow() { const h = new Date().getHours(); return h < 5 ? '간식' : h < 10 ? '아침' : h < 15 ? '점심' : h < 21 ? '저녁' : '간식'; }

// ── 사진 (IndexedDB) ──
const photos = (() => {
  let opening;
  const open = () => opening || (opening = new Promise((res, rej) => {
    const r = indexedDB.open('my-care', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction('photos', mode), req = fn(t.objectStore('photos'));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  };
  const cache = new Map();
  return {
    async get(id) {
      if (cache.has(id)) return cache.get(id);
      const v = await tx('readonly', s => s.get(id)).catch(() => null);
      if (v) cache.set(id, v);
      return v;
    },
    async put(id, v) { cache.set(id, v); await tx('readwrite', s => s.put(v, id)); },
    async del(id) { cache.delete(id); await tx('readwrite', s => s.delete(id)).catch(() => {}); },
    async clear() { cache.clear(); await tx('readwrite', s => s.clear()).catch(() => {}); },
    async all() {
      const keys = await tx('readonly', s => s.getAllKeys()).catch(() => []);
      const vals = await tx('readonly', s => s.getAll()).catch(() => []);
      return Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
    },
  };
})();

// 이미지 파일 → 긴 변 max px JPEG dataURL
function compressImage(file, max = 1280, q = 0.82) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('이미지를 읽지 못했어요')); };
    img.src = url;
  });
}

// ── 이름 비교 (냉장고 ↔ 레시피) ──
const SYNONYM = { 계란: '달걀', 쇠고기: '소고기', 파: '대파', 쪽파: '대파', 닭가슴: '닭가슴살', 우유저지방: '우유', 저지방우유: '우유', 무가당두유: '두유', 삶은달걀: '달걀', 흰살생선: '생선', 햇반: '밥', 즉석밥: '밥' };
function normName(s) {
  let n = String(s || '').replace(/\s+/g, '').replace(/\(.*?\)/g, '');
  for (const [a, b] of Object.entries(SYNONYM)) if (n === a) return b;
  return n;
}
function nameMatch(a, b) {
  const x = normName(a), y = normName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  // 한 글자(김·무·밥)는 '김치'·'무가당'처럼 엉뚱하게 걸리지 않도록 끝말만 비교 (현미밥 ↔ 밥)
  return short.length === 1 ? long.endsWith(short) : long.includes(short);
}

// 냉장고 재료(have)가 레시피 재료(need)를 채우는지: 냉장고 쪽이 더 구체적인 것만 인정
// (현미밥 → 밥 O, 훈제 닭가슴살 → 닭가슴살 O, 두부 → 연두부·두부면 X)
// '자투리 채소'·'남은 고기'는 냉장고의 아무 채소·고기와 맞는 특별 재료 (냉장고 털이 레시피용)
const ANY_ING = { 자투리채소: '채소', 남은고기: '고기·생선' };
function covers(have, need) {
  const any = ANY_ING[normName(need)];
  if (any) return typeof ingredientGroup === 'function' && ingredientGroup(have) === any;
  const x = normName(have), y = normName(need);
  if (!x || !y) return false;
  if (x === y) return true;
  return y.length === 1 ? x.endsWith(y) : x.includes(y);
}

// ── 유통기한 기본값 (직접 추가할 때 추정) ──
const SHELF = [
  ['달걀', 21], ['두부', 5], ['연두부', 7], ['순두부', 5], ['닭가슴살', 2], ['닭', 2], ['소고기', 3], ['돼지', 3],
  ['생선', 2], ['연어', 2], ['고등어', 2], ['새우', 2], ['우유', 7], ['두유', 30], ['요거트', 14], ['치즈', 21],
  ['대파', 7], ['양파', 30], ['감자', 30], ['당근', 14], ['애호박', 7], ['오이', 5], ['브로콜리', 5], ['버섯', 5],
  ['시금치', 4], ['양배추', 14], ['토마토', 7], ['바나나', 5], ['사과', 21], ['밥', 2], ['식빵', 5], ['빵', 4],
];
function guessExp(name, loc) {
  if (loc === '냉동') return addDays(today(), 60);
  const hit = SHELF.find(([n]) => normName(name).includes(n));
  return hit ? addDays(today(), loc === '실온' ? Math.min(hit[1], 5) : hit[1]) : '';
}

// ── 냉장고 → 장보기 ──
function addShopping(name, src = '', qty = '') {
  name = String(name).trim();
  if (!name) return false;
  if (db.shopping.some(s => !s.done && nameMatch(s.name, name))) return false;
  db.shopping.unshift({ id: uid(), name, qty, src, done: false });
  return true;
}
