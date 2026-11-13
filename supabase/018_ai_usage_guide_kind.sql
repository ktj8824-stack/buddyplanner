-- 골프장 공략 카드(course-guide 서버 함수)의 하루 사용량 기록 'guide' 허용
--  · course-guide 가 ai_try_use(p_kind 'guide')를 부르는데 ai_usage.kind 검사에 'guide'가 없어서
--    새 골프장 카드를 만들 때마다 '잠시 후 다시 시도해 주세요'(usage_check_failed)만 나오던 문제
--  · 지금 서버에 있는 값(chat·image·food·place)은 그대로 두고 guide 만 더함
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('chat', 'image', 'food', 'place', 'guide'));
