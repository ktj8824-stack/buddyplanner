-- 공략 카드 하루 횟수 기록이 'guide' 종류를 거부해 모든 새 카드가 실패하던 문제 (2026-11-16)
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind = any (array['chat','image','food','place','guide']));
