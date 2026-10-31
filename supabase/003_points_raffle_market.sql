-- =====================================================================
-- 버디플래너 포인트 · 럭키드로우 · 마켓 — Supabase 추가 설정
--
-- 사용법: 001, 002 파일을 먼저 실행한 뒤, SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
--
-- 원칙
--  · 포인트는 서버 장부(point_ledger)의 합계만 인정합니다. 앱은 숫자를 바꿀 수 없습니다.
--  · 포인트는 무료(광고 시청 등)로만 적립되며, 돈으로 판매하지 않습니다.
--  · 럭키드로우 응모·추첨·환불은 모두 서버 함수 안에서 처리합니다.
--  · 상품·럭키드로우 등록은 Supabase 대시보드(Table Editor)에서 운영자가 합니다.
-- =====================================================================

-- 0) 운영 설정 ---------------------------------------------------------
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
-- 앱에서 읽거나 쓸 수 없음 (서버 함수만 사용)

-- ad_reward_mode
--   'client' : 앱이 광고 시청 완료를 알려 주면 적립 (하루 횟수 제한으로 피해 제한)
--   'ssv'    : AdMob 서버 검증(admob-reward 함수)으로만 적립 — 실서비스 권장
insert into public.app_settings (key, value) values
  ('ad_reward_mode', 'client'),
  ('ad_reward_points', '50'),
  ('ad_daily_limit', '20')
on conflict (key) do nothing;

create or replace function public._setting(p_key text, p_default text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.app_settings where key = p_key), p_default);
$$;
revoke all on function public._setting(text, text) from public, anon, authenticated;

-- 1) 포인트 장부 -------------------------------------------------------
create table if not exists public.point_ledger (
  id          bigserial   primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  delta       integer     not null check (delta <> 0),
  reason      text        not null check (reason in ('ad', 'raffle_entry', 'raffle_refund', 'admin', 'event')),
  ref         text,
  created_at  timestamptz not null default now()
);
create index if not exists point_ledger_user_idx on public.point_ledger (user_id, created_at desc);
-- 같은 AdMob 거래(transaction_id)로 두 번 적립되지 않게
create unique index if not exists point_ledger_ad_tx_uniq on public.point_ledger (ref) where reason = 'ad' and ref is not null;

alter table public.point_ledger enable row level security;
drop policy if exists "ledger_select_own" on public.point_ledger;
create policy "ledger_select_own" on public.point_ledger
  for select to authenticated using (user_id = (select auth.uid()));
-- insert/update/delete 정책 없음 → 앱에서 직접 쓸 수 없음

create or replace function public._balance(p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(delta), 0)::int from public.point_ledger where user_id = p_user;
$$;
revoke all on function public._balance(uuid) from public, anon, authenticated;

create or replace function public._ad_today(p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.point_ledger
  where user_id = p_user and reason = 'ad'
    and created_at >= ((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul');
$$;
revoke all on function public._ad_today(uuid) from public, anon, authenticated;

-- 내 포인트
create or replace function public.my_points()
returns json language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login_required'; end if;
  return json_build_object(
    'balance', public._balance(uid),
    'ad_today', public._ad_today(uid),
    'ad_limit', public._setting('ad_daily_limit', '20')::int,
    'ad_points', public._setting('ad_reward_points', '50')::int,
    'ad_mode', public._setting('ad_reward_mode', 'client'));
end;
$$;
revoke all on function public.my_points() from public, anon;
grant execute on function public.my_points() to authenticated;

-- 내 포인트 내역 (최근 50건)
create or replace function public.my_point_history()
returns setof public.point_ledger language sql stable security definer set search_path = '' as $$
  select * from public.point_ledger where user_id = auth.uid() order by created_at desc limit 50;
$$;
revoke all on function public.my_point_history() from public, anon;
grant execute on function public.my_point_history() to authenticated;

-- 광고 보상 적립 (공통 처리)
create or replace function public._grant_ad(p_user uuid, p_tx text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  lim int := public._setting('ad_daily_limit', '20')::int;
  pts int := public._setting('ad_reward_points', '50')::int;
  today int;
begin
  perform pg_advisory_xact_lock(hashtext('pts:' || p_user::text));
  if p_tx is not null and exists (select 1 from public.point_ledger where reason = 'ad' and ref = p_tx) then
    return json_build_object('ok', true, 'duplicate', true, 'balance', public._balance(p_user));
  end if;
  today := public._ad_today(p_user);
  if today >= lim then
    return json_build_object('ok', false, 'error', 'daily_limit', 'balance', public._balance(p_user), 'ad_today', today, 'ad_limit', lim);
  end if;
  insert into public.point_ledger (user_id, delta, reason, ref) values (p_user, pts, 'ad', p_tx);
  return json_build_object('ok', true, 'earned', pts, 'balance', public._balance(p_user), 'ad_today', today + 1, 'ad_limit', lim);
end;
$$;
revoke all on function public._grant_ad(uuid, text) from public, anon, authenticated;

-- 앱이 호출: 광고 시청 완료 ('client' 모드일 때만)
create or replace function public.earn_ad_points()
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login_required'; end if;
  if public._setting('ad_reward_mode', 'client') <> 'client' then
    -- 서버 검증 모드: 적립은 admob-reward 함수가 처리
    return json_build_object('ok', false, 'error', 'use_ssv', 'balance', public._balance(uid));
  end if;
  return public._grant_ad(uid, null);
end;
$$;
revoke all on function public.earn_ad_points() from public, anon;
grant execute on function public.earn_ad_points() to authenticated;

-- AdMob 서버 검증 함수(admob-reward Edge Function, service_role)만 호출
create or replace function public.grant_ad_reward(p_user uuid, p_tx text)
returns json language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from auth.users where id = p_user) then
    return json_build_object('ok', false, 'error', 'unknown_user');
  end if;
  return public._grant_ad(p_user, p_tx);
end;
$$;
revoke all on function public.grant_ad_reward(uuid, text) from public, anon, authenticated;
grant execute on function public.grant_ad_reward(uuid, text) to service_role;

-- 2) 럭키드로우 ---------------------------------------------------------
create table if not exists public.raffles (
  id              bigserial   primary key,
  title           text        not null check (char_length(title) between 1 and 80),
  prize_name      text        not null check (char_length(prize_name) between 1 and 80),
  prize_value     integer     not null default 0 check (prize_value >= 0),   -- 경품 시가(원). 5만원 초과 시 제세공과금 안내
  image_url       text,
  description     text,
  entry_cost      integer     not null check (entry_cost between 1 and 100000),
  max_entries     integer     not null check (max_entries between 1 and 1000000), -- 정원: 다 차면 즉시 추첨
  min_entries     integer     not null default 0 check (min_entries >= 0),        -- 마감 때 이보다 적으면 취소·전액 반환
  per_user_limit  integer     not null default 5 check (per_user_limit >= 1),
  winners_count   integer     not null default 1 check (winners_count >= 1),
  claim_days      integer     not null default 7 check (claim_days between 1 and 60), -- 배송지 입력 기한(일)
  starts_at       timestamptz not null default now(),
  ends_at         timestamptz not null,
  status          text        not null default 'open' check (status in ('open', 'drawn', 'cancelled')),
  drawn_at        timestamptz,
  rules           text,       -- 추가 유의사항 (기본 공식 규칙은 앱이 자동으로 표시)
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);
alter table public.raffles enable row level security;
drop policy if exists "raffles_select_all" on public.raffles;
create policy "raffles_select_all" on public.raffles for select to anon, authenticated using (true);

create table if not exists public.raffle_entries (
  id          bigserial   primary key,
  raffle_id   bigint      not null references public.raffles (id) on delete cascade,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists raffle_entries_raffle_idx on public.raffle_entries (raffle_id);
create index if not exists raffle_entries_user_idx on public.raffle_entries (user_id, raffle_id);
alter table public.raffle_entries enable row level security;
drop policy if exists "entries_select_own" on public.raffle_entries;
create policy "entries_select_own" on public.raffle_entries
  for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.raffle_winners (
  raffle_id     bigint      not null references public.raffles (id) on delete cascade,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  rank          integer     not null,
  display_name  text        not null,       -- 공개용 (가린 닉네임)
  ship_name     text,
  ship_phone    text,
  ship_addr     text,
  claimed_at    timestamptz,
  shipped_at    timestamptz,                -- 운영자가 발송 후 입력
  primary key (raffle_id, user_id)
);
alter table public.raffle_winners enable row level security;
drop policy if exists "winners_select_own" on public.raffle_winners;
create policy "winners_select_own" on public.raffle_winners
  for select to authenticated using (user_id = (select auth.uid()));

-- 닉네임 가리기: 김골퍼 → 김**
create or replace function public._masked_name(p_user uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare n text;
begin
  select value #>> '{}' into n from public.user_data where user_id = p_user and key = 'bp_user_name';
  n := btrim(coalesce(n, ''));
  if n = '' then return '버디' || upper(right(replace(p_user::text, '-', ''), 4)); end if;
  return left(n, 1) || repeat('*', greatest(2, least(char_length(n) - 1, 4)));
end;
$$;
revoke all on function public._masked_name(uuid) from public, anon, authenticated;

-- 추첨 (내부용). 응모 건수만큼 확률이 올라가고, 한 사람은 한 번만 당첨.
create or replace function public._draw_raffle(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.raffles;
  n int;
  picked int := 0;
  u uuid;
begin
  select * into r from public.raffles where id = p_id for update;
  if not found or r.status <> 'open' then return; end if;
  select count(*) into n from public.raffle_entries where raffle_id = p_id;

  if n = 0 or n < r.min_entries then
    -- 취소: 사용한 포인트 전액 반환
    insert into public.point_ledger (user_id, delta, reason, ref)
      select user_id, count(*)::int * r.entry_cost, 'raffle_refund', p_id::text
      from public.raffle_entries where raffle_id = p_id group by user_id;
    update public.raffles set status = 'cancelled', drawn_at = now() where id = p_id;
    return;
  end if;

  -- 응모권을 무작위 순서로 섞고(gen_random_uuid는 암호학적 난수), 처음 나온 순서대로 사람을 뽑음
  for u in
    select e.user_id from (
      select user_id, min(ord) as first_ord from (
        select user_id, row_number() over (order by gen_random_uuid()) as ord
        from public.raffle_entries where raffle_id = p_id
      ) shuffled group by user_id
    ) e order by e.first_ord
  loop
    exit when picked >= r.winners_count;
    picked := picked + 1;
    insert into public.raffle_winners (raffle_id, user_id, rank, display_name)
      values (p_id, u, picked, public._masked_name(u));
  end loop;
  update public.raffles set status = 'drawn', drawn_at = now() where id = p_id;
end;
$$;
revoke all on function public._draw_raffle(bigint) from public, anon, authenticated;

-- 마감됐거나 정원이 찬 응모를 추첨 (조회·응모 때 자동 실행, pg_cron으로도 실행 가능)
create or replace function public.draw_due_raffles()
returns integer language plpgsql security definer set search_path = '' as $$
declare rid bigint; cnt int := 0;
begin
  for rid in
    select r.id from public.raffles r
    where r.status = 'open'
      and (r.ends_at <= now()
           or (select count(*) from public.raffle_entries e where e.raffle_id = r.id) >= r.max_entries)
  loop
    perform public._draw_raffle(rid);
    cnt := cnt + 1;
  end loop;
  return cnt;
end;
$$;
revoke all on function public.draw_due_raffles() from public, anon, authenticated;
grant execute on function public.draw_due_raffles() to service_role;

-- 목록 (진행 중 + 최근 30일 종료분). 로그인 안 해도 볼 수 있음.
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
             r.claim_days, r.starts_at, r.ends_at, r.status, r.drawn_at, r.rules,
             (select count(*) from public.raffle_entries e where e.raffle_id = r.id)::int as entries,
             (select count(*) from public.raffle_entries e where e.raffle_id = r.id and e.user_id = uid)::int as my_entries,
             (select json_agg(json_build_object('rank', w.rank, 'name', w.display_name) order by w.rank)
                from public.raffle_winners w where w.raffle_id = r.id) as winners,
             (select json_build_object('claimed', w.claimed_at is not null, 'shipped', w.shipped_at is not null,
                       'claim_until', r.drawn_at + make_interval(days => r.claim_days))
                from public.raffle_winners w where w.raffle_id = r.id and w.user_id = uid) as me_winner,
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

-- 응모
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
  perform pg_advisory_xact_lock(hashtext('pts:' || uid::text));
  select * into r from public.raffles where id = p_id for update;   -- 같은 응모끼리 순서대로 처리
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
    won := exists (select 1 from public.raffle_winners where raffle_id = p_id and user_id = uid);
  end if;

  return json_build_object('ok', true, 'balance', bal - cost, 'entries', total + p_count,
    'my_entries', mine + p_count, 'drawn', total + p_count >= r.max_entries, 'won', won);
end;
$$;
revoke all on function public.enter_raffle(bigint, integer) from public, anon;
grant execute on function public.enter_raffle(bigint, integer) to authenticated;

-- 당첨자 배송지 입력
create or replace function public.claim_prize(p_id bigint, p_name text, p_phone text, p_addr text)
returns json language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.raffles; w public.raffle_winners;
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into r from public.raffles where id = p_id;
  select * into w from public.raffle_winners where raffle_id = p_id and user_id = uid;
  if not found then return json_build_object('ok', false, 'error', 'not_winner'); end if;
  if w.shipped_at is not null then return json_build_object('ok', false, 'error', 'already_shipped'); end if;
  if now() > r.drawn_at + make_interval(days => r.claim_days) then
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

-- 배송 정보 파기: 발송 30일 후 (개인정보 최소 보관). pg_cron으로 매일 실행 권장.
create or replace function public.purge_shipping_info()
returns integer language sql security definer set search_path = '' as $$
  with u as (
    update public.raffle_winners set ship_name = null, ship_phone = null, ship_addr = null
    where shipped_at is not null and shipped_at < now() - interval '30 days' and ship_phone is not null
    returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.purge_shipping_info() from public, anon, authenticated;
grant execute on function public.purge_shipping_info() to service_role;

-- 3) 마켓 상품 ----------------------------------------------------------
create table if not exists public.market_products (
  id          bigserial   primary key,
  kind        text        not null default 'affiliate' check (kind in ('affiliate', 'direct')), -- 제휴 링크 / 직접 판매
  category    text        not null default 'etc' check (category in ('ball', 'wear', 'glove_cap', 'shoes', 'club_bag', 'etc')),
  brand       text,
  title       text        not null check (char_length(title) between 1 and 100),
  image_url   text,
  link        text,       -- 제휴 상품 링크
  price       integer     check (price is null or price >= 0),       -- 직접 판매가 (제휴 상품은 비워 두기: 가격이 자주 바뀜)
  list_price  integer     check (list_price is null or list_price >= 0),
  badge       text,
  sort        integer     not null default 100,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);
alter table public.market_products enable row level security;
drop policy if exists "products_select_active" on public.market_products;
create policy "products_select_active" on public.market_products
  for select to anon, authenticated using (active);

-- 4) 회원 탈퇴 시 함께 삭제 --------------------------------------------
-- (포인트·응모·당첨 기록은 auth.users 삭제 시 on delete cascade로 함께 삭제됩니다)
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
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- =====================================================================
-- (선택) 매일 자동 실행 — Database → Extensions에서 pg_cron을 켠 뒤 실행
--   select cron.schedule('bp-draw',  '*/10 * * * *', 'select public.draw_due_raffles()');
--   select cron.schedule('bp-purge', '0 4 * * *',    'select public.purge_shipping_info()');
--
-- 럭키드로우 등록 예시 (Table Editor에서 직접 입력해도 됩니다)
--   insert into public.raffles (title, prize_name, prize_value, entry_cost, max_entries, min_entries,
--                               per_user_limit, winners_count, ends_at, image_url)
--   values ('11월 럭키드로우', '타이틀리스트 PRO V1 (12구)', 45000, 100, 300, 30,
--           5, 1, now() + interval '14 days', 'https://.../prov1.jpg');
-- =====================================================================
