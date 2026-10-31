-- =====================================================================
-- 버디플래너 커뮤니티 — Supabase 추가 설정
--
-- 사용법: 001~003 파일을 먼저 실행한 뒤, SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
--
-- 원칙
--  · 글쓰기·굿샷·조인 신청·신고·차단은 모두 서버 함수로만 처리합니다 (앱이 표를 직접 수정할 수 없음).
--  · 신고가 3건 쌓인 글은 자동으로 숨겨집니다. 운영자는 Table Editor에서 hidden 값을 바꿔 숨기거나 되살립니다.
--  · 오픈채팅 등 연락 링크는 작성자와 '수락된 신청자'에게만 보입니다.
--  · 차단한 사용자의 글과 신청은 내 화면에 보이지 않습니다.
-- =====================================================================

-- 1) 표 ----------------------------------------------------------------
create table if not exists public.community_posts (
  id           bigserial   primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  author_name  text        not null check (char_length(author_name) between 1 and 20),
  category     text        not null check (category in ('join', 'review', 'carpool', 'free')),
  content      text        not null check (char_length(content) between 2 and 1000),
  course_name  text        check (course_name is null or char_length(course_name) <= 60),
  round_at     timestamptz,                 -- 조인·카풀: 라운딩 일시
  slots        integer     check (slots is null or slots between 1 and 3),  -- 모집 인원
  status       text        not null default 'open' check (status in ('open', 'closed')),
  hidden       boolean     not null default false,   -- 신고 누적 또는 운영자 숨김
  report_count integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists community_posts_feed_idx on public.community_posts (created_at desc) where not hidden;
create index if not exists community_posts_user_idx on public.community_posts (user_id);

create table if not exists public.community_post_contacts (
  post_id  bigint primary key references public.community_posts (id) on delete cascade,
  url      text   not null check (url ~ '^https://open\.kakao\.com/' and char_length(url) <= 200)
);

create table if not exists public.community_likes (
  post_id    bigint      not null references public.community_posts (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_join_requests (
  id             bigserial   primary key,
  post_id        bigint      not null references public.community_posts (id) on delete cascade,
  user_id        uuid        not null references auth.users (id) on delete cascade,
  applicant_name text        not null check (char_length(applicant_name) between 1 and 20),
  message        text        check (message is null or char_length(message) <= 200),
  status         text        not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (post_id, user_id)
);
create index if not exists community_join_requests_user_idx on public.community_join_requests (user_id);

create table if not exists public.community_reports (
  id          bigserial   primary key,
  post_id     bigint      not null references public.community_posts (id) on delete cascade,
  reporter_id uuid        not null references auth.users (id) on delete cascade,
  reason      text        not null check (char_length(reason) between 1 and 200),
  created_at  timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create table if not exists public.community_blocks (
  blocker_id uuid        not null references auth.users (id) on delete cascade,
  blocked_id uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- 모든 표: RLS 켜고 앱의 직접 읽기·쓰기 금지 (아래 함수로만 접근)
alter table public.community_posts         enable row level security;
alter table public.community_post_contacts enable row level security;
alter table public.community_likes         enable row level security;
alter table public.community_join_requests enable row level security;
alter table public.community_reports       enable row level security;
alter table public.community_blocks        enable row level security;

-- 2) 도우미 ------------------------------------------------------------
create or replace function public._cm_uid()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login_required'; end if;
  return uid;
end;
$$;
revoke all on function public._cm_uid() from public, anon, authenticated;

create or replace function public._cm_today_count(p_table text, p_user uuid)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare n int; since timestamptz := (now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul';
begin
  if p_table = 'posts' then
    select count(*) into n from public.community_posts where user_id = p_user and created_at >= since;
  elsif p_table = 'requests' then
    select count(*) into n from public.community_join_requests where user_id = p_user and created_at >= since;
  else
    select count(*) into n from public.community_reports where reporter_id = p_user and created_at >= since;
  end if;
  return n;
end;
$$;
revoke all on function public._cm_today_count(text, uuid) from public, anon, authenticated;

create or replace function public._cm_name(p text)
returns text language sql immutable as $$
  select left(nullif(btrim(coalesce(p, '')), ''), 20);
$$;

-- 3) 피드 ---------------------------------------------------------------
create or replace function public.community_feed(p_category text default null, p_before bigint default null, p_limit integer default 20)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid();
begin
  p_limit := least(greatest(coalesce(p_limit, 20), 1), 50);
  return coalesce((
    select json_agg(x order by x.id desc) from (
      select p.id, p.user_id = uid as is_mine, p.author_name, p.category, p.content, p.course_name,
             p.round_at, p.slots, p.status, p.hidden, p.created_at, p.updated_at,
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
        and (p_before is null or p.id < p_before)
        and not exists (select 1 from public.community_blocks b where b.blocker_id = uid and b.blocked_id = p.user_id)
      order by p.id desc
      limit p_limit
    ) x
  ), '[]'::json);
end;
$$;
revoke all on function public.community_feed(text, bigint, integer) from public, anon;
grant execute on function public.community_feed(text, bigint, integer) to authenticated;

-- 4) 글쓰기·수정·마감·삭제 ---------------------------------------------
create or replace function public.community_create_post(
  p_author text, p_category text, p_content text,
  p_course text default null, p_round_at timestamptz default null, p_slots integer default null, p_contact text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid(); new_id bigint; nm text := public._cm_name(p_author);
begin
  if nm is null then return json_build_object('ok', false, 'error', 'name_required'); end if;
  if public._cm_today_count('posts', uid) >= 10 then return json_build_object('ok', false, 'error', 'daily_limit'); end if;
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
  insert into public.community_posts (user_id, author_name, category, content, course_name, round_at, slots)
    values (uid, nm, p_category, p_content, left(nullif(btrim(coalesce(p_course, '')), ''), 60), p_round_at, p_slots)
    returning id into new_id;
  if p_contact is not null then insert into public.community_post_contacts (post_id, url) values (new_id, p_contact); end if;
  return json_build_object('ok', true, 'id', new_id);
end;
$$;
revoke all on function public.community_create_post(text, text, text, text, timestamptz, integer, text) from public, anon;
grant execute on function public.community_create_post(text, text, text, text, timestamptz, integer, text) to authenticated;

create or replace function public.community_set_status(p_post bigint, p_status text)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid();
begin
  if p_status not in ('open', 'closed') then return json_build_object('ok', false, 'error', 'invalid'); end if;
  update public.community_posts set status = p_status, updated_at = now() where id = p_post and user_id = uid;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.community_set_status(bigint, text) from public, anon;
grant execute on function public.community_set_status(bigint, text) to authenticated;

create or replace function public.community_delete_post(p_post bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid();
begin
  delete from public.community_posts where id = p_post and user_id = uid;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.community_delete_post(bigint) from public, anon;
grant execute on function public.community_delete_post(bigint) to authenticated;

-- 5) 굿샷 --------------------------------------------------------------
create or replace function public.community_toggle_like(p_post bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid(); liked boolean;
begin
  if not exists (select 1 from public.community_posts where id = p_post and (not hidden or user_id = uid)) then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  delete from public.community_likes where post_id = p_post and user_id = uid;
  liked := not found;
  if liked then insert into public.community_likes (post_id, user_id) values (p_post, uid); end if;
  return json_build_object('ok', true, 'liked', liked,
    'count', (select count(*) from public.community_likes where post_id = p_post));
end;
$$;
revoke all on function public.community_toggle_like(bigint) from public, anon;
grant execute on function public.community_toggle_like(bigint) to authenticated;

-- 6) 조인 신청 ----------------------------------------------------------
create or replace function public.community_request_join(p_post bigint, p_name text, p_message text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid(); p public.community_posts; nm text := public._cm_name(p_name); acc int; prev text;
begin
  if nm is null then return json_build_object('ok', false, 'error', 'name_required'); end if;
  select * into p from public.community_posts where id = p_post for update;
  if not found or p.hidden then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if p.category not in ('join', 'carpool') then return json_build_object('ok', false, 'error', 'not_joinable'); end if;
  if p.user_id = uid then return json_build_object('ok', false, 'error', 'own_post'); end if;
  if p.status <> 'open' or (p.round_at is not null and p.round_at < now()) then return json_build_object('ok', false, 'error', 'closed'); end if;
  if exists (select 1 from public.community_blocks b where (b.blocker_id = p.user_id and b.blocked_id = uid) or (b.blocker_id = uid and b.blocked_id = p.user_id)) then
    return json_build_object('ok', false, 'error', 'blocked');
  end if;
  select count(*) into acc from public.community_join_requests where post_id = p_post and status = 'accepted';
  if acc >= coalesce(p.slots, 0) then return json_build_object('ok', false, 'error', 'full'); end if;
  select status into prev from public.community_join_requests where post_id = p_post and user_id = uid;
  if prev in ('pending', 'accepted') then return json_build_object('ok', false, 'error', 'already'); end if;
  if prev = 'declined' then return json_build_object('ok', false, 'error', 'declined'); end if;
  if public._cm_today_count('requests', uid) >= 30 then return json_build_object('ok', false, 'error', 'daily_limit'); end if;
  insert into public.community_join_requests (post_id, user_id, applicant_name, message)
    values (p_post, uid, nm, left(nullif(btrim(coalesce(p_message, '')), ''), 200))
    on conflict (post_id, user_id) do update set status = 'pending', applicant_name = excluded.applicant_name,
      message = excluded.message, updated_at = now();
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.community_request_join(bigint, text, text) from public, anon;
grant execute on function public.community_request_join(bigint, text, text) to authenticated;

create or replace function public.community_cancel_join(p_post bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid();
begin
  update public.community_join_requests set status = 'cancelled', updated_at = now()
    where post_id = p_post and user_id = uid and status in ('pending', 'accepted');
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  -- 정원이 찼다가 취소로 자리가 나면 다시 모집
  update public.community_posts p set status = 'open', updated_at = now()
    where p.id = p_post and p.status = 'closed' and (p.round_at is null or p.round_at > now())
      and (select count(*) from public.community_join_requests r where r.post_id = p.id and r.status = 'accepted') < coalesce(p.slots, 0);
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.community_cancel_join(bigint) from public, anon;
grant execute on function public.community_cancel_join(bigint) to authenticated;

-- 작성자: 내 글의 신청 목록
create or replace function public.community_post_requests(p_post bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid();
begin
  if not exists (select 1 from public.community_posts where id = p_post and user_id = uid) then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  return json_build_object('ok', true, 'requests', coalesce((
    select json_agg(json_build_object('id', r.id, 'name', r.applicant_name, 'message', r.message, 'status', r.status, 'created_at', r.created_at) order by r.created_at)
    from public.community_join_requests r
    where r.post_id = p_post and r.status <> 'cancelled'
      and not exists (select 1 from public.community_blocks b where b.blocker_id = uid and b.blocked_id = r.user_id)
  ), '[]'::json));
end;
$$;
revoke all on function public.community_post_requests(bigint) from public, anon;
grant execute on function public.community_post_requests(bigint) to authenticated;

-- 작성자: 수락·거절 (정원이 차면 자동 마감)
create or replace function public.community_respond_join(p_request bigint, p_accept boolean)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid(); r public.community_join_requests; p public.community_posts; acc int;
begin
  select * into r from public.community_join_requests where id = p_request;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  select * into p from public.community_posts where id = r.post_id for update;
  if p.user_id <> uid then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status not in ('pending', 'accepted') then return json_build_object('ok', false, 'error', 'invalid_state'); end if;
  if p_accept then
    if r.status = 'accepted' then return json_build_object('ok', true); end if;
    select count(*) into acc from public.community_join_requests where post_id = p.id and status = 'accepted';
    if acc >= coalesce(p.slots, 0) then return json_build_object('ok', false, 'error', 'full'); end if;
    update public.community_join_requests set status = 'accepted', updated_at = now() where id = p_request;
    if acc + 1 >= coalesce(p.slots, 0) then
      update public.community_posts set status = 'closed', updated_at = now() where id = p.id;
    end if;
  else
    update public.community_join_requests set status = 'declined', updated_at = now() where id = p_request;
  end if;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.community_respond_join(bigint, boolean) from public, anon;
grant execute on function public.community_respond_join(bigint, boolean) to authenticated;

-- 신청자: 내 신청 현황 (수락되면 연락 링크 포함)
create or replace function public.community_my_requests()
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid();
begin
  return coalesce((
    select json_agg(json_build_object(
      'post_id', p.id, 'status', r.status, 'category', p.category, 'author_name', p.author_name,
      'course_name', p.course_name, 'round_at', p.round_at, 'content', left(p.content, 80),
      'contact', case when r.status = 'accepted' then (select c.url from public.community_post_contacts c where c.post_id = p.id) end
    ) order by r.updated_at desc)
    from public.community_join_requests r
    join public.community_posts p on p.id = r.post_id
    where r.user_id = uid and r.status <> 'cancelled'
  ), '[]'::json);
end;
$$;
revoke all on function public.community_my_requests() from public, anon;
grant execute on function public.community_my_requests() to authenticated;

-- 연락 링크: 작성자와 수락된 신청자만
create or replace function public.community_post_contact(p_post bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid(); u text;
begin
  if not exists (select 1 from public.community_posts p where p.id = p_post and p.user_id = uid)
     and not exists (select 1 from public.community_join_requests r where r.post_id = p_post and r.user_id = uid and r.status = 'accepted') then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;
  select url into u from public.community_post_contacts where post_id = p_post;
  return json_build_object('ok', true, 'url', u);
end;
$$;
revoke all on function public.community_post_contact(bigint) from public, anon;
grant execute on function public.community_post_contact(bigint) to authenticated;

-- 7) 신고·차단 -----------------------------------------------------------
create or replace function public.community_report(p_post bigint, p_reason text)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid(); n int;
begin
  p_reason := left(nullif(btrim(coalesce(p_reason, '')), ''), 200);
  if p_reason is null then return json_build_object('ok', false, 'error', 'reason_required'); end if;
  if not exists (select 1 from public.community_posts where id = p_post and user_id <> uid) then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  if public._cm_today_count('reports', uid) >= 20 then return json_build_object('ok', false, 'error', 'daily_limit'); end if;
  insert into public.community_reports (post_id, reporter_id, reason) values (p_post, uid, p_reason)
    on conflict (post_id, reporter_id) do nothing;
  select count(*) into n from public.community_reports where post_id = p_post;
  update public.community_posts set report_count = n, hidden = (hidden or n >= 3) where id = p_post;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.community_report(bigint, text) from public, anon;
grant execute on function public.community_report(bigint, text) to authenticated;

-- 글 작성자를 차단 (작성자 id는 앱에 노출하지 않고 글 번호로 차단)
create or replace function public.community_block_author(p_post bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid(); target uuid;
begin
  select user_id into target from public.community_posts where id = p_post;
  if target is null or target = uid then return json_build_object('ok', false, 'error', 'not_found'); end if;
  insert into public.community_blocks (blocker_id, blocked_id) values (uid, target) on conflict do nothing;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.community_block_author(bigint) from public, anon;
grant execute on function public.community_block_author(bigint) to authenticated;

-- 신청자 차단 (작성자가 신청 목록에서)
create or replace function public.community_block_applicant(p_request bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid(); target uuid;
begin
  select r.user_id into target from public.community_join_requests r
    join public.community_posts p on p.id = r.post_id
    where r.id = p_request and p.user_id = uid;
  if target is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  insert into public.community_blocks (blocker_id, blocked_id) values (uid, target) on conflict do nothing;
  update public.community_join_requests set status = 'declined', updated_at = now() where id = p_request and status = 'pending';
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.community_block_applicant(bigint) from public, anon;
grant execute on function public.community_block_applicant(bigint) to authenticated;

create or replace function public.community_unblock_all()
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := public._cm_uid(); n int;
begin
  delete from public.community_blocks where blocker_id = uid;
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'count', n);
end;
$$;
revoke all on function public.community_unblock_all() from public, anon;
grant execute on function public.community_unblock_all() to authenticated;

create or replace function public.community_block_count()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.community_blocks where blocker_id = auth.uid();
$$;
revoke all on function public.community_block_count() from public, anon;
grant execute on function public.community_block_count() to authenticated;

-- 8) 회원 탈퇴 시 함께 삭제 --------------------------------------------
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
  delete from public.raffle_winners where user_id = uid;
  delete from public.raffle_entries where user_id = uid;
  delete from public.point_ledger where user_id = uid;
  delete from public.community_posts where user_id = uid;
  delete from public.community_join_requests where user_id = uid;
  delete from public.community_likes where user_id = uid;
  delete from public.community_reports where reporter_id = uid;
  delete from public.community_blocks where blocker_id = uid or blocked_id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
