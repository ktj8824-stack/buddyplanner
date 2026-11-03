-- =====================================================================
-- BuddyPlanner 마켓 참고 가격 · 로켓배송 표시 — Supabase 추가 설정
--
-- 사용법: 001~006 파일을 먼저 실행한 뒤, SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
--
--  · 쿠팡 제휴 상품의 가격은 자주 바뀌므로 '참고 가격 + 기준 날짜'로만 표시합니다.
--  · 가격을 새로 넣으면 기준 날짜가 오늘(한국 시간)로 바뀝니다.
-- =====================================================================

alter table public.market_products add column if not exists ref_price    integer check (ref_price is null or ref_price between 0 and 100000000);
alter table public.market_products add column if not exists ref_price_at date;
alter table public.market_products add column if not exists rocket       boolean not null default false;

-- 관리 목록: 새 칸 포함
create or replace function public.market_admin_list()
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public._market_admin_check();
  return coalesce((
    select json_agg(json_build_object(
      'id', m.id, 'kind', m.kind, 'category', m.category, 'brand', m.brand, 'title', m.title,
      'image_url', m.image_url, 'link', m.link, 'price', m.price, 'list_price', m.list_price,
      'badge', m.badge, 'sort', m.sort, 'active', m.active,
      'ref_price', m.ref_price, 'ref_price_at', m.ref_price_at, 'rocket', m.rocket) order by m.sort, m.id)
    from public.market_products m
  ), '[]'::json);
end;
$$;
revoke all on function public.market_admin_list() from public, anon;
grant execute on function public.market_admin_list() to authenticated;

-- 추가·수정: 참고 가격, 로켓배송 추가 (예전 6개 인자 버전은 지우고 새 버전으로)
drop function if exists public.market_admin_save(bigint, text, text, text, text, text);
create or replace function public.market_admin_save(
  p_id bigint, p_category text, p_title text, p_link text, p_image text default null, p_brand text default null,
  p_ref_price integer default null, p_rocket boolean default false)
returns json language plpgsql security definer set search_path = '' as $$
declare new_id bigint; nxt int; old_price int; today date := (now() at time zone 'Asia/Seoul')::date;
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
  if p_ref_price is not null and (p_ref_price < 0 or p_ref_price > 100000000) then
    return json_build_object('ok', false, 'error', 'invalid_price');
  end if;
  if p_id is null then
    select coalesce(min(sort), 100) - 1 into nxt from public.market_products;   -- 새 상품은 맨 앞
    insert into public.market_products (kind, category, brand, title, image_url, link, sort, ref_price, ref_price_at, rocket)
      values ('affiliate', p_category, p_brand, p_title, p_image, p_link, nxt,
              p_ref_price, case when p_ref_price is not null then today end, coalesce(p_rocket, false))
      returning id into new_id;
    return json_build_object('ok', true, 'id', new_id);
  end if;
  select ref_price into old_price from public.market_products where id = p_id;
  update public.market_products
    set category = p_category, title = p_title, link = p_link, image_url = p_image, brand = p_brand,
        ref_price = p_ref_price,
        -- 가격이 바뀌었을 때만 기준 날짜를 오늘로
        ref_price_at = case when p_ref_price is null then null
                            when p_ref_price is distinct from old_price then today
                            else coalesce(ref_price_at, today) end,
        rocket = coalesce(p_rocket, false)
    where id = p_id;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true, 'id', p_id);
end;
$$;
revoke all on function public.market_admin_save(bigint, text, text, text, text, text, integer, boolean) from public, anon;
grant execute on function public.market_admin_save(bigint, text, text, text, text, text, integer, boolean) to authenticated;
