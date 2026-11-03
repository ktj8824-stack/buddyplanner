-- =====================================================================
-- BuddyPlanner 추천 맛집 — 운영팀 추천(고정) 설정
--
-- 사용법: 001~008 파일을 먼저 실행한 뒤, SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
--
-- 원칙
--  · 맛집 목록은 카카오 장소 검색을 '매번 실시간'으로 호출해 만듭니다.
--    (카카오 로컬 API 결과는 서버에 저장하면 안 되므로 검색 결과는 저장하지 않습니다)
--  · 여기에는 운영팀이 직접 고른 '추천 표시'만 저장합니다: 골프장·식당의 카카오 장소 ID, 이름, 운영팀 한마디.
--    실제 주소·거리·전화 등은 저장하지 않고, 검색할 때 실시간 결과에 있을 때만 맨 위에 보여 줍니다.
--  · 관리자(app_admins)만 추가·삭제할 수 있고, 읽기는 서버 함수(food-nearby)가 합니다.
-- =====================================================================

create table if not exists public.food_picks (
  id          bigint generated always as identity primary key,
  course_id   text        not null check (char_length(course_id) between 1 and 40),   -- 골프장 카카오 장소 ID
  place_id    text        not null check (char_length(place_id) between 1 and 40),    -- 식당 카카오 장소 ID
  place_name  text        not null check (char_length(place_name) between 1 and 60),
  timing      text        not null check (timing in ('before', 'after')),
  note        text        check (note is null or char_length(note) <= 40),
  created_by  uuid        references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (course_id, place_id, timing)
);
alter table public.food_picks enable row level security;
revoke all on public.food_picks from anon, authenticated;
grant select on public.food_picks to service_role;

-- 추가 (같은 골프장·식당·시간대면 한마디만 바꿈)
create or replace function public.food_pick_add(p_course_id text, p_place_id text, p_place_name text, p_timing text, p_note text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); new_id bigint;
begin
  if uid is null or not exists (select 1 from public.app_admins where user_id = uid) then raise exception 'admin_only'; end if;
  p_course_id := btrim(coalesce(p_course_id, ''));
  p_place_id := btrim(coalesce(p_place_id, ''));
  p_place_name := left(btrim(coalesce(p_place_name, '')), 60);
  p_note := left(nullif(btrim(coalesce(p_note, '')), ''), 40);
  if p_course_id !~ '^[0-9]{1,40}$' or p_place_id !~ '^[0-9]{1,40}$' then return json_build_object('ok', false, 'error', 'invalid_id'); end if;
  if char_length(p_place_name) < 1 then return json_build_object('ok', false, 'error', 'invalid_name'); end if;
  if p_timing not in ('before', 'after') then return json_build_object('ok', false, 'error', 'invalid_timing'); end if;
  insert into public.food_picks (course_id, place_id, place_name, timing, note, created_by)
    values (p_course_id, p_place_id, p_place_name, p_timing, p_note, uid)
    on conflict (course_id, place_id, timing) do update set note = excluded.note, place_name = excluded.place_name
    returning id into new_id;
  return json_build_object('ok', true, 'id', new_id);
end;
$$;
revoke all on function public.food_pick_add(text, text, text, text, text) from public, anon;
grant execute on function public.food_pick_add(text, text, text, text, text) to authenticated;

-- 삭제
create or replace function public.food_pick_remove(p_course_id text, p_place_id text, p_timing text)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists (select 1 from public.app_admins where user_id = uid) then raise exception 'admin_only'; end if;
  delete from public.food_picks where course_id = p_course_id and place_id = p_place_id and timing = p_timing;
  return json_build_object('ok', found);
end;
$$;
revoke all on function public.food_pick_remove(text, text, text) from public, anon;
grant execute on function public.food_pick_remove(text, text, text) to authenticated;
