// =====================================================================
// BuddyPlanner 추천 맛집 — Supabase Edge Function (food-nearby)
//
// 앱 '추천 맛집' 메뉴 → 골프장 입력 → 이 함수
//  1) 로그인 확인  2) 하루 검색 한도 확인  3) 골프장 위치 확인
//  4) 카카오 실시간 검색 → 카테고리별 정리 (키가 있으면 AI가 순서·한 줄 이유를 다듬음)
//  5) 운영팀 추천(food_picks)과 버디 평가를 붙여서 돌려줌
// 검색 결과는 저장하지 않습니다 (카카오 로컬 API 정책).
//
// 필요한 비밀값: KAKAO_REST_API_KEY / 선택: ANTHROPIC_API_KEY, FOOD_DAILY_LIMIT(기본 30)
// 자동 제공: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// =====================================================================
import { resolveCourse, searchCandidates, groupByRule, curateWithAI, placeKey, publicPlace, catInfo, classify } from '../_shared/food.ts';

type Env = Record<string, string | undefined>;
type Json = any;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(status: number, body: Json): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

async function getUser(env: Env, authHeader: string, f: typeof fetch) {
  const res = await f(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: env.SUPABASE_ANON_KEY || '' } });
  if (!res.ok) return null;
  const u = await res.json();
  return u && u.id ? u : null;
}

function svcHeaders(env: Env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}
async function rpc(env: Env, fn: string, body: Json, f: typeof fetch) {
  const res = await f(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: svcHeaders(env), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`rpc ${fn} 실패 (${res.status})`);
  return res.json();
}

export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'login_required', message: '로그인하면 골프장 주변 맛집을 볼 수 있어요.' });
  const user = await getUser(env, auth, f);
  if (!user) return json(401, { error: 'login_required', message: '로그인이 만료됐어요. 다시 로그인해 주세요.' });

  let body: Json;
  try { body = await req.json(); } catch (_) { return json(400, { error: 'bad_request' }); }
  const name = String(body.course_name || '').slice(0, 60);
  let lat = Number(body.lat), lng = Number(body.lng);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) < 1 || Math.abs(lng) < 1) { lat = NaN; lng = NaN; }
  if (!name && isNaN(lat)) return json(400, { error: 'course_required', message: '골프장을 입력해 주세요.' });
  if (!isNaN(lat) && (lat < 32 || lat > 39.5 || lng < 124 || lng > 132)) return json(400, { error: 'out_of_range', message: '국내 골프장만 찾을 수 있어요.' });

  const limit = parseInt(env.FOOD_DAILY_LIMIT || '30', 10);
  try {
    if (!(await rpc(env, 'ai_try_use', { p_user: user.id, p_kind: 'food', p_limit: limit }, f))) {
      return json(429, { error: 'daily_limit', message: `오늘 맛집 검색 한도(${limit}회)를 모두 썼어요. 내일 다시 이용해 주세요.` });
    }
  } catch (_) {
    return json(500, { error: 'usage_check_failed', message: '잠시 후 다시 시도해 주세요.' });
  }

  let course: Json;
  try {
    course = await resolveCourse(env, name, isNaN(lat) ? null : lat, isNaN(lng) ? null : lng, f);
  } catch (e) {
    return json(502, { error: 'search_failed', message: '맛집을 찾지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
  if (!course) return json(404, { error: 'course_not_found', message: `'${name}' 골프장을 찾지 못했어요. 이름을 다시 확인해 주세요.` });

  let cands: Json[];
  try { cands = await searchCandidates(env, course.lat, course.lng, f); }
  catch (_) { return json(502, { error: 'search_failed', message: '맛집을 찾지 못했어요. 잠시 후 다시 시도해 주세요.' }); }

  const ruled = groupByRule(cands);
  const { groups, by } = await curateWithAI(env, ruled, course.name, f);

  // 운영팀 추천 (실시간 결과에 있는 식당만)
  let picks: Json[] = [];
  if (course.id) {
    try {
      const res = await f(`${env.SUPABASE_URL}/rest/v1/food_picks?select=place_id,timing,note&course_id=eq.${encodeURIComponent(course.id)}`, { headers: svcHeaders(env) });
      if (res.ok) picks = await res.json();
    } catch (_) { /* 없어도 진행 */ }
  }
  const candById: Record<string, Json> = {};
  cands.forEach(p => { candById[p.id] = p; });

  // 버디 평가
  const all: Json[] = [];
  for (const t of ['before', 'after']) for (const g of groups[t]) all.push(...g.items);
  for (const pk of picks) if (candById[pk.place_id]) all.push(candById[pk.place_id]);
  const ratings: Record<string, Json> = {};
  if (all.length) {
    try {
      const rows = await rpc(env, 'get_place_ratings', { keys: [...new Set(all.map(p => placeKey(p.name)))] }, f);
      for (const r of rows || []) ratings[r.place_key] = r;
    } catch (_) { /* 평가 없이 진행 */ }
  }
  const decorate = (p: Json) => {
    const out: Json = publicPlace(p);
    const r = ratings[placeKey(p.name)];
    if (r) { out.buddy_rating = Number(r.avg_rating); out.buddy_count = r.review_count; }
    return out;
  };

  const result: Json = { course, curated_by: by, before: [], after: [] };
  for (const t of ['before', 'after']) {
    const tPicks = picks.filter(pk => pk.timing === t && candById[pk.place_id]).map(pk => {
      const p = candById[pk.place_id];
      const ck = classify(p.kakao_category, p.name);
      return { ...decorate(p), pick: true, note: pk.note || null, cat: ck, cat_label: ck ? catInfo(ck)?.label : null };
    });
    const pickIds = new Set(tPicks.map(p => p.id));
    result[t] = groups[t].map((g: Json) => ({
      key: g.key, label: g.label, emoji: g.emoji,
      items: [
        ...tPicks.filter(p => p.cat === g.key),
        ...g.items.filter((p: Json) => !pickIds.has(p.id)).map(decorate),
      ],
    }));
    // 카테고리에 안 맞는 운영팀 추천은 첫 카테고리 맨 위에
    const loose = tPicks.filter(p => !result[t].some((g: Json) => g.key === p.cat));
    if (loose.length && result[t][0]) result[t][0].items.unshift(...loose);
  }
  result.total = result.before.concat(result.after).reduce((n: number, g: Json) => n + g.items.length, 0);
  return json(200, result);
}

declare const Deno: any;
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve((req: Request) => handle(req, Deno.env.toObject()));
}
