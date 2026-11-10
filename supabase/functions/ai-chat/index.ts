// =====================================================================
// BuddyPlanner AI 비서 — Supabase Edge Function (ai-chat)
//
// 앱 → 이 함수 → Claude API. API 키는 서버 비밀값으로만 보관합니다.
//  1) 로그인 사용자 확인  2) PRO 구독 확인(RevenueCat)  3) 하루 사용 한도 확인
//  4) Claude 도구 사용 루프: 맛집 검색은 서버에서 실행, 일정·스코어·식사 등록은
//     앱에 '확인 카드'로 넘겨 사용자가 직접 승인하도록 합니다.
//
// 필요한 비밀값 (supabase secrets set ...):
//   ANTHROPIC_API_KEY, KAKAO_REST_API_KEY, REVENUECAT_SECRET_KEY
// 선택: AI_ALLOW_ALL_USERS=true (RevenueCat 연결 전 테스트용, 출시 전 반드시 삭제)
//       PRO_PAY_TEST_OK=true (웹 테스트 결제로 산 PRO도 인정, 출시 전 삭제)
//       AI_DAILY_CHAT_LIMIT (기본 60), AI_DAILY_IMAGE_LIMIT (기본 15)
// 자동 제공: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// =====================================================================

import { resolveCourse, searchCandidates, groupByRule, placeKey, publicPlace } from '../_shared/food.ts';

type Env = Record<string, string | undefined>;
type Json = any;

export const CHAT_MODEL = 'claude-haiku-5-5';    // 일반 대화: 빠르고 저렴
const VISION_MODEL = 'claude-sonnet-5-5'; // 스코어카드 사진 인식: 정확도 우선
const MAX_TOOL_ROUNDS = 4;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Json): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

// ── 도구 정의 ──────────────────────────────────────────────────────────
export const TOOLS = [
  {
    name: 'search_restaurants',
    description: '골프장 주변의 실제 식당을 카카오 장소 검색으로 찾습니다. 맛집을 추천할 때는 반드시 이 도구 결과에 있는 식당만 추천하세요. 결과에는 BuddyPlanner 회원 평균 별점(buddy_rating)이 있을 수 있습니다.',
    input_schema: {
      type: 'object',
      properties: {
        course_name: { type: 'string', description: '골프장 이름 (예: 남서울 CC)' },
        near_lat: { type: 'number', description: '알고 있다면 골프장 위도' },
        near_lng: { type: 'number', description: '알고 있다면 골프장 경도' },
        keyword: { type: 'string', description: '음식 종류나 키워드 (예: 해장국, 한우, 장어). 없으면 생략' },
        timing: { type: 'string', enum: ['before', 'after', 'any'], description: 'before=라운딩 전 식사, after=라운딩 후 식사' },
      },
      required: ['course_name'],
    },
  },
  {
    name: 'propose_schedule',
    description: '새 라운딩 일정 등록을 제안합니다. 사용자 화면에 확인 카드가 뜨고, 사용자가 버튼을 눌러야 일정 등록 화면이 채워진 채로 열립니다.',
    input_schema: {
      type: 'object',
      properties: {
        course_name: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        tee_off: { type: 'string', description: 'HH:MM (24시간)' },
        companions_count: { type: 'integer', description: '본인 제외 동반자 수 (모르면 생략)' },
        memo: { type: 'string' },
        allow_duplicate: { type: 'boolean', description: '같은 날짜·같은 골프장 일정이 이미 있는데도 사용자가 하나 더 만들겠다고 분명히 말한 경우만 true' },
      },
      required: ['course_name', 'date', 'tee_off'],
    },
  },
  {
    name: 'propose_score_record',
    description: '라운딩 스코어 기록 저장을 제안합니다. 스코어카드 사진이 있으면 사진에서 읽은 값을 넣으세요. 사용자가 확인 카드에서 승인해야 저장됩니다.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        course_name: { type: 'string' },
        total_score: { type: 'integer', description: '총 타수' },
        holes: { type: 'array', items: { type: 'integer' }, description: '1번~18번 홀 타수 (읽을 수 있을 때만)' },
        putts_total: { type: 'integer' },
        memo: { type: 'string', description: '한 줄 라운딩 메모' },
      },
      required: ['date', 'course_name', 'total_score'],
    },
  },
  {
    name: 'propose_update',
    description: '이미 있는 일정의 날짜·티오프 변경이나 취소(삭제)를 제안합니다. 새 일정을 만들지 않습니다. 사용자가 확인 카드에서 승인해야 바뀌고, 알람도 새 시각으로 다시 맞춰집니다.',
    input_schema: {
      type: 'object',
      properties: {
        schedule_index: { type: 'integer', description: '사용자 정보의 다가오는 일정 목록에 있는 idx' },
        new_date: { type: 'string', description: '바뀐 날짜 YYYY-MM-DD (날짜가 바뀔 때만)' },
        new_tee_off: { type: 'string', description: '바뀐 티오프 HH:MM 24시간 (시간이 바뀔 때만)' },
        cancel: { type: 'boolean', description: '라운딩이 취소돼 일정을 지울 때 true' },
      },
      required: ['schedule_index'],
    },
  },
  {
    name: 'propose_meal',
    description: '이미 등록된 일정에 식사 장소를 넣도록 제안합니다. restaurant_id는 search_restaurants 결과의 id여야 합니다.',
    input_schema: {
      type: 'object',
      properties: {
        schedule_index: { type: 'integer', description: '사용자 컨텍스트의 upcoming 목록에 있는 idx' },
        timing: { type: 'string', enum: ['before', 'after'] },
        restaurant_id: { type: 'string' },
      },
      required: ['schedule_index', 'timing', 'restaurant_id'],
    },
  },
];

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const HM = /^([01]\d|2[0-3]):[0-5]\d$/, YMD = /^20\d\d-\d\d-\d\d$/;

/** 한국 시각 기준 오늘(YYYY-MM-DD)·지금(HH:MM) */
function kstNow(): { today: string; now: string } {
  const iso = new Date(Date.now() + 9 * 3600000).toISOString();
  return { today: iso.slice(0, 10), now: iso.slice(11, 16) };
}

/** 앱이 보낸 정보 정리: 오늘·지금은 앱 값(형식이 맞을 때) 아니면 서버 한국 시각, 목록 크기 제한 */
export function normalizeCtx(c0: Json): Json {
  const c = c0 && typeof c0 === 'object' ? c0 : {};
  const k = kstNow();
  const t = String(c.today || '').slice(0, 10);
  return {
    ...c,
    today: YMD.test(t) ? t : k.today,
    now: HM.test(String(c.now || '')) ? String(c.now) : k.now,
    userName: String(c.userName || '').slice(0, 30),
    upcoming: Array.isArray(c.upcoming) ? c.upcoming.slice(0, 10) : [],
  };
}

/** 달력에 있는 날짜인지 (2026-11-31 같은 날 거르기) */
function realDate(v: string): boolean {
  if (!YMD.test(v || '')) return false;
  const [y, m, d] = v.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** '2026-11-08' → '11월 8일(일)' */
function koDate(v: string): string {
  if (!realDate(v)) return v;
  const [y, m, d] = v.split('-').map(Number);
  return `${m}월 ${d}일(${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}

/**
 * 오늘부터 3주 날짜표 — AI가 요일·날짜 계산을 틀리지 않도록 서버가 미리 계산 (마이플래너와 같음)
 * 주는 월요일~일요일. "이번 주 X요일" = 오늘이 속한 주, "다음 주 X요일" = 그다음 주.
 */
export function calendarTable(today: string): string {
  if (!YMD.test(today || '')) return '';
  const [y, m, d] = today.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const mondayOffset = (base.getUTCDay() + 6) % 7;
  const rel: Record<number, string> = { 0: '오늘', 1: '내일', 2: '모레', 3: '글피' };
  const lines: string[] = [];
  for (let i = 0; i < 21; i++) {
    const t = new Date(base.getTime() + i * 86400000);
    const ymd = t.toISOString().slice(0, 10);
    const w = DOW[t.getUTCDay()];
    const week = Math.floor((i + mondayOffset) / 7);
    const wk = ['이번 주', '다음 주', '다다음 주'][week];   // 오늘이 월요일이 아니면 21일째 쪽은 그다음 주라 이름 없음
    const tags = [rel[i], wk ? wk + ' ' + w + '요일' : null].filter(Boolean);
    if (week === 0 && (w === '토' || w === '일')) tags.push('이번 주말');
    if (week === 1 && (w === '토' || w === '일')) tags.push('다음 주말');
    lines.push(`${ymd}(${w}) ${koDate(ymd)} ${tags.join(', ')}`);
  }
  return lines.join('\n');
}

/** 다가오는 일정에 '오늘/내일/N일 뒤'와 한국식 날짜를 붙임 */
function withWhen(ctx: Json): Json[] {
  const list: Json[] = Array.isArray(ctx.upcoming) ? ctx.upcoming : [];
  const t0 = Date.parse(String(ctx.today || '') + 'T00:00:00Z');
  return list.map((u) => {
    const ymd = String(u && u.date || '').slice(0, 10);
    const dd = Date.parse(ymd + 'T00:00:00Z');
    if (isNaN(t0) || isNaN(dd)) return u;
    const n = Math.round((dd - t0) / 86400000);
    const when = n === 0 ? '오늘' : n === 1 ? '내일' : n === 2 ? '모레' : n > 0 ? `${n}일 뒤` : `${-n}일 전`;
    return { ...u, date: ymd, date_ko: koDate(ymd), when };
  });
}

/** 바뀌지 않는 규칙 (프롬프트 캐시 대상) */
export function systemRules(): string {
  return `당신은 골프 일정 앱 'BuddyPlanner'의 AI 비서 '버디'입니다. 한국어로 친근하고 간결하게 답하세요. 사용자는 40~60대가 많습니다.

[역할과 범위]
- 골프에 관한 것이면 무엇이든 자유롭게 대화합니다: 라운딩 일정, 스코어, 골프장, 날씨, 준비물, 룰·에티켓, 스윙 고민, 골프장 주변 맛집.
- 골프와 무관한 요청(코딩, 숙제, 정치, 투자 등)은 "저는 골프 비서라 골프 관련 이야기를 도와드릴게요"처럼 짧고 정중하게 돌려 말합니다.
- 모바일 화면이므로 답변은 짧게(보통 3~6문장). 목록은 간단히. 마크다운은 **굵게**와 줄바꿈 정도만 씁니다.
- 답은 한국어로만 씁니다. 한자·영어 메모·괄호 속 혼잣말([Note: …] 같은 것)을 절대 쓰지 않습니다.

[날짜·시각]
- 날짜는 직접 계산하지 말고 아래 [날짜표]에서 그대로 찾아 씁니다. 도구에는 YYYY-MM-DD를 넣습니다.
- 답에서 날짜는 "11월 8일(일)"처럼 말합니다. "2026-11-08" 같은 표기는 답에 쓰지 않습니다. 다가오는 일정은 목록의 when(오늘·내일·N일 뒤)과 date_ko를 그대로 씁니다.
- 시각은 답에서 "오전 7시 40분"처럼 오전/오후를 붙여 말하고, 도구에는 24시간 HH:MM을 넣습니다. "반"은 30분.
- 티오프 시각에 오전/오후를 말하지 않으면 7~11시는 오전, 12시는 낮 12시, 1~4시는 오후로 봅니다. 5~6시는 새벽인지 저녁인지 물어봅니다. 그 밖에도 애매하면 물어봅니다.
- 지난 날짜(어제, 지난주 등)나 오늘 이미 지난 시각으로는 일정을 만들지 않습니다. "이미 지난 날짜라 등록할 수 없어요"라고 말하고, 지난 라운딩이면 스코어 기록을 도와드릴지 물어봅니다.
- 달력에 없는 날짜(11월 31일 등)를 말하면 날짜를 다시 물어봅니다.
- 음성 입력이라 글자가 틀릴 수 있습니다("레이크 사이드 씨씨"=레이크사이드CC, "티업"=티오프). 뜻이 분명하면 바로잡아 쓰고, 애매하면 물어봅니다.

[도구 사용 원칙]
- 맛집 추천은 반드시 search_restaurants 결과에 있는 식당만 언급합니다. 결과에 없는 식당 이름, 평점, 리뷰, 영업시간을 지어내지 마세요. buddy_rating이 있으면 "버디 회원 평균 ★4.3(12명)"처럼 소개하고, 없으면 평점을 말하지 않습니다.
- 라운딩 전 식사는 새벽 영업 가능성이 높은 해장국·국밥·백반을, 라운딩 후에는 고기·한정식·장어 등을 우선 고려합니다. 영업시간은 확인할 수 없으니 방문 전 확인을 권하세요.
- 일정 등록·변경·스코어 저장·식사 추가는 propose_* 도구로 '제안'만 합니다. 저장은 사용자가 카드의 버튼을 눌러야 완료되므로 "등록했어요"가 아니라 "아래 카드에서 확인해 주세요"라고 말합니다.
- 도구를 쓰지 않았으면 "카드", "아래에서 확인" 같은 말을 하지 않습니다. 등록·변경할 게 있으면 말로만 하지 말고 반드시 도구로 제안합니다.
- 이미 있는 일정의 시간·날짜 변경("내일 티오프 7시 40분으로 바뀌었어")이나 취소("토요일 라운딩 취소됐어")는 절대 propose_schedule로 새 일정을 만들지 않습니다. 다가오는 일정 목록에서 맞는 일정의 idx로 propose_update를 씁니다(시간이면 new_tee_off, 날짜면 new_date, 취소면 cancel:true). 어느 일정인지 애매하면 물어봅니다.
- 같은 날짜·같은 골프장 일정이 목록에 이미 있으면 새로 만들지 말고 "이미 ○월 ○일 ○○ 일정이 있어요. 시간을 바꿀까요?"라고 묻습니다. 사용자가 하나 더 만들겠다고 분명히 말하면 allow_duplicate:true로 제안합니다.
- "○일 라운딩 끝나고 여기 가게 일정에 넣어줘"처럼 식당을 일정에 넣어 달라고 하면, 다가오는 일정 목록에서 날짜·골프장이 맞는 일정의 idx로 propose_meal을 씁니다. 라운딩 전 식사면 timing=before, 끝나고 가면 after입니다. 그 날짜에 일정이 없으면 없다고 말하고 일정 등록(propose_schedule)부터 제안합니다. 식당은 이번 대화에서 search_restaurants로 찾은 곳이어야 하니, 아직 검색하지 않았다면 먼저 검색합니다.
- 필수 정보(골프장, 날짜, 티오프 시간)가 빠지면 추측하지 말고 짧게 하나만 물어봅니다.
- 도구 결과가 오류(is_error)로 돌아오면 그 내용을 바탕으로 사용자에게 짧게 다시 묻거나 바르게 고쳐 다시 제안합니다. 오류 내용을 그대로 읽어 주지 않습니다.
- 스코어는 오늘이나 지난 날짜만 기록합니다. 스코어카드 사진: 골프장 이름, 날짜, 사용자 본인의 홀별 타수와 합계를 읽어 propose_score_record로 제안합니다. 동반자 줄이 여러 개면 사용자 정보의 닉네임과 가장 가까운 줄을 쓰고, 애매하면 어느 줄인지 물어봅니다. 잘 안 보이는 값은 지어내지 말고 확인을 요청합니다.

[예시] (실제로는 아래 날짜표의 날짜를 씁니다)
- "내일 7시 반 레이크사이드" → propose_schedule {course_name:"레이크사이드CC", date:내일, tee_off:"07:30"}
- (목록에 내일 남서울CC 일정 idx 3이 있을 때) "내일 티오프 7시 40분으로 바뀌었어" → propose_update {schedule_index:3, new_tee_off:"07:40"}
- (목록에 토요일 일정 idx 5가 있을 때) "토요일 라운딩 취소됐어" → propose_update {schedule_index:5, cancel:true}
- "어제 8시 남서울 라운딩 등록해 줘" → 도구 없이 "어제는 이미 지난 날짜라 일정으로 등록할 수 없어요. 그날 스코어를 기록해 드릴까요?"
- "토요일 라운딩 있어" → 골프장과 티오프를 모르므로 먼저 "어느 골프장인가요?"라고 하나만 물음 (답을 들은 뒤 티오프 시각을 물음)`;
}

/** 사용자마다·날마다 바뀌는 부분 (캐시하지 않음) */
export function systemContext(ctx: Json): string {
  return `[사용자 정보]
- 지금: ${koDate(ctx.today)} ${ctx.now}
- 닉네임: ${ctx.userName || ''}
- 다가오는 일정: ${JSON.stringify(withWhen(ctx))}
- 스코어 요약: ${JSON.stringify(ctx.records || {})}

[날짜표] (오늘부터 3주, 주는 월~일)
${calendarTable(ctx.today)}`;
}

/** 평가·테스트용: 규칙 + 사용자 정보를 한 글로 */
export function systemPrompt(ctx: Json): string {
  return systemRules() + '\n\n' + systemContext(normalizeCtx(ctx));
}

/** Claude에 보낼 system: 규칙 블록에 캐시 표시 (tools 끝 + 규칙까지가 한 번에 캐시됨) */
function systemBlocks(ctx: Json): Json[] {
  return [
    { type: 'text', text: systemRules(), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: systemContext(ctx) },
  ];
}

/** tools 마지막 항목에 캐시 표시 */
const TOOLS_CACHED = TOOLS.map((t, i) => i === TOOLS.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t);

const HAN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
const NOTE = /[\[(]\s*note\b|^\s*note\s*:/im;
/** 사용자에게 보이면 안 되는 것: 한자, AI 내부 메모 */
export function hasLeak(t: string): boolean { return HAN.test(t) || NOTE.test(t); }
export function stripLeak(t: string): string { return t.split('\n').filter((l) => !hasLeak(l)).join('\n').trim(); }
/** 카드를 만들었다고 말하는지 */
export function claimsCard(t: string): boolean { return /카드/.test(t); }

/** 골프장 이름 비교용: 공백·CC·골프클럽 등을 떼고 비교 */
function courseKey(v: string): string {
  return String(v || '').toLowerCase().replace(/\s+/g, '')
    .replace(/(컨트리클럽|골프클럽|골프앤리조트|골프리조트|골프장|골프|country ?club|golf ?club|cc|gc)$/g, '');
}
function upcomingByIdx(ctx: Json, idx: Json): Json | null {
  return (ctx.upcoming || []).find((u: Json) => u && Number(u.idx) === Number(idx)) || null;
}

/** AI가 만든 제안이 앱에서 쓸 수 있는 형태인지 저장 전에 확인 (문제가 있으면 AI에게 돌려보내 다시 묻게 함) */
export function checkAction(name: string, input: Json, ctx0: Json): string | null {
  const ctx = normalizeCtx(ctx0);
  const today = ctx.today, now = ctx.now;
  if (name === 'propose_schedule') {
    if (!String(input.course_name || '').trim()) return '골프장 이름(course_name)이 필요합니다. 모르면 사용자에게 물어보세요';
    if (!realDate(input.date || '')) return 'date는 YYYY-MM-DD이고 달력에 있는 날짜여야 합니다. 날짜표에서 고르거나 사용자에게 다시 물어보세요';
    if (!HM.test(input.tee_off || '')) return 'tee_off는 HH:MM(24시간)이어야 합니다. 티오프 시각을 사용자에게 확인하세요';
    if (input.date < today) return `${koDate(input.date)}은 이미 지난 날짜라 일정으로 만들 수 없습니다. 사용자에게 그렇게 말하고, 지난 라운딩이면 스코어 기록을 도와드릴지 물어보세요`;
    if (input.date === today && input.tee_off <= now) return `오늘 ${input.tee_off}은 이미 지난 시각입니다(지금 ${now}). 날짜나 시각을 사용자에게 확인하세요`;
    if (!input.allow_duplicate) {
      const dup = (ctx.upcoming || []).find((u: Json) => String(u && u.date || '').slice(0, 10) === input.date && courseKey(u.course) && courseKey(u.course) === courseKey(input.course_name));
      if (dup) return `${koDate(input.date)} ${dup.course} 일정(idx ${dup.idx}, 티오프 ${dup.tee_off})이 이미 있습니다. 새로 만들지 말고 "이미 있어요. 시간을 바꿀까요?"라고 물어보세요. 시간 변경이면 propose_update를 쓰세요`;
    }
    if (input.companions_count != null && !(Number.isInteger(input.companions_count) && input.companions_count >= 0 && input.companions_count <= 20)) return 'companions_count는 0~20';
    return null;
  }
  if (name === 'propose_update') {
    const u = upcomingByIdx(ctx, input.schedule_index);
    if (!u) return '다가오는 일정 목록에 있는 idx를 schedule_index로 쓰세요. 맞는 일정이 없으면 사용자에게 어느 일정인지 물어보세요';
    if (!input.cancel && !input.new_date && !input.new_tee_off) return '무엇을 바꿀지(new_date, new_tee_off) 넣거나 취소면 cancel:true를 넣으세요';
    if (input.new_date && !realDate(input.new_date)) return 'new_date는 YYYY-MM-DD이고 달력에 있는 날짜여야 합니다';
    if (input.new_tee_off && !HM.test(input.new_tee_off)) return 'new_tee_off는 HH:MM(24시간)이어야 합니다';
    if (!input.cancel) {
      const d = input.new_date || String(u.date || '').slice(0, 10);
      const t = input.new_tee_off || String(u.tee_off || '');
      if (d < today) return '이미 지난 날짜로는 옮길 수 없습니다. 사용자에게 날짜를 다시 확인하세요';
      if (d === today && HM.test(t) && t <= now) return `오늘 ${t}은 이미 지난 시각입니다(지금 ${now}). 사용자에게 확인하세요`;
    }
    return null;
  }
  if (name === 'propose_score_record') {
    if (!realDate(input.date || '')) return 'date는 YYYY-MM-DD이고 달력에 있는 날짜여야 합니다';
    if (input.date > today) return '아직 오지 않은 날짜의 스코어는 기록할 수 없습니다. 날짜를 확인하세요';
    if (!String(input.course_name || '').trim()) return '골프장 이름(course_name)이 필요합니다';
    if (!(Number.isInteger(input.total_score) && input.total_score >= 18 && input.total_score <= 200)) return 'total_score는 18~200 사이 정수여야 합니다. 9홀이면 사용자에게 확인하세요';
    if (input.holes != null && !(Array.isArray(input.holes) && input.holes.length <= 18 && input.holes.every((h: Json) => Number.isInteger(h) && h >= 1 && h <= 15))) return 'holes는 홀별 타수(1~15) 목록이어야 합니다. 잘 안 보이면 빼고 제안하세요';
    return null;
  }
  if (name === 'propose_meal') {
    if (!upcomingByIdx(ctx, input.schedule_index)) return '다가오는 일정 목록에 있는 idx를 schedule_index로 쓰세요';
    if (input.timing !== 'before' && input.timing !== 'after') return "timing은 'before' 또는 'after'";
    return null;
  }
  return null;
}

// ── 외부 서비스 ────────────────────────────────────────────────────────
async function getUser(env: Env, authHeader: string, f: typeof fetch) {
  const res = await f(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: env.SUPABASE_ANON_KEY || '' },
  });
  if (!res.ok) return null;
  const u = await res.json();
  return u && u.id ? u : null;
}

async function isPro(env: Env, userId: string, f: typeof fetch): Promise<boolean> {
  if (env.AI_ALLOW_ALL_USERS === 'true') return true;
  // 웹 결제(토스) PRO — 실결제(live)만 인정, 테스트 결제는 PRO_PAY_TEST_OK=true일 때만
  try {
    for (const m of env.PRO_PAY_TEST_OK === 'true' ? ['live', 'test'] : ['live']) {
      const until = await rpc(env, 'bp_web_pro_until', { p_user: userId, p_mode: m }, f);
      if (until && Date.parse(String(until)) > Date.now()) return true;
    }
  } catch (_) { /* 웹 결제 확인 실패 → 앱 결제(RevenueCat)로 확인 */ }
  if (!env.REVENUECAT_SECRET_KEY) return false;
  const res = await f(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  const ent = data?.subscriber?.entitlements?.pro;
  if (!ent) return false;
  return !ent.expires_date || Date.parse(ent.expires_date) > Date.now();
}

async function rpc(env: Env, fn: string, body: Json, f: typeof fetch) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const res = await f(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`rpc ${fn} 실패 (${res.status})`);
  return res.json();
}

export { placeKey };

async function kakao(env: Env, path: string, params: Record<string, string>, f: typeof fetch) {
  const q = new URLSearchParams(params).toString();
  const res = await f(`https://dapi.kakao.com/v2/local/search/${path}.json?${q}`, {
    headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
  });
  if (!res.ok) throw new Error(`카카오 검색 실패 (${res.status})`);
  return (await res.json()).documents || [];
}

/** 골프장 이름 → 위치 (일정 제안 카드에 붙여서 앱이 따로 검색하지 않게 함) */
export async function findCourse(env: Env, name: string, f: typeof fetch) {
  let q = String(name || '').trim();
  if (!q) return null;
  if (!q.includes('골프') && !q.toLowerCase().includes('cc')) q += ' 골프장';
  const docs = await kakao(env, 'keyword', { query: q, size: '1' }, f);
  if (!docs.length) return null;
  const d = docs[0];
  return { id: String(d.id || ''), name: d.place_name, addr: d.road_address_name || d.address_name || '', lat: parseFloat(d.y), lng: parseFloat(d.x) };
}

async function searchRestaurants(env: Env, input: Json, f: typeof fetch) {
  // 추천 맛집 메뉴와 같은 후보·같은 순위를 씁니다 (_shared/food.ts)
  let lat = Number(input.near_lat), lng = Number(input.near_lng);
  const hasPos = isFinite(lat) && isFinite(lng) && !!lat && !!lng;
  const course = await resolveCourse(env, String(input.course_name || ''), hasPos ? lat : null, hasPos ? lng : null, f);
  if (!course) return { error: `'${input.course_name}' 골프장 위치를 찾지 못했어요.` };
  const cands = await searchCandidates(env, course.lat, course.lng, f);
  const groups = groupByRule(cands);
  const timing = input.timing === 'before' || input.timing === 'after' ? input.timing : null;
  const kw = String(input.keyword || '').replace(/\s+/g, '');
  let pool: Json[] = [];
  for (const t of timing ? [timing] : ['before', 'after']) for (const g of groups[t]) pool.push(...g.items.map((p: Json) => ({ ...p, timing: t, group: g.label })));
  if (kw) {
    const hit = pool.filter(p => (p.kakao_category + p.name + p.group).replace(/\s+/g, '').includes(kw));
    if (hit.length) pool = hit;
  }
  // 카테고리를 골고루: 각 카테고리 1순위부터 돌아가며
  const byGroup: Record<string, Json[]> = {};
  pool.forEach(p => { (byGroup[p.group] = byGroup[p.group] || []).push(p); });
  const picked: Json[] = [];
  for (let i = 0; picked.length < 8 && i < 5; i++) for (const g of Object.keys(byGroup)) if (byGroup[g][i] && picked.length < 8) picked.push(byGroup[g][i]);
  const list = picked.map((p: Json) => ({ ...publicPlace(p), timing: p.timing, group: p.group }));

  // 버디 회원 평균 별점 결합
  if (list.length) {
    try {
      const rows = await rpc(env, 'get_place_ratings', { keys: list.map((r: Json) => placeKey(r.name)) }, f);
      const map: Record<string, Json> = {};
      for (const r of rows || []) map[r.place_key] = r;
      for (const r of list as Json[]) {
        const m = map[placeKey(r.name)];
        if (m) { r.buddy_rating = Number(m.avg_rating); r.buddy_count = m.review_count; }
      }
    } catch (_) { /* 평점 조회 실패해도 검색 결과는 반환 */ }
  }
  return { course: course.name, course_lat: course.lat, course_lng: course.lng, restaurants: list };
}

async function callClaude(env: Env, body: Json, f: typeof fetch) {
  const res = await f('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Claude API 오류 (${res.status}) ${data?.error?.message || ''}`);
  return data;
}

// ── 요청 처리 ──────────────────────────────────────────────────────────
export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'login_required', message: '로그인이 필요해요.' });
  const user = await getUser(env, auth, f);
  if (!user) return json(401, { error: 'login_required', message: '로그인이 만료됐어요. 다시 로그인해 주세요.' });

  if (!(await isPro(env, user.id, f))) {
    return json(403, { error: 'pro_required', message: 'AI 비서는 PRO 회원 전용 기능이에요.' });
  }

  let body: Json;
  try { body = await req.json(); } catch (_) { return json(400, { error: 'bad_request' }); }
  // 화면이 '이 사용자 AI 써도 되나'만 확인 (횟수 차감 없음)
  if (body && body.probe === true) return json(200, { ok: true, allowed: true });
  const text = String(body.message || '').slice(0, 2000);
  const image = body.image && typeof body.image.data === 'string' ? body.image : null;
  if (!text && !image) return json(400, { error: 'empty_message' });
  if (image && image.data.length > 2_800_000) return json(413, { error: 'image_too_large', message: '사진 용량이 너무 커요.' });

  // 하루 사용 한도
  const chatLimit = parseInt(env.AI_DAILY_CHAT_LIMIT || '60', 10);
  const imageLimit = parseInt(env.AI_DAILY_IMAGE_LIMIT || '15', 10);
  try {
    if (!(await rpc(env, 'ai_try_use', { p_user: user.id, p_kind: 'chat', p_limit: chatLimit }, f))) {
      return json(429, { error: 'daily_limit', message: `오늘 AI 비서 사용 한도(${chatLimit}회)를 모두 썼어요. 내일 다시 이용해 주세요.` });
    }
    if (image && !(await rpc(env, 'ai_try_use', { p_user: user.id, p_kind: 'image', p_limit: imageLimit }, f))) {
      return json(429, { error: 'daily_limit', message: `오늘 사진 분석 한도(${imageLimit}장)를 모두 썼어요.` });
    }
  } catch (e) {
    return json(500, { error: 'usage_check_failed', message: '잠시 후 다시 시도해 주세요.' });
  }

  // 대화 기록(최근 12개, 텍스트만) + 이번 메시지
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  const messages: Json[] = [];
  for (const m of history) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = String(m.content || '').slice(0, 2000);
    if (!content) continue;
    if (messages.length && messages[messages.length - 1].role === role) {
      messages[messages.length - 1].content += '\n' + content;
    } else messages.push({ role, content });
  }
  while (messages.length && messages[0].role !== 'user') messages.shift();
  const userContent: Json[] = [];
  if (image) userContent.push({ type: 'image', source: { type: 'base64', media_type: image.media_type || 'image/jpeg', data: image.data } });
  userContent.push({ type: 'text', text: text || '이 스코어카드를 기록해 줘.' });
  if (messages.length && messages[messages.length - 1].role === 'user') messages.pop(); // 연속 user 방지
  messages.push({ role: 'user', content: userContent });

  const ctx = normalizeCtx(body.context);
  const actions: Json[] = [];
  const restaurants: Json[] = [];
  const knownRestaurants: Record<string, Json> = {};
  let reply = '';
  const system = systemBlocks(ctx);

  /** 도구 제안을 받을 때까지 몇 번 주고받기 (tool_choice none이면 글만) */
  const run = async (toolChoice?: Json) => {
    let said = '';
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const req: Json = { model: image ? VISION_MODEL : CHAT_MODEL, max_tokens: 1024, system, tools: TOOLS_CACHED, messages };
      if (toolChoice) req.tool_choice = toolChoice;
      const resp = await callClaude(env, req, f);

      const blocks: Json[] = resp.content || [];
      const texts = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      if (texts) said = texts;
      const uses = blocks.filter(b => b.type === 'tool_use');
      if (resp.stop_reason !== 'tool_use' || !uses.length) break;

      messages.push({ role: 'assistant', content: blocks });
      const results: Json[] = [];
      for (const u of uses) {
        let result: Json;
        let isError = false;
        try {
          if (u.name === 'search_restaurants') {
            result = await searchRestaurants(env, u.input || {}, f);
            for (const r of result.restaurants || []) {
              if (!knownRestaurants[r.id]) { knownRestaurants[r.id] = r; restaurants.push(r); }
            }
          } else {
            // 저장 전 서버 검사: 지난 날짜·없는 날짜·잘못된 시각·중복 등은 AI에게 돌려보내 다시 묻게 함
            const problem = checkAction(u.name, u.input || {}, ctx);
            if (problem) { isError = true; result = problem; }
            else if (u.name === 'propose_schedule' || u.name === 'propose_score_record') {
              const act: Json = { type: u.name.replace('propose_', ''), ...u.input };
              delete act.allow_duplicate;
              if (u.name === 'propose_schedule') {
                try { act.course = await findCourse(env, u.input?.course_name, f); } catch (_) { act.course = null; }
              }
              actions.push(act);
              result = { shown_to_user: true, note: '사용자 화면에 확인 카드를 표시했습니다. 사용자가 버튼을 눌러야 저장됩니다.' };
            } else if (u.name === 'propose_update') {
              const target = upcomingByIdx(ctx, u.input.schedule_index) || {};
              actions.push({
                type: 'update', schedule_index: u.input.schedule_index, aid: target.aid || null,
                course_name: target.course || '', old_date: String(target.date || '').slice(0, 10), old_tee_off: target.tee_off || '',
                new_date: u.input.new_date || null, new_tee_off: u.input.new_tee_off || null, cancel: !!u.input.cancel,
              });
              result = { shown_to_user: true, note: '확인 카드를 표시했습니다. 사용자가 버튼을 눌러야 바뀝니다.' };
            } else if (u.name === 'propose_meal') {
              const r = knownRestaurants[String(u.input?.restaurant_id)];
              if (!r) { isError = true; result = 'search_restaurants 결과에 있는 restaurant_id만 사용할 수 있습니다.'; }
              else {
                const target = upcomingByIdx(ctx, u.input.schedule_index) || {};
                actions.push({ type: 'meal', schedule_index: u.input.schedule_index, aid: target.aid || null, timing: u.input.timing, restaurant: r });
                result = { shown_to_user: true, note: '확인 카드를 표시했습니다.' };
              }
            } else { isError = true; result = '알 수 없는 도구'; }
          }
        } catch (e) {
          isError = true;
          result = (e as Error).message;
        }
        results.push({ type: 'tool_result', tool_use_id: u.id, content: typeof result === 'string' ? result : JSON.stringify(result), ...(isError ? { is_error: true } : {}) });
      }
      messages.push({ role: 'user', content: results });
    }
    return said;
  };
  /** 한 번 더 묻기: 방금 답을 대화에 넣고 고칠 점을 말해 줌 */
  const again = async (prev: string, fix: string, toolChoice?: Json) => {
    if (prev) messages.push({ role: 'assistant', content: prev });
    const last = messages[messages.length - 1];
    if (last && last.role === 'user') {
      last.content = Array.isArray(last.content) ? [...last.content, { type: 'text', text: fix }] : last.content + '\n' + fix;
    } else messages.push({ role: 'user', content: fix });
    return await run(toolChoice);
  };

  try {
    reply = await run();
    // 1) 도구 없이 "카드에서 확인해 주세요"라고 말한 경우 → 도구로 제안하라고 한 번 더
    if (!actions.length && !restaurants.length && claimsCard(reply)) {
      const r2 = await again(reply, '(앱 안내) 방금 확인 카드는 만들어지지 않았어요. 말로만 하지 말고 propose_* 도구로 제안하세요. 제안할 게 없으면 카드를 말하지 말고 짧게 답하세요.');
      reply = r2 || reply;
      if (!actions.length && claimsCard(reply)) reply = '다시 한 번 말씀해 주시겠어요?';
    }
    // 2) 한자나 내부 메모가 섞인 경우 → 한 번 다시 받고, 그래도 있으면 그 줄을 지움
    if (hasLeak(reply)) {
      const r2 = await again(reply, '(앱 안내) 방금 답에 한자나 메모가 섞였어요. 같은 내용을 한국어로만, 메모 없이 다시 써 주세요. 도구는 다시 쓰지 마세요.', { type: 'none' });
      if (r2) reply = r2;
      if (hasLeak(reply)) reply = stripLeak(reply);
    }
  } catch (e) {
    console.error(e);
    return json(502, { error: 'ai_failed', message: 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }

  return json(200, { reply: reply || (actions.length ? '아래 카드에서 확인해 주세요.' : '다시 한 번 말씀해 주시겠어요?'), actions, restaurants: restaurants.slice(0, 8) });
}

// Supabase Edge Runtime(Deno)에서 실행
declare const Deno: any;
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve((req: Request) => handle(req, Deno.env.toObject()));
}
