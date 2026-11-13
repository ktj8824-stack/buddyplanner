-- 골프장 공략 카드: 한 번 만든 골프장 정보를 모든 사용자가 다시 씀 (웹 검색 비용 절약)
-- 파·거리 같은 사실 정보와 요약만 저장 (블로그 글 원문·카카오 지도 결과는 저장하지 않음)
create table if not exists public.course_guides (
  key        text primary key,                 -- '골프장이름|코스' (공백·CC 표기 제거)
  aliases    text[] not null default '{}',     -- 다른 이름으로 물어본 것들
  data       jsonb  not null,
  built_by   uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_guides_aliases_idx on public.course_guides using gin (aliases);
alter table public.course_guides enable row level security;
-- 정책 없음: 앱은 course-guide 서버 함수(service_role)로만 읽고 씀
