-- =====================================================================
-- BuddyPlanner 단체 일정 (총무가 만드는 모임 라운딩) — Supabase 추가 설정
--
-- 사용법: 001~009 파일을 먼저 실행한 뒤, SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
--
-- 원칙
--  · 총무(로그인 필수)가 단체 일정을 만들고 참석자 이름을 넣습니다. 조 편성·차량 배정은 총무만.
--  · 참석자는 카톡 링크(공유 코드)로 들어와 로그인 없이 '내 이름'을 고르고 참석/불참을 누릅니다.
--    처음 고른 기기에 비밀 토큰을 저장해서, 다른 사람이 같은 이름으로 응답을 바꾸지 못하게 합니다.
--  · 단체 톡방은 로그인한 사람만: 총무, 또는 로그인한 채로 이름을 골라 응답한 참석자.
--  · 모든 표는 직접 읽기/쓰기를 막고(RLS), 아래 함수로만 다룹니다.
-- =====================================================================

create table if not exists public.group_events (
  id          bigint generated always as identity primary key,
  code        text        not null unique check (code ~ '^[0-9a-f]{16}$'),
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  title       text        not null check (char_length(title) between 1 and 40),
  course      jsonb       not null,
  round_date  date        not null,
  tee_off     text        not null check (tee_off ~ '^[0-2][0-9]:[0-5][0-9]$'),
  meet_time   text        check (meet_time is null or meet_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  memo        text        check (memo is null or char_length(memo) <= 300),
  meal_before jsonb,
  meal_after  jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists group_events_owner_idx on public.group_events (owner_id, round_date);

create table if not exists public.group_members (
  id            bigint generated always as identity primary key,
  event_id      bigint      not null references public.group_events (id) on delete cascade,
  name          text        not null check (char_length(name) between 1 and 20),
  is_owner      boolean     not null default false,
  user_id       uuid        references auth.users (id) on delete set null,
  token_hash    text,
  status        text        not null default 'pending' check (status in ('pending', 'yes', 'no')),
  transport     text        check (transport is null or transport in ('self', 'ride')),
  ride_note     text        check (ride_note is null or char_length(ride_note) <= 40),
  team_no       smallint    check (team_no is null or team_no between 1 and 20),
  car_driver_id bigint      references public.group_members (id) on delete set null,
  sort          integer     not null default 0,
  responded_at  timestamptz,
  unique (event_id, name)
);
create index if not exists group_members_user_idx on public.group_members (user_id) where user_id is not null;

create table if not exists public.group_messages (
  id          bigint generated always as identity primary key,
  event_id    bigint      not null references public.group_events (id) on delete cascade,
  user_id     uuid        references auth.users (id) on delete set null,
  member_id   bigint      references public.group_members (id) on delete set null,
  author_name text        not null,
  body        text        not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists group_messages_event_idx on public.group_messages (event_id, id);

alter table public.group_events   enable row level security;
alter table public.group_members  enable row level security;
alter table public.group_messages enable row level security;
revoke all on public.group_events, public.group_members, public.group_messages from anon, authenticated;

-- ── 내부 도우미 ────────────────────────────────────────────────────────
create or replace function public._ge_clean_name(p text)
returns text language sql immutable as $$
  select left(nullif(btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')), ''), 20);
$$;

create or replace function public._ge_by_code(p_code text)
returns public.group_events language sql stable security definer set search_path = '' as $$
  select * from public.group_events where code = lower(btrim(coalesce(p_code, '')));
$$;
revoke all on function public._ge_by_code(text) from public, anon, authenticated;

-- 화면에 보낼 단체 일정 전체 (참석자 목록 포함, 개인 식별 정보는 빼고)
create or replace function public._ge_json(e public.group_events, uid uuid)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'id', e.id, 'code', e.code, 'title', e.title, 'course', e.course,
    'round_date', e.round_date, 'tee_off', e.tee_off, 'meet_time', e.meet_time, 'memo', e.memo,
    'meal_before', e.meal_before, 'meal_after', e.meal_after, 'updated_at', e.updated_at,
    'i_am_owner', uid is not null and uid = e.owner_id,
    'my_member_id', (select m.id from public.group_members m where m.event_id = e.id and uid is not null and m.user_id = uid limit 1),
    'members', coalesce((select json_agg(json_build_object(
        'id', m.id, 'name', m.name, 'is_owner', m.is_owner, 'status', m.status,
        'transport', m.transport, 'ride_note', m.ride_note, 'team_no', m.team_no,
        'car_driver_id', m.car_driver_id, 'claimed', (m.token_hash is not null or m.user_id is not null),
        'logged_in', m.user_id is not null, 'responded_at', m.responded_at)
        order by m.team_no nulls last, m.sort, m.id)
      from public.group_members m where m.event_id = e.id), '[]'::json),
    'chat_count', (select count(*) from public.group_messages g where g.event_id = e.id)::int
  );
$$;
revoke all on function public._ge_json(public.group_events, uuid) from public, anon, authenticated;

create or replace function public._ge_owner(p_id bigint)
returns public.group_events language plpgsql stable security definer set search_path = '' as $$
declare e public.group_events; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into e from public.group_events where id = p_id;
  if not found or e.owner_id <> uid then raise exception 'owner_only'; end if;
  return e;
end;
$$;
revoke all on function public._ge_owner(bigint) from public, anon, authenticated;

-- ── 총무: 만들기 ───────────────────────────────────────────────────────
create or replace function public.ge_create(
  p_title text, p_course jsonb, p_date date, p_tee text, p_owner_name text,
  p_names text[] default '{}', p_meet text default null, p_memo text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e public.group_events; nm text; i int := 0; owner_nm text;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'login_required'); end if;
  if (select count(*) from public.group_events where owner_id = uid and created_at > now() - interval '1 day') >= 20 then
    return json_build_object('ok', false, 'error', 'too_many');
  end if;
  p_title := left(btrim(coalesce(p_title, '')), 40);
  owner_nm := public._ge_clean_name(p_owner_name);
  if char_length(p_title) < 1 then return json_build_object('ok', false, 'error', 'invalid_title'); end if;
  if owner_nm is null then return json_build_object('ok', false, 'error', 'invalid_owner_name'); end if;
  if p_course is null or jsonb_typeof(p_course) <> 'object' or coalesce(p_course->>'name', '') = '' or length(p_course::text) > 2000 then
    return json_build_object('ok', false, 'error', 'invalid_course');
  end if;
  if p_date is null or p_date < (now() at time zone 'Asia/Seoul')::date - 1 then return json_build_object('ok', false, 'error', 'invalid_date'); end if;
  if coalesce(p_tee, '') !~ '^[0-2][0-9]:[0-5][0-9]$' then return json_build_object('ok', false, 'error', 'invalid_tee'); end if;
  if p_meet is not null and p_meet !~ '^[0-2][0-9]:[0-5][0-9]$' then p_meet := null; end if;
  if coalesce(array_length(p_names, 1), 0) > 39 then return json_build_object('ok', false, 'error', 'too_many_members'); end if;

  insert into public.group_events (code, owner_id, title, course, round_date, tee_off, meet_time, memo)
    values (left(replace(gen_random_uuid()::text, '-', ''), 16), uid, p_title,
            jsonb_build_object('name', left(p_course->>'name', 60), 'addr', left(coalesce(p_course->>'addr', ''), 120),
                               'lat', (p_course->>'lat')::float8, 'lng', (p_course->>'lng')::float8, 'id', left(coalesce(p_course->>'id', ''), 40)),
            p_date, p_tee, p_meet, left(nullif(btrim(coalesce(p_memo, '')), ''), 300))
    returning * into e;
  insert into public.group_members (event_id, name, is_owner, user_id, status, responded_at, sort)
    values (e.id, owner_nm, true, uid, 'yes', now(), 0);
  foreach nm in array coalesce(p_names, '{}') loop
    nm := public._ge_clean_name(nm);
    if nm is null then continue; end if;
    i := i + 1;
    insert into public.group_members (event_id, name, sort) values (e.id, nm, i) on conflict (event_id, name) do nothing;
  end loop;
  return json_build_object('ok', true, 'id', e.id, 'code', e.code);
end;
$$;
revoke all on function public.ge_create(text, jsonb, date, text, text, text[], text, text) from public, anon;
grant execute on function public.ge_create(text, jsonb, date, text, text, text[], text, text) to authenticated;

-- ── 총무: 정보 바꾸기 ──────────────────────────────────────────────────
create or replace function public.ge_update(
  p_id bigint, p_title text, p_date date, p_tee text, p_meet text default null, p_memo text default null,
  p_meal_before jsonb default null, p_meal_after jsonb default null)
returns json language plpgsql security definer set search_path = '' as $$
declare e public.group_events := public._ge_owner(p_id);
begin
  p_title := left(btrim(coalesce(p_title, '')), 40);
  if char_length(p_title) < 1 then return json_build_object('ok', false, 'error', 'invalid_title'); end if;
  if p_date is null then return json_build_object('ok', false, 'error', 'invalid_date'); end if;
  if coalesce(p_tee, '') !~ '^[0-2][0-9]:[0-5][0-9]$' then return json_build_object('ok', false, 'error', 'invalid_tee'); end if;
  if p_meet is not null and p_meet !~ '^[0-2][0-9]:[0-5][0-9]$' then p_meet := null; end if;
  if p_meal_before is not null and (jsonb_typeof(p_meal_before) <> 'object' or length(p_meal_before::text) > 600) then p_meal_before := null; end if;
  if p_meal_after is not null and (jsonb_typeof(p_meal_after) <> 'object' or length(p_meal_after::text) > 600) then p_meal_after := null; end if;
  update public.group_events set title = p_title, round_date = p_date, tee_off = p_tee, meet_time = p_meet,
    memo = left(nullif(btrim(coalesce(p_memo, '')), ''), 300), meal_before = p_meal_before, meal_after = p_meal_after, updated_at = now()
    where id = e.id;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.ge_update(bigint, text, date, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.ge_update(bigint, text, date, text, text, text, jsonb, jsonb) to authenticated;

-- ── 총무: 참석자 추가 / 빼기 ───────────────────────────────────────────
create or replace function public.ge_add_members(p_id bigint, p_names text[])
returns json language plpgsql security definer set search_path = '' as $$
declare e public.group_events := public._ge_owner(p_id); nm text; n int; added int := 0; mx int;
begin
  select count(*), coalesce(max(sort), 0) into n, mx from public.group_members where event_id = e.id;
  foreach nm in array coalesce(p_names, '{}') loop
    nm := public._ge_clean_name(nm);
    if nm is null then continue; end if;
    if n + added >= 40 then exit; end if;
    insert into public.group_members (event_id, name, sort) values (e.id, nm, mx + added + 1) on conflict (event_id, name) do nothing;
    if found then added := added + 1; end if;
  end loop;
  update public.group_events set updated_at = now() where id = e.id;
  return json_build_object('ok', true, 'added', added);
end;
$$;
revoke all on function public.ge_add_members(bigint, text[]) from public, anon;
grant execute on function public.ge_add_members(bigint, text[]) to authenticated;

create or replace function public.ge_remove_member(p_id bigint, p_member bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare e public.group_events := public._ge_owner(p_id);
begin
  delete from public.group_members where id = p_member and event_id = e.id and not is_owner;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  update public.group_events set updated_at = now() where id = e.id;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.ge_remove_member(bigint, bigint) from public, anon;
grant execute on function public.ge_remove_member(bigint, bigint) to authenticated;

-- ── 총무: 조 편성 · 차량 배정 ─────────────────────────────────────────
-- p_transport: 'self'(직접 운전) / 'ride'(p_driver 차 탑승) / null(미정)
create or replace function public.ge_assign(p_id bigint, p_member bigint, p_team integer, p_transport text, p_driver bigint default null)
returns json language plpgsql security definer set search_path = '' as $$
declare e public.group_events := public._ge_owner(p_id);
begin
  if p_team is not null and p_team not between 1 and 20 then return json_build_object('ok', false, 'error', 'invalid_team'); end if;
  if p_transport is not null and p_transport not in ('self', 'ride') then return json_build_object('ok', false, 'error', 'invalid_transport'); end if;
  if p_transport = 'ride' then
    if p_driver is null or p_driver = p_member
       or not exists (select 1 from public.group_members where id = p_driver and event_id = e.id) then
      return json_build_object('ok', false, 'error', 'invalid_driver');
    end if;
    -- 운전자는 직접 운전으로
    update public.group_members set transport = 'self' where id = p_driver and event_id = e.id;
  else
    p_driver := null;
  end if;
  update public.group_members set team_no = p_team, transport = p_transport, car_driver_id = p_driver
    where id = p_member and event_id = e.id;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  -- 이 사람이 운전을 그만두면, 이 사람 차를 타기로 한 사람은 '미정'으로
  if coalesce(p_transport, '') <> 'self' then
    update public.group_members set transport = null, car_driver_id = null where event_id = e.id and car_driver_id = p_member;
  end if;
  update public.group_events set updated_at = now() where id = e.id;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.ge_assign(bigint, bigint, integer, text, bigint) from public, anon;
grant execute on function public.ge_assign(bigint, bigint, integer, text, bigint) to authenticated;

create or replace function public.ge_delete(p_id bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare e public.group_events := public._ge_owner(p_id);
begin
  delete from public.group_events where id = e.id;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.ge_delete(bigint) from public, anon;
grant execute on function public.ge_delete(bigint) to authenticated;

-- ── 누구나(링크 가진 사람): 보기 ───────────────────────────────────────
create or replace function public.ge_view(p_code text)
returns json language plpgsql stable security definer set search_path = '' as $$
declare e public.group_events := public._ge_by_code(p_code);
begin
  if e.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true, 'event', public._ge_json(e, auth.uid()));
end;
$$;
revoke all on function public.ge_view(text) from public;
grant execute on function public.ge_view(text) to anon, authenticated;

-- ── 누구나: 참석 응답 (로그인 없어도 됨) ───────────────────────────────
-- 처음 그 이름을 고른 기기가 토큰을 등록하고, 이후에는 같은 토큰(또는 로그인한 본인·총무)만 바꿀 수 있음
create or replace function public.ge_respond(p_code text, p_member bigint, p_token text, p_status text,
  p_transport text default null, p_ride_note text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare e public.group_events := public._ge_by_code(p_code); m public.group_members; uid uuid := auth.uid(); th text;
begin
  if e.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if p_status not in ('yes', 'no') then return json_build_object('ok', false, 'error', 'invalid_status'); end if;
  if p_transport is not null and p_transport not in ('self', 'ride') then p_transport := null; end if;
  if coalesce(char_length(p_token), 0) < 16 or char_length(p_token) > 100 then return json_build_object('ok', false, 'error', 'invalid_token'); end if;
  th := md5('ge:' || p_token);
  select * into m from public.group_members where id = p_member and event_id = e.id;
  if not found then return json_build_object('ok', false, 'error', 'member_not_found'); end if;
  if not (
       (uid is not null and (m.user_id = uid or e.owner_id = uid))
    or (m.token_hash = th)
    or (m.token_hash is null and m.user_id is null)
  ) then
    return json_build_object('ok', false, 'error', 'taken');   -- 다른 기기에서 이미 고른 이름
  end if;
  update public.group_members set
      status = p_status,
      transport = case when p_status = 'no' then null when p_transport is null then transport else p_transport end,
      car_driver_id = case when p_status = 'no' or p_transport = 'self' then null else car_driver_id end,
      ride_note = left(nullif(btrim(coalesce(p_ride_note, '')), ''), 40),
      token_hash = coalesce(token_hash, th),
      user_id = case when user_id is null and uid is not null
                      and not exists (select 1 from public.group_members x where x.event_id = e.id and x.user_id = uid)
                     then uid else user_id end,
      responded_at = now()
    where id = m.id;
  if p_status = 'no' then
    update public.group_members set transport = null, car_driver_id = null where event_id = e.id and car_driver_id = m.id;
  end if;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.ge_respond(text, bigint, text, text, text, text) from public;
grant execute on function public.ge_respond(text, bigint, text, text, text, text) to anon, authenticated;

-- ── 누구나: 명단에 내 이름이 없을 때 직접 추가 (최대 40명) ─────────────
create or replace function public.ge_join(p_code text, p_name text)
returns json language plpgsql security definer set search_path = '' as $$
declare e public.group_events := public._ge_by_code(p_code); nm text := public._ge_clean_name(p_name); new_id bigint; mx int;
begin
  if e.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if nm is null then return json_build_object('ok', false, 'error', 'invalid_name'); end if;
  if (select count(*) from public.group_members where event_id = e.id) >= 40 then return json_build_object('ok', false, 'error', 'full'); end if;
  if exists (select 1 from public.group_members where event_id = e.id and name = nm) then return json_build_object('ok', false, 'error', 'name_exists'); end if;
  select coalesce(max(sort), 0) into mx from public.group_members where event_id = e.id;
  insert into public.group_members (event_id, name, sort) values (e.id, nm, mx + 1) returning id into new_id;
  return json_build_object('ok', true, 'member_id', new_id);
end;
$$;
revoke all on function public.ge_join(text, text) from public;
grant execute on function public.ge_join(text, text) to anon, authenticated;

-- ── 로그인 사용자: 내 단체 일정 목록 ───────────────────────────────────
create or replace function public.ge_my_list()
returns json language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return '[]'::json; end if;
  return coalesce((
    select json_agg(x order by x.round_date, x.tee_off) from (
      select e.code, e.title, e.course->>'name' as course_name, e.round_date, e.tee_off,
             (e.owner_id = uid) as i_am_owner,
             (select count(*) from public.group_members m where m.event_id = e.id and m.status = 'yes')::int as yes_count,
             (select count(*) from public.group_members m where m.event_id = e.id)::int as total
      from public.group_events e
      where (e.owner_id = uid or exists (select 1 from public.group_members m where m.event_id = e.id and m.user_id = uid))
        and e.round_date >= (now() at time zone 'Asia/Seoul')::date - 7
    ) x
  ), '[]'::json);
end;
$$;
revoke all on function public.ge_my_list() from public, anon;
grant execute on function public.ge_my_list() to authenticated;

-- ── 단체 톡방 (로그인한 총무·참석자만) ────────────────────────────────
create or replace function public._ge_chat_member(e public.group_events)
returns public.group_members language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.group_members;
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into m from public.group_members where event_id = e.id and user_id = uid limit 1;
  if not found then raise exception 'not_member'; end if;
  return m;
end;
$$;
revoke all on function public._ge_chat_member(public.group_events) from public, anon, authenticated;

create or replace function public.ge_chat_list(p_code text, p_after bigint default 0)
returns json language plpgsql security definer set search_path = '' as $$
declare e public.group_events := public._ge_by_code(p_code); me public.group_members;
begin
  if e.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  begin me := public._ge_chat_member(e);
  exception when others then return json_build_object('ok', false, 'error', sqlerrm); end;
  return json_build_object('ok', true, 'me', me.id, 'messages', coalesce((
    select json_agg(json_build_object('id', g.id, 'member_id', g.member_id, 'author', g.author_name, 'body', g.body,
                                      'created_at', g.created_at, 'mine', g.user_id = me.user_id,
                                      'owner', g.member_id is not null and g.member_id in (select id from public.group_members where event_id = e.id and is_owner))
                    order by g.id)
    from (select * from public.group_messages where event_id = e.id and id > coalesce(p_after, 0) order by id desc limit 200) g
  ), '[]'::json));
end;
$$;
revoke all on function public.ge_chat_list(text, bigint) from public, anon;
grant execute on function public.ge_chat_list(text, bigint) to authenticated;

create or replace function public.ge_chat_send(p_code text, p_body text)
returns json language plpgsql security definer set search_path = '' as $$
declare e public.group_events := public._ge_by_code(p_code); me public.group_members; new_id bigint;
begin
  if e.id is null then return json_build_object('ok', false, 'error', 'not_found'); end if;
  begin me := public._ge_chat_member(e);
  exception when others then return json_build_object('ok', false, 'error', sqlerrm); end;
  p_body := btrim(coalesce(p_body, ''));
  if char_length(p_body) < 1 or char_length(p_body) > 500 then return json_build_object('ok', false, 'error', 'invalid_body'); end if;
  if (select count(*) from public.group_messages where event_id = e.id and user_id = me.user_id and created_at > now() - interval '1 minute') >= 20 then
    return json_build_object('ok', false, 'error', 'too_fast');
  end if;
  insert into public.group_messages (event_id, user_id, member_id, author_name, body)
    values (e.id, me.user_id, me.id, me.name, p_body) returning id into new_id;
  return json_build_object('ok', true, 'id', new_id);
end;
$$;
revoke all on function public.ge_chat_send(text, text) from public, anon;
grant execute on function public.ge_chat_send(text, text) to authenticated;

-- ── 총무: 잘못 고른 이름 풀어주기 (다른 사람이 내 이름을 눌렀을 때) ──
create or replace function public.ge_reset_claim(p_id bigint, p_member bigint)
returns json language plpgsql security definer set search_path = '' as $$
declare e public.group_events := public._ge_owner(p_id);
begin
  update public.group_members set token_hash = null, user_id = null, status = 'pending', transport = null, car_driver_id = null, ride_note = null, responded_at = null
    where id = p_member and event_id = e.id and not is_owner;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.ge_reset_claim(bigint, bigint) from public, anon;
grant execute on function public.ge_reset_claim(bigint, bigint) to authenticated;
