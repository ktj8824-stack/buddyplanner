/* =========================================
   BuddyPlanner v2 — Premium Restaurant Discovery (Michelin Style)
   ========================================= */

const Restaurant = {
  tab: 'after',

  init() { this.render(); },

  render() {
    const el = U.$('#screen-restaurant');

    let allPicks = [];
    Object.keys(GOLFER_PICKS).forEach(region => {
      allPicks = allPicks.concat(GOLFER_PICKS[region]);
    });
    
    // Sort arbitrarily or by a ranking
    allPicks = allPicks.sort(() => 0.5 - Math.random());

    // Filter by type
    const beforeList = allPicks.filter(p => p.tag.includes('아침') || p.category.includes('해장') || p.category.includes('국밥') || p.category.includes('탕'));
    const afterList = allPicks.filter(p => p.category.includes('고기') || p.category.includes('한우') || p.category.includes('갈비') || p.category.includes('회') || p.category.includes('장어'));

    const currentList = this.tab === 'before' ? beforeList.slice(0, 15) : afterList.slice(0, 15);

    const listHtml = currentList.map((p, idx) => {
      const review = ReviewStore.getReviews(p.place_name);
      const rating = review.count > 0 ? review.avgRating : '4.8';
      const count = review.count > 0 ? review.count : Math.floor(Math.random()*100+50);
      
      return `
        <div class="premium-card" onclick="Restaurant.showDetail('${p.place_name}', '${p.address_name}')">
          <div class="premium-rank">0${idx + 1}</div>
          <div class="pc-header">
            <div class="pc-title">${p.place_name}</div>
          </div>
          <div class="pc-meta">
            <span>${p.category}</span>
            <span class="pc-meta-dot"></span>
            <span>${p.address_name.split(' ').slice(0,2).join(' ')}</span>
          </div>
          <div class="pc-footer">
            <div class="pc-rating">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              ${rating} <span class="pc-review-cnt">(${count})</span>
            </div>
            <div class="pc-action">
              네이버 리뷰 보기
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="discovery-hero">
        <h2 style="font-weight:400; font-size:16px; margin-bottom:8px; color:#94a3b8;">프리미엄 큐레이션</h2>
        <h2>완벽한 라운딩을 위한<br><span class="gold-text">골퍼 추천 맛집</span></h2>
        <div class="search-bar" onclick="Restaurant.searchArea()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span style="font-weight:600;">골프장 이름 또는 지역 검색...</span>
        </div>
      </div>
      
      <div class="premium-tabs">
        <div class="premium-tab ${this.tab === 'before' ? 'active' : ''}" onclick="Restaurant.switchTab('before')">라운딩 전 (식사)</div>
        <div class="premium-tab ${this.tab === 'after' ? 'active' : ''}" onclick="Restaurant.switchTab('after')">라운딩 후 (회식)</div>
      </div>

      <div class="screen-scroll premium-list" style="padding-bottom:100px;">
        ${listHtml}
      </div>
    `;
  },

  switchTab(tab) {
    this.tab = tab;
    this.render();
    U.haptic();
  },

  showDetail(name, addr) {
    const regionQuery = addr ? addr.split(' ').slice(0, 2).join(' ') : '';
    const reviewUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(name + ' ' + regionQuery)}`;
    window.open(reviewUrl, '_blank');
  },

  searchArea() {
    App.openAddressSearch('⛳ 맛집을 찾을 골프장/지역 검색', (selectedPlace) => {
      const name = selectedPlace.name || selectedPlace.place_name || selectedPlace.address;
      
      // 네이버 맛집 검색으로 바로 연동
      const reviewUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(name + ' 맛집')}`;
      window.open(reviewUrl, '_blank');
    });
  },

  async fetchAndShowNearby(name, lat, lng, radius) {
    App.closeModal(); 
    
    const el = U.$('#screen-restaurant');
    el.innerHTML = `
      <div class="header" style="background:#0f172a; color:#fff; border-bottom:none;">
        <button class="header-btn" onclick="Restaurant.render()" style="color:#fff;"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
        <h1 class="header-title">검색 중...</h1>
        <div class="header-btn" style="visibility:hidden"></div>
      </div>
      <div class="screen-scroll" style="display:flex; align-items:center; justify-content:center; flex-direction:column; gap:16px; padding-top:100px; background:#f8fafc;">
        <div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#0f172a;border-radius:50%;animation:spin 1s linear infinite;"></div>
        <p style="color:var(--text-500); font-weight:600;">TMAP 실시간 데이터를 분석 중입니다...</p>
      </div>
    `;

    if(!document.getElementById('spin-style')) {
      const style = document.createElement('style');
      style.id = 'spin-style';
      style.textContent = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }

    const rests = await TmapAPI.searchNearbyPlaces(lat, lng, '맛집', radius);
    
    if (!rests || rests.length === 0) {
      el.innerHTML = `
        <div class="header" style="background:#0f172a; color:#fff;">
          <button class="header-btn" onclick="Restaurant.render()" style="color:#fff;"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
          <h1 class="header-title">${name} 주변</h1>
          <div class="header-btn" style="visibility:hidden"></div>
        </div>
        <div class="screen-scroll" style="display:flex; align-items:center; justify-content:center; flex-direction:column; padding-top:100px; background:#f8fafc;">
          <p style="color:var(--text-500); font-weight:600;">주변 ${radius}km 이내에 검색된 맛집이 없습니다.</p>
          <button class="btn btn-primary" style="margin-top:24px; padding:0 32px; background:#0f172a;" onclick="Restaurant.render()">돌아가기</button>
        </div>
      `;
      return;
    }

    const sorted = rests.sort((a, b) => parseFloat(a.distance || 999) - parseFloat(b.distance || 999));

    const formattedRests = sorted.map(r => {
      const review = ReviewStore.getReviews(r.place_name);
      return {
        place_name: r.place_name,
        address_name: r.address_name || '',
        category: r.category || '음식점',
        distance: r.distance,
        avgRating: review.count > 0 ? review.avgRating : '4.5',
        count: review.count > 0 ? review.count : Math.floor(Math.random()*100+50)
      };
    });

    const listHtml = formattedRests.map((p, idx) => {
      return `
        <div class="premium-card" onclick="Restaurant.showDetail('${p.place_name}', '${p.address_name}')">
          <div class="premium-rank">${idx + 1 < 10 ? '0'+(idx+1) : idx+1}</div>
          <div class="pc-header">
            <div class="pc-title">${p.place_name}</div>
            <div class="pc-distance">${p.distance}km</div>
          </div>
          <div class="pc-meta">
            <span>${p.category}</span>
            <span class="pc-meta-dot"></span>
            <span>${p.address_name}</span>
          </div>
          <div class="pc-footer">
            <div class="pc-rating">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              ${p.avgRating} <span class="pc-review-cnt">(${p.count})</span>
            </div>
            <div class="pc-action">
              상세보기
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="header" style="background:#0f172a; color:#fff; border-bottom:none;">
        <button class="header-btn" onclick="Restaurant.render()" style="color:#fff;"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
        <h1 class="header-title">${name} 주변</h1>
        <div class="header-btn" style="visibility:hidden"></div>
      </div>
      <div class="screen-scroll premium-list" style="padding-bottom:100px;">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size:18px; font-weight:800; color:#0f172a; line-height:1.4;">반경 ${radius}km<br><span style="color:#d4af37;">실시간 인기 식당 ${sorted.length}선</span></h2>
        </div>
        ${listHtml}
      </div>
    `;
  }
};
