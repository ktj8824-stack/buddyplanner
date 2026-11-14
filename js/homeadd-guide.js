/* =========================================
   BuddyPlanner — 아이폰 사파리 '홈 화면에 추가' 그림 안내
   글만으로는 따라 하기 어려워서, 아이폰 화면의 필요한 부분만 그림으로 그리고
   눌러야 할 곳에 빨간 표시 + 번호를 붙임 (iOS 26 사파리 순서)
     1 주소창 옆 ≡  →  2 공유  →  3 더 보기  →  4 홈 화면에 추가  →  5 추가
   ========================================= */

const HomeAddGuide = {
  RED: '#ff3b30',

  /** 빨간 번호 동그라미 */
  _badge(x, y, n) {
    return `<circle cx="${x}" cy="${y}" r="13" fill="${this.RED}"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">${n}</text>`;
  },
  /** 눌러야 할 곳 빨간 테두리 */
  _ring(x, y, w, h, r) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${this.RED}" stroke-width="3.5"/>`;
  },
  _svg(h, body) {
    return `<svg viewBox="0 0 320 ${h}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, 'Apple SD Gothic Neo', sans-serif" role="img">${body}</svg>`;
  },
  /** 공유 아이콘 □↑ */
  _shareIco(x, y, c) {
    return `<g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M${x - 6} ${y - 2}h-3v13h18v-13h-3"/><path d="M${x} ${y + 5}v-14M${x - 4} ${y - 5}l4-4 4 4"/></g>`;
  },

  /** 1. 사파리 아래쪽: 주소창 옆 ≡ */
  s1() {
    return this._svg(120, `
      <rect width="320" height="120" rx="14" fill="#eef0f4"/>
      <rect x="0" y="0" width="320" height="34" rx="14" fill="#fff" opacity=".7"/>
      <circle cx="38" cy="78" r="22" fill="#fff" stroke="#d9dce2"/>
      <path d="M42 70l-8 8 8 8" fill="none" stroke="#333" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="70" y="56" width="180" height="44" rx="22" fill="#fff" stroke="#d9dce2"/>
      <g stroke="#222" stroke-width="2.4" stroke-linecap="round"><path d="M88 70h16M88 78h16M88 86h11"/></g>
      <text x="122" y="84" font-size="14" fill="#222">buddyplanner.kr</text>
      <circle cx="282" cy="78" r="22" fill="#fff" stroke="#d9dce2"/>
      <rect x="273" y="69" width="14" height="14" rx="3" fill="none" stroke="#333" stroke-width="2"/><rect x="277" y="73" width="14" height="14" rx="3" fill="#fff" stroke="#333" stroke-width="2"/>
      <circle cx="96" cy="78" r="18" fill="none" stroke="${this.RED}" stroke-width="3.5"/>
      <path d="M96 40v14" stroke="${this.RED}" stroke-width="3" stroke-linecap="round"/><path d="M90 48l6 7 6-7" fill="none" stroke="${this.RED}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${this._badge(96, 24, 1)}
      <text x="118" y="29" font-size="13" font-weight="700" fill="${this.RED}">이 버튼 (··· 일 수도 있어요)</text>`);
  },

  /** 2. 메뉴에서 공유 */
  s2() {
    const row = (y, t, last) => `<text x="64" y="${y + 23}" font-size="15" fill="#222">${t}</text>${last ? '' : `<path d="M50 ${y + 36}h220" stroke="#e5e5ea"/>`}`;
    return this._svg(176, `
      <rect width="320" height="176" rx="14" fill="#eef0f4"/>
      <rect x="40" y="12" width="240" height="152" rx="18" fill="#fff" stroke="#e1e3e8"/>
      ${this._shareIco(254, 34, '#222')}
      <text x="64" y="41" font-size="15" font-weight="700" fill="#222">공유</text><path d="M50 54h220" stroke="#e5e5ea"/>
      ${row(54, '책갈피 추가')}${row(90, '즐겨찾기에 추가')}${row(126, '페이지에서 찾기', true)}
      ${this._ring(46, 16, 228, 36, 10)}
      ${this._badge(30, 34, 2)}`);
  },

  /** 3. 공유 창에서 더 보기 */
  s3() {
    const app = (x, c, t, fg) => `<rect x="${x - 22}" y="62" width="44" height="44" rx="12" fill="${c}"/><text x="${x}" y="90" text-anchor="middle" font-size="12" font-weight="800" fill="${fg || '#fff'}">${t}</text>`;
    const act = (x, label, ico) => `<rect x="${x}" y="122" width="88" height="48" rx="12" fill="#fff" stroke="#e1e3e8"/>${ico}<text x="${x + 44}" y="162" text-anchor="middle" font-size="12" fill="#222">${label}</text>`;
    return this._svg(184, `
      <rect width="320" height="184" rx="14" fill="#eef0f4"/>
      <rect x="10" y="10" width="300" height="40" rx="10" fill="#fff"/>
      <rect x="20" y="17" width="26" height="26" rx="6" fill="#16140f"/><text x="33" y="35" text-anchor="middle" font-size="13" font-weight="800" fill="#e8c77a">B</text>
      <text x="56" y="28" font-size="13" font-weight="700" fill="#222">BuddyPlanner</text><text x="56" y="43" font-size="11" fill="#888">buddyplanner.kr</text>
      ${app(50, '#34c759', '메시지')}${app(110, '#fee500', '카톡', '#3a1d1d')}${app(170, '#1a8cff', '메일')}${app(230, '#ffcc00', '메모', '#5a4500')}
      <text x="282" y="90" text-anchor="middle" font-size="18" fill="#999">›</text>
      ${act(14, '복사', `<rect x="51" y="130" width="12" height="14" rx="2" fill="none" stroke="#333" stroke-width="1.8"/>`)}
      ${act(116, '읽기 목록', `<circle cx="160" cy="138" r="8" fill="none" stroke="#333" stroke-width="1.8"/>`)}
      ${act(218, '더 보기', `<g fill="#333"><circle cx="252" cy="138" r="2.4"/><circle cx="262" cy="138" r="2.4"/><circle cx="272" cy="138" r="2.4"/></g>`)}
      ${this._ring(214, 118, 96, 56, 14)}
      ${this._badge(206, 112, 3)}`);
  },

  /** 4. 조금 내려서 홈 화면에 추가 */
  s4() {
    const row = (y, t, ico, last) => `<text x="34" y="${y + 24}" font-size="15" fill="#222">${t}</text>${ico}${last ? '' : `<path d="M24 ${y + 38}h272" stroke="#e5e5ea"/>`}`;
    return this._svg(178, `
      <rect width="320" height="178" rx="14" fill="#eef0f4"/>
      <text x="160" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="#888">⬇ 목록을 조금 내리면 있어요</text>
      <rect x="12" y="32" width="296" height="136" rx="16" fill="#fff" stroke="#e1e3e8"/>
      ${row(32, '책갈피 추가', '')}
      ${row(70, '홈 화면에 추가', `<rect x="272" y="82" width="18" height="18" rx="4" fill="none" stroke="#222" stroke-width="2"/><path d="M281 86v10M276 91h10" stroke="#222" stroke-width="2" stroke-linecap="round"/>`)}
      ${row(108, '마크업', '', true)}
      ${this._ring(16, 72, 288, 36, 10)}
      ${this._badge(22, 70, 4)}`);
  },

  /** 5. 오른쪽 위 추가 */
  s5(label, icon) {
    return this._svg(176, `
      <rect width="320" height="176" rx="14" fill="#eef0f4"/>
      <rect x="12" y="12" width="296" height="40" rx="10" fill="#fff"/>
      <text x="28" y="37" font-size="15" fill="#007aff">취소</text>
      <text x="160" y="37" text-anchor="middle" font-size="15" font-weight="700" fill="#222">홈 화면에 추가</text>
      <text x="292" y="37" text-anchor="end" font-size="15" font-weight="800" fill="#007aff">추가</text>
      <rect x="12" y="62" width="296" height="104" rx="14" fill="#fff"/>
      <image href="${icon}" x="26" y="76" width="56" height="56" preserveAspectRatio="xMidYMid slice"/>
      <text x="96" y="100" font-size="15" font-weight="700" fill="#222">${U.esc(label)}</text>
      <path d="M96 110h196" stroke="#e5e5ea"/>
      <text x="96" y="128" font-size="11" fill="#888">buddyplanner.kr</text>
      <text x="26" y="156" font-size="12" fill="#888">이름은 이미 들어가 있어요. 그대로 두면 돼요</text>
      ${this._ring(262, 16, 44, 32, 10)}
      ${this._badge(250, 60, 5)}`);
  },

  /** 끝: 홈 화면에 생긴 아이콘 */
  done(label, icon) {
    return this._svg(118, `
      <rect width="320" height="118" rx="14" fill="#1f2a44"/>
      <image href="${icon}" x="132" y="16" width="56" height="56"/>
      <text x="160" y="92" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">${U.esc(label)}</text>
      <text x="160" y="110" text-anchor="middle" font-size="11" fill="#c7d2fe">이 아이콘을 누르면 일정이 바로 열려요</text>`);
  },

  /** 단계 묶음 HTML (안내 창 아이폰 탭) */
  html(s, label, icon) {
    const step = (n, txt, svg) => `<div class="hg-step"><p><span class="hg-n">${n}</span>${txt}</p>${svg}</div>`;
    const arrow = '<div class="hg-arrow">↓</div>';
    return `<div class="hg">
      ${step(1, '주소창 옆 <b>≡</b> 누르기', this.s1())}${arrow}
      ${step(2, '<b>공유</b> 누르기', this.s2())}${arrow}
      ${step(3, '<b>더 보기</b> 누르기', this.s3())}${arrow}
      ${step(4, '조금 내려서 <b>홈 화면에 추가</b> 누르기', this.s4())}${arrow}
      ${step(5, '오른쪽 위 <b>추가</b> 누르기', this.s5(label, icon))}${arrow}
      <div class="hg-step"><p><span class="hg-n ok">✓</span>끝! 홈 화면에 이 아이콘이 생겨요</p>${this.done(label, icon)}</div>
      <p class="hg-old">아래쪽에 <b>□↑</b> 버튼이 보이는 아이폰이라면 그걸 누르고 4번부터 하면 돼요.</p>
    </div>`;
  }
};
