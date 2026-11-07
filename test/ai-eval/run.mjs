// AI 비서 말 알아듣기 평가 (실제 Claude 호출): ANTHROPIC_API_KEY=sk-... node --no-warnings --experimental-strip-types test/ai-eval/run.mjs
// (Node 23 이상이면 --experimental-strip-types 없이도 됨)
// 골퍼가 실제로 할 법한 말 32개로 서버 함수(ai-chat)와 같은 지시문·도구를 써서 첫 응답을 검사합니다.
// 일정 등록·날짜 표현·음성 오타·맛집·스코어·변경·중복·지난 날짜·없는 날짜·정보 부족·범위 밖.
// 프롬프트를 고친 뒤 점수가 떨어지지 않는지 확인하는 용도 (비용: 32번 호출, Haiku 기준 몇십 원)
// 마이플래너 test/ai-eval을 버디플래너용으로 옮긴 것.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 저장소 package.json이 CommonJS라 .ts를 그대로 import하면 모듈로 안 읽힘 → 임시 폴더에 .mts로 복사해서 불러옴
const fnDir = new URL('../../supabase/functions/', import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-ai-eval-'));
fs.mkdirSync(path.join(tmp, 'ai-chat')); fs.mkdirSync(path.join(tmp, '_shared'));
fs.writeFileSync(path.join(tmp, '_shared/food.mts'), fs.readFileSync(new URL('_shared/food.ts', fnDir)));
fs.writeFileSync(path.join(tmp, 'ai-chat/index.mts'), fs.readFileSync(new URL('ai-chat/index.ts', fnDir), 'utf8').replace("'../_shared/food.ts'", "'../_shared/food.mts'"));
const { TOOLS, CHAT_MODEL, systemPrompt, checkAction, hasLeak } = await import(path.join(tmp, 'ai-chat/index.mts'));

const key = process.env.ANTHROPIC_API_KEY;
if (!key) { console.error('ANTHROPIC_API_KEY 환경 변수가 필요해요'); process.exit(1); }
const { context: ctx, cases } = JSON.parse(fs.readFileSync(new URL('./cases.json', import.meta.url)));
const only = process.argv[2];   // 예: node ... run.mjs 변경  → 그 그룹만

function check(c, blocks) {
  const uses = blocks.filter(b => b.type === 'tool_use');
  const text = blocks.filter(b => b.type === 'text').map(b => b.text).join(' ');
  const bad = [];
  if (hasLeak(text)) bad.push('한자·내부 메모가 답에 섞임');
  if (/20\d\d-\d\d-\d\d/.test(text)) bad.push("답에 '2026-11-08' 같은 날짜 표기");
  if (c.noTool && uses.some(u => u.name === c.noTool)) bad.push(`${c.noTool}를 쓰면 안 됨`);
  if (c.tool === null) {
    // 일정 만들기·변경 도구를 쓰면 실패. 단 서버 검사에서 걸러지는 제안은 AI에게 되돌아가므로 '서버가 막음'으로 표시
    for (const u of uses.filter(u => u.name.startsWith('propose_'))) {
      const p = checkAction(u.name, u.input || {}, ctx);
      bad.push(p ? `도구를 씀 (${u.name}) → 서버가 막음: ${p.slice(0, 40)}…` : `도구를 쓰면 안 됨 (${u.name})`);
    }
    if (c.ask && !/[?？]|요\s*$/.test(text)) bad.push('되묻지 않음');
    if (c.refuse && !/골프/.test(text)) bad.push('범위 밖 요청을 돌리지 않음');
    for (const h of c.replyHas || []) if (!text.includes(h)) bad.push(`답에 '${h}' 없음`);
    if (c.nonEmpty && !text.trim() && !uses.length) bad.push('답이 비어 있음');
    if (c.noCardClaim && !uses.length && /카드/.test(text)) bad.push('도구 없이 카드를 말함');
    return { ok: !bad.length, bad, text };
  }
  const mine = uses.filter(u => u.name === c.tool);
  if (!mine.length) return { ok: false, bad: [`${c.tool} 안 씀`, ...bad], text };
  const a = mine[0].input || {};
  for (const [k, v] of Object.entries(c.expect || {})) {
    if (k.endsWith('~')) { const f = k.slice(0, -1); if (!String(a[f] || '').replace(/\s+/g, '').includes(v)) bad.push(`${f}=${a[f]} (기대: ${v} 포함)`); }
    else if (JSON.stringify(a[k]) !== JSON.stringify(v)) bad.push(`${k}=${JSON.stringify(a[k])} (기대: ${JSON.stringify(v)})`);
  }
  if (c.tool.startsWith('propose_')) {
    const problem = checkAction(c.tool, a, ctx);
    if (problem) bad.push('서버 검사 불통과: ' + problem);
  }
  return { ok: !bad.length, bad, text, input: a };
}

let pass = 0, total = 0;
const failedGroups = {};
for (const [n, c] of cases.entries()) {
  if (only && c.group !== only) continue;
  total++;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: CHAT_MODEL, max_tokens: 1024, system: systemPrompt(ctx), tools: TOOLS, messages: [{ role: 'user', content: c.say }] })
  });
  const data = await res.json();
  if (!res.ok) { console.error('API 오류', data); process.exit(1); }
  const r = check(c, data.content || []);
  if (r.ok) pass++; else failedGroups[c.group] = (failedGroups[c.group] || 0) + 1;
  console.log(`${r.ok ? '✓' : '✗'} ${String(n + 1).padStart(2)}. [${c.group}] ${c.say}`);
  if (!r.ok) console.log(`     ${r.bad.join(' / ')}${r.input ? '\n     → ' + JSON.stringify(r.input) : r.text ? '\n     → ' + r.text.slice(0, 140) : ''}`);
}
console.log(`\n${pass}/${total} 통과` + (Object.keys(failedGroups).length ? `  (틀린 그룹: ${Object.entries(failedGroups).map(([g, k]) => `${g} ${k}`).join(', ')})` : ''));
fs.rmSync(tmp, { recursive: true, force: true });
