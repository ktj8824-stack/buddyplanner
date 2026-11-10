-- ⚠️ 2026-11-10: 아직 서버에 적용 전 (Supabase 확인 대기). 적용되면 이 줄을 지웁니다.
-- =====================================================================
-- 포인트·럭키드로우 운영정책 반영 (2026-11-10)
--  · 포인트 숫자: 광고 10P(하루 10회), 출석 3P(7일 연속 +10P), 라운딩 후기 20P(하루 1회),
--    맛집 별점 10P(하루 2회, 같은 식당 1번), 게시판 글 5P(하루 2회, 삭제·숨김 시 회수)
--  · 포인트 유효기간 1년 (먼저 쌓인 포인트부터 사용·소멸)
--  · 회차: 성립 기준(min_entries) 미달이면 한 번 연장, 그래도 미달이면 취소·전액 반환
--  · 예비 당첨자, 당첨자별 배송정보 입력 기한, 운영자 응모 금지, 관리자 회차 관리 함수
-- 숫자는 app_settings 표에서 바꿀 수 있습니다.
-- =====================================================================

insert into public.app_settings (key, value) values
  ('attend_points', '3'), ('attend_streak_days', '7'), ('attend_streak_bonus', '10'),
  ('post_points', '5'), ('post_daily_limit', '2'),
  ('food_points', '10'), ('food_daily_limit', '2'),
  ('round_points', '20'), ('round_daily_limit', '1'),
  ('point_expire_days', '365'),
  ('rf_rev_per_view', '11'), ('rf_payout', '0.75'), ('rf_ad_share', '0.55'),
  ('rf_entry_cost', '100'), ('rf_per_user_limit', '20')
on conflict (key) do nothing;
update public.app_settings set value = '10' where key in ('ad_reward_points', 'ad_daily_limit');

-- 포인트 사유 늘리기
alter table public.point_ledger drop constraint if exists point_ledger_reason_check;
alter table public.point_ledger add constraint point_ledger_reason_check check (reason in
  ('ad', 'raffle_entry', 'raffle_refund', 'admin', 'event',
   'attend', 'post', 'post_revoke', 'food_review', 'round_review', 'expire', 'referral'));
create unique index if not exists point_ledger_once_uniq on public.point_ledger (user_id, reason, ref)
  where reason in ('attend', 'post', 'post_revoke', 'food_review', 'round_review') and ref is not null;

-- 오늘(한국 시각) 0시
create or replace function public._kst_today_start()
returns timestamptz language sql stable set search_path = '' as $$
  select ((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul');
$$;

create or replace function public._earned_today(p_user uuid, p_reason text)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.point_ledger
  where user_id = p_user and reason = p_reason and delta > 0 and created_at >= public._kst_today_start();
$$;
revoke all on function public._earned_today(uuid, text) from public, anon, authenticated;

-- 1년 지난 포인트 소멸 (먼저 쌓인 것부터 쓴 것으로 봄)
create or replace function public._expire_points(p_user uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare days int := public._setting('point_expire_days', '365')::int; old_earned int; spent int; n int;
begin
  select coalesce(sum(delta), 0) into old_earned from public.point_ledger
    where user_id = p_user and delta > 0 and created_at < now() - make_interval(days => days);
  if old_earned = 0 then return 0; end if;
  select coalesce(-sum(delta), 0) into spent from public.point_ledger where user_id = p_user and delta < 0;
  n := old_earned - spent;
  if n > 0 then
    insert into public.point_ledger (user_id, delta, reason, ref) values (p_user, -n, 'expire', to_char(now(), 'YYYY-MM-DD'));
    return n;
  end if;
  return 0;
end;
$$;
revoke all on function public._expire_points(uuid) from public, anon, authenticated;

-- 포인트를 회수 (잔액 아래로는 안 내려감)
create or replace function public._revoke_points(p_user uuid, p_amount int, p_reason text, p_ref text)
returns void language plpgsql security definer set search_path = '' as $$
declare take int;
begin
  take := least(p_amount, greatest(public._balance(p_user), 0));
  if take > 0 then
    insert into public.point_ledger (user_id, delta, reason, ref) values (p_user, -take, p_reason, p_ref) on conflict do nothing;
  end if;
end;
$$;
revoke all on function public._revoke_points(uuid, int, text, text) from public, anon, authenticated;

-- 내 포인트 (소멸 처리 후 잔액 + 오늘 받은 현황)
create or replace function public.my_points()
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); exp_soon int;
begin
  if uid is null then raise exception 'login_required'; end if;
  perform public._expire_points(uid);
  -- 30일 안에 사라질 포인트 (대략: 11개월 넘은 적립 - 지금까지 쓴 것)
  select greatest(coalesce((select sum(delta) from public.point_ledger where user_id = uid and delta > 0
           and created_at < now() - make_interval(days => public._setting('point_expire_days', '365')::int - 30)), 0)
         - coalesce((select -sum(delta) from public.point_ledger where user_id = uid and delta < 0), 0), 0)::int into exp_soon;
  return json_build_object(
    'balance', public._balance(uid),
    'ad_today', public._ad_today(uid),
    'ad_limit', public._setting('ad_daily_limit', '10')::int,
    'ad_points', public._setting('ad_reward_points', '10')::int,
    'ad_mode', public._setting('ad_reward_mode', 'client'),
    'attended_today', exists (select 1 from public.point_ledger where user_id = uid and reason = 'attend' and ref = 'day:' || to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD')),
    'attend_points', public._setting('attend_points', '3')::int,
    'expiring_soon', exp_soon,
    'rules', json_build_object(
      'attend', public._setting('attend_points', '3')::int, 'streak_days', public._setting('attend_streak_days', '7')::int, 'streak_bonus', public._setting('attend_streak_bonus', '10')::int,
      'round', public._setting('round_points', '20')::int, 'food', public._setting('food_points', '10')::int, 'post', public._setting('post_points', '5')::int,
      'food_limit', public._setting('food_daily_limit', '2')::int, 'post_limit', public._setting('post_daily_limit', '2')::int, 'expire_days', public._setting('point_expire_days', '365')::int));
end;
$$;
revoke all on function public.my_points() from public, anon;
grant execute on function public.my_points() to authenticated;

-- 출석 체크 (하루 1번, 연속 N일마다 보너스)
create or replace function public.daily_check_in()
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  pts int := public._setting('attend_points', '3')::int;
  every int := public._setting('attend_streak_days', '7')::int;
  bonus int := public._setting('attend_streak_bonus', '10')::int;
  streak int := 1; d date; earned int;
begin
  if uid is null then raise exception 'login_required'; end if;
  perform pg_advisory_xact_lock(hashtext('pts:' || uid::text));
  if exists (select 1 from public.point_ledger where user_id = uid and reason = 'attend' and ref = 'day:' || to_char(today, 'YYYY-MM-DD')) then
    return json_build_object('ok', false, 'error', 'already', 'balance', public._balance(uid));
  end if;
  d := today - 1;
  while streak < 400 and exists (select 1 from public.point_ledger where user_id = uid and reason = 'attend' and ref = 'day:' || to_char(d, 'YYYY-MM-DD')) loop
    streak := streak + 1; d := d - 1;
  end loop;
  insert into public.point_ledger (user_id, delta, reason, ref) values (uid, pts, 'attend', 'day:' || to_char(today, 'YYYY-MM-DD'));
  earned := pts;
  if every > 0 and bonus > 0 and streak % every = 0 then
    insert into public.point_ledger (user_id, delta, reason, ref) values (uid, bonus, 'attend', 'streak:' || to_char(today, 'YYYY-MM-DD'));
    earned := earned + bonus;
  end if;
  return json_build_object('ok', true, 'earned', earned, 'streak', streak, 'bonus', streak % every = 0, 'balance', public._balance(uid));
end;
$$;
revoke all on function public.daily_check_in() from public, anon;
grant execute on function public.daily_check_in() to authenticated;

-- 라운딩 후기 (스코어 + 한 줄 일기가 서버에 동기화된 지난 7일 안 라운딩, 날짜마다 1번, 하루 1번)
create or replace function public.earn_round_review(p_date date)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  rec jsonb; pts int := public._setting('round_points', '20')::int;
  lim int := public._setting('round_daily_limit', '1')::int;
begin
  if uid is null then raise exception 'login_required'; end if;
  if p_date is null or p_date > today or p_date < today - 7 then return json_build_object('ok', false, 'error', 'too_old'); end if;
  perform pg_advisory_xact_lock(hashtext('pts:' || uid::text));
  select (value::jsonb) -> to_char(p_date, 'YYYY-MM-DD') into rec from public.user_data where user_id = uid and key = 'bp_records_v1';
  if rec is null or coalesce((rec ->> 'score')::numeric, 0) <= 0 or char_length(btrim(coalesce(rec ->> 'diary', ''))) < 2 then
    return json_build_object('ok', false, 'error', 'no_review');
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

-- 게시판 글: 쓸 때 적립, 삭제·숨김 때 회수
create or replace function public._post_points_trg()
returns trigger language plpgsql security definer set search_path = '' as $$
declare pts int := public._setting('post_points', '5')::int; lim int := public._setting('post_daily_limit', '2')::int;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.is_official, false) or new.user_id is null then return new; end if;
    perform pg_advisory_xact_lock(hashtext('pts:' || new.user_id::text));
    if public._earned_today(new.user_id, 'post') < lim then
      insert into public.point_ledger (user_id, delta, reason, ref) values (new.user_id, pts, 'post', 'post:' || new.id) on conflict do nothing;
    end if;
    return new;
  end if;
  -- 삭제 또는 숨김
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and coalesce(new.hidden, false) and not coalesce(old.hidden, false)) then
    if exists (select 1 from public.point_ledger where user_id = old.user_id and reason = 'post' and ref = 'post:' || old.id) then
      perform public._revoke_points(old.user_id, (select delta from public.point_ledger where user_id = old.user_id and reason = 'post' and ref = 'post:' || old.id), 'post_revoke', 'post:' || old.id);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public._post_points_trg() from public, anon, authenticated;
drop trigger if exists post_points_ins on public.community_posts;
create trigger post_points_ins after insert on public.community_posts for each row execute function public._post_points_trg();
drop trigger if exists post_points_del on public.community_posts;
create trigger post_points_del after delete on public.community_posts for each row execute function public._post_points_trg();
drop trigger if exists post_points_hide on public.community_posts;
create trigger post_points_hide after update of hidden on public.community_posts for each row execute function public._post_points_trg();

-- 맛집 별점: 같은 식당은 평생 1번, 하루 2번까지
create or replace function public._food_points_trg()
returns trigger language plpgsql security definer set search_path = '' as $$
declare pts int := public._setting('food_points', '10')::int; lim int := public._setting('food_daily_limit', '2')::int;
begin
  perform pg_advisory_xact_lock(hashtext('pts:' || new.user_id::text));
  if public._earned_today(new.user_id, 'food_review') < lim then
    insert into public.point_ledger (user_id, delta, reason, ref) values (new.user_id, pts, 'food_review', 'food:' || left(new.place_key, 120)) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public._food_points_trg() from public, anon, authenticated;
drop trigger if exists food_points_ins on public.restaurant_reviews;
create trigger food_points_ins after insert on public.restaurant_reviews for each row execute function public._food_points_trg();

-- ── 럭키드로우 ─────────────────────────────────────────────────────
alter table public.raffles add column if not exists extended boolean not null default false;
alter table public.raffles add column if not exists extend_days integer not null default 7 check (extend_days between 1 and 30);
alter table public.raffles add column if not exists reserve_count integer not null default 1 check (reserve_count between 0 and 5);
alter table public.raffles add column if not exists sponsored boolean not null default false;   -- 홍보 회차 (성립 기준 없이 진행)
alter table public.raffle_winners add column if not exists reserve boolean not null default false;
alter table public.raffle_winners add column if not exists forfeited boolean not null default false;
alter table public.raffle_winners add column if not exists claim_until timestamptz;

create or replace function public._draw_raffle(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.raffles; n int; picked int := 0; u uuid;
begin
  select * into r from public.raffles where id = p_id for update;
  if not found or r.status <> 'open' then return; end if;
  select count(*) into n from public.raffle_entries where raffle_id = p_id;
  if n = 0 or n < r.min_entries then
    -- 성립 기준 미달: 한 번만 연장, 그래도 미달이면 취소·전액 반환
    if n > 0 and r.min_entries > 0 and not r.extended then
      update public.raffles set extended = true, ends_at = greatest(ends_at, now()) + make_interval(days => r.extend_days) where id = p_id;
      return;
    end if;
    insert into public.point_ledger (user_id, delta, reason, ref)
      select user_id, count(*)::int * r.entry_cost, 'raffle_refund', p_id::text
      from public.raffle_entries where raffle_id = p_id group by user_id;
    update public.raffles set status = 'cancelled', drawn_at = now() where id = p_id;
    return;
  end if;
  for u in
    select e.user_id from (
      select user_id, min(ord) as first_ord from (
        select user_id, row_number() over (order by gen_random_uuid()) as ord
        from public.raffle_entries where raffle_id = p_id
      ) shuffled group by user_id
    ) e order by e.first_ord
  loop
    exit when picked >= r.winners_count + r.reserve_count;
    picked := picked + 1;
    insert into public.raffle_winners (raffle_id, user_id, rank, display_name, reserve, claim_until)
      values (p_id, u, picked, public._masked_name(u), picked > r.winners_count,
              case when picked > r.winners_count then null else now() + make_interval(days => r.claim_days) end);
  end loop;
  update public.raffles set status = 'drawn', drawn_at = now() where id = p_id;
end;
$$;
revoke all on function public._draw_raffle(bigint) from public, anon, authenticated;

create or replace function public.get_raffles()
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  perform public.draw_due_raffles();
  return coalesce((
    select json_agg(x order by x.sort_key, x.ends_at)
    from (
      select r.id, r.title, r.prize_name, r.prize_value, r.image_url, r.description,
             r.entry_cost, r.max_entries, r.min_entries, r.per_user_limit, r.winners_count,
             r.claim_days, r.starts_at, r.ends_at, r.status, r.drawn_at, r.rules, r.extended, r.extend_days,
             (select count(*) from public.raffle_entries e where e.raffle_id = r.id)::int as entries,
             (select count(*) from public.raffle_entries e where e.raffle_id = r.id and e.user_id = uid)::int as my_entries,
             (select json_agg(json_build_object('rank', w.rank, 'name', w.display_name) order by w.rank)
                from public.raffle_winners w where w.raffle_id = r.id and not w.reserve and not w.forfeited) as winners,
             (select json_build_object('claimed', w.claimed_at is not null, 'shipped', w.shipped_at is not null,
                       'claim_until', coalesce(w.claim_until, r.drawn_at + make_interval(days => r.claim_days)))
                from public.raffle_winners w where w.raffle_id = r.id and w.user_id = uid and not w.reserve and not w.forfeited) as me_winner,
             case when r.status = 'open' then 0 else 1 end as sort_key
      from public.raffles r
      where r.starts_at <= now()
        and (r.status = 'open' or r.drawn_at > now() - interval '30 days')
    ) x
  ), '[]'::json);
end;
$$;
revoke all on function public.get_raffles() from public;
grant execute on function public.get_raffles() to anon, authenticated;

create or replace function public.enter_raffle(p_id bigint, p_count integer default 1)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.raffles;
  total int; mine int; bal int; cost int; won boolean := false;
begin
  if uid is null then raise exception 'login_required'; end if;
  if p_count is null or p_count < 1 or p_count > 100 then
    return json_build_object('ok', false, 'error', 'bad_count');
  end if;
  if exists (select 1 from public.app_admins where user_id = uid) then
    return json_build_object('ok', false, 'error', 'admin_blocked');   -- 운영자는 응모할 수 없음
  end if;
  perform pg_advisory_xact_lock(hashtext('pts:' || uid::text));
  perform public._expire_points(uid);
  select * into r from public.raffles where id = p_id for update;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status <> 'open' or now() < r.starts_at or now() >= r.ends_at then
    return json_build_object('ok', false, 'error', 'closed');
  end if;
  select count(*) into total from public.raffle_entries where raffle_id = p_id;
  select count(*) into mine from public.raffle_entries where raffle_id = p_id and user_id = uid;
  if total + p_count > r.max_entries then
    return json_build_object('ok', false, 'error', 'full', 'remaining', r.max_entries - total);
  end if;
  if mine + p_count > r.per_user_limit then
    return json_build_object('ok', false, 'error', 'user_limit', 'remaining', r.per_user_limit - mine);
  end if;
  cost := r.entry_cost * p_count;
  bal := public._balance(uid);
  if bal < cost then
    return json_build_object('ok', false, 'error', 'not_enough_points', 'balance', bal, 'need', cost);
  end if;
  insert into public.point_ledger (user_id, delta, reason, ref) values (uid, -cost, 'raffle_entry', p_id::text);
  insert into public.raffle_entries (raffle_id, user_id) select p_id, uid from generate_series(1, p_count);
  if total + p_count >= r.max_entries then
    perform public._draw_raffle(p_id);
    won := exists (select 1 from public.raffle_winners where raffle_id = p_id and user_id = uid and not reserve);
  end if;
  return json_build_object('ok', true, 'balance', bal - cost, 'entries', total + p_count,
    'my_entries', mine + p_count, 'drawn', total + p_count >= r.max_entries, 'won', won);
end;
$$;
revoke all on function public.enter_raffle(bigint, integer) from public, anon;
grant execute on function public.enter_raffle(bigint, integer) to authenticated;

create or replace function public.claim_prize(p_id bigint, p_name text, p_phone text, p_addr text)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.raffles; w public.raffle_winners;
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into r from public.raffles where id = p_id;
  select * into w from public.raffle_winners where raffle_id = p_id and user_id = uid and not reserve and not forfeited;
  if not found then return json_build_object('ok', false, 'error', 'not_winner'); end if;
  if w.shipped_at is not null then return json_build_object('ok', false, 'error', 'already_shipped'); end if;
  if now() > coalesce(w.claim_until, r.drawn_at + make_interval(days => r.claim_days)) then
    return json_build_object('ok', false, 'error', 'claim_expired');
  end if;
  p_name := btrim(coalesce(p_name, '')); p_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'); p_addr := btrim(coalesce(p_addr, ''));
  if char_length(p_name) not between 1 and 30 or p_phone !~ '^01[0-9]{8,9}$' or char_length(p_addr) not between 5 and 200 then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  update public.raffle_winners set ship_name = p_name, ship_phone = p_phone, ship_addr = p_addr, claimed_at = now()
    where raffle_id = p_id and user_id = uid;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.claim_prize(bigint, text, text, text) from public, anon;
grant execute on function public.claim_prize(bigint, text, text, text) to authenticated;

-- ── 관리자 ────────────────────────────────────────────────────────
create or replace function public.admin_point_settings()
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._market_admin_check();
  return (select json_object_agg(key, value) from public.app_settings);
end;
$$;
revoke all on function public.admin_point_settings() from public, anon;
grant execute on function public.admin_point_settings() to authenticated;

create or replace function public.admin_raffle_list()
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public._market_admin_check();
  perform public.draw_due_raffles();
  return coalesce((select json_agg(x order by x.sort_key, x.id desc) from (
    select r.*,
      (select count(*) from public.raffle_entries e where e.raffle_id = r.id)::int as entries,
      (select count(distinct e.user_id) from public.raffle_entries e where e.raffle_id = r.id)::int as people,
      (select json_agg(json_build_object('user_id', w.user_id, 'rank', w.rank, 'name', w.display_name, 'reserve', w.reserve,
          'forfeited', w.forfeited, 'claim_until', coalesce(w.claim_until, r.drawn_at + make_interval(days => r.claim_days)),
          'claimed_at', w.claimed_at, 'shipped_at', w.shipped_at, 'ship_name', w.ship_name, 'ship_phone', w.ship_phone, 'ship_addr', w.ship_addr)
          order by w.rank) from public.raffle_winners w where w.raffle_id = r.id) as winners,
      case when r.status = 'open' then 0 else 1 end as sort_key
    from public.raffles r
    where r.status = 'open' or r.created_at > now() - interval '180 days'
  ) x), '[]'::json);
end;
$$;
revoke all on function public.admin_raffle_list() from public, anon;
grant execute on function public.admin_raffle_list() to authenticated;

create or replace function public.admin_raffle_save(p jsonb)
returns json language plpgsql security definer set search_path = '' as $$
declare rid bigint := nullif(p ->> 'id', '')::bigint; has_entries boolean;
begin
  perform public._market_admin_check();
  if rid is null then
    insert into public.raffles (title, prize_name, prize_value, image_url, description, entry_cost, max_entries, min_entries,
        per_user_limit, winners_count, reserve_count, claim_days, starts_at, ends_at, rules, sponsored, extend_days)
    values (p ->> 'title', p ->> 'prize_name', coalesce((p ->> 'prize_value')::int, 0), nullif(p ->> 'image_url', ''), nullif(p ->> 'description', ''),
        coalesce((p ->> 'entry_cost')::int, 100), coalesce((p ->> 'max_entries')::int, 100000), coalesce((p ->> 'min_entries')::int, 0),
        coalesce((p ->> 'per_user_limit')::int, 20), coalesce((p ->> 'winners_count')::int, 1), coalesce((p ->> 'reserve_count')::int, 1),
        coalesce((p ->> 'claim_days')::int, 7), coalesce((p ->> 'starts_at')::timestamptz, now()), (p ->> 'ends_at')::timestamptz,
        nullif(p ->> 'rules', ''), coalesce((p ->> 'sponsored')::boolean, false), coalesce((p ->> 'extend_days')::int, 7))
    returning id into rid;
    return json_build_object('ok', true, 'id', rid);
  end if;
  select exists (select 1 from public.raffle_entries where raffle_id = rid) into has_entries;
  if has_entries then
    -- 응모가 시작된 회차는 응모자에게 불리한 변경을 막고, 설명·사진·마감 연장만 허용
    update public.raffles set image_url = nullif(p ->> 'image_url', ''), description = nullif(p ->> 'description', ''),
        rules = nullif(p ->> 'rules', ''), ends_at = greatest(ends_at, (p ->> 'ends_at')::timestamptz)
      where id = rid and status = 'open';
    return json_build_object('ok', true, 'id', rid, 'limited', true);
  end if;
  update public.raffles set title = p ->> 'title', prize_name = p ->> 'prize_name', prize_value = coalesce((p ->> 'prize_value')::int, 0),
      image_url = nullif(p ->> 'image_url', ''), description = nullif(p ->> 'description', ''), entry_cost = coalesce((p ->> 'entry_cost')::int, 100),
      max_entries = coalesce((p ->> 'max_entries')::int, 100000), min_entries = coalesce((p ->> 'min_entries')::int, 0),
      per_user_limit = coalesce((p ->> 'per_user_limit')::int, 20), winners_count = coalesce((p ->> 'winners_count')::int, 1),
      reserve_count = coalesce((p ->> 'reserve_count')::int, 1), claim_days = coalesce((p ->> 'claim_days')::int, 7),
      starts_at = coalesce((p ->> 'starts_at')::timestamptz, starts_at), ends_at = (p ->> 'ends_at')::timestamptz,
      rules = nullif(p ->> 'rules', ''), sponsored = coalesce((p ->> 'sponsored')::boolean, false), extend_days = coalesce((p ->> 'extend_days')::int, 7)
    where id = rid and status = 'open';
  return json_build_object('ok', true, 'id', rid);
end;
$$;
revoke all on function public.admin_raffle_save(jsonb) from public, anon;
grant execute on function public.admin_raffle_save(jsonb) to authenticated;

create or replace function public.admin_raffle_action(p_id bigint, p_action text, p_user uuid default null)
returns json language plpgsql security definer set search_path = '' as $$
declare r public.raffles; w public.raffle_winners; nxt public.raffle_winners;
begin
  perform public._market_admin_check();
  select * into r from public.raffles where id = p_id for update;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if p_action = 'cancel' then
    if r.status <> 'open' then return json_build_object('ok', false, 'error', 'not_open'); end if;
    insert into public.point_ledger (user_id, delta, reason, ref)
      select user_id, count(*)::int * r.entry_cost, 'raffle_refund', p_id::text from public.raffle_entries where raffle_id = p_id group by user_id;
    update public.raffles set status = 'cancelled', drawn_at = now() where id = p_id;
    return json_build_object('ok', true);
  elsif p_action = 'draw' then
    if r.status <> 'open' then return json_build_object('ok', false, 'error', 'not_open'); end if;
    update public.raffles set extended = true where id = p_id;   -- 직접 추첨은 연장 없이
    perform public._draw_raffle(p_id);
    return json_build_object('ok', true);
  elsif p_action = 'ship' then
    update public.raffle_winners set shipped_at = now() where raffle_id = p_id and user_id = p_user and claimed_at is not null;
    return json_build_object('ok', found);
  elsif p_action = 'promote' then
    -- 기한 안에 배송지를 안 넣은 당첨자 → 당첨 취소, 첫 예비 당첨자에게 넘김
    select * into w from public.raffle_winners where raffle_id = p_id and not reserve and not forfeited and claimed_at is null
      and now() > coalesce(claim_until, r.drawn_at + make_interval(days => r.claim_days)) order by rank limit 1;
    if not found then return json_build_object('ok', false, 'error', 'no_expired_winner'); end if;
    select * into nxt from public.raffle_winners where raffle_id = p_id and reserve and not forfeited order by rank limit 1;
    if not found then return json_build_object('ok', false, 'error', 'no_reserve'); end if;
    update public.raffle_winners set forfeited = true, ship_name = null, ship_phone = null, ship_addr = null where raffle_id = p_id and user_id = w.user_id;
    update public.raffle_winners set reserve = false, claim_until = now() + make_interval(days => r.claim_days) where raffle_id = p_id and user_id = nxt.user_id;
    return json_build_object('ok', true, 'promoted', nxt.display_name);
  end if;
  return json_build_object('ok', false, 'error', 'bad_action');
end;
$$;
revoke all on function public.admin_raffle_action(bigint, text, uuid) from public, anon;
grant execute on function public.admin_raffle_action(bigint, text, uuid) to authenticated;
