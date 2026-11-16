// =====================================================================
// BuddyPlanner 음성 받아쓰기 — Supabase Edge Function (voice-stt)
//
// 앱이 녹음한 짧은 음성(최대 30초)을 받아 OpenAI 음성 인식으로 글자로 바꿔 돌려줌.
//  - 음성 파일은 저장하지 않음 (받아쓰기 후 바로 버림)
//  - 골프장 이름·골프 용어를 힌트로 넘겨 고유명사 정확도를 높임
//  - 비용 안전장치: 1회 30초 · 1인 하루 횟수 · 서비스 전체 월 분량
//    넘으면 { fallback: true } → 앱은 기기 받아쓰기로 바꿔 씀
//
// 비밀값: OPENAI_API_KEY (없으면 기능 꺼짐 → 앱은 기기 받아쓰기)
// 선택:  VOICE_MODEL (기본 gpt-4o-transcribe) · VOICE_DAILY_LIMIT (기본 30)
//        VOICE_MONTHLY_MINUTES (기본 3400 ≈ 월 3만 원)
// =====================================================================

type Env = Record<string, string | undefined>;
type Json = any;

const MAX_SEC = 30;
const MAX_BYTES = 1_500_000;   // 30초 압축 음성은 보통 0.5MB 안팎
const GOLF_WORDS = '골프장, 티오프, 티업, 하늘코스, 동코스, 서코스, 남코스, 북코스, 레이크코스, 밸리코스, 힐코스, 오션코스, CC, GC, 컨트리클럽, 라운딩, 단체 라운딩, 스크린, 버디, 파, 보기, 더블보기, 이글, 홀인원, 그린, 페어웨이, 벙커, 해저드, 캐디, 카트, 클럽하우스, 해장국, 출발, 도착, 집결지';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(status: number, body: Json): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
}

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

/** 힌트 문장: 골프 용어 + 사용자 골프장 이름 (짧게, 이상한 글자 제거) */
export function buildPrompt(hints: unknown): string {
  const list = Array.isArray(hints) ? hints : [];
  const names = [...new Set(list.map((h) => String(h || '').replace(/[^\p{L}\p{N}\s·&()-]/gu, '').trim().slice(0, 30)).filter(Boolean))].slice(0, 25);
  return `골프 일정 앱에 하는 한국어 말입니다. 자주 나오는 말: ${GOLF_WORDS}${names.length ? '. 골프장: ' + names.join(', ') : ''}.`;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const EXT: Record<string, string> = { 'audio/mp4': 'm4a', 'audio/m4a': 'm4a', 'audio/aac': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mpeg': 'mp3' };

export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!env.OPENAI_API_KEY) return json(503, { error: 'not_configured', fallback: true });

  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'login_required', fallback: true });
  const user = await getUser(env, auth, f);
  if (!user) return json(401, { error: 'login_required', fallback: true });

  let body: Json;
  try { body = await req.json(); } catch (_) { return json(400, { error: 'bad_body' }); }
  const audio = String(body.audio || '');
  const mime = String(body.mime || 'audio/mp4').split(';')[0].toLowerCase();
  if (!audio) return json(400, { error: 'empty' });
  let bytes: Uint8Array;
  try { bytes = b64ToBytes(audio); } catch (_) { return json(400, { error: 'bad_audio' }); }
  if (bytes.length < 800) return json(200, { text: '' });                      // 너무 짧음 (무음)
  if (bytes.length > MAX_BYTES) return json(413, { error: 'too_long', fallback: true });
  const sec = Math.min(MAX_SEC, Math.max(1, Math.ceil(Number(body.seconds) || MAX_SEC)));

  // 1인 하루 횟수
  const daily = parseInt(env.VOICE_DAILY_LIMIT || '30', 10);
  try {
    if (!(await rpc(env, 'ai_try_use', { p_user: user.id, p_kind: 'voice', p_limit: daily }, f))) {
      return json(429, { error: 'daily_limit', fallback: true, message: `오늘 고음질 음성 인식 ${daily}회를 다 썼어요. 오늘은 기본 받아쓰기로 들어요.` });
    }
  } catch (e) { console.error('voice usage', (e as Error).message); return json(503, { error: 'usage_check_failed', fallback: true }); }
  const refund = async () => { try { await rpc(env, 'ai_refund_use', { p_user: user.id, p_kind: 'voice' }, f); } catch (_) { /* 무시 */ } };

  // 서비스 전체 월 분량
  const capSec = parseInt(env.VOICE_MONTHLY_MINUTES || '3400', 10) * 60;
  try {
    if (!(await rpc(env, 'voice_month_add', { p_sec: sec, p_cap_sec: capSec }, f))) {
      await refund();
      console.error('voice monthly cap reached');
      return json(429, { error: 'monthly_cap', fallback: true });
    }
  } catch (e) { await refund(); console.error('voice month', (e as Error).message); return json(503, { error: 'usage_check_failed', fallback: true }); }

  try {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mime }), `voice.${EXT[mime] || 'm4a'}`);
    form.append('model', env.VOICE_MODEL || 'gpt-4o-transcribe');
    form.append('language', 'ko');
    form.append('response_format', 'json');
    form.append('prompt', buildPrompt(body.hints));
    const res = await f('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await refund();
      console.error('openai stt', res.status, data?.error?.type || '', data?.error?.code || '');
      return json(502, { error: 'stt_failed', fallback: true });
    }
    return json(200, { text: String(data.text || '').trim().slice(0, 500) });
  } catch (e) {
    await refund();
    console.error('voice-stt', (e as Error).message);
    return json(500, { error: 'internal', fallback: true });
  }
}

// deno-lint-ignore no-explicit-any
const D = (globalThis as any).Deno;
if (D && D.serve) D.serve((req: Request) => handle(req, D.env.toObject()));
