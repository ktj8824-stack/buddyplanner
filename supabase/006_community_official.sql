-- =====================================================================
-- BuddyPlanner 커뮤니티 운영팀 공지 — Supabase 추가 설정
--
-- 사용법: 001~005 파일을 먼저 실행한 뒤, SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
--
-- 원칙
--  · 관리자(app_admins, 005 참고)만 '운영팀' 이름으로 글을 올리고, 피드 맨 위에 고정/해제할 수 있습니다.
--  · 운영팀 글은 작성자 이름이 'BuddyPlanner 운영팀'으로 고정됩니다 (사칭 방지).
--  · 고정된 글은 첫 페이지 맨 위에 나오고, 아래 목록에는 다시 나오지 않습니다.
-- =====================================================================

alter table public.community_posts add column if not exists is_official boolean not null default false;
alter table public.community_posts add column if not exists pinned      boolean not null default false;
create index if not exists community_posts_pinned_idx on public.community_posts (id desc) where pinned and not hidden;

-- 일반 사용자가 '운영팀' 이름을 쓰지 못하게 (공백 제거 후 비교)
create or replace function public._cm_name(p text)
returns text language sql immutable as $$
  select case
    when replace(lower(coalesce(p, '')), ' ', '') like '%운영팀%'
      or replace(lower(coalesce(p, '')), ' ', '') like '%buddyplanner%'
      or replace(lower(coalesce(p, '')), ' ', '') like '%관리자%'
    then null
    else left(nullif(btrim(coalesce(p, '')), ''), 20) end;
$$;

-- 피드: 첫 페이지에는 고정 글을 맨 위에, 나머지는 최신순 (고정 글 제외)
create or replace function public.community_feed(p_category text default null, p_before bigint default null, p_limit integer default 20)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid();
begin
  p_limit := least(greatest(coalesce(p_limit, 20), 1), 50);
  return coalesce((
    select json_agg(x order by x.pinned desc, x.id desc) from (
      select p.id, p.user_id = uid as is_mine, p.author_name, p.category, p.content, p.course_name,
             p.round_at, p.slots, p.status, p.hidden, p.created_at, p.updated_at, p.is_official, p.pinned,
             (select count(*) from public.community_likes l where l.post_id = p.id)::int as like_count,
             exists (select 1 from public.community_likes l where l.post_id = p.id and l.user_id = uid) as liked,
             (select count(*) from public.community_join_requests r where r.post_id = p.id and r.status = 'accepted')::int as accepted_count,
             case when p.user_id = uid then (select count(*) from public.community_join_requests r where r.post_id = p.id and r.status = 'pending')::int end as pending_count,
             (select r.status from public.community_join_requests r where r.post_id = p.id and r.user_id = uid) as my_request,
             exists (select 1 from public.community_post_contacts c where c.post_id = p.id) as has_contact,
             exists (select 1 from public.community_reports rp where rp.post_id = p.id and rp.reporter_id = uid) as reported
      from public.community_posts p
      where (not p.hidden or p.user_id = uid)
        and (p_category is null or p.category = p_category)
        and not exists (select 1 from public.community_blocks b where b.blocker_id = uid and b.blocked_id = p.user_id)
        and (
          (p.pinned and p_before is null)
          or (p.id in (
            select q.id from public.community_posts q
            where not q.pinned
              and (not q.hidden or q.user_id = uid)
              and (p_category is null or q.category = p_category)
              and (p_before is null or q.id < p_before)
              and not exists (select 1 from public.community_blocks b2 where b2.blocker_id = uid and b2.blocked_id = q.user_id)
            order by q.id desc
            limit p_limit))
        )
    ) x
  ), '[]'::json);
end;
$$;
revoke all on function public.community_feed(text, bigint, integer) from public, anon;
grant execute on function public.community_feed(text, bigint, integer) to authenticated;

-- 운영팀 글쓰기 (관리자만) — 기본으로 맨 위 고정
create or replace function public.community_create_official_post(
  p_category text, p_content text,
  p_course text default null, p_round_at timestamptz default null, p_slots integer default null,
  p_contact text default null, p_pin boolean default true)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid(); new_id bigint;
begin
  if not exists (select 1 from public.app_admins where user_id = uid) then raise exception 'admin_only'; end if;
  p_content := btrim(coalesce(p_content, ''));
  if char_length(p_content) < 2 or char_length(p_content) > 1000 then return json_build_object('ok', false, 'error', 'invalid_content'); end if;
  if p_category not in ('join', 'review', 'carpool', 'free') then return json_build_object('ok', false, 'error', 'invalid_category'); end if;
  if p_category in ('join', 'carpool') then
    if p_round_at is null or p_round_at < now() - interval '1 hour' then return json_build_object('ok', false, 'error', 'invalid_date'); end if;
    if p_slots is null or p_slots not between 1 and 3 then return json_build_object('ok', false, 'error', 'invalid_slots'); end if;
  else
    p_round_at := null; p_slots := null; p_contact := null;
  end if;
  p_contact := nullif(btrim(coalesce(p_contact, '')), '');
  if p_contact is not null and (p_contact !~ '^https://open\.kakao\.com/' or char_length(p_contact) > 200) then
    return json_build_object('ok', false, 'error', 'invalid_contact');
  end if;
  insert into public.community_posts (user_id, author_name, category, content, course_name, round_at, slots, is_official, pinned)
    values (uid, 'BuddyPlanner 운영팀', p_category, p_content, left(nullif(btrim(coalesce(p_course, '')), ''), 60), p_round_at, p_slots, true, coalesce(p_pin, true))
    returning id into new_id;
  if p_contact is not null then insert into public.community_post_contacts (post_id, url) values (new_id, p_contact); end if;
  return json_build_object('ok', true, 'id', new_id);
end;
$$;
revoke all on function public.community_create_official_post(text, text, text, timestamptz, integer, text, boolean) from public, anon;
grant execute on function public.community_create_official_post(text, text, text, timestamptz, integer, text, boolean) to authenticated;

-- 고정 / 고정 해제 (관리자만, 운영팀 글만)
create or replace function public.community_set_pin(p_post bigint, p_pinned boolean)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid();
begin
  if not exists (select 1 from public.app_admins where user_id = uid) then raise exception 'admin_only'; end if;
  update public.community_posts set pinned = coalesce(p_pinned, false), updated_at = now()
    where id = p_post and is_official;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.community_set_pin(bigint, boolean) from public, anon;
grant execute on function public.community_set_pin(bigint, boolean) to authenticated;
