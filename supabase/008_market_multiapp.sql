-- =====================================================================
-- 마켓 상품을 여러 앱(BuddyPlanner · 마이플래너 · 매니저플래너)에서 같이 쓰기
--
-- 사용법: 001~007 파일을 먼저 실행한 뒤, SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
--
--  · 상품마다 '보일 앱'(apps)을 정합니다. 기존 상품은 BuddyPlanner에만 보입니다.
--  · 각 앱은 자기 앱 이름이 들어간 상품만 읽습니다. 예) ?apps=cs.{myplanner}
--  · 카테고리는 앱 공통 목록에서 고릅니다 (골프용품 + 생활·이동 용품).
-- =====================================================================

alter table public.market_products add column if not exists apps text[] not null default '{buddyplanner}';

do $$ begin
  alter table public.market_products drop constraint if exists market_products_category_check;
  alter table public.market_products drop constraint if exists market_products_apps_check;
  alter table public.market_products add constraint market_products_category_check check (category in
    ('ball', 'wear', 'glove_cap', 'shoes', 'club_bag', 'car', 'travel', 'charge', 'office', 'life', 'etc'));
  alter table public.market_products add constraint market_products_apps_check check (
    cardinality(apps) >= 1 and apps <@ array['buddyplanner', 'myplanner', 'managerplanner']::text[]);
end $$;
create index if not exists market_products_apps_idx on public.market_products using gin (apps);

create or replace function public.market_admin_list()
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public._market_admin_check();
  return coalesce((
    select json_agg(json_build_object(
      'id', m.id, 'kind', m.kind, 'category', m.category, 'brand', m.brand, 'title', m.title,
      'image_url', m.image_url, 'link', m.link, 'price', m.price, 'list_price', m.list_price,
      'badge', m.badge, 'sort', m.sort, 'active', m.active,
      'ref_price', m.ref_price, 'ref_price_at', m.ref_price_at, 'rocket', m.rocket, 'apps', m.apps) order by m.sort, m.id)
    from public.market_products m
  ), '[]'::json);
end;
$$;
revoke all on function public.market_admin_list() from public, anon;
grant execute on function public.market_admin_list() to authenticated;

drop function if exists public.market_admin_save(bigint, text, text, text, text, text);
drop function if exists public.market_admin_save(bigint, text, text, text, text, text, integer, boolean);
create or replace function public.market_admin_save(
  p_id bigint, p_category text, p_title text, p_link text, p_image text default null, p_brand text default null,
  p_ref_price integer default null, p_rocket boolean default false, p_apps text[] default '{buddyplanner}')
returns json language plpgsql security definer set search_path = '' as $$
declare new_id bigint; nxt int; old_price int; today date := (now() at time zone 'Asia/Seoul')::date;
begin
  perform public._market_admin_check();
  p_title := btrim(coalesce(p_title, ''));
  p_link  := btrim(coalesce(p_link, ''));
  p_image := nullif(btrim(coalesce(p_image, '')), '');
  p_brand := left(nullif(btrim(coalesce(p_brand, '')), ''), 30);
  p_apps  := coalesce(p_apps, '{buddyplanner}');
  if char_length(p_title) < 1 or char_length(p_title) > 100 then return json_build_object('ok', false, 'error', 'invalid_title'); end if;
  if p_category not in ('ball', 'wear', 'glove_cap', 'shoes', 'club_bag', 'car', 'travel', 'charge', 'office', 'life', 'etc') then
    return json_build_object('ok', false, 'error', 'invalid_category');
  end if;
  if cardinality(p_apps) < 1 or not (p_apps <@ array['buddyplanner', 'myplanner', 'managerplanner']::text[]) then
    return json_build_object('ok', false, 'error', 'invalid_apps');
  end if;
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
    insert into public.market_products (kind, category, brand, title, image_url, link, sort, ref_price, ref_price_at, rocket, apps)
      values ('affiliate', p_category, p_brand, p_title, p_image, p_link, nxt,
              p_ref_price, case when p_ref_price is not null then today end, coalesce(p_rocket, false), p_apps)
      returning id into new_id;
    return json_build_object('ok', true, 'id', new_id);
  end if;
  select ref_price into old_price from public.market_products where id = p_id;
  update public.market_products
    set category = p_category, title = p_title, link = p_link, image_url = p_image, brand = p_brand,
        ref_price = p_ref_price,
        ref_price_at = case when p_ref_price is null then null
                            when p_ref_price is distinct from old_price then today
                            else coalesce(ref_price_at, today) end,
        rocket = coalesce(p_rocket, false),
        apps = p_apps
    where id = p_id;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  return json_build_object('ok', true, 'id', p_id);
end;
$$;
revoke all on function public.market_admin_save(bigint, text, text, text, text, text, integer, boolean, text[]) from public, anon;
grant execute on function public.market_admin_save(bigint, text, text, text, text, text, integer, boolean, text[]) to authenticated;
