// =====================================================================
// BuddyPlanner 단체 일정 명단 읽기 — Supabase Edge Function (group-import)
//
// 총무가 찍은 종이 조편성표·명단 사진(손글씨 포함)을 AI(Claude 비전)로 읽어
// 조·티업·코스·이름·전화번호를 돌려줌. 앱은 결과를 '확인 화면'에 먼저 보여 주고
// 총무가 고친 뒤에만 조편성표에 넣음.
//  - 로그인한 사람만 · 1인 하루 20장 (ai_usage 'import')
//  - 사진은 저장하지 않음
// 비밀값: ANTHROPIC_API_KEY (ai-chat 과 같은 키)
// =====================================================================

type Env = Record<string, string | undefined>;
type Json = any;

const MODEL = 'claude-sonnet-5-5';
const DAILY = 20;
const MAX_B64 = 6_000_000;   // 앱이 1600px JPEG 로 줄여 보냄 (보통 0.3~0.8MB)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: Json) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

async function getUser(env: Env, auth: string, f: typeof fetch) {
  const r = await f(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: env.SUPABASE_ANON_KEY || '' } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}
async function rpc(env: Env, fn: string, body: Json, f: typeof fetch) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const r = await f(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`rpc ${fn} ${r.status}`);
  return r.json();
}

const PROMPT = `이 사진은 한국 골프 단체 모임의 조편성표나 참석자 명단입니다 (인쇄물, 손글씨, 화이트보드, 카톡 화면 캡처일 수 있음).
사진에 적힌 내용만 읽어서 read_lineup 도구로 돌려주세요.
- 조(1조, A조, 1팀 등)가 있으면 조별로, 없으면 teams 하나에 모두 넣으세요.
- tee: 그 조의 티업/티오프 시각이 적혀 있으면 "07:00" 형식, 없으면 빈 문자열.
- course: 코스 이름(OUT, IN, 하늘, 레이크 등)이 적혀 있으면, 없으면 빈 문자열.
- 사람: 이름만 (직함·호칭 "님/프로/회장"은 이름에 붙어 있으면 그대로 둠). 전화번호가 있으면 숫자만.
- 글씨가 흐리거나 확실하지 않은 이름은 unsure: true.
- 사진에 없는 사람을 지어내지 마세요. 명단이 아니면 teams 를 빈 배열로.`;

const TOOL = {
  name: 'read_lineup',
  description: '사진에서 읽은 조편성/명단',
  input_schema: {
    type: 'object',
    properties: {
      teams: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tee: { type: 'string' },
            course: { type: 'string' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: { name: { type: 'string' }, phone: { type: 'string' }, unsure: { type: 'boolean' } },
                required: ['name'],
              },
            },
          },
          required: ['members'],
        },
      },
    },
    required: ['teams'],
  },
};

/** AI 결과를 안전하게 정리 (최대 10조 · 조당 8명 · 글자 길이 제한) */
export function clean(input: Json) {
  const teams = Array.isArray(input && input.teams) ? input.teams : [];
  return teams.slice(0, 10).map((t: Json) => {
    const tee = /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(t && t.tee || '').trim())
      ? String(t.tee).trim().padStart(5, '0') : '';
    const members = (Array.isArray(t && t.members) ? t.members : []).slice(0, 8).map((m: Json) => ({
      name: String(m && m.name || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20),
      phone: (String(m && m.phone || '').replace(/[^0-9]/g, '').match(/^01\d{8,9}$/) || [''])[0],
      unsure: !!(m && m.unsure),
    })).filter((m: Json) => m.name);
    return { tee, course: String(t && t.course || '').replace(/[<>"'`\\]/g, '').trim().slice(0, 20), members };
  }).filter((t: Json) => t.members.length);
}

export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!env.ANTHROPIC_API_KEY) return json(503, { error: 'not_configured' });
  const auth = req.headers.get('Authorization') || '';
  const user = auth.startsWith('Bearer ') ? await getUser(env, auth, f) : null;
  if (!user) return json(401, { error: 'login_required' });

  let body: Json;
  try { body = await req.json(); } catch (_) { return json(400, { error: 'bad_body' }); }
  const image = String(body.image || '');
  const mime = ['image/jpeg', 'image/png', 'image/webp'].includes(body.mime) ? body.mime : 'image/jpeg';
  if (!image || image.length > MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 200))) return json(400, { error: 'bad_image' });

  try {
    if (!(await rpc(env, 'ai_try_use', { p_user: user.id, p_kind: 'import', p_limit: DAILY }, f))) {
      return json(429, { error: 'daily_limit', message: `사진 읽기는 하루 ${DAILY}장까지예요. 붙여넣기나 직접 입력을 써 주세요.` });
    }
  } catch (e) { console.error('import usage', (e as Error).message); return json(503, { error: 'usage_check_failed' }); }
  const refund = async () => { try { await rpc(env, 'ai_refund_use', { p_user: user.id, p_kind: 'import' }, f); } catch (_) { /* */ } };

  try {
    const r = await f('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 2000,
        tools: [TOOL], tool_choice: { type: 'tool', name: 'read_lineup' },
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data: image } },
          { type: 'text', text: PROMPT },
        ] }],
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { await refund(); console.error('anthropic', r.status, d?.error?.type || ''); return json(502, { error: 'ai_failed' }); }
    const tu = (d.content || []).find((c: Json) => c.type === 'tool_use');
    const teams = clean(tu && tu.input);
    return json(200, { teams });
  } catch (e) {
    await refund();
    console.error('group-import', (e as Error).message);
    return json(500, { error: 'internal' });
  }
}

// deno-lint-ignore no-explicit-any
const D = (globalThis as any).Deno;
if (D && D.serve) D.serve((req: Request) => handle(req, D.env.toObject()));
