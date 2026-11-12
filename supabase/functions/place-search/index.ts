// =====================================================================
// BuddyPlanner 장소 검색 — Supabase Edge Function (place-search)
//
// 골프장·주소 검색과 골프장 주변 식당 찾기를 카카오 장소 검색으로 합니다.
//  · 카카오 REST 키는 서버에만 둡니다 (앱에 넣지 않음).
//  · 결과는 저장하지 않고 그대로 돌려줍니다 (카카오 로컬 API 정책).
//  · 로그인한 사용자만, 하루 검색 한도 안에서 씁니다.
//  · 앱은 이 함수가 실패하면 TMAP 검색으로 넘어갑니다.
//
// body: { mode: 'keyword', q, golf }  또는  { mode: 'nearby', lat, lng, radius_km, q }
// 필요한 비밀값: KAKAO_REST_API_KEY / 선택: PLACE_DAILY_LIMIT(기본 300)
// =====================================================================
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

async function tryUse(env: Env, uid: string, limit: number, f: typeof fetch) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const res = await f(`${env.SUPABASE_URL}/rest/v1/rpc/ai_try_use`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user: uid, p_kind: 'place', p_limit: limit }),
  });
  if (!res.ok) throw new Error('usage ' + res.status);
  return await res.json();
}

async function kakao(env: Env, path: string, params: Record<string, string>, f: typeof fetch) {
  const q = new URLSearchParams(params).toString();
  const res = await f(`https://dapi.kakao.com/v2/local/search/${path}.json?${q}`, {
    headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
  });
  if (!res.ok) throw new Error(`kakao ${res.status}`);
  return (await res.json()).documents || [];
}

/** 음식 종류: 마지막 단계가 가게 이름(브랜드)이면 그 앞 단계 */
function typeLabel(categoryName: string, placeName: string) {
  const parts = String(categoryName || '').split('>').map(x => x.trim()).filter(Boolean);
  const name = String(placeName || '').replace(/\s+/g, '');
  while (parts.length > 2) {
    const last = parts[parts.length - 1].replace(/\s+/g, '');
    if (last && last.length >= 3 && name.includes(last)) parts.pop(); else break;
  }
  return parts[parts.length - 1] || '';
}

// 앱의 기존 검색 결과 모양(place_name, address_name, x, y)에 맞춤
function toPlace(d: Json) {
  const road = String(d.road_address_name || '').trim(), jb = String(d.address_name || '').trim();
  return {
    id: String(d.id || ''),
    place_name: String(d.place_name || ''),
    address_name: road || jb,
    jibun_name: road && jb && road !== jb ? jb : '',   // 지번(구주소)도 같이 보여 주려고
    tel: d.phone || '',
    category: typeLabel(d.category_name, d.place_name),
    x: d.x, y: d.y,
    distance: d.distance ? String(Math.round(Number(d.distance) / 100) / 10) : undefined,
  };
}

/** 주소처럼 친 검색어인지 (역삼동 824 · 테헤란로 114) */
export const looksAddr = (q: string) => /\d/.test(q) && /(동|리|가|로|길|읍|면)\s*\d/.test(q);

/** 카카오 주소 검색 결과 → 같은 모양 (도로명·지번 둘 다) */
function toAddr(d: Json) {
  const road = String((d.road_address && d.road_address.address_name) || '').trim();
  const jb = String((d.address && d.address.address_name) || (d.address_type !== 'ROAD_ADDR' ? d.address_name : '') || '').trim();
  const bld = d.road_address && d.road_address.building_name;
  return { id: 'addr:' + d.address_name, place_name: String(bld || d.address_name || ''), address_name: road || jb, jibun_name: road && jb && road !== jb ? jb : '', tel: '', category: '주소', x: d.x, y: d.y };
}

export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!env.KAKAO_REST_API_KEY) return json(503, { error: 'not_configured' });

  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'login_required' });
  const user = await getUser(env, auth, f);
  if (!user) return json(401, { error: 'login_required' });

  let body: Json;
  try { body = await req.json(); } catch (_) { return json(400, { error: 'bad_request' }); }
  const mode = body.mode === 'nearby' ? 'nearby' : 'keyword';

  try {
    if (!(await tryUse(env, user.id, parseInt(env.PLACE_DAILY_LIMIT || '300', 10), f))) {
      return json(429, { error: 'daily_limit' });
    }
  } catch (_) { return json(500, { error: 'usage_check_failed' }); }

  try {
    if (mode === 'keyword') {
      let q = String(body.q || '').trim().slice(0, 60);
      if (!q) return json(200, { places: [] });
      const chosung = /^[ㄱ-ㅎ\s]+$/.test(q);
      if (body.golf && !chosung && !q.includes('골프') && !q.toLowerCase().includes('cc')) q += ' 골프장';
      // 주소처럼 치면(골프장 검색 제외) 그 주소를 맨 위에 — 지번(구주소)으로 쳐도 찾게
      const addrFirst = !body.golf && looksAddr(q);
      const [docs, addrs] = await Promise.all([
        kakao(env, 'keyword', { query: q, size: '15' }, f),
        addrFirst ? kakao(env, 'address', { query: q, size: '5' }, f).catch(() => []) : Promise.resolve([]),
      ]);
      return json(200, { places: [...addrs.slice(0, 2).map(toAddr), ...docs.map(toPlace)] });
    }
    // 골프장 주변 식당
    const lat = Number(body.lat), lng = Number(body.lng);
    if (!isFinite(lat) || !isFinite(lng) || lat < 32 || lat > 39.5 || lng < 124 || lng > 132) return json(400, { error: 'bad_location' });
    const radius = String(Math.min(20000, Math.max(500, Math.round((Number(body.radius_km) || 5) * 1000))));
    const q = String(body.q || '맛집').trim().slice(0, 30) || '맛집';
    const base = { query: q, x: String(lng), y: String(lat), radius, category_group_code: 'FD6', sort: 'accuracy', size: '15' };
    const pages = await Promise.all(['1', '2', '3'].map(page => kakao(env, 'keyword', { ...base, page }, f).catch(() => [])));
    const seen = new Set<string>();
    const places: Json[] = [];
    for (const d of pages.flat()) { if (d && d.id && !seen.has(d.id)) { seen.add(d.id); places.push(toPlace(d)); } }
    return json(200, { places });
  } catch (_) {
    return json(502, { error: 'search_failed' });
  }
}

declare const Deno: any;
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve((req: Request) => handle(req, Deno.env.toObject()));
}
