-- =====================================================================
-- 버디플래너 데이터 동기화 — Supabase 초기 설정
--
-- 사용법: Supabase 대시보드 > SQL Editor > New query 에 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전하도록 작성했습니다.
-- =====================================================================

-- 1) 사용자 데이터 테이블 ----------------------------------------------
-- 앱이 기기에 저장하는 항목(일정, 기록, 설정, 포인트 등)을 키 단위로 보관합니다.
create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null check (char_length(key) between 1 and 64),
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

comment on table public.user_data is '버디플래너 사용자별 동기화 데이터 (키 = 앱 저장 항목 이름)';

-- 2) 행 수준 보안(RLS): 본인 데이터만 읽고 쓸 수 있음 --------------------
alter table public.user_data enable row level security;

drop policy if exists "user_data_select_own" on public.user_data;
drop policy if exists "user_data_insert_own" on public.user_data;
drop policy if exists "user_data_update_own" on public.user_data;
drop policy if exists "user_data_delete_own" on public.user_data;

create policy "user_data_select_own" on public.user_data
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_data_insert_own" on public.user_data
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_data_update_own" on public.user_data
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_data_delete_own" on public.user_data
  for delete to authenticated using (user_id = (select auth.uid()));

-- 3) 사진 저장소: 비공개 버킷, 본인 폴더(<사용자 ID>/...)만 접근 ---------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos_select_own" on storage.objects;
drop policy if exists "photos_insert_own" on storage.objects;
drop policy if exists "photos_update_own" on storage.objects;
drop policy if exists "photos_delete_own" on storage.objects;

create policy "photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 4) 회원 탈퇴: 본인 데이터와 계정 삭제 ----------------------------------
-- 사진 파일은 앱이 저장소 API로 먼저 지운 뒤 이 함수를 호출합니다.
-- (user_data는 auth.users 삭제 시 on delete cascade로 함께 삭제됨)
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
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
