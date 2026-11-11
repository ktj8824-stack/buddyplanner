// BuddyPlanner PRO 웹 결제 로직 (로드플래너 payments 함수를 바탕으로 함)
// 금액은 서버가 정하고, 토스 승인 결과를 서버가 확인한 뒤에만 PRO 기간을 늘립니다.
// 1회 결제 = 1개월 이용권 (자동결제 아님). 이미 PRO면 남은 기간 뒤에 이어 붙입니다.
export const PRICE = { monthly: 4900 };   // 부가세 포함
export const ORDER_NAME = 'BuddyPlanner PRO 1개월 이용권';
export const DOCS_TEST_SECRET = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6'; // 토스 문서 공개 테스트 키 (실제 돈 안 나감)

export class PayError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}

// 주문번호: 문의·환불 때 불러 주기 쉽게 "BP-날짜(한국)-영문숫자 6자리" (예: BP-20261110-8F3K2A)
export function makeOrderId(now: Date) {
  const k = new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0·O·1·I 빼고
  const r = crypto.getRandomValues(new Uint8Array(6));
  return `BP-${k}-${Array.from(r, (b) => abc[b % abc.length]).join('')}`;
}

export function addMonth(from: Date) {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

// db: { getPayment, insertPayment, updatePayment, finishPayment(orderId, patch) → READY 줄을 바꿨으면 true, proUntil, recentPayments }
// toss: (paymentKey, orderId, amount) => { ok, status, body }
export async function handle(action: string, body: Record<string, unknown>, userId: string, db: any, toss: any, mode: string, now = new Date()) {
  if (action === 'prepare') {
    const orderId = makeOrderId(now);
    await db.insertPayment({ order_id: orderId, user_id: userId, amount: PRICE.monthly, order_name: ORDER_NAME, status: 'READY', mode });
    return { orderId, amount: PRICE.monthly, orderName: ORDER_NAME, mode };
  }

  if (action === 'confirm') {
    const orderId = String(body.orderId || ''), paymentKey = String(body.paymentKey || '');
    if (!orderId || !paymentKey || paymentKey.length > 200) throw new PayError(400, 'INVALID_REQUEST', '결제 정보가 올바르지 않아요.');
    const row = await db.getPayment(orderId);
    if (!row || row.user_id !== userId) throw new PayError(404, 'ORDER_NOT_FOUND', '주문을 찾을 수 없어요.');
    if (row.status === 'DONE') return { status: 'DONE', orderId, amount: row.amount, method: row.method, approvedAt: row.approved_at, periodEnd: row.period_end, mode: row.mode };
    if (row.status !== 'READY') throw new PayError(409, 'ORDER_CLOSED', '이미 처리된 주문이에요.');
    if (Number(body.amount) !== row.amount) {
      await db.updatePayment(orderId, { status: 'FAILED', fail_reason: 'AMOUNT_MISMATCH' });
      throw new PayError(400, 'AMOUNT_MISMATCH', '결제 금액이 주문과 달라요. 결제가 승인되지 않았어요.');
    }
    const r = await toss(paymentKey, orderId, row.amount);
    if (!r.ok || r.body?.status !== 'DONE') {
      const waiting = r.ok && r.body?.status === 'WAITING_FOR_DEPOSIT';
      await db.updatePayment(orderId, { status: waiting ? 'WAITING_FOR_DEPOSIT' : 'FAILED', payment_key: paymentKey, fail_reason: waiting ? null : String(r.body?.code || r.status || 'TOSS_ERROR').slice(0, 80) });
      if (waiting) return { status: 'WAITING_FOR_DEPOSIT', orderId, virtualAccount: r.body.virtualAccount };
      throw new PayError(402, String(r.body?.code || 'PAYMENT_FAILED'), String(r.body?.message || '결제 승인에 실패했어요.'));
    }
    if (Number(r.body.totalAmount) !== row.amount) throw new PayError(400, 'AMOUNT_MISMATCH', '승인 금액이 주문과 달라요.');
    const cur = await db.proUntil(userId, row.mode);
    const start = cur && new Date(cur) > now ? new Date(cur) : now;
    const periodEnd = addMonth(start);
    const approvedAt = r.body.approvedAt || now.toISOString();
    const patch = { status: 'DONE', payment_key: paymentKey, method: String(r.body.method || ''), approved_at: approvedAt, period_end: periodEnd.toISOString() };
    // READY 일 때만 DONE 으로 — 같은 주문 승인이 동시에 두 번 와도 1개월만 붙게 (2026-11-11 점검)
    const changed = db.finishPayment ? await db.finishPayment(orderId, patch) : (await db.updatePayment(orderId, patch), true);
    if (!changed) {
      const done = await db.getPayment(orderId);
      if (done && done.status === 'DONE') return { status: 'DONE', orderId, amount: done.amount, method: done.method, approvedAt: done.approved_at, periodEnd: done.period_end, mode: done.mode };
      throw new PayError(409, 'ORDER_CLOSED', '이미 처리된 주문이에요.');
    }
    return { status: 'DONE', orderId, amount: row.amount, method: r.body.method, approvedAt, periodEnd: periodEnd.toISOString(), mode: row.mode };
  }

  if (action === 'status') {
    const until = await db.proUntil(userId, mode);
    return { proUntil: until, active: !!until && new Date(until) > now, price: PRICE.monthly, mode, payments: await db.recentPayments(userId) };
  }
  throw new PayError(400, 'INVALID_ACTION', '알 수 없는 요청이에요.');
}
