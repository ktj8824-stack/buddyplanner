-- =====================================================================
-- 버디플래너 마켓 관리자 — Supabase 추가 설정
--
-- 사용법: 001~004 파일을 먼저 실행한 뒤, SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
--
-- 관리자 지정 (한 번만, SQL Editor에서 직접 실행 — 이메일은 본인 로그인 이메일로):
--   insert into public.app_admins (user_id)
--     select id from auth.users where email = '관리자@이메일' on conflict do nothing;
--
-- 원칙
--  · 마켓 상품은 관리자(app_admins 표에 있는 계정)만 앱에서 추가·수정·숨김·삭제·순서 변경할 수 있습니다.
--  · 일반 사용자는 지금처럼 '노출 중'인 상품만 읽을 수 있습니다 (003의 정책 그대로).
--  · 링크는 쿠팡 주소만, 사진은 https 주소만 받습니다.
-- =====================================================================

create table if not exists public.app_admins (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;   -- 앱에서 직접 읽기·쓰기 금지

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

create or replace function public._market_admin_check()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.app_admins where user_id = auth.uid()) then
    raise exception 'admin_only';
  end if;
end;
$$;
revoke all on function public._market_admin_check() from public, anon, authenticated;

-- 전체 목록 (숨긴 상품 포함)
create or replace function public.market_admin_list()
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public._market_admin_check();
  return coalesce((
    select json_agg(json_build_object(
      'id', m.id, 'kind', m.kind, 'category', m.category, 'brand', m.brand, 'title', m.title,
      'image_url', m.image_url, 'link', m.link, 'price', m.price, 'list_price', m.list_price,
      'badge', m.badge, 'sort', m.sort, 'active', m.active) order by m.sort, m.id)
    from public.market_products m
  ), '[]'::json);
end;
$$;
revoke all on function public.market_admin_list() from public, anon;
grant execute on function public.market_admin_list() to authenticated;

-- 추가 (p_id 없음) 또는 수정 (p_id 있음) — 쿠팡 제휴 상품
create or replace function public.market_admin_save(
  p_id bigint, p_category text, p_title text, p_link text, p_image text default null, p_brand text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare new_id bigint; nxt int;
begin
  perform public._market_admin_check();
  p_title := btrim(coalesce(p_title, ''));
  p_link  := btrim(coalesce(p_link, ''));
  p_image := nullif(btrim(coalesce(p_image, '')), '');
  p_brand := left(nullif(btrim(coalesce(p_brand, '')), ''), 30);
  if char_length(p_title) < 1 or char_length(p_title) > 100 then return json_build_object('ok', false, 'error', 'invalid_title'); end if;
  if p_category not in ('ball', 'wear', 'glove_cap', 'shoes', 'club_bag', 'etc') then return json_build_object('ok', false, 'error', 'invalid_category'); end if;
  if p_link !~ '^https://(link\.coupang\.com|coupa\.ng|www\.coupang\.com|m\.coupang\.com)/' or char_length(p_link) > 500 then
    return json_build_object('ok', false, 'error', 'invalid_link');
  end if;
  if p_image is not null and (p_image !~ '^https://' or char_length(p_image) > 1000) then
    return json_build_object('ok', false, 'error', 'invalid_image');
  end if;
  if p_id is null then
    select coalesce(min(sort), 100) - 1 into nxt from public.market_products;   -- 새 상품은 맨 앞
    insert into public.market_products (kind, category, brand, title, image_url, link, sort)
      values ('affiliate', p_category, p_brand, p_title, p_image, p_link, nxt)
      returning id into new_id;
    return json_build_object('ok', true, 'id', new_id);
  end if;
  update public.market_products
    set category = p_category, title = p_title, link = p_link, image_url = p_image, brand = p_brand
    where id = p_id;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true, 'id', p_id);
end;
$$;
revoke all on function public.market_admin_save(bigint, text, text, text, text, text) from public, anon;
grant execute on function public.market_admin_save(bigint, text, text, text, text, text) to authenticated;

create or replace function public.market_admin_set_active(p_id bigint, p_active boolean)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public._market_admin_check();
  update public.market_products set active = coalesce(p_active, false) where id = p_id;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.market_admin_set_active(bigint, boolean) from public, anon;
grant execute on function public.market_admin_set_active(bigint, boolean) to authenticated;

create or replace function public.market_admin_delete(p_id bigint)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public._market_admin_check();
  delete from public.market_products where id = p_id;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.market_admin_delete(bigint) from public, anon;
grant execute on function public.market_admin_delete(bigint) to authenticated;

-- 순서 변경: 화면에 보이는 순서대로 id 배열을 넘기면 10, 20, 30 … 으로 다시 매김
create or replace function public.market_admin_reorder(p_ids bigint[])
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public._market_admin_check();
  update public.market_products m set sort = t.ord * 10
    from unnest(p_ids) with ordinality as t(id, ord)
    where m.id = t.id;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.market_admin_reorder(bigint[]) from public, anon;
grant execute on function public.market_admin_reorder(bigint[]) to authenticated;
