// =====================================================================
// BuddyPlanner 골프장 공략 카드 — Supabase Edge Function (course-guide)
//
// 앱 → 이 함수 → (저장된 카드가 있으면 바로) / (없으면 Claude + 웹 검색으로 만들어 저장)
//  - 한 번 만든 골프장 카드는 모든 사용자가 다시 씀 → 웹 검색 비용은 골프장당 한 번
//  - 저장하는 것: 파·거리 같은 사실 정보, 요약 팁, 출처 링크 (블로그 원문·사진은 저장하지 않음)
//
// 비밀값: ANTHROPIC_API_KEY (ai-chat과 같음), 선택: AI_DAILY_GUIDE_LIMIT (기본 3: 하루에 새로 만드는 카드 수)
// =====================================================================

type Env = Record<string, string | undefined>;
type Json = any;

const GUIDE_MODEL = 'claude-sonnet-5-5'; // 검색 결과를 골라 정리: 정확도 우선
const MAX_SEARCHES = 6;
const FRESH_DAYS = 180;                   // 이보다 오래된 카드는 다시 만듦

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(status: number, body: Json): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/** '더헤븐 CC' · '더헤븐컨트리클럽' → '더헤븐' / '사우스 코스' · 'South' → '사우스' */
export function normName(s: string): string {
  return String(s || '').toLowerCase().replace(/\s+/g, '')
    .replace(/(컨트리클럽|골프클럽|골프앤리조트|골프리조트|골프장|리조트|c\.?c\.?|g\.?c\.?|countryclub|golfclub)$/i, '')
    .replace(/[()\[\]·.,'"-]/g, '');
}
export function normSub(s: string): string {
  const t = String(s || '').toLowerCase().replace(/\s+/g, '').replace(/코스$|course$/i, '');
  const map: Record<string, string> = { south: '사우스', west: '웨스트', east: '이스트', north: '노스', lake: '레이크', valley: '밸리', mountain: '마운틴', ocean: '오션', hill: '힐' };
  return map[t] || t;
}
export function guideKey(name: string, sub: string): string { return `${normName(name)}|${normSub(sub)}`; }

async function getUser(env: Env, authHeader: string, f: typeof fetch) {
  const res = await f(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: env.SUPABASE_ANON_KEY || '' } });
  if (!res.ok) return null;
  const u = await res.json();
  return u && u.id ? u : null;
}

async function rpc(env: Env, fn: string, body: Json, f: typeof fetch) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const res = await f(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`rpc ${fn} 실패 (${res.status})`);
  return res.json();
}

async function isPro(env: Env, userId: string, f: typeof fetch): Promise<boolean> {
  if (env.AI_ALLOW_ALL_USERS === 'true') return true;
  try {
    const st = await rpc(env, 'bp_public_settings', {}, f);
    const until = st && (st as Json).pro_free_until;
    if (until && Date.parse(String(until)) > Date.now()) return true;
  } catch (_) { /* 결제 상태로 확인 */ }
  try {
    for (const m of env.PRO_PAY_TEST_OK === 'true' ? ['live', 'test'] : ['live']) {
      const until = await rpc(env, 'bp_web_pro_until', { p_user: userId, p_mode: m }, f);
      if (until && Date.parse(String(until)) > Date.now()) return true;
    }
  } catch (_) { /* 앱 결제로 확인 */ }
  if (!env.REVENUECAT_SECRET_KEY) return false;
  const res = await f(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` } });
  if (!res.ok) return false;
  const ent = (await res.json())?.subscriber?.entitlements?.pro;
  return !!ent && (!ent.expires_date || Date.parse(ent.expires_date) > Date.now());
}

/** 저장된 카드 찾기 (이름 그대로 또는 예전에 물어본 다른 이름) */
async function findGuide(env: Env, key: string, f: typeof fetch): Promise<Json | null> {
  const k = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const q = `${env.SUPABASE_URL}/rest/v1/course_guides?select=key,data,updated_at&or=(key.eq.${encodeURIComponent(JSON.stringify(key))},aliases.cs.${encodeURIComponent('{' + JSON.stringify(key) + '}')})&limit=1`;
  const res = await f(q, { headers: { apikey: k, Authorization: `Bearer ${k}` } });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows && rows[0] ? rows[0] : null;
}

async function saveGuide(env: Env, key: string, alias: string, data: Json, userId: string, f: typeof fetch) {
  const k = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const prev = await findGuide(env, key, f).catch(() => null);
  const aliases = Array.from(new Set([...(prev?.data?._aliases || []), alias].filter(a => a && a !== key)));
  await f(`${env.SUPABASE_URL}/rest/v1/course_guides?on_conflict=key`, {
    method: 'POST',
    headers: { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ key, aliases, data: { ...data, _aliases: aliases }, built_by: userId, updated_at: new Date().toISOString() }),
  });
}

function prompt(name: string, sub: string): string {
  return `한국 골프장 "${name}"${sub ? ` "${sub}" 코스` : ''}의 공략 카드를 만듭니다.

웹 검색으로 찾으세요 (최대 ${MAX_SEARCHES}번):
1) 골프장 공식 홈페이지의 코스 안내 — 홀별 파, 티별 거리, 홀 설명. 홀별 안내 페이지 주소도 모으세요.
2) 뉴스 기사(대회 코스 세팅·선수 인터뷰), 골프 블로그·커뮤니티 라운딩 후기 — 코스 특징과 공략.

규칙:
- 찾은 자료에 있는 것만 씁니다. 홀별 거리·해저드·벙커 위치를 지어내지 마세요. 못 찾은 값은 null 또는 빈 문자열.
- 공식 자료에서 거리를 못 찾았으면 yards를 비워 둡니다.
- 홀 팁(tip)은 자료에 근거가 있으면 tip_basis "source", 거리·파 구성으로 판단한 일반 운영 팁이면 "general".
- 블로그 문장을 그대로 옮기지 말고 짧게 요약합니다. 모든 글은 쉬운 한국어.
- 골프장이나 코스를 확인할 수 없으면 found:false.
- 공식 페이지의 야드/미터 표가 서로 맞지 않는 등 이상한 점은 notes에 적습니다.

마지막 답은 아래 JSON 하나만 (설명·코드블록 없이):
{"found":true,
 "official_name":"골프장 공식 이름","sub_course":"코스 이름(없으면 빈 문자열)","region":"시·군 (예: 경기 안산 대부도)",
 "holes_count":9,"par_total":36,"unit":"yd 또는 m",
 "tees":["블랙","블루","화이트","골드","레드"],
 "summary":"코스 한 줄 요약 (60자 이내)",
 "key_points":["핵심 공략 3가지, 각 40자 이내"],
 "holes":[{"no":1,"par":4,"dist":{"블랙":394,"화이트":346},"tip":"2~3문장 이내","tip_basis":"general","tags":["버디 찬스" 또는 "주의" 등 0~2개],"hazard":"자료에 있을 때만","page_url":"공식 홀 안내 주소(있을 때만)"}],
 "notes":"자료상 주의점 (없으면 빈 문자열)",
 "sources":[{"title":"출처 이름","url":"주소"}]}`;
}

async function callClaude(env: Env, body: Json, f: typeof fetch) {
  const res = await f('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String(data?.error?.message || '');
    const e: Json = new Error(`Claude API 오류 (${res.status}) ${msg}`);
    e.quota = /usage limit|spend limit|credit balance|billing/i.test(msg);
    throw e;
  }
  return data;
}

/** 답에서 JSON만 꺼내 검사·정리 */
export function cleanGuide(text: string, cited: Json[]): Json | null {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let g: Json;
  try { g = JSON.parse(text.slice(a, b + 1)); } catch (_) { return null; }
  if (!g || g.found === false) return { found: false };
  const holes = (Array.isArray(g.holes) ? g.holes : []).filter((h: Json) => h && Number(h.no) >= 1 && Number(h.no) <= 27)
    .map((h: Json) => {
      const dist: Record<string, number> = {};
      for (const [t, v] of Object.entries(h.dist || {})) { const n = Number(v); if (n > 40 && n < 800) dist[String(t).slice(0, 8)] = Math.round(n); }
      const par = Number(h.par);
      return {
        no: Number(h.no), par: par >= 3 && par <= 6 ? par : null, dist,
        tip: String(h.tip || '').slice(0, 220), tip_basis: h.tip_basis === 'source' ? 'source' : 'general',
        tags: (Array.isArray(h.tags) ? h.tags : []).map((x: Json) => String(x).slice(0, 10)).slice(0, 2),
        hazard: String(h.hazard || '').slice(0, 120),
        page_url: /^https?:\/\//.test(String(h.page_url || '')) ? String(h.page_url) : '',
      };
    }).sort((x: Json, y: Json) => x.no - y.no);
  if (!holes.length) return null;
  const tees = (Array.isArray(g.tees) ? g.tees : []).map((t: Json) => String(t).slice(0, 8)).filter((t: string) => holes.some((h: Json) => h.dist[t]));
  const src: Json[] = [];
  const seen = new Set<string>();
  for (const s of [...(Array.isArray(g.sources) ? g.sources : []), ...cited]) {
    const url = String(s?.url || '');
    if (!/^https?:\/\//.test(url) || seen.has(url)) continue;
    seen.add(url); src.push({ title: String(s.title || url).slice(0, 80), url });
    if (src.length >= 8) break;
  }
  return {
    found: true,
    official_name: String(g.official_name || '').slice(0, 40), sub_course: String(g.sub_course || '').slice(0, 20),
    region: String(g.region || '').slice(0, 40),
    holes_count: holes.length, par_total: holes.reduce((s: number, h: Json) => s + (h.par || 0), 0) || Number(g.par_total) || null,
    unit: g.unit === 'm' ? 'm' : 'yd', tees,
    summary: String(g.summary || '').slice(0, 120),
    key_points: (Array.isArray(g.key_points) ? g.key_points : []).map((x: Json) => String(x).slice(0, 80)).slice(0, 3),
    holes, notes: String(g.notes || '').slice(0, 200), sources: src,
    checked_at: new Date().toISOString().slice(0, 10),
  };
}

async function build(env: Env, name: string, sub: string, f: typeof fetch): Promise<Json | null> {
  const messages: Json[] = [{ role: 'user', content: prompt(name, sub) }];
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES, user_location: { type: 'approximate', country: 'KR', timezone: 'Asia/Seoul' } }];
  let text = '';
  const cited: Json[] = [];
  for (let i = 0; i < 4; i++) {
    const resp = await callClaude(env, { model: GUIDE_MODEL, max_tokens: 8000, tools, messages }, f);
    const blocks: Json[] = resp.content || [];
    for (const b of blocks) {
      if (b.type === 'text') {
        text += b.text;
        for (const c of b.citations || []) if (c.url) cited.push({ title: c.title, url: c.url });
      }
    }
    if (resp.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: blocks }); // 긴 검색이 잠깐 멈춤 → 그대로 이어서
  }
  return cleanGuide(text, cited);
}

export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'login_required', message: '로그인이 필요해요.' });
  const user = await getUser(env, auth, f);
  if (!user) return json(401, { error: 'login_required', message: '로그인이 만료됐어요. 다시 로그인해 주세요.' });
  if (!(await isPro(env, user.id, f))) return json(403, { error: 'pro_required', message: '공략 카드는 PRO 회원 전용 기능이에요.' });

  let body: Json;
  try { body = await req.json(); } catch (_) { return json(400, { error: 'bad_request' }); }
  const name = String(body.course_name || '').trim().slice(0, 40);
  const sub = String(body.sub_course || '').trim().slice(0, 20);
  if (!name) return json(400, { error: 'empty', message: '골프장 이름이 필요해요.' });
  const askKey = guideKey(name, sub);

  // 1) 저장된 카드
  const row = await findGuide(env, askKey, f).catch(() => null);
  const fresh = row && Date.now() - Date.parse(row.updated_at) < FRESH_DAYS * 86400000;
  if (row && fresh && !body.refresh) return json(200, { guide: row.data, cached: true });

  // 2) 새로 만들기 (하루 횟수 제한)
  const limit = parseInt(env.AI_DAILY_GUIDE_LIMIT || '3', 10);
  try {
    if (!(await rpc(env, 'ai_try_use', { p_user: user.id, p_kind: 'guide', p_limit: limit }, f))) {
      if (row) return json(200, { guide: row.data, cached: true, stale: true });
      return json(429, { error: 'daily_limit', message: `오늘 새 골프장 공략 카드는 ${limit}곳까지 만들 수 있어요. 내일 다시 시도해 주세요.` });
    }
  } catch (_) { return json(500, { error: 'usage_check_failed', message: '잠시 후 다시 시도해 주세요.' }); }
  const refund = async () => { try { await rpc(env, 'ai_refund_use', { p_user: user.id, p_kind: 'guide' }, f); } catch (_) { /* 무시 */ } };

  try {
    const g = await build(env, name, sub, f);
    if (!g || !g.found) {
      await refund();
      if (row) return json(200, { guide: row.data, cached: true, stale: true });
      return json(404, { error: 'not_found', message: `${name}${sub ? ' ' + sub : ''}의 코스 정보를 찾지 못했어요. 골프장·코스 이름을 다시 확인해 주세요.` });
    }
    const key = guideKey(g.official_name || name, g.sub_course || sub);
    await saveGuide(env, key, askKey, g, user.id, f).catch(e => console.warn('[course-guide] 저장 실패', e));
    return json(200, { guide: g, cached: false });
  } catch (e) {
    console.error(e);
    await refund();
    if (row) return json(200, { guide: row.data, cached: true, stale: true });
    if ((e as Json)?.quota) return json(503, { error: 'ai_paused', message: '이번 달 AI 이용이 많아 잠시 쉬고 있어요.' });
    return json(502, { error: 'ai_failed', message: '공략 카드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
}

declare const Deno: any;
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve((req: Request) => handle(req, Deno.env.toObject()));
}
