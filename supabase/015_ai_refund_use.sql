-- AI 비서가 답을 못 했을 때(서버 오류·월 한도) 오늘 사용 횟수를 1 돌려줌
create or replace function public.ai_refund_use(p_user uuid, p_kind text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage set count = greatest(count - 1, 0)
  where user_id = p_user and kind = p_kind and day = (now() at time zone 'Asia/Seoul')::date;
$$;
revoke all on function public.ai_refund_use(uuid, text) from public, anon, authenticated;
grant execute on function public.ai_refund_use(uuid, text) to service_role;
