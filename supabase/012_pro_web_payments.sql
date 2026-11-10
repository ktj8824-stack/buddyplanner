-- =====================================================================
-- BuddyPlanner PRO 웹 결제 (토스페이먼츠) — 2026-11-10 서버에 적용됨
--  · 결제는 웹(buddyplanner.kr)에서만. 금액·승인·기간 반영은 pro-pay 함수(서버)만 함
--  · 1회 결제 = PRO 1개월 (4,900원, 자동결제 아님). 이미 PRO면 남은 기간 뒤에 이어 붙임
--  · 앱 안에서는 웹 결제로 안내하지 않고, 웹에서 산 PRO를 인정만 함 (앱스토어 규정)
-- 실제 결제 시작: 토스 가맹(사업자 필요) 후 Supabase Secrets에 TOSS_SECRET_KEY(live_gsk_...) 저장
--               + 웹 config.js(WEB_CONFIG_JS)에 TOSS_CLIENT_KEY(live_gck_...) 추가
-- =====================================================================
create table if not exists public.bp_pro_payments (
  order_id    text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      int  not null check (amount > 0),
  order_name  text not null,
  status      text not null default 'READY' check (status in ('READY','DONE','FAILED','WAITING_FOR_DEPOSIT','CANCELED')),
  mode        text not null default 'test' check (mode in ('test','live')),
  payment_key text,
  method      text,
  approved_at timestamptz,
  period_end  timestamptz,
  fail_reason text,
  created_at  timestamptz not null default now()
);
create index if not exists bp_pro_payments_user_idx on public.bp_pro_payments (user_id, period_end desc);
alter table public.bp_pro_payments enable row level security;
revoke all on public.bp_pro_payments from anon, authenticated;
grant select on public.bp_pro_payments to authenticated;
drop policy if exists bp_pro_payments_read on public.bp_pro_payments;
create policy bp_pro_payments_read on public.bp_pro_payments for select to authenticated using (user_id = auth.uid());

create or replace function public.bp_web_pro_until(p_user uuid, p_mode text default 'live')
returns timestamptz language sql stable security definer set search_path = '' as $$
  select max(period_end) from public.bp_pro_payments
  where user_id = p_user and status = 'DONE' and mode = p_mode;
$$;
revoke all on function public.bp_web_pro_until(uuid, text) from public, anon, authenticated;
grant execute on function public.bp_web_pro_until(uuid, text) to service_role;
