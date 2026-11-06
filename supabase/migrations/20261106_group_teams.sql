-- 단체 등록 조편성: 조마다 티업 시간·코스, 참석자 전화번호(총무에게만 보임), 아침 식사 시간
alter table public.group_events add column if not exists teams jsonb not null default '[]'::jsonb;
alter table public.group_events add column if not exists meal_time text;
alter table public.group_members add column if not exists phone text;

-- 전화번호 정리: 숫자만, 0으로 시작하는 9~11자리 아니면 null
create or replace function public._ge_clean_phone(p text)
returns text language sql immutable set search_path to '' as $$
  select case when d ~ '^0[0-9]{8,10}$' then d else null end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) x;
$$;

-- 조 정보 정리: [{no, tee, course}] 최대 10조
create or replace function public._ge_clean_teams(p jsonb)
returns jsonb language plpgsql immutable set search_path to '' as $$
declare t jsonb; out jsonb := '[]'::jsonb; i int := 0; tee text; crs text;
begin
  if p is null or jsonb_typeof(p) <> 'array' then return '[]'::jsonb; end if;
  for t in select * from jsonb_array_elements(p) loop
    i := i + 1;
    exit when i > 10;
    tee := coalesce(t->>'tee', '');
    if tee !~ '^[0-2][0-9]:[0-5][0-9]$' then tee := null; end if;
    crs := left(btrim(coalesce(t->>'course', '')), 20);
    out := out || jsonb_build_array(jsonb_build_object('no', i, 'tee', tee, 'course', nullif(crs, '')));
  end loop;
  return out;
end;
$$;

-- 조편성으로 단체 일정 만들기
-- p_teams: [{tee:'07:00', course:'OUT', members:[{name, phone}]}]  (조당 최대 4명, 최대 10조)
create or replace function public.ge_create_teams(
  p_title text, p_course jsonb, p_date date, p_owner_name text, p_teams jsonb,
  p_memo text default null, p_meal_before jsonb default null, p_meal_time text default null)
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid := auth.uid(); e public.group_events; owner_nm text; meta jsonb; t jsonb; mb jsonb;
        ti int := 0; mi int; s int := 0; nm text; ph text; first_tee text; owner_found boolean := false; total int := 0;
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
  if p_teams is null or jsonb_typeof(p_teams) <> 'array' or jsonb_array_length(p_teams) < 1 then return json_build_object('ok', false, 'error', 'invalid_teams'); end if;
  if length(p_teams::text) > 20000 then return json_build_object('ok', false, 'error', 'invalid_teams'); end if;
  meta := public._ge_clean_teams(p_teams);
  select min(x->>'tee') into first_tee from jsonb_array_elements(meta) x where x->>'tee' is not null;
  if first_tee is null then return json_build_object('ok', false, 'error', 'invalid_tee'); end if;
  if p_meal_before is not null and (jsonb_typeof(p_meal_before) <> 'object' or length(p_meal_before::text) > 600) then p_meal_before := null; end if;
  if p_meal_time is not null and p_meal_time !~ '^[0-2][0-9]:[0-5][0-9]$' then p_meal_time := null; end if;
  if p_meal_before is null then p_meal_time := null; end if;

  insert into public.group_events (code, owner_id, title, course, round_date, tee_off, meet_time, memo, teams, meal_before, meal_time)
    values (left(replace(gen_random_uuid()::text, '-', ''), 16), uid, p_title,
            jsonb_build_object('name', left(p_course->>'name', 60), 'addr', left(coalesce(p_course->>'addr', ''), 120),
                               'lat', (p_course->>'lat')::float8, 'lng', (p_course->>'lng')::float8, 'id', left(coalesce(p_course->>'id', ''), 40)),
            p_date, first_tee, null, left(nullif(btrim(coalesce(p_memo, '')), ''), 300), meta, p_meal_before, p_meal_time)
    returning * into e;

  for t in select * from jsonb_array_elements(p_teams) loop
    ti := ti + 1;
    exit when ti > 10;
    mi := 0;
    if jsonb_typeof(t->'members') <> 'array' then continue; end if;
    for mb in select * from jsonb_array_elements(t->'members') loop
      mi := mi + 1;
      exit when mi > 4;
      nm := public._ge_clean_name(mb->>'name');
      if nm is null then continue; end if;
      ph := public._ge_clean_phone(mb->>'phone');
      s := s + 1;
      if not owner_found and nm = owner_nm then
        insert into public.group_members (event_id, name, is_owner, user_id, status, responded_at, sort, team_no, phone)
          values (e.id, nm, true, uid, 'yes', now(), s, ti, ph);
        owner_found := true; total := total + 1;
      else
        insert into public.group_members (event_id, name, sort, team_no, phone)
          values (e.id, nm, s, ti, ph) on conflict (event_id, name) do nothing;
        if found then total := total + 1; end if;
      end if;
    end loop;
  end loop;
  -- 총무가 어느 조에도 없으면 조 미정으로 명단에 넣음 (관리용)
  if not owner_found then
    insert into public.group_members (event_id, name, is_owner, user_id, status, responded_at, sort)
      values (e.id, owner_nm, true, uid, 'yes', now(), 0) on conflict (event_id, name) do nothing;
  end if;
  return json_build_object('ok', true, 'id', e.id, 'code', e.code, 'members', total);
end;
$$;

-- 총무: 조별 티업·코스 바꾸기 (첫 티업이 대표 티오프)
create or replace function public.ge_set_teams(p_id bigint, p_teams jsonb)
returns json language plpgsql security definer set search_path to '' as $$
declare e public.group_events := public._ge_owner(p_id); meta jsonb := public._ge_clean_teams(p_teams); first_tee text;
begin
  select min(x->>'tee') into first_tee from jsonb_array_elements(meta) x where x->>'tee' is not null;
  if jsonb_array_length(meta) < 1 or first_tee is null then return json_build_object('ok', false, 'error', 'invalid_teams'); end if;
  update public.group_events set teams = meta, tee_off = first_tee, updated_at = now() where id = e.id;
  return json_build_object('ok', true);
end;
$$;

-- 총무: 참석자 전화번호 넣기·바꾸기
create or replace function public.ge_set_phone(p_id bigint, p_member bigint, p_phone text)
returns json language plpgsql security definer set search_path to '' as $$
declare e public.group_events := public._ge_owner(p_id);
begin
  update public.group_members set phone = public._ge_clean_phone(p_phone) where id = p_member and event_id = e.id;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  update public.group_events set updated_at = now() where id = e.id;
  return json_build_object('ok', true);
end;
$$;

-- 총무: 아침 식사 시간
create or replace function public.ge_set_meal_time(p_id bigint, p_meal_time text)
returns json language plpgsql security definer set search_path to '' as $$
declare e public.group_events := public._ge_owner(p_id);
begin
  if p_meal_time is not null and p_meal_time !~ '^[0-2][0-9]:[0-5][0-9]$' then p_meal_time := null; end if;
  update public.group_events set meal_time = p_meal_time, updated_at = now() where id = e.id;
  return json_build_object('ok', true);
end;
$$;

-- 보기: 조 정보·아침 식사 시간 추가, 전화번호는 총무에게만
create or replace function public._ge_json(e public.group_events, uid uuid)
returns json language sql stable security definer set search_path to '' as $$
  select json_build_object(
    'id', e.id, 'code', e.code, 'title', e.title, 'course', e.course,
    'round_date', e.round_date, 'tee_off', e.tee_off, 'meet_time', e.meet_time, 'memo', e.memo,
    'meal_before', e.meal_before, 'meal_after', e.meal_after, 'updated_at', e.updated_at,
    'teams', coalesce(e.teams, '[]'::jsonb), 'meal_time', e.meal_time,
    'i_am_owner', uid is not null and uid = e.owner_id,
    'my_member_id', (select m.id from public.group_members m where m.event_id = e.id and uid is not null and m.user_id = uid limit 1),
    'members', coalesce((select json_agg(json_build_object(
        'id', m.id, 'name', m.name, 'is_owner', m.is_owner, 'status', m.status,
        'transport', m.transport, 'ride_note', m.ride_note, 'team_no', m.team_no,
        'car_driver_id', m.car_driver_id, 'claimed', (m.token_hash is not null or m.user_id is not null),
        'logged_in', m.user_id is not null, 'responded_at', m.responded_at,
        'phone', case when uid is not null and uid = e.owner_id then m.phone else null end,
        'has_phone', m.phone is not null)
        order by m.team_no nulls last, m.sort, m.id)
      from public.group_members m where m.event_id = e.id), '[]'::json),
    'chat_count', (select count(*) from public.group_messages g where g.event_id = e.id)::int
  );
$$;

revoke all on function public.ge_create_teams(text, jsonb, date, text, jsonb, text, jsonb, text) from public, anon;
grant execute on function public.ge_create_teams(text, jsonb, date, text, jsonb, text, jsonb, text) to authenticated;
revoke all on function public.ge_set_teams(bigint, jsonb) from public, anon;
grant execute on function public.ge_set_teams(bigint, jsonb) to authenticated;
revoke all on function public.ge_set_phone(bigint, bigint, text) from public, anon;
grant execute on function public.ge_set_phone(bigint, bigint, text) to authenticated;
revoke all on function public.ge_set_meal_time(bigint, text) from public, anon;
grant execute on function public.ge_set_meal_time(bigint, text) to authenticated;
revoke all on function public._ge_clean_phone(text) from public, anon, authenticated;
revoke all on function public._ge_clean_teams(jsonb) from public, anon, authenticated;
