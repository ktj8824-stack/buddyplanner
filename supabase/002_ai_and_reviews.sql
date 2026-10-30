-- =====================================================================
-- 버디플래너 AI 비서 + 버디 평가 — Supabase 추가 설정
--
-- 사용법: 001 파일을 먼저 실행한 뒤, SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
-- =====================================================================

-- 1) 버디 평가 (식당 별점) -----------------------------------------------
-- 개별 평가는 본인만 볼 수 있고, 다른 사람에게는 평균·개수만 공개합니다.
create table if not exists public.restaurant_reviews (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  place_key   text        not null check (char_length(place_key) between 1 and 120),
  place_name  text        not null check (char_length(place_name) between 1 and 100),
  rating      smallint    not null check (rating between 1 and 5),
  comment     text        check (comment is null or char_length(comment) <= 300),
  course_name text        check (course_name is null or char_length(course_name) <= 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, place_key)
);
create index if not exists restaurant_reviews_place_idx on public.restaurant_reviews (place_key);

alter table public.restaurant_reviews enable row level security;

drop policy if exists "reviews_select_own" on public.restaurant_reviews;
drop policy if exists "reviews_insert_own" on public.restaurant_reviews;
drop policy if exists "reviews_update_own" on public.restaurant_reviews;
drop policy if exists "reviews_delete_own" on public.restaurant_reviews;

create policy "reviews_select_own" on public.restaurant_reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reviews_insert_own" on public.restaurant_reviews
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "reviews_update_own" on public.restaurant_reviews
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reviews_delete_own" on public.restaurant_reviews
  for delete to authenticated using (user_id = (select auth.uid()));

-- 식당별 평균 별점과 평가 수 (누가 평가했는지는 공개하지 않음)
create or replace function public.get_place_ratings(keys text[])
returns table (place_key text, avg_rating numeric, review_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.place_key,
         round(avg(r.rating)::numeric, 1) as avg_rating,
         count(*)::integer as review_count
  from public.restaurant_reviews r
  where r.place_key = any (keys)
  group by r.place_key;
$$;

revoke all on function public.get_place_ratings(text[]) from public;
grant execute on function public.get_place_ratings(text[]) to anon, authenticated, service_role;

-- 2) AI 비서 하루 사용량 (서버 함수만 기록) -------------------------------
create table if not exists public.ai_usage (
  user_id uuid    not null references auth.users (id) on delete cascade,
  day     date    not null,
  kind    text    not null check (kind in ('chat', 'image')),
  count   integer not null default 0,
  primary key (user_id, day, kind)
);
alter table public.ai_usage enable row level security;
-- 정책 없음: 앱(사용자)은 읽기·쓰기 불가, 서버 함수(service_role)만 사용

-- 한도 안이면 1 증가 후 true, 한도를 넘으면 false (동시 요청에도 안전)
create or replace function public.ai_try_use(p_user uuid, p_kind text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  new_count integer;
begin
  insert into public.ai_usage (user_id, day, kind, count)
  values (p_user, today, p_kind, 1)
  on conflict (user_id, day, kind)
  do update set count = public.ai_usage.count + 1
  where public.ai_usage.count < p_limit
  returning count into new_count;
  return new_count is not null;
end;
$$;

revoke all on function public.ai_try_use(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.ai_try_use(uuid, text, integer) to service_role;

-- 3) 부적절한 AI 답변 신고 (구글 플레이 생성형 AI 정책) --------------------
create table if not exists public.ai_reports (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  message    text        not null check (char_length(message) <= 4000),
  reason     text        check (reason is null or char_length(reason) <= 300),
  created_at timestamptz not null default now()
);
alter table public.ai_reports enable row level security;

drop policy if exists "ai_reports_insert_own" on public.ai_reports;
create policy "ai_reports_insert_own" on public.ai_reports
  for insert to authenticated with check (user_id = (select auth.uid()));

-- 4) 회원 탈퇴 함수 갱신: 새 테이블도 함께 삭제 ----------------------------
-- (auth.users 삭제 시 on delete cascade로도 지워지지만 명시적으로 삭제)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from public.user_data where user_id = uid;
  delete from public.restaurant_reviews where user_id = uid;
  delete from public.ai_usage where user_id = uid;
  delete from public.ai_reports where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
