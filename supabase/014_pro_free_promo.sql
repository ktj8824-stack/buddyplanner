-- 출시 기념 PRO 무료 기간 (사업자·스토어 구독 준비 전까지)
-- 기간 동안 PRO 기능(AI 비서·단체 등록·무제한 일정·당일 예보)을 모두에게 열어 줌. 광고 제거는 포함 안 함.
-- 기간 연장/종료: update app_settings set value = '2027-04-30T23:59:59+09:00' where key = 'pro_free_until';
--               (끝내려면 지난 날짜로 바꾸거나 행 삭제)
insert into public.app_settings (key, value) values
  ('pro_free_until', '2027-03-31T23:59:59+09:00')
on conflict (key) do update set value = excluded.value;

-- 앱이 로그인 없이 읽어도 되는 설정만 돌려줌 (app_settings 테이블 자체는 계속 비공개)
create or replace function public.bp_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'pro_free_until', (select value from public.app_settings where key = 'pro_free_until')
  );
$$;
revoke all on function public.bp_public_settings() from public;
grant execute on function public.bp_public_settings() to anon, authenticated, service_role;
