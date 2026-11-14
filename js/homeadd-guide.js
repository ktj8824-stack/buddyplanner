/* =========================================
   BuddyPlanner — 아이폰 사파리 '홈 화면에 추가' 그림 안내 (한 화면에 다 보이게)
   눌러야 할 곳만 작게 잘라 그린 그림 + 빨간 표시 + 번호, 글은 한두 단어
     1 ≡  →  2 공유  →  3 더 보기  →  4 홈 화면에 추가  →  5 추가
   ========================================= */

const HomeAddGuide = {
  RED: '#ff3b30',

  _svg(body) {
    return `<svg viewBox="0 0 160 96" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, 'Apple SD Gothic Neo', sans-serif">${body}</svg>`;
  },
  _ring(x, y, w, h, r) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${this.RED}" stroke-width="3.5"/>`;
  },

  /** 1. 사파리 아래 주소창 옆 ≡ */
  s1() {
    return this._svg(`
      <rect x="10" y="26" width="170" height="44" rx="22" fill="#fff" stroke="#d9dce2"/>
      <g stroke="#222" stroke-width="2.6" stroke-linecap="round"><path d="M30 40h18M30 48h18M30 56h12"/></g>
      <text x="62" y="54" font-size="14" fill="#555">buddypl…</text>
      <circle cx="39" cy="48" r="19" fill="none" stroke="${this.RED}" stroke-width="3.5"/>`);
  },
  /** 2. 공유 */
  s2() {
    return this._svg(`
      <rect x="8" y="14" width="144" height="76" rx="14" fill="#fff" stroke="#e1e3e8"/>
      <text x="24" y="44" font-size="16" font-weight="700" fill="#222">공유</text>
      <g fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M125 34h-3v14h18v-14h-3"/><path d="M131 42v-14M127 32l4-4 4 4"/></g>
      <path d="M18 60h124" stroke="#eee"/><text x="24" y="80" font-size="13" fill="#bbb">책갈피 추가</text>
      ${this._ring(12, 18, 136, 38, 10)}`);
  },
  /** 3. 더 보기 */
  s3() {
    return this._svg(`
      <rect x="2" y="22" width="62" height="54" rx="12" fill="#fff" stroke="#e8e8ec"/><text x="33" y="66" text-anchor="middle" font-size="12" fill="#bbb">복사</text>
      <rect x="78" y="22" width="74" height="54" rx="12" fill="#fff" stroke="#e1e3e8"/>
      <g fill="#222"><circle cx="103" cy="40" r="2.6"/><circle cx="115" cy="40" r="2.6"/><circle cx="127" cy="40" r="2.6"/></g>
      <text x="115" y="64" text-anchor="middle" font-size="13" font-weight="700" fill="#222">더 보기</text>
      ${this._ring(74, 18, 82, 62, 14)}`);
  },
  /** 4. 홈 화면에 추가 (목록을 조금 내리면) */
  s4() {
    return this._svg(`
      <rect x="4" y="8" width="152" height="84" rx="14" fill="#fff" stroke="#e1e3e8"/>
      <text x="16" y="26" font-size="12" fill="#bbb">책갈피 추가</text><path d="M12 34h136" stroke="#eee"/>
      <text x="16" y="56" font-size="14" font-weight="700" fill="#222">홈 화면에 추가</text>
      <rect x="126" y="42" width="18" height="18" rx="4" fill="none" stroke="#222" stroke-width="2"/><path d="M135 46v10M130 51h10" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 70h136" stroke="#eee"/><text x="16" y="86" font-size="12" fill="#bbb">마크업</text>
      ${this._ring(8, 36, 144, 32, 9)}`);
  },
  /** 5. 오른쪽 위 추가 */
  s5() {
    return this._svg(`
      <rect x="4" y="26" width="152" height="44" rx="12" fill="#fff" stroke="#e1e3e8"/>
      <text x="14" y="53" font-size="12" fill="#bbb">홈 화면에 추가</text>
      <text x="138" y="53" text-anchor="end" font-size="16" font-weight="800" fill="#007aff">추가</text>
      ${this._ring(98, 30, 52, 36, 10)}`);
  },
  /** 끝: 생기는 아이콘 */
  done(label, icon) {
    return this._svg(`
      <rect width="160" height="96" rx="12" fill="#1f2a44"/>
      <image href="${icon}" x="54" y="8" width="52" height="52"/>
      <text x="80" y="80" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">${U.esc(label)}</text>`);
  },

  /** 안내 창 아이폰 탭: 2칸 × 3줄, 한 화면에 */
  html(s, label, icon) {
    const tile = (n, txt, svg) => `<div class="hg-tile"><span class="hg-n${n === '✓' ? ' ok' : ''}">${n}</span>${svg}<b>${txt}</b></div>`;
    return `<div class="hg">
      ${tile(1, '≡ 누르기', this.s1())}
      ${tile(2, '공유', this.s2())}
      ${tile(3, '더 보기', this.s3())}
      ${tile(4, '내려서 홈 화면에 추가', this.s4())}
      ${tile(5, '추가', this.s5())}
      ${tile('✓', '완성!', this.done(label, icon))}
    </div>`;
  }
};
