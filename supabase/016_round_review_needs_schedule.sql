-- 라운딩 후기 포인트: 미리 등록한 일정(bp_schedules_v2)이 그날에 있을 때만 적립
create or replace function public.earn_round_review(p_date date)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  rec jsonb; sch jsonb; pts int := public._setting('round_points', '20')::int;
  lim int := public._setting('round_daily_limit', '1')::int;
begin
  if uid is null then raise exception 'login_required'; end if;
  if p_date is null or p_date > today or p_date < today - 7 then return json_build_object('ok', false, 'error', 'too_old'); end if;
  perform pg_advisory_xact_lock(hashtext('pts:' || uid::text));
  select (value::jsonb) -> to_char(p_date, 'YYYY-MM-DD') into rec from public.user_data where user_id = uid and key = 'bp_records_v1';
  if rec is null or coalesce((rec ->> 'score')::numeric, 0) <= 0 or char_length(btrim(coalesce(rec ->> 'diary', ''))) < 2 then
    return json_build_object('ok', false, 'error', 'no_review');
  end if;
  select value::jsonb into sch from public.user_data where user_id = uid and key = 'bp_schedules_v2';
  if sch is null or jsonb_typeof(sch) <> 'array' or not exists (
    select 1 from jsonb_array_elements(sch) e
    where (e ->> 'date') ~ '^\d{4}-\d{2}-\d{2}T'
      and ((e ->> 'date')::timestamptz at time zone 'Asia/Seoul')::date = p_date
  ) then
    return json_build_object('ok', false, 'error', 'no_schedule');
  end if;
  if exists (select 1 from public.point_ledger where user_id = uid and reason = 'round_review' and ref = 'round:' || p_date) then
    return json_build_object('ok', false, 'error', 'already');
  end if;
  if public._earned_today(uid, 'round_review') >= lim then return json_build_object('ok', false, 'error', 'daily_limit'); end if;
  insert into public.point_ledger (user_id, delta, reason, ref) values (uid, pts, 'round_review', 'round:' || p_date);
  return json_build_object('ok', true, 'earned', pts, 'balance', public._balance(uid));
end;
$$;
revoke all on function public.earn_round_review(date) from public, anon;
grant execute on function public.earn_round_review(date) to authenticated;
