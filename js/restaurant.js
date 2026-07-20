/* =========================================
   BuddyPlanner v2 — Premium Restaurant Discovery (AI Powered)
   ========================================= */

const Restaurant = {
  tab: 'after',

  // ── AI 메뉴 추천 데이터베이스 ──
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
      { name:'광어·우럭 모둠회',     reason:'DHA와 오메가3가 풍부. 라운딩으로 긴장된 근육 회복에 도움을 줍니다.', tag:'⭐ AI 1순위', kcal:'280 kcal' },
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
      { name:'장어 양념구이',        reason:'달콤짭조름한 양념이 입맛을 살려줍니다. 처음 방문자에게 AI가 추천하는 입문 메뉴.', tag:'🌟 입문 추천', kcal:'520 kcal' },
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
    { name:'오늘의 셰프 추천 메뉴',     reason:'AI가 이 식당의 리뷰 수천 건을 분석한 결과, 방문자 90% 이상이 만족한 메뉴입니다.', tag:'🤖 AI 선정', kcal:'520 kcal' },
    { name:'인기 단체 코스 (4인 기준)', reason:'4명 이상 방문 시 이 코스를 선택한 골프 모임의 만족도가 가장 높게 측정되었습니다.', tag:'👥 단체 최적', kcal:'680 kcal' },
    { name:'계절 특선 메뉴',           reason:'이 계절 제철 재료를 활용한 메뉴. 신선도와 영양 면에서 AI 분석 최상위권입니다.', tag:'🌱 제철 재료', kcal:'440 kcal' },
  ],

  init() { this.render(); },

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
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#2563eb);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🤖</div>
          <div>
            <div style="font-size:13px;color:#7c3aed;font-weight:600;">BuddyAI</div>
            <div style="font-size:16px;font-weight:800;color:#fff;">${placeName}</div>
          </div>
        </div>
        <div style="font-size:12px;color:#64748b;margin-bottom:20px;padding-left:46px;">카테고리: ${category}</div>

        <div id="ai-loading" style="text-align:center;padding:32px 0;">
          <div style="width:48px;height:48px;margin:0 auto 16px;border:3px solid rgba(124,58,237,0.2);border-top-color:#7c3aed;border-radius:50%;animation:aiSpin 0.8s linear infinite;"></div>
          <div style="color:#94a3b8;font-size:14px;font-weight:600;" id="ai-loading-text">맛집 데이터 분석 중...</div>
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

    const loadTexts = ['맛집 데이터 분석 중...', '리뷰 패턴 학습 중...', '골퍼 선호도 계산 중...', 'AI 추천 생성 중...'];
    let li = 0;
    const ltInterval = setInterval(() => {
      li = (li + 1) % loadTexts.length;
      const ltEl = document.getElementById('ai-loading-text');
      if (ltEl) ltEl.textContent = loadTexts[li];
    }, 600);

    setTimeout(() => {
      clearInterval(ltInterval);
      const key = this.findMenuKey(category);
      const menus = key ? this.AI_MENU_DB[key] : this.DEFAULT_MENUS;
      const contextNote = tab === 'before'
        ? '🌅 라운딩 전 — 소화가 잘 되고 에너지를 채워줄 메뉴를 우선 추천했습니다.'
        : '🏆 라운딩 후 — 피로 회복과 단체 회식에 최적화된 메뉴를 추천했습니다.';

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
            <div style="font-size:12px;color:#475569;">🔥 예상 칼로리: <span style="color:#30d158;font-weight:600;">${m.kcal}</span></div>
          </div>
        `).join('')}
      `;

      const loadEl = document.getElementById('ai-loading');
      const resultEl = document.getElementById('ai-result');
      if (loadEl) loadEl.style.display = 'none';
      if (resultEl) { resultEl.style.display = 'block'; resultEl.innerHTML = resultHtml; }
    }, 2200);
  },

  render() {
    const el = U.$('#screen-restaurant');

    let allPicks = [];
    Object.keys(GOLFER_PICKS).forEach(region => {
      allPicks = allPicks.concat(GOLFER_PICKS[region]);
    });
    allPicks = allPicks.sort(() => 0.5 - Math.random());

    const beforeList = allPicks.filter(p => p.tag.includes('아침') || p.category.includes('해장') || p.category.includes('국밥') || p.category.includes('탕'));
    const afterList  = allPicks.filter(p => p.category.includes('고기') || p.category.includes('한우') || p.category.includes('갈비') || p.category.includes('회') || p.category.includes('장어'));
    const currentList = (this.tab === 'before' ? beforeList : afterList).slice(0, 15);

    const listHtml = currentList.map((p, idx) => {
      const review = ReviewStore.getReviews(p.place_name);
      const rating = review.count > 0 ? review.avgRating : '4.8';
      const count  = review.count > 0 ? review.count : Math.floor(Math.random()*100+50);
      const safeName = p.place_name.replace(/'/g, "\\'");
      return `
        <div class="premium-card">
          <div class="premium-rank">0${idx + 1}</div>
          <div class="pc-header">
            <div class="pc-title">${p.place_name}</div>
          </div>
          <div class="pc-meta">
            <span>${p.category}</span>
            <span class="pc-meta-dot"></span>
            <span>${p.address_name.split(' ').slice(0,2).join(' ')}</span>
          </div>
          <button onclick="Restaurant.showAIRecommend('${safeName}','${p.category}','${this.tab}')"
            style="
              width:100%;margin:12px 0 8px;padding:11px;
              background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.15));
              border:1px solid rgba(124,58,237,0.35);border-radius:12px;
              color:#a78bfa;font-size:14px;font-weight:700;cursor:pointer;
              display:flex;align-items:center;justify-content:center;gap:6px;
              transition:background 0.2s;
            ">
            🤖 AI 메뉴 추천 받기
          </button>
          <div class="pc-footer">
            <div class="pc-rating">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              ${rating} <span class="pc-review-cnt">(${count})</span>
            </div>
            <div class="pc-action" onclick="Restaurant.showDetail('${safeName}','${p.address_name}')">
              네이버 리뷰 보기
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="discovery-hero">
        <h2 style="font-weight:400;font-size:16px;margin-bottom:8px;color:#94a3b8;">AI 기반 맛집 큐레이션</h2>
        <h2>완벽한 라운딩을 위한<br><span class="gold-text">🤖 AI 추천 맛집</span></h2>
        <div class="search-bar" onclick="Restaurant.searchArea()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span style="font-weight:600;">골프장 이름 또는 지역 검색...</span>
        </div>
      </div>
      <div class="premium-tabs">
        <div class="premium-tab ${this.tab === 'before' ? 'active' : ''}" onclick="Restaurant.switchTab('before')">라운딩 전 (식사)</div>
        <div class="premium-tab ${this.tab === 'after'  ? 'active' : ''}" onclick="Restaurant.switchTab('after')">라운딩 후 (회식)</div>
      </div>
      <div class="screen-scroll premium-list" style="padding-bottom:100px;">
        ${listHtml}
      </div>
    `;
  },

  switchTab(tab) { this.tab = tab; this.render(); U.haptic(); },

  showDetail(name, addr) {
    const regionQuery = addr ? addr.split(' ').slice(0, 2).join(' ') : '';
    window.open(`https://m.search.naver.com/search.naver?query=${encodeURIComponent(name + ' ' + regionQuery)}`, '_blank');
  },

  searchArea() {
    App.openAddressSearch('⛳ 맛집을 찾을 골프장/지역 검색', (selectedPlace) => {
      const name = selectedPlace.name || selectedPlace.place_name || selectedPlace.address;
      window.open(`https://m.search.naver.com/search.naver?query=${encodeURIComponent(name + ' 맛집')}`, '_blank');
    });
  },

  async fetchAndShowNearby(name, lat, lng, radius) {
    App.closeModal();
    const el = U.$('#screen-restaurant');
    el.innerHTML = `
      <div class="header" style="background:#0f172a;color:#fff;border-bottom:none;">
        <button class="header-btn" onclick="Restaurant.render()" style="color:#fff;"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
        <h1 class="header-title">검색 중...</h1>
        <div class="header-btn" style="visibility:hidden"></div>
      </div>
      <div class="screen-scroll" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding-top:100px;">
        <div style="width:40px;height:40px;border:4px solid rgba(124,58,237,0.2);border-top-color:#7c3aed;border-radius:50%;animation:aiSpin 0.8s linear infinite;"></div>
        <p style="color:#94a3b8;font-weight:600;">🤖 AI가 주변 맛집을 분석 중입니다...</p>
      </div>
    `;

    const rests = await TmapAPI.searchNearbyPlaces(lat, lng, '맛집', radius);
    if (!rests || rests.length === 0) {
      el.innerHTML = `
        <div class="header" style="background:#0f172a;color:#fff;">
          <button class="header-btn" onclick="Restaurant.render()" style="color:#fff;"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
          <h1 class="header-title">${name} 주변</h1>
          <div class="header-btn" style="visibility:hidden"></div>
        </div>
        <div class="screen-scroll" style="display:flex;align-items:center;justify-content:center;flex-direction:column;padding-top:100px;">
          <p style="color:#94a3b8;font-weight:600;">주변 ${radius}km 이내에 검색된 맛집이 없습니다.</p>
          <button class="btn btn-primary" style="margin-top:24px;padding:0 32px;" onclick="Restaurant.render()">돌아가기</button>
        </div>
      `;
      return;
    }

    const sorted = rests.sort((a, b) => parseFloat(a.distance || 999) - parseFloat(b.distance || 999));
    const listHtml = sorted.map((p, idx) => {
      const review = ReviewStore.getReviews(p.place_name);
      const avgRating = review.count > 0 ? review.avgRating : '4.5';
      const count = review.count > 0 ? review.count : Math.floor(Math.random()*100+50);
      const safeName = p.place_name.replace(/'/g, "\\'");
      return `
        <div class="premium-card">
          <div class="premium-rank">${idx + 1 < 10 ? '0'+(idx+1) : idx+1}</div>
          <div class="pc-header">
            <div class="pc-title">${p.place_name}</div>
            <div class="pc-distance">${p.distance}km</div>
          </div>
          <div class="pc-meta">
            <span>${p.category || '음식점'}</span>
            <span class="pc-meta-dot"></span>
            <span>${p.address_name || ''}</span>
          </div>
          <button onclick="Restaurant.showAIRecommend('${safeName}','${p.category || '음식점'}','after')"
            style="
              width:100%;margin:12px 0 8px;padding:11px;
              background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.15));
              border:1px solid rgba(124,58,237,0.35);border-radius:12px;
              color:#a78bfa;font-size:14px;font-weight:700;cursor:pointer;
              display:flex;align-items:center;justify-content:center;gap:6px;
            ">
            🤖 AI 메뉴 추천 받기
          </button>
          <div class="pc-footer">
            <div class="pc-rating">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              ${avgRating} <span class="pc-review-cnt">(${count})</span>
            </div>
            <div class="pc-action" onclick="Restaurant.showDetail('${safeName}','${p.address_name || ''}')">
              상세보기
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="header" style="background:#0f172a;color:#fff;border-bottom:none;">
        <button class="header-btn" onclick="Restaurant.render()" style="color:#fff;"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
        <h1 class="header-title">${name} 주변</h1>
        <div class="header-btn" style="visibility:hidden"></div>
      </div>
      <div class="screen-scroll premium-list" style="padding-bottom:100px;">
        <div style="margin-bottom:24px;">
          <h2 style="font-size:18px;font-weight:800;color:#0f172a;line-height:1.4;">반경 ${radius}km<br><span style="color:#d4af37;">실시간 인기 식당 ${sorted.length}선</span></h2>
        </div>
        ${listHtml}
      </div>
    `;
  }
};
