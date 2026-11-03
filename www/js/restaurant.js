/* =========================================
   BuddyPlanner v2 — 골프장 주변 맛집 · 추천 메뉴 (메뉴는 미리 정리해 둔 목록이며 AI 분석이 아님)
   ========================================= */

const Restaurant = {
  tab: 'before',

  // ── 식당 종류별 추천 메뉴 (미리 정리해 둔 목록) ──
  AI_MENU_DB: {
    '한우': [
      { name:'한우 꽃등심 구이',    reason:'라운딩 후 부족한 단백질을 최고급 마블링으로 보충. 중불에 살짝 구워 육즙을 살리세요.', tag:'⭐ 시그니처', kcal:'420 kcal' },
      { name:'육회비빔밥',          reason:'신선한 육회와 참기름의 조화. 운동 후 빠른 탄수화물 보충에 최적입니다.', tag:'🔥 인기 1위', kcal:'580 kcal' },
      { name:'갈비탕',              reason:'콜라겐이 풍부한 국물로 피로 회복. 깔끔한 국물이 라운딩 후 갈증도 해소해줍니다.', tag:'💪 피로 회복', kcal:'340 kcal' },
    ],
    '갈비': [
      { name:'LA 갈비 구이',         reason:'두툼한 갈비살은 라운딩 후 에너지 보충의 정석. 탄화 없이 노릇하게 구워야 제맛.', tag:'⭐ 시그니처', kcal:'550 kcal' },
      { name:'갈비탕',              reason:'진한 사골 육수와 부드러운 갈비살의 조화. 소화가 잘 돼 운동 후 최적입니다.', tag:'🍲 국물 보양', kcal:'380 kcal' },
      { name:'냉면',                reason:'갈비 후 입가심으로 냉면을 선택하면 30% 이상이 만족도를 높게 평가합니다.', tag:'🌿 마무리 필수', kcal:'510 kcal' },
    ],
    '삼겹살': [
      { name:'생삼겹살 + 항정살 세트', reason:'지방 함량 균형이 뛰어난 조합. 쌈채소와 함께 먹으면 칼로리 부담을 낮출 수 있어요.', tag:'🏆 베스트 조합', kcal:'680 kcal' },
      { name:'된장찌개 + 공기밥',    reason:'나트륨 보충에 탁월. 라운딩 중 땀으로 빠진 미네랄을 채워줍니다.', tag:'⚡ 미네랄 보충', kcal:'290 kcal' },
      { name:'냉삼겹 수육',          reason:'수육은 직화 구이보다 지방 흡수율이 20% 낮아 부담 없이 즐길 수 있습니다.', tag:'💚 건강 선택', kcal:'430 kcal' },
    ],
    '횟집': [
      { name:'광어·우럭 모둠회',     reason:'DHA와 오메가3가 풍부. 라운딩으로 긴장된 근육 회복에 도움을 줍니다.', tag:'⭐ 대표 메뉴', kcal:'280 kcal' },
      { name:'전복 버터구이',        reason:'타우린이 풍부해 피로 해소 효과 탁월. 10홀 이상 라운딩 후 강력 추천!', tag:'💎 프리미엄', kcal:'220 kcal' },
      { name:'매운탕 (대)',          reason:'얼큰한 국물이 체온 회복을 도와줍니다. 생선 뼈 깊은 육수로 속을 든든하게.', tag:'🌶️ 마무리 국물', kcal:'310 kcal' },
    ],
    '회': [
      { name:'참치 대뱃살 회',       reason:'최상급 DHA 함유. 라운딩 후 집중력 회복과 뇌 피로 해소에 효과적입니다.', tag:'💎 프리미엄', kcal:'310 kcal' },
      { name:'모둠 해산물 플래터',   reason:'다양한 해산물로 여러 영양소를 한 번에. 동반자와 나눠 먹기 최적 구성.', tag:'👥 단체 추천', kcal:'260 kcal' },
      { name:'게장 정식',            reason:'간장게장의 짭조름한 감칠맛이 입맛을 돋웁니다. 밥도둑 메뉴 1위.', tag:'🦀 밥도둑', kcal:'420 kcal' },
    ],
    '장어': [
      { name:'민물장어 소금구이',     reason:'스태미나 식품 1위. 비타민 A·E가 풍부해 라운딩 후 체력 회복에 탁월합니다.', tag:'💪 스태미나', kcal:'480 kcal' },
      { name:'장어 양념구이',        reason:'달콤짭조름한 양념이 입맛을 살려줍니다. 처음 방문했다면 무난하게 고르기 좋은 메뉴.', tag:'🌟 입문 추천', kcal:'520 kcal' },
      { name:'장어탕',              reason:'소화가 잘 되는 국물형. 연령대 높은 동반자와 함께라면 이 메뉴를 선택하세요.', tag:'🍵 소화 편안', kcal:'380 kcal' },
    ],
    '국밥': [
      { name:'소뼈 해장국',          reason:'콜라겐이 녹아든 진한 국물. 새벽 라운딩 전 공복 상태에서 최고의 선택입니다.', tag:'🌅 새벽 라운딩', kcal:'390 kcal' },
      { name:'선지국밥',             reason:'철분이 풍부한 선지가 혈액 순환을 촉진. 라운딩 전 집중력 향상에 도움.', tag:'⚡ 집중력 UP', kcal:'340 kcal' },
      { name:'순대국밥 (특)',         reason:'순대의 부드러운 식감과 진한 국물의 조화. 든든하게 배를 채우는 최고의 선택.', tag:'💪 든든한 에너지', kcal:'520 kcal' },
    ],
    '해장국': [
      { name:'콩나물 해장국',        reason:'숙취 해소 성분인 아스파라긴산이 풍부. 전날 음주 후 라운딩 전 필수 메뉴.', tag:'🟢 숙취 해소', kcal:'180 kcal' },
      { name:'북어국',              reason:'북어의 메티오닌 성분이 간 해독을 도와줍니다. 가볍고 깔끔한 아침 식사.', tag:'🌿 간 해독', kcal:'160 kcal' },
      { name:'뼈다귀 해장국',        reason:'묵직한 국물이 속을 달래줍니다. 라운딩 전 에너지 충전에 필요한 칼로리를 공급.', tag:'💪 에너지 충전', kcal:'420 kcal' },
    ],
    '순대': [
      { name:'순대 모듬 (대)',        reason:'순대, 간, 머리고기가 어우러진 풍성한 한 상. 단백질과 비타민 B군이 풍부합니다.', tag:'⭐ 시그니처', kcal:'480 kcal' },
      { name:'순대국밥',             reason:'진한 돼지 사골 국물이 속을 든든하게 채워줍니다. 라운딩 전 에너지 보충 필수!', tag:'💪 에너지 충전', kcal:'510 kcal' },
      { name:'머리고기 수육',         reason:'쫄깃한 식감과 담백한 맛. 새우젓과 곁들이면 궁합이 완벽합니다.', tag:'🌿 담백 추천', kcal:'350 kcal' },
    ],
    '쌈밥': [
      { name:'두루치기 쌈밥 정식',   reason:'신선한 쌈 채소로 비타민을 보충. 두루치기의 얼큰한 맛이 라운딩 피로를 날려줍니다.', tag:'⭐ 시그니처', kcal:'620 kcal' },
      { name:'제육볶음 정식',        reason:'돼지고기의 비타민 B1이 피로 회복을 도와줍니다. 밥과 함께 먹으면 든든합니다.', tag:'💪 비타민 B1', kcal:'680 kcal' },
      { name:'보쌈 (소)',            reason:'삶은 돼지고기는 직화보다 부담이 낮습니다. 김치와 굴의 조화가 일품.', tag:'🥬 라이트 선택', kcal:'430 kcal' },
    ],
    '한식': [
      { name:'한정식 코스',          reason:'균형 잡힌 영양 구성으로 라운딩 후 전반적인 컨디션 회복에 도움을 줍니다.', tag:'⭐ 프리미엄 코스', kcal:'890 kcal' },
      { name:'돌솥비빔밥',           reason:'5가지 이상의 나물이 비타민·미네랄을 충족. 탄수화물 보충도 동시에 해결!', tag:'🌿 영양 균형', kcal:'540 kcal' },
      { name:'갈비탕',              reason:'부드러운 고기와 깊은 국물로 소화 부담이 적습니다. 라운딩 후 저녁 식사로 최적.', tag:'🍲 소화 편안', kcal:'380 kcal' },
    ],
    '중식': [
      { name:'짜장면 + 탕수육 세트', reason:'쫄깃한 면과 새콤달콤한 탕수육의 황금 조합. 라운딩 후 빠른 탄수화물 보충에 최적.', tag:'⭐ 황금 조합', kcal:'820 kcal' },
      { name:'마라탕',              reason:'마라의 자극적인 맛이 식욕을 깨워줍니다. 땀으로 빠진 나트륨을 보충하기에도 좋아요.', tag:'🌶️ 식욕 자극', kcal:'590 kcal' },
      { name:'짬뽕',               reason:'얼큰한 해물 국물이 라운딩 후 피로 해소에 도움. 해산물로 단백질도 충분히 섭취.', tag:'🦐 해물 보양', kcal:'480 kcal' },
    ],
    '일식': [
      { name:'연어 사시미 정식',     reason:'오메가3가 풍부해 관절 건강에 도움. 라운딩으로 과부하된 손목·어깨 회복에 추천.', tag:'💚 관절 건강', kcal:'420 kcal' },
      { name:'규카츠 정식',          reason:'얇게 썬 와규 카츠. 촉촉한 내부와 바삭한 외부의 조화가 일품입니다.', tag:'⭐ 프리미엄', kcal:'680 kcal' },
      { name:'라멘',                reason:'진한 돈코츠 국물이 체온을 올려줍니다. 저녁 라운딩 후 따뜻하게 마무리하세요.', tag:'🍜 마무리 추천', kcal:'620 kcal' },
    ],
  },

  DEFAULT_MENUS: [
    { name:'이 집 대표 메뉴',          reason:'처음 가는 식당이라면 간판 메뉴부터 드셔 보세요. 네이버 리뷰에서 많이 찾는 메뉴를 확인할 수 있어요.', tag:'⭐ 대표 메뉴', kcal:'약 500 kcal' },
    { name:'단체 세트·코스 (4인 기준)', reason:'동반자 4명이 함께라면 세트나 코스 메뉴가 주문하기 편하고 가격도 합리적인 경우가 많아요.', tag:'👥 단체 추천', kcal:'약 650 kcal' },
    { name:'계절 특선 메뉴',           reason:'제철 재료를 쓴 계절 메뉴가 있다면 함께 맛보세요.', tag:'🌱 제철 재료', kcal:'약 450 kcal' },
  ],

  init() { this.view = this.view || 'start'; this.render(); },

  findMenuKey(category) {
    const cat = category || '';
    if (cat.includes('한우') || cat.includes('소고기')) return '한우';
    if (cat.includes('갈비')) return '갈비';
    if (cat.includes('삼겹') || cat.includes('돼지고기')) return '삼겹살';
    if (cat.includes('횟집') || cat.includes('활어')) return '횟집';
    if (cat.includes('회') || cat.includes('참치') || cat.includes('해산물')) return '회';
    if (cat.includes('장어')) return '장어';
    if (cat.includes('국밥')) return '국밥';
    if (cat.includes('해장국') || cat.includes('해장')) return '해장국';
    if (cat.includes('순대')) return '순대';
    if (cat.includes('쌈밥') || cat.includes('쌈')) return '쌈밥';
    if (cat.includes('중식') || cat.includes('중국집') || cat.includes('짜장')) return '중식';
    if (cat.includes('일식') || cat.includes('초밥') || cat.includes('스시')) return '일식';
    if (cat.includes('한식') || cat.includes('정식')) return '한식';
    return null;
  },

  showAIRecommend(placeName, category, tab) {
    U.haptic();

    const bg = document.createElement('div');
    bg.id = 'ai-modal-bg';
    bg.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'background:rgba(0,0,0,0.85)',
      'backdrop-filter:blur(16px)',
      'display:flex', 'align-items:flex-end', 'justify-content:center'
    ].join(';');

    bg.innerHTML = `
      <div id="ai-modal-panel" style="
        width:100%;max-width:480px;
        background:linear-gradient(160deg,#0f0f1a 0%,#0a0a12 100%);
        border:1px solid rgba(255,255,255,0.1);
        border-radius:28px 28px 0 0;
        padding:24px 24px 48px;
        transform:translateY(100%);
        transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
        max-height:85vh;overflow-y:auto;
      ">
        <div style="width:40px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;margin:0 auto 20px;"></div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#2563eb);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🍽️</div>
          <div>
            <div style="font-size:13px;color:#7c3aed;font-weight:600;">추천 메뉴</div>
            <div style="font-size:16px;font-weight:800;color:#fff;">${placeName}</div>
          </div>
        </div>
        <div style="font-size:12px;color:#64748b;margin-bottom:20px;padding-left:46px;">카테고리: ${category}</div>

        <div id="ai-loading" style="text-align:center;padding:32px 0;">
          <div style="width:48px;height:48px;margin:0 auto 16px;border:3px solid rgba(124,58,237,0.2);border-top-color:#7c3aed;border-radius:50%;animation:aiSpin 0.8s linear infinite;"></div>
          <div style="color:#94a3b8;font-size:14px;font-weight:600;" id="ai-loading-text">추천 메뉴를 고르는 중...</div>
        </div>
        <div id="ai-result" style="display:none;"></div>

        <button onclick="document.getElementById('ai-modal-bg').remove()" style="
          width:100%;margin-top:20px;padding:14px;
          background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
          border-radius:14px;color:#94a3b8;font-size:15px;font-weight:600;cursor:pointer;
        ">닫기</button>
      </div>
    `;

    if (!document.getElementById('ai-spin-style')) {
      const s = document.createElement('style');
      s.id = 'ai-spin-style';
      s.textContent = `
        @keyframes aiSpin { 100% { transform:rotate(360deg); } }
        @keyframes aiFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(bg);
    requestAnimationFrame(() => {
      bg.querySelector('#ai-modal-panel').style.transform = 'translateY(0)';
    });
    bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });

    // 미리 정리한 목록이라 오래 기다리게 하지 않음 (예전: 가짜 'AI 분석 중' 문구를 돌렸음)
    setTimeout(() => {
      const key = this.findMenuKey(category);
      const menus = key ? this.AI_MENU_DB[key] : this.DEFAULT_MENUS;
      const contextNote = tab === 'before'
        ? '🌅 라운딩 전 — 식당 종류에 맞춰 부담 없이 먹기 좋은 메뉴를 골라 봤어요. 실제 메뉴는 식당마다 다를 수 있어요.'
        : '🏆 라운딩 후 — 식당 종류에 맞춰 회식하기 좋은 메뉴를 골라 봤어요. 실제 메뉴는 식당마다 다를 수 있어요.';

      const resultHtml = `
        <div style="font-size:12px;color:#7c3aed;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);border-radius:10px;padding:10px 14px;margin-bottom:16px;">${contextNote}</div>
        ${menus.map((m, i) => `
          <div style="
            background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
            border-radius:16px;padding:16px;margin-bottom:12px;
            animation:aiFadeUp 0.4s ease both;animation-delay:${i * 0.15}s;
          ">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
              <div style="font-size:15px;font-weight:800;color:#fff;">${m.name}</div>
              <div style="font-size:11px;color:#fbbf24;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.25);padding:3px 8px;border-radius:20px;white-space:nowrap;margin-left:8px;">${m.tag}</div>
            </div>
            <div style="font-size:13px;color:#94a3b8;line-height:1.6;margin-bottom:10px;">${m.reason}</div>
            <div style="font-size:12px;color:#475569;">🔥 대략적인 칼로리: <span style="color:#30d158;font-weight:600;">${m.kcal}</span></div>
          </div>
        `).join('')}
      `;

      const loadEl = document.getElementById('ai-loading');
      const resultEl = document.getElementById('ai-result');
      if (loadEl) loadEl.style.display = 'none';
      if (resultEl) { resultEl.style.display = 'block'; resultEl.innerHTML = resultHtml; }
    }, 300);
  },

  /* =========================================================
     골프장 주변 맛집 (서버 food-nearby: 카카오 실시간 검색 → 카테고리·순위 정리)
     ========================================================= */
  view: 'start',      // start | loading | result | error
  course: null,       // { name, lat, lng } 사용자가 고른 골프장
  data: null,         // 서버 결과
  cat: 'all',
  open: {},           // 펼친 카테고리
  errMsg: '',
  RECENT_KEY: 'bp_food_recent_v1',

  _today0() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; },
  upcoming() {
    const t0 = this._today0();
    return (State.schedules || []).map((s, idx) => ({ s, idx }))
      .filter(({ s }) => s && s.date && s.course && new Date(s.date) >= t0)
      .sort((a, b) => new Date(a.s.date) - new Date(b.s.date));
  },
  _dateLabel(d) {
    const x = new Date(d); const w = ['일', '월', '화', '수', '목', '금', '토'][x.getDay()];
    return `${x.getMonth() + 1}월 ${x.getDate()}일(${w})`;
  },
  recent() { try { return JSON.parse(localStorage.getItem(this.RECENT_KEY) || '[]').slice(0, 5); } catch (e) { return []; } },
  _saveRecent(c) {
    try {
      const list = this.recent().filter(x => x.name !== c.name);
      list.unshift({ name: c.name, lat: c.lat, lng: c.lng });
      localStorage.setItem(this.RECENT_KEY, JSON.stringify(list.slice(0, 5)));
    } catch (e) { }
  },

  render() {
    const el = U.$('#screen-restaurant');
    if (!el) return;
    if (this.view === 'result' && this.data) return this.renderResult(el);
    if (this.view === 'loading') return this.renderLoading(el);
    this.renderStart(el);
  },

  renderStart(el) {
    const next = this.upcoming()[0];
    const recent = this.recent();
    const nextHtml = next ? `
      <div class="fd-lab">📅 다음 라운딩</div>
      <div class="fd-next" onclick="Restaurant.searchNext()">
        <div class="fd-next-ic">⛳</div>
        <div class="fd-next-info"><div class="fd-next-t">${U.esc(next.s.course.name)}</div>
          <div class="fd-next-m">${this._dateLabel(next.s.date)} ${U.esc(next.s.teeOff || '')} 티오프</div></div>
        <div class="fd-next-go">맛집 보기</div>
      </div>` : '';
    const recentHtml = recent.length ? `
      <div class="fd-lab" style="margin-top:24px">최근 찾아본 골프장</div>
      <div class="fd-recent">${recent.map((r, i) => `<button onclick="Restaurant.searchRecent(${i})">${U.esc(r.name)}</button>`).join('')}</div>` : '';
    const err = this.view === 'error' ? `<div class="fd-err">${U.esc(this.errMsg)}</div>` : '';
    el.innerHTML = `
      <div class="fd-wrap">
        <div class="discovery-hero">
          <div class="fd-hero-s">골프장 주변 맛집 추천</div>
          <h2>어느 골프장에 가세요?<br><span class="gold-text">주변 맛집을 찾아드릴게요</span></h2>
          <div class="search-bar" onclick="Restaurant.searchArea()">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span style="font-weight:600;">골프장 이름을 입력하세요</span>
          </div>
        </div>
        <div class="fd-sec">
          ${err}
          ${nextHtml}
          ${recentHtml}
          <div class="fd-lab" style="margin-top:24px">이렇게 추천해요</div>
          <div class="fd-how">· 골프장에서 <b>가까운 곳</b>부터, 카카오에서 <b>많이 찾는 곳</b>을 위로<br>· 우리 앱 사용자의 <b>버디 평가</b>가 높으면 더 위로<br>· <b>운영팀 추천</b> 집은 맨 위에 고정</div>
        </div>
      </div>`;
  },

  renderLoading(el) {
    el.innerHTML = `
      <div class="fd-wrap">
        <div class="fd-rh"><button class="fd-back" onclick="Restaurant.reset()">‹ 맛집</button><div class="fd-rh-t">${U.esc(this.course ? this.course.name : '')} 주변</div></div>
        <div class="fd-loading"><div class="fd-spin"></div><p>🔎 골프장 주변 맛집을 찾고 있어요…</p></div>
      </div>`;
  },

  reset() { this.view = 'start'; this.data = null; this.render(); },

  searchArea() {
    App.openAddressSearch('⛳ 골프장 검색', (p) => {
      this.search({ name: p.name || p.place_name, lat: parseFloat(p.lat), lng: parseFloat(p.lng) });
    });
  },
  searchNext() {
    const n = this.upcoming()[0];
    if (n) this.search({ name: n.s.course.name, lat: n.s.course.lat, lng: n.s.course.lng });
  },
  searchRecent(i) { const r = this.recent()[i]; if (r) this.search(r); },

  async search(course) {
    if (!course || !course.name) return;
    if (typeof Cloud === 'undefined' || !Cloud.isConfigured() || !Cloud.isSignedIn()) {
      this.view = 'error'; this.errMsg = '로그인하면 골프장 주변 맛집을 볼 수 있어요.'; this.render();
      U.toast('로그인이 필요해요.');
      return;
    }
    this.course = course; this.view = 'loading'; this.cat = 'all'; this.open = {};
    this.render();
    try {
      const { url, key } = Cloud.cfg();
      const token = await Cloud._freshToken();
      const res = await fetch(`${url}/functions/v1/food-nearby`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_name: course.name, lat: course.lat, lng: course.lng })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || '맛집을 찾지 못했어요. 잠시 후 다시 시도해 주세요.');
      this.data = d; this.view = 'result';
      this._saveRecent(course);
      if (typeof Admin !== 'undefined' && Admin.checkAdmin) Admin.checkAdmin().then(() => { if (this.view === 'result') this.render(); }).catch(() => { });
    } catch (e) {
      this.view = 'error'; this.errMsg = e.message || '맛집을 찾지 못했어요.';
    }
    if (State.screen === 'restaurant' || U.$('#screen-restaurant.active')) this.render();
  },

  switchTab(tab) { this.tab = tab; this.cat = 'all'; this.render(); U.haptic(); },
  setCat(k) { this.cat = k; this.render(); U.haptic(); },
  toggleOpen(k) { this.open[k] = !this.open[k]; this.render(); },

  _find(id) {
    const d = this.data; if (!d) return null;
    for (const t of ['before', 'after']) for (const g of d[t]) { const p = g.items.find(x => x.id === id); if (p) return { p, g, t }; }
    return null;
  },

  _ratingHtml(p) {
    return p.buddy_count ? `<b>★ ${U.esc(p.buddy_rating)}</b> 버디 평가 ${U.esc(p.buddy_count)}` : '아직 버디 평가가 없어요';
  },

  _card(p, label) {
    const id = U.esc(p.id);
    const admin = typeof Admin !== 'undefined' && Admin.isAdmin === true && this.data.course.id;
    return `
      <div class="fd-card">
        <span class="fd-rank ${p.pick ? 'pick' : ''}">${p.pick ? '★ 운영팀 추천' : label}</span>
        <div class="fd-ct"><span class="fd-n">${U.esc(p.name)}</span>${p.distance_km != null ? `<span class="fd-dist">${U.esc(p.distance_km)}km</span>` : ''}</div>
        <div class="fd-meta">${U.esc(p.category || '음식점')}${p.address ? ` · ${U.esc(p.address.split(' ').slice(0, 2).join(' '))}` : ''}</div>
        ${p.pick && p.note ? `<div class="fd-why pick">운영팀 한마디 · ${U.esc(p.note)}</div>` : (p.why ? `<div class="fd-why">${U.esc(p.why)}</div>` : '')}
        <button class="fd-add" onclick="Restaurant.openAdd('${id}')">＋ 일정에 추가</button>
        <div class="fd-foot">
          <span class="fd-rate">${this._ratingHtml(p)}</span>
          <div class="fd-btns">
            <button class="fd-btn" onclick="Restaurant.openNaver('${id}')">네이버 리뷰</button>
            <button class="fd-btn k" onclick="Restaurant.openRoute('${id}')">길찾기</button>
          </div>
        </div>
        ${admin ? `<button class="fd-admin" onclick="Restaurant.togglePick('${id}')">${p.pick ? '운영팀 추천 해제' : '☆ 운영팀 추천으로 고정'}</button>` : ''}
      </div>`;
  },

  _mini(p, n) {
    return `
      <div class="fd-mini" onclick="Restaurant.openMini('${U.esc(p.id)}')">
        <span class="fd-mini-r">${n}</span>
        <div class="fd-mini-info"><div class="fd-mini-n">${U.esc(p.name)}</div><div class="fd-mini-m">${U.esc(p.category || '음식점')}</div></div>
        ${p.distance_km != null ? `<span class="fd-mini-d">${U.esc(p.distance_km)}km</span>` : ''}
      </div>`;
  },

  _group(g, single) {
    if (!g.items.length) return '';
    const big = single ? g.items : g.items.slice(0, 3);
    const rest = single ? [] : g.items.slice(3);
    let n = 0;
    const bigHtml = big.map(p => this._card(p, p.pick ? '' : `${++n}순위`)).join('');
    const restHtml = rest.length
      ? (this.open[g.key] ? rest.map(p => this._mini(p, ++n)).join('') : rest.map(p => this._mini(p, ++n)).slice(0, 2).join(''))
      : '';
    return `
      <div class="fd-gh"><span class="fd-g">${g.emoji} ${U.esc(g.label)}</span>
        ${single ? `<span class="fd-more">가까운 곳·많이 찾는 곳 순</span>` : `<span class="fd-more" onclick="Restaurant.setCat('${g.key}')">${g.items.length}곳 ›</span>`}</div>
      ${bigHtml}${restHtml}`;
  },

  renderResult(el) {
    const d = this.data;
    const groups = d[this.tab] || [];
    const visible = groups.filter(g => g.items.length);
    const chips = [{ key: 'all', label: '전체' }].concat(visible).map(g =>
      `<button class="fd-chip ${this.cat === g.key ? 'on' : ''}" onclick="Restaurant.setCat('${g.key}')">${U.esc(g.label)}</button>`).join('');
    const count = groups.reduce((n, g) => n + g.items.length, 0);
    let body;
    if (!visible.length) body = `<div class="fd-empty">반경 10km 안에서 ${this.tab === 'before' ? '라운딩 전' : '라운딩 후'}에 갈 만한 식당을 찾지 못했어요.</div>`;
    else if (this.cat === 'all') body = visible.map(g => this._group(g, false)).join('');
    else { const g = groups.find(x => x.key === this.cat); body = g ? this._group(g, true) : ''; }
    el.innerHTML = `
      <div class="fd-wrap">
        <div class="fd-rh">
          <button class="fd-back" onclick="Restaurant.reset()">‹ 맛집</button>
          <button class="fd-chg" onclick="Restaurant.searchArea()">골프장 변경</button>
          <div class="fd-rh-t">${U.esc(d.course.name)} 주변</div>
          <div class="fd-rh-m">반경 10km · ${count}곳 · 카카오 장소 검색 기준${d.curated_by === 'ai' ? ' · AI 정리' : ''}</div>
        </div>
        <div class="premium-tabs">
          <div class="premium-tab ${this.tab === 'before' ? 'active' : ''}" onclick="Restaurant.switchTab('before')">🌅 라운딩 전</div>
          <div class="premium-tab ${this.tab === 'after' ? 'active' : ''}" onclick="Restaurant.switchTab('after')">🏆 라운딩 후</div>
        </div>
        <div class="fd-chips">${chips}</div>
        <div class="fd-list">
          ${body}
          <div class="fd-src">장소 정보: 카카오 · 버디 평가: BuddyPlanner 사용자${d.curated_by === 'ai' ? ' · 추천 이유는 AI가 음식 종류·거리로 작성' : ''}</div>
        </div>
      </div>`;
    if (typeof Ratings !== 'undefined') Ratings.fillDom(el);
  },

  openNaver(id) {
    const f = this._find(id); if (!f) return;
    const region = f.p.address ? f.p.address.split(' ').slice(0, 2).join(' ') : '';
    window.open(`https://m.search.naver.com/search.naver?query=${encodeURIComponent(f.p.name + ' ' + region)}`, '_blank');
  },
  openRoute(id) {
    const f = this._find(id); if (!f) return;
    const p = f.p;
    const url = (isFinite(p.lat) && isFinite(p.lng))
      ? `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`
      : (p.url || '');
    if (/^https?:\/\//.test(url)) window.open(url, '_blank');
  },

  /** 4·5위 줄을 누르면: 행동 고르기 */
  openMini(id) {
    const f = this._find(id); if (!f) return;
    App.closeModal();
    const bg = U.el('div', 'modal-bg'); bg.id = 'app-modal';
    const sid = U.esc(id);
    bg.innerHTML = `
      <div class="modal-panel">
        <div class="modal-handle"></div>
        <h3 class="modal-title">${U.esc(f.p.name)}</h3>
        <div class="fd-sheet">
          <div class="fd-meta" style="margin:0 0 14px">${U.esc(f.p.category || '음식점')}${f.p.distance_km != null ? ` · 골프장에서 ${U.esc(f.p.distance_km)}km` : ''}</div>
          <button class="fd-sheet-btn main" onclick="App.closeModal();Restaurant.openAdd('${sid}')">＋ 일정에 추가</button>
          <button class="fd-sheet-btn" onclick="Restaurant.openNaver('${sid}')">네이버 리뷰 보기</button>
          <button class="fd-sheet-btn" onclick="Restaurant.openRoute('${sid}')">카카오맵 길찾기</button>
        </div>
      </div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click', e => { if (e.target === bg) App.closeModal(); });
    requestAnimationFrame(() => bg.classList.add('open'));
  },

  /* ── 일정에 추가 ── */
  _addState: null,
  openAdd(id) {
    const f = this._find(id); if (!f) return;
    U.haptic();
    const course = this.data.course;
    const near = (s) => {
      const c = s.course || {};
      if (c.name && course.name && c.name.replace(/\s+/g, '') === course.name.replace(/\s+/g, '')) return true;
      if (isFinite(c.lat) && isFinite(c.lng) && isFinite(course.lat)) {
        const dx = (c.lat - course.lat) * 111, dy = (c.lng - course.lng) * 88;
        return Math.sqrt(dx * dx + dy * dy) < 3;
      }
      return false;
    };
    const list = this.upcoming().map(x => ({ ...x, same: near(x.s) }))
      .sort((a, b) => (b.same - a.same) || (new Date(a.s.date) - new Date(b.s.date))).slice(0, 8);
    const sel = list.find(x => x.same) || null;
    this._addState = { id, timing: f.t, idx: sel ? sel.idx : null, list };
    this._renderAdd();
  },

  _renderAdd() {
    const st = this._addState; if (!st) return;
    const f = this._find(st.id); if (!f) return;
    App.closeModal();
    const bg = U.el('div', 'modal-bg'); bg.id = 'app-modal';
    const items = st.list.map(x => `
      <div class="fd-sch ${st.idx === x.idx ? 'on' : ''}" onclick="Restaurant.pickSchedule(${x.idx})">
        <div class="fd-sch-radio"></div>
        <div class="fd-sch-info"><div class="fd-sch-t">${this._dateLabel(x.s.date)} ${U.esc(x.s.teeOff || '')}</div>
          <div class="fd-sch-m">${U.esc(x.s.course.name)}${x.same ? ' <span class="fd-same">같은 골프장</span>' : ''}</div>
          ${(st.timing === 'before' ? (x.s.hasMeal && x.s.mealRestaurant) : (x.s.hasPostMeal && x.s.postMealRestaurant))
            ? `<div class="fd-sch-w">지금 넣어둔 '${U.esc((st.timing === 'before' ? x.s.mealRestaurant : x.s.postMealRestaurant).name)}' 대신 들어가요</div>` : ''}
        </div>
      </div>`).join('');
    bg.innerHTML = `
      <div class="modal-panel">
        <div class="modal-handle"></div>
        <h3 class="modal-title">🍽️ ${U.esc(f.p.name)} 일정에 추가</h3>
        <div class="fd-sheet">
          <div class="fd-lab">언제 가세요?</div>
          <div class="fd-seg">
            <button class="${st.timing === 'before' ? 'on' : ''}" onclick="Restaurant.pickTiming('before')">🌅 라운딩 전 식사</button>
            <button class="${st.timing === 'after' ? 'on' : ''}" onclick="Restaurant.pickTiming('after')">🏆 라운딩 후 식사</button>
          </div>
          <div class="fd-lab" style="margin-top:16px">어느 라운딩에 넣을까요?</div>
          ${st.list.length ? `<div class="fd-sch-list">${items}</div>` : `<div class="fd-empty" style="padding:18px 0">다가오는 라운딩 일정이 없어요.</div>`}
          ${st.list.length ? `<button class="fd-sheet-btn main" ${st.idx === null ? 'disabled' : ''} onclick="Restaurant.confirmAdd()">이 일정에 넣기</button>` : ''}
          <button class="fd-sheet-btn" onclick="Restaurant.addNewSchedule()">＋ ${U.esc(this.data.course.name)} 새 일정 만들기</button>
          <div class="fd-note">일정 화면이 열리면 '저장'을 눌러야 반영돼요. 식당을 넣으면 출발 시간도 다시 계산돼요.</div>
        </div>
      </div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click', e => { if (e.target === bg) { App.closeModal(); this._addState = null; } });
    requestAnimationFrame(() => bg.classList.add('open'));
  },
  pickTiming(t) { if (this._addState) { this._addState.timing = t; this._renderAdd(); } },
  pickSchedule(idx) { if (this._addState) { this._addState.idx = idx; this._renderAdd(); } },

  _restObj(p) { return { name: p.name, tel: p.phone || '', lat: p.lat, lng: p.lng }; },

  confirmAdd() {
    const st = this._addState; if (!st || st.idx === null) return;
    const f = this._find(st.id); if (!f) return;
    if (!State.schedules[st.idx]) { U.toast('일정을 찾을 수 없어요.'); return; }
    const rest = this._restObj(f.p), timing = st.timing;
    App.closeModal(); this._addState = null;
    Register.edit(st.idx);
    setTimeout(() => {
      Register.setMealFromAI(timing, rest);
      U.toast(`🍽️ ${rest.name}을(를) 넣었어요. '스마트 플랜 수정'을 눌러 저장하세요.`, 3500);
    }, 300);
  },

  addNewSchedule() {
    const st = this._addState; if (!st) return;
    const f = this._find(st.id); if (!f) return;
    const c = this.data.course;
    const course = { id: c.id, name: c.name, addr: c.addr || '', region: (c.addr || '').split(' ').slice(0, 2).join(' '), lat: c.lat, lng: c.lng };
    const rest = this._restObj(f.p), timing = st.timing;
    App.closeModal(); this._addState = null;
    Register.editIdx = null;
    App.navigate('register');
    setTimeout(() => {
      Register.prefill({ course });
      Register.setMealFromAI(timing, rest);
      U.toast(`🍽️ ${rest.name}을(를) 넣었어요. 날짜·티오프를 정하고 저장하세요.`, 3500);
    }, 300);
  },

  /* ── 운영팀 추천 (관리자만) ── */
  async togglePick(id) {
    const f = this._find(id); if (!f || !this.data.course.id) return;
    const p = f.p;
    try {
      if (p.pick) {
        await Cloud._api('rest/v1/rpc/food_pick_remove', { method: 'POST', body: { p_course_id: this.data.course.id, p_place_id: p.id, p_timing: f.t } });
        U.toast('운영팀 추천을 해제했어요.');
      } else {
        const note = prompt('운영팀 한마디 (40자 이내, 비워도 돼요)', '');
        if (note === null) return;
        const r = await Cloud._api('rest/v1/rpc/food_pick_add', { method: 'POST', body: { p_course_id: this.data.course.id, p_place_id: p.id, p_place_name: p.name, p_timing: f.t, p_note: note.slice(0, 40) } });
        if (r && r.ok === false) throw new Error(r.error);
        U.toast('운영팀 추천으로 고정했어요.');
      }
      this.search(this.course);
    } catch (e) {
      U.toast('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

};
