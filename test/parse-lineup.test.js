/* 붙여넣기 명단(Group.parseLineup) 문장 시험 — 실행: node test/parse-lineup.test.js
   js/group.js 를 그대로 읽어 Group 객체만 꺼내 씀 (브라우저 없이) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'group.js'), 'utf8');
const ctx = { window: {}, document: {}, localStorage: { getItem() { return null; }, setItem() {} }, console };
vm.createContext(ctx);
vm.runInContext(src + '\n;this.Group = Group;', ctx);
const G = ctx.Group;

const show = t => G.parseLineup(t).map((tm, i) => `${i + 1}조 ${tm.tee || '--:--'}${tm.course ? ' ' + tm.course : ''}: ${tm.members.map(m => m.name + (m.phone ? '☎' : '')).join(',')}`);

const CASES = [
  ['11-17 실제 공지', `[11/22 남서울CC 정기모임 조편성]
일시: 11월 22일(토) 06:50 클럽하우스 로비 집결
1조 07:00 OUT 김영수 회장님, 박정민 총무, 이상훈, 최동욱
2조 07:07 IN 정우성 / 한지민 / 오세훈 / 강수진
3조 07:14 윤재호 서민아 백승호
※ 회비 15만원 당일 현장 납부
늦으시면 총무에게 연락 주세요~`, [
    '1조 07:00 OUT: 김영수,박정민,이상훈,최동욱',
    '2조 07:07 IN: 정우성,한지민,오세훈,강수진',
    '3조 07:14: 윤재호,서민아,백승호']],
  ['줄 끝 괄호 메모', `1조 07:00 김영수 박정민 이상훈 최동욱 (늦으면 연락 주세요)\n2조 07:07 정우성 한지민 오세훈 강수진`, [
    '1조 07:00: 김영수,박정민,이상훈,최동욱',
    '2조 07:07: 정우성,한지민,오세훈,강수진']],
  ['전각 괄호 메모', `1조 07:00 김영수 박정민 이상훈 최동욱（카트 2대）`, ['1조 07:00: 김영수,박정민,이상훈,최동욱']],
  ['괄호 속 한 단어 이름은 둠', `1조 07:00 김영수 박정민 이상훈 (최동욱)`, ['1조 07:00: 김영수,박정민,이상훈,최동욱']],
  ['1조: 꼴', `1조: 김영수, 박정민, 이상훈, 최동욱\n2조: 정우성, 한지민, 오세훈, 강수진`, [
    '1조 --:--: 김영수,박정민,이상훈,최동욱',
    '2조 --:--: 정우성,한지민,오세훈,강수진']],
  ['금액 줄 (원 뒤 띄어쓰기)', `회비 50,000원 (카트비 포함)\n1조 07:00 김영수 박정민 이상훈 최동욱`, ['1조 07:00: 김영수,박정민,이상훈,최동욱']],
  ['금액 줄 (원 뒤 괄호 바로)', `그린피 18만원(카트비 별도)\n1조 07:00 김영수 박정민 이상훈 최동욱`, ['1조 07:00: 김영수,박정민,이상훈,최동욱']],
  ['번호 명단 + 골프장 줄', `티업 07:00 남서울CC\n1. 김영수 010-1234-5678\n2. 박정민\n3. 이상훈\n4. 최동욱\n5. 정우성\n6. 한지민`, [
    '1조 07:00: 김영수☎,박정민,이상훈,최동욱,정우성,한지민'], '남서울CC'],   // 4명 넘는 조는 '조편성표에 넣기'(applyImport)에서 다음 조로 나뉨
  ['골프장 이름 여러 꼴', `레이크사이드컨트리클럽 07:30\n김영수 박정민 이상훈 최동욱`, ['1조 07:30: 김영수,박정민,이상훈,최동욱'], '레이크사이드컨트리클럽'],
  ['감사합니다 끝줄', `1조 07:00 김영수 박정민 이상훈 최동욱\n감사합니다`, ['1조 07:00: 김영수,박정민,이상훈,최동욱']],
  ['이름 + 전화', `김영수 010-1234-5678\n박정민 010 2222 3333`, ['1조 --:--: 김영수☎,박정민☎']],
];

let fail = 0;
CASES.forEach(([name, text, want, course]) => {
  const got = show(text);
  const hint = G.parseLineup(text).courseHint || '';
  let ok = JSON.stringify(got) === JSON.stringify(want);
  if (hint !== (course || '')) { ok = false; got.push(`(골프장 후보: '${hint}' / 기대 '${course || ''}')`); }
  if (!ok) fail++;
  console.log(`${ok ? '통과' : '실패'} · ${name}${ok ? '' : `\n   기대: ${JSON.stringify(want)}\n   결과: ${JSON.stringify(got)}`}`);
});
console.log(`\n${CASES.length - fail}/${CASES.length} 통과`);
process.exit(fail ? 1 : 0);
