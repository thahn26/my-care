// Claude API 호출 (사용자 본인 API 키로 브라우저에서 직접 호출)
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.133.0/+esm';

const AI_MODELS = [
  ['claude-opus-5-5', 'Claude Opus 5.5 (가장 정확)', 4, 20],
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (빠르고 저렴)', 2, 10],
  ['claude-haiku-4-5', 'Claude Haiku 4.5 (가장 저렴)', 1, 5],
];

const AI_SYSTEM = `당신은 '요리 초보 자취생'의 다이어트·단백질 식단을 돕는 한국어 영양 도우미입니다.
- 모든 답은 한국어로, 지정된 JSON 형식으로만 답합니다.
- 칼로리와 단백질은 한국 식품 영양성분 데이터베이스 기준의 현실적인 평균값으로 추정합니다.
- 레시피는 속이 편하고(튀김·매운 양념·기름진 조리 금지) 단백질이 많으며 한 끼 450kcal 이하인 다이어트식으로 만듭니다.
- 계량은 밥숟가락(숟)과 종이컵(컵, 약 180ml)으로, 주재료는 2~4개, 단계는 4개 이하로 쉽게 씁니다.`;

let _client = null, _clientKey = '';
async function aiClient() {
  const key = db.settings.apiKey.trim();
  if (!key) { const e = new Error('API 키가 없어요. 설정에서 Anthropic API 키를 넣어 주세요.'); e.code = 'NO_KEY'; throw e; }
  if (_client && _clientKey === key) return _client;
  let mod;
  try { mod = await import(SDK_URL); }
  catch (e) { throw new Error('AI 모듈을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'); }
  const Anthropic = mod.default || mod.Anthropic;
  _client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 2 });
  _clientKey = key;
  return _client;
}

function imageBlock(dataUrl) {
  const [head, data] = dataUrl.split(',');
  const media_type = (head.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
  return { type: 'image', source: { type: 'base64', media_type, data } };
}

function trackUsage(model, usage) {
  const m = AI_MODELS.find(x => x[0] === model) || AI_MODELS[0];
  const cost = ((usage?.input_tokens || 0) * m[2] + (usage?.output_tokens || 0) * m[3]) / 1e6;
  const ym = today().slice(0, 7);
  const u = db.aiUsage[ym] || (db.aiUsage[ym] = { calls: 0, cost: 0 });
  u.calls++; u.cost += cost;
  save();
  return cost;
}

// content: 메시지 내용 블록 배열, schema: JSON Schema, effort: 'low' | 'medium'
async function askAI(content, schema, effort = 'low') {
  const client = await aiClient();
  const model = db.settings.aiModel || 'claude-opus-5-5';
  const params = {
    model,
    max_tokens: 16000,
    system: AI_SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema } },
  };
  let res;
  try {
    if (model === 'claude-haiku-4-5') {
      res = await client.messages.create(params);
    } else {
      params.output_config.effort = effort;
      res = await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
    }
  } catch (e) {
    const st = e?.status;
    if (st === 401) throw new Error('API 키가 올바르지 않아요. 설정에서 키를 다시 확인해 주세요.');
    if (st === 429) throw new Error('요청이 많아 잠시 막혔어요. 1분 뒤 다시 시도해 주세요.');
    if (st === 400 && /credit|balance/i.test(e.message || '')) throw new Error('API 크레딧이 부족해요. Anthropic 콘솔에서 충전해 주세요.');
    if (st >= 500) throw new Error('AI 서버가 잠시 불안정해요. 조금 뒤 다시 시도해 주세요.');
    if (!navigator.onLine) throw new Error('인터넷에 연결되어 있지 않아요.');
    throw new Error('AI 요청에 실패했어요: ' + (e?.message || e));
  }
  trackUsage(model, res.usage);
  if (res.stop_reason === 'refusal') throw new Error('AI가 이 요청을 처리하지 못했어요. 다른 사진으로 시도해 주세요.');
  if (res.stop_reason === 'max_tokens') throw new Error('AI 답이 너무 길어 잘렸어요. 다시 시도해 주세요.');
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  try { return JSON.parse(text); }
  catch (e) { throw new Error('AI 답을 해석하지 못했어요. 다시 시도해 주세요.'); }
}

// ── 스키마 ──
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const S = { type: 'string' }, N = { type: 'number' }, I = { type: 'integer' }, B = { type: 'boolean' };

// 1) 식사 사진·메뉴명 → 칼로리·단백질
async function aiEstimateMeal({ photo, name }) {
  const content = [];
  if (photo) content.push(imageBlock(photo));
  content.push({ type: 'text', text:
    `이 식사의 칼로리와 단백질을 추정해 주세요.\n` +
    (name ? `사용자가 적은 메뉴명: "${name}"\n` : '메뉴명은 없습니다. 사진으로 판단해 주세요.\n') +
    `사진이 있으면 보이는 양을 기준으로, 없으면 1인분 기준으로 추정하세요. name은 짧은 메뉴명(예: "현미밥, 된장찌개, 계란말이")으로 쓰세요. comment는 다이어트·단백질 관점의 한 줄 조언입니다.` });
  return askAI(content, obj({
    name: S, kcal: I, protein: N,
    items: { type: 'array', items: obj({ name: S, kcal: I, protein: N }) },
    confidence: { type: 'string', enum: ['높음', '보통', '낮음'] },
    comment: S,
  }), 'low');
}

function fridgeSummary() {
  if (!db.fridge.length) return '(비어 있음)';
  return db.fridge.map(f => `${f.name} ${f.qty}${f.unit}${f.exp ? ` (유통기한 ${f.exp})` : ''}`).join(', ');
}
function todayNeed() {
  const g = goals(), t = dayTotals(today());
  return `오늘 목표 ${g.kcal}kcal / 단백질 ${g.protein}g, 지금까지 ${Math.round(t.kcal)}kcal / ${Math.round(t.protein)}g 먹음.`;
}

// 3) 냉장고 재료로 레시피 추천
async function aiRecipes(extra = '') {
  return askAI([{ type: 'text', text:
    `냉장고 재료: ${fridgeSummary()}\n${todayNeed()}\n` +
    (extra ? `사용자 요청: ${extra}\n` : '') +
    `냉장고 재료를 최대한 활용한 레시피 3개를 추천해 주세요. 유통기한이 임박한 재료를 우선 쓰고, 세 레시피의 맛·조리법이 겹치지 않게 하세요. ` +
    `한 개 이상은 점심 도시락으로 싸 갈 수 있게 하고, 도시락이 가능하면 lunchTip에 싸는 요령을, 아니면 빈 문자열을 넣으세요. ` +
    `ingredients는 주재료만(양념 제외), inFridge는 냉장고에 있으면 true. seasoning은 집에 흔한 양념을 쉼표로. why는 이 레시피를 고른 이유 한 줄.` }],
  obj({ recipes: { type: 'array', items: obj({
    name: S, kcal: I, protein: N, minutes: I,
    ingredients: { type: 'array', items: obj({ name: S, amount: S, inFridge: B }) },
    seasoning: S, steps: { type: 'array', items: S }, lunchTip: S, why: S,
  }) } }), 'medium');
}

// 4) 일주일 장보기 추천
async function aiWeeklyShopping() {
  const g = goals();
  return askAI([{ type: 'text', text:
    `냉장고 재료: ${fridgeSummary()}\n현재 장보기 목록: ${db.shopping.filter(s => !s.done).map(s => s.name).join(', ') || '(없음)'}\n` +
    `하루 목표: ${g.kcal}kcal, 단백질 ${g.protein}g. 혼자 사는 요리 초보입니다.\n` +
    `앞으로 일주일 동안 속 편한 고단백 다이어트 식단(아침·점심 도시락·저녁)을 쉽게 해 먹으려면 무엇을 사야 할지 장보기 목록을 만들어 주세요. ` +
    `이미 냉장고에 넉넉한 것은 빼고, 혼자 일주일 안에 다 먹을 수 있는 양으로 적으세요(qty 예: "10구 1판", "2모"). reason은 짧게. summary는 이번 주 식단 방향 한두 문장.` }],
  obj({ items: { type: 'array', items: obj({ name: S, qty: S, reason: S }) }, summary: S }), 'medium');
}
