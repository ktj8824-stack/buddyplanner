-- 결제 스위치 (2026-11-14)
-- 결제 열기:  update app_settings set value = 'true'  where key = 'payments_open';
-- 결제 닫기:  update app_settings set value = 'false' where key = 'payments_open';
-- 닫혀 있는 동안은 pro_free_until 날짜가 지나도 계속 무료이고, 결제 화면이 나오지 않음.
insert into public.app_settings (key, value) values ('payments_open', 'false')
on conflict (key) do nothing;

create or replace function public.bp_public_settings()
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  with s as (
    select
      (select value from public.app_settings where key = 'pro_free_until') as until,
      coalesce((select value from public.app_settings where key = 'payments_open'), 'false') = 'true' as pay_open
  )
  select jsonb_build_object(
    'pro_free_until', case
      when pay_open then until
      when until is not null and until::timestamptz > now() + interval '1 day' then until
      else to_char((now() + interval '1 day') at time zone 'Asia/Seoul', 'YYYY-MM-DD"T"HH24:MI:SS"+09:00"')
    end,
    'pro_free_label', until,
    'payments_open', pay_open
  ) from s;
$function$;
