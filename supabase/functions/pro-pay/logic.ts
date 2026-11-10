// BuddyPlanner PRO 웹 결제 로직 (로드플래너 payments 함수를 바탕으로 함)
// 금액은 서버가 정하고, 토스 승인 결과를 서버가 확인한 뒤에만 PRO 기간을 늘립니다.
// 1회 결제 = 1개월 이용권 (자동결제 아님). 이미 PRO면 남은 기간 뒤에 이어 붙입니다.
export const PRICE = { monthly: 4900 };
export const ORDER_NAME = 'BuddyPlanner PRO (1개월)';
export const DOCS_TEST_SECRET = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6'; // 토스 문서 공개 테스트 키 (실제 돈 안 나감)

export class PayError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}

export function addMonth(from: Date) {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

// db: { getPayment, insertPayment, updatePayment, proUntil, recentPayments }
// toss: (paymentKey, orderId, amount) => { ok, status, body }
export async function handle(action: string, body: Record<string, unknown>, userId: string, db: any, toss: any, mode: string, now = new Date()) {
  if (action === 'prepare') {
    const orderId = `BP-PRO-${now.getTime()}-${crypto.randomUUID().slice(0, 8)}`;
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
    await db.updatePayment(orderId, { status: 'DONE', payment_key: paymentKey, method: String(r.body.method || ''), approved_at: approvedAt, period_end: periodEnd.toISOString() });
    return { status: 'DONE', orderId, amount: row.amount, method: r.body.method, approvedAt, periodEnd: periodEnd.toISOString(), mode: row.mode };
  }

  if (action === 'status') {
    const until = await db.proUntil(userId, mode);
    return { proUntil: until, active: !!until && new Date(until) > now, price: PRICE.monthly, mode, payments: await db.recentPayments(userId) };
  }
  throw new PayError(400, 'INVALID_ACTION', '알 수 없는 요청이에요.');
}
