-- 단체 목록에 '내 답'(my_status: yes / no / pending)을 함께 돌려줌 (2026-11-15)
-- 홈에서 불참한 단체 라운딩은 '등록하세요' 안내를 띄우지 않기 위함. 서버에는 이미 적용됨.
create or replace function public.ge_my_list()
returns json
language plpgsql
stable security definer
set search_path to ''
as $function$
declare uid uuid := auth.uid();
begin
  if uid is null then return '[]'::json; end if;
  return coalesce((
    select json_agg(x order by x.round_date, x.tee_off) from (
      select e.code, e.title, e.course->>'name' as course_name, e.round_date, e.tee_off,
             (e.owner_id = uid) as i_am_owner,
             (select m.status from public.group_members m where m.event_id = e.id and m.user_id = uid limit 1) as my_status,
             (select count(*) from public.group_members m where m.event_id = e.id and m.status = 'yes')::int as yes_count,
             (select count(*) from public.group_members m where m.event_id = e.id)::int as total
      from public.group_events e
      where (e.owner_id = uid or exists (select 1 from public.group_members m where m.event_id = e.id and m.user_id = uid))
        and e.round_date >= (now() at time zone 'Asia/Seoul')::date - 7
    ) x
  ), '[]'::json);
end;
$function$;
