// =====================================================================
// BuddyPlanner 광고 보상 서버 검증 — Supabase Edge Function (admob-reward)
//
// 사용자가 보상형 광고를 끝까지 보면 Google AdMob 서버가 이 주소를 직접 호출합니다.
// Google의 서명을 확인한 뒤에만 포인트를 적립하므로, 앱을 조작해도 포인트를 만들 수 없습니다.
//
// 설정
//  1) 배포: supabase functions deploy admob-reward --no-verify-jwt   (Google이 로그인 없이 호출하기 때문)
//  2) AdMob 콘솔 → 보상형 광고 단위 → 서버 측 확인 → 콜백 URL:
//       https://<프로젝트>.supabase.co/functions/v1/admob-reward
//  3) 검증 확인 후 SQL Editor에서:  update app_settings set value = 'ssv' where key = 'ad_reward_mode';
//     (이때부터 앱이 직접 적립을 요청하면 거절되고, 이 함수로만 적립됩니다)
// 자동 제공: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// 참고: https://developers.google.com/admob/android/ssv
// =====================================================================

type Env = Record<string, string | undefined>;
type Json = any;

export const KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let keyCache: { at: number; keys: Record<string, CryptoKey> } | null = null;

function b64ToBytes(b64: string): Uint8Array {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** ECDSA DER 서명 → WebCrypto가 요구하는 r||s (64바이트) */
export function derToRaw(der: Uint8Array): Uint8Array {
  if (der[0] !== 0x30) throw new Error('bad der');
  let i = 2;
  if (der[1] & 0x80) i = 2 + (der[1] & 0x7f);
  const readInt = () => {
    if (der[i] !== 0x02) throw new Error('bad der int');
    const len = der[i + 1];
    let v = der.slice(i + 2, i + 2 + len);
    i += 2 + len;
    while (v.length > 32 && v[0] === 0) v = v.slice(1);
    const out = new Uint8Array(32);
    out.set(v, 32 - v.length);
    return out;
  };
  const r = readInt(), s = readInt();
  const raw = new Uint8Array(64);
  raw.set(r, 0); raw.set(s, 32);
  return raw;
}

async function getKeys(f: typeof fetch): Promise<Record<string, CryptoKey>> {
  if (keyCache && Date.now() - keyCache.at < 6 * 3600 * 1000) return keyCache.keys;
  const res = await f(KEYS_URL);
  if (!res.ok) throw new Error('keys fetch failed');
  const data = await res.json();
  const keys: Record<string, CryptoKey> = {};
  for (const k of data.keys || []) {
    keys[String(k.keyId)] = await crypto.subtle.importKey(
      'spki', b64ToBytes(k.base64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  }
  keyCache = { at: Date.now(), keys };
  return keys;
}

export function _resetKeyCache() { keyCache = null; }

/** Google 서명 확인: 서명 대상은 쿼리 문자열에서 '&signature=' 앞부분 */
export async function verifySsv(url: string, f: typeof fetch): Promise<URLSearchParams | null> {
  const query = url.split('?')[1] || '';
  const sigAt = query.indexOf('&signature=');
  if (sigAt < 0) return null;
  const message = query.slice(0, sigAt);
  const params = new URLSearchParams(query);
  const sig = params.get('signature'), keyId = params.get('key_id');
  if (!sig || !keyId) return null;
  const keys = await getKeys(f);
  const key = keys[keyId];
  if (!key) return null;
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(b64ToBytes(sig)), new TextEncoder().encode(message));
  return ok ? params : null;
}

export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method !== 'GET') return new Response('method', { status: 405 });
  let params: URLSearchParams | null = null;
  try {
    params = await verifySsv(req.url, f);
  } catch (e) {
    console.error(e);
    return new Response('verify error', { status: 500 });   // Google이 나중에 다시 시도
  }
  if (!params) return new Response('invalid signature', { status: 403 });

  const userId = params.get('user_id') || '';
  const tx = params.get('transaction_id') || '';
  // AdMob 콘솔의 '확인 테스트' 호출 등 사용자 없는 요청은 성공으로 응답만
  if (!UUID_RE.test(userId) || !tx) return new Response('ok (no user)', { status: 200 });

  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const res = await f(`${env.SUPABASE_URL}/rest/v1/rpc/grant_ad_reward`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user: userId, p_tx: 'admob:' + tx }),
  });
  if (!res.ok) return new Response('grant failed', { status: 500 });
  const out: Json = await res.json();
  return new Response(JSON.stringify(out), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

declare const Deno: any;
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve((req: Request) => handle(req, Deno.env.toObject()));
}
