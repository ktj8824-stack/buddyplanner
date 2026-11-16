-- 단체 일정 사진 명단 읽기(group-import) 하루 횟수: ai_usage 'import' (2026-11-16)
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind = any (array['chat','image','food','place','guide','voice','import']));
