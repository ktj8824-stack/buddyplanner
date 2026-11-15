// Apple 로그인 연결 끊기 (Supabase Edge Function: apple-revoke, verify_jwt=true)
// 회원 탈퇴 때 앱이 Apple 확인을 한 번 더 받아 authorization code 를 보내면,
// 이 함수가 Apple 서버에서 토큰으로 바꾼 뒤 바로 '연결 끊기(revoke)'를 요청합니다.
// (App Store 심사 지침 5.1.1(v): Apple 로그인 앱은 계정 삭제 때 Apple 토큰을 해지해야 함)
//
// 비밀값 (Supabase → Edge Functions → Secrets):
//   APPLE_PRIVATE_KEY  애플 개발자 사이트에서 받은 .p8 파일 내용 전체 (BEGIN/END 줄 포함)
//   APPLE_KEY_ID       그 키의 Key ID (없으면 아래 기본값)
//   APPLE_TEAM_ID      팀 ID (없으면 아래 기본값)
//   APPLE_CLIENT_ID    앱 번들 ID (없으면 com.myB11)
// 자동: SUPABASE_URL, SUPABASE_ANON_KEY

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

const DEFAULT_TEAM_ID = "WKR837G6CH";
const DEFAULT_CLIENT_ID = "com.myB11";
const DEFAULT_KEY_ID = "XRSDV9QSRH";   // 애플 개발자 사이트의 Sign in with Apple 키 ID (비밀 아님)

const b64url = (buf: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf as ArrayBuffer);
  let s = ""; bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Apple 에 보낼 client_secret (ES256 으로 서명한 짧은 JWT, 5분 유효) */
export async function clientSecret(pem: string, keyId: string, teamId: string, clientId: string, now = Math.floor(Date.now() / 1000)) {
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const body = b64url(JSON.stringify({ iss: teamId, iat: now, exp: now + 300, aud: "https://appleid.apple.com", sub: clientId }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

// deno-lint-ignore no-explicit-any
const D = (globalThis as any).Deno;
if (D && D.serve) D.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const env = D.env.toObject();

  // 로그인한 사람만
  const auth = req.headers.get("Authorization") || "";
  const ur = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: env.SUPABASE_ANON_KEY || "" } });
  const user = ur.ok ? await ur.json() : null;
  if (!user || !user.id) return json(401, { error: "login_required" });

  let code = "";
  try { code = String((await req.json()).code || "").slice(0, 2000); } catch { /* */ }
  if (!code) return json(400, { error: "code_required" });

  const pem = env.APPLE_PRIVATE_KEY, keyId = env.APPLE_KEY_ID || DEFAULT_KEY_ID;
  if (!pem || !keyId) return json(503, { error: "not_configured" });
  const clientId = env.APPLE_CLIENT_ID || DEFAULT_CLIENT_ID;

  try {
    const secret = await clientSecret(pem, keyId, env.APPLE_TEAM_ID || DEFAULT_TEAM_ID, clientId);
    const form = (o: Record<string, string>) => new URLSearchParams(o).toString();
    const hdr = { "Content-Type": "application/x-www-form-urlencoded" };
    // 1) 코드 → 토큰
    const tr = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST", headers: hdr,
      body: form({ client_id: clientId, client_secret: secret, code, grant_type: "authorization_code" }),
    });
    const tj = await tr.json().catch(() => ({}));
    const token = tj.refresh_token || tj.access_token;
    if (!token) { console.error("apple token", tr.status, tj.error); return json(400, { error: "exchange_failed", detail: String(tj.error || tr.status) }); }
    // 2) 연결 끊기
    const rr = await fetch("https://appleid.apple.com/auth/revoke", {
      method: "POST", headers: hdr,
      body: form({ client_id: clientId, client_secret: secret, token, token_type_hint: tj.refresh_token ? "refresh_token" : "access_token" }),
    });
    if (!rr.ok) { console.error("apple revoke", rr.status); return json(502, { error: "revoke_failed", status: rr.status }); }
    return json(200, { ok: true });
  } catch (e) {
    console.error("apple-revoke", (e as Error).message);
    return json(500, { error: "internal" });
  }
});
