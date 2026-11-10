// BuddyPlanner PRO 웹 결제 서버 (토스페이먼츠) — 웹(buddyplanner.kr)에서만 결제, 앱은 PRO 상태만 조회
// 비밀값: TOSS_SECRET_KEY (없으면 토스 문서 공개 테스트 키 = 실제 돈 안 나감)
// 선택: PRO_PAY_ORIGINS (쉼표 구분, 기본 https://buddyplanner.kr,https://www.buddyplanner.kr)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handle, PayError, DOCS_TEST_SECRET } from './logic.ts';

const ORIGINS = new Set((Deno.env.get('PRO_PAY_ORIGINS') || 'https://buddyplanner.kr,https://www.buddyplanner.kr').split(',').map((s) => s.trim()).filter(Boolean));
const LOCAL = /^(http:\/\/(localhost|127\.0\.0\.1)(:\d+)?|capacitor:\/\/localhost|https:\/\/localhost)$/;

function cors(origin: string | null) {
  const ok = origin && (ORIGINS.has(origin) || LOCAL.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin! : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const h = { ...cors(origin), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: h });
  try {
    if (req.method !== 'POST') throw new PayError(405, 'METHOD', 'POST only');
    const url = Deno.env.get('SUPABASE_URL')!, key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new PayError(500, 'CONFIG', '서버 설정이 완료되지 않았어요.');
    const db = createClient(url, key, { auth: { persistSession: false } });
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u, error: ue } = await db.auth.getUser(token);
    if (ue || !u?.user) throw new PayError(401, 'UNAUTHORIZED', '로그인이 필요해요.');

    const text = await req.text();
    if (text.length > 4096) throw new PayError(413, 'TOO_LARGE', '요청이 너무 커요.');
    const body = text ? JSON.parse(text) : {};
    const secret = Deno.env.get('TOSS_SECRET_KEY') || DOCS_TEST_SECRET;
    const mode = secret.startsWith('live_') ? 'live' : 'test';

    const must = <T>(r: { data: T; error: unknown }) => { if (r.error) throw new PayError(500, 'DB', '저장소 오류가 발생했어요.'); return r.data; };
    const store = {
      getPayment: async (id: string) => must(await db.from('bp_pro_payments').select('*').eq('order_id', id).maybeSingle()),
      insertPayment: async (row: unknown) => must(await db.from('bp_pro_payments').insert(row)),
      updatePayment: async (id: string, patch: unknown) => must(await db.from('bp_pro_payments').update(patch).eq('order_id', id)),
      proUntil: async (uid: string, m: string) => must(await db.rpc('bp_web_pro_until', { p_user: uid, p_mode: m })) as string | null,
      recentPayments: async (uid: string) => must(await db.from('bp_pro_payments').select('order_id, amount, status, method, approved_at, period_end, mode, created_at').eq('user_id', uid).neq('status', 'READY').order('created_at', { ascending: false }).limit(12)),
    };
    const toss = async (paymentKey: string, orderId: string, amount: number) => {
      const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(secret + ':'), 'Content-Type': 'application/json', 'Idempotency-Key': orderId },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });
      let b: any = {}; try { b = await res.json(); } catch { /* */ }
      return { ok: res.ok, status: res.status, body: b };
    };
    return reply(200, await handle(String(body.action || ''), body, u.user.id, store, toss, mode));
  } catch (e) {
    if (e instanceof PayError) return reply(e.status, { error: { code: e.code, message: e.message } });
    console.error('pro-pay error', e instanceof Error ? e.message : e);
    return reply(500, { error: { code: 'INTERNAL', message: '결제 서버 오류가 발생했어요.' } });
  }
});
