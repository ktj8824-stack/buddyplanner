-- 고음질 음성 받아쓰기(voice-stt) 비용 제한 (2026-11-16)
--  · 1인 하루 횟수: ai_usage 의 'voice' 종류
--  · 서비스 전체 월 분량: voice_month (서버 함수만 사용)
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind = any (array['chat','image','food','place','guide','voice']));

create table if not exists public.voice_month (
  month text primary key,
  seconds integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.voice_month enable row level security;
revoke all on public.voice_month from anon, authenticated;

create or replace function public.voice_month_add(p_sec integer, p_cap_sec integer)
returns boolean language plpgsql security definer set search_path to '' as $$
declare m text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM'); n integer;
begin
  insert into public.voice_month (month, seconds) values (m, greatest(p_sec,0))
  on conflict (month) do update set seconds = public.voice_month.seconds + greatest(p_sec,0), updated_at = now()
  where public.voice_month.seconds < p_cap_sec
  returning seconds into n;
  return n is not null;
end; $$;
revoke all on function public.voice_month_add(integer, integer) from public, anon, authenticated;
