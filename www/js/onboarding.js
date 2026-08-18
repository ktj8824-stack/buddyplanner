/* =========================================
   BuddyPlanner v2 — Onboarding Screen
   ========================================= */

const Onboarding = {
  fontFamily: 'Pretendard',
  fontSize: 'medium',
  homeObj: null,
  officeObj: null,
  
  init() {
    this.render();
  },

  render() {
    const el = U.$('#screen-onboarding');
    el.innerHTML = `
      <div class="onboarding-container">
        <div class="ob-header">
          <h2 class="ob-title">기본 설정</h2>
          <p class="ob-desc">버디플래너를 내 스타일에 맞게 설정해보세요.</p>
        </div>

        <div class="ob-section">
          <div class="ob-section-title">글꼴 스타일</div>
          <div class="font-options" id="ob-fonts">
            <div class="ob-pill on" onclick="Onboarding.setFont('Pretendard', this)">고딕 (기본)</div>
            <div class="ob-pill" onclick="Onboarding.setFont('Nanum Myeongjo', this)">명조체</div>
            <div class="ob-pill" onclick="Onboarding.setFont('Gowun Dodum', this)">둥근고딕</div>
          </div>
        </div>

        <div class="ob-section">
          <div class="ob-section-title">글자 크기</div>
          <div class="size-options" id="ob-sizes">
            <div class="ob-pill" onclick="Onboarding.setSize('small', this)">작게</div>
            <div class="ob-pill on" onclick="Onboarding.setSize('medium', this)">보통</div>
            <div class="ob-pill" onclick="Onboarding.setSize('large', this)">크게</div>
          </div>
        </div>

        <div class="ob-section">
          <div class="ob-section-title">자주 출발하는 장소 등록</div>
          <div class="ob-input-group" style="display:flex; flex-direction:column; gap:8px;">
            <div class="setting-item" style="cursor:pointer; background:var(--bg-input); padding:16px; border-radius:12px; display:flex; align-items:center;" onclick="Onboarding.searchAddress('home')">
              <span class="address-icon" style="margin-right:12px; font-size:18px;">🏠</span>
              <div id="ob-home-label" style="flex:1; color:var(--text-400); font-size:15px; font-weight:600;">집 주소 검색하기 (터치)</div>
            </div>
            <div class="setting-item" style="cursor:pointer; background:var(--bg-input); padding:16px; border-radius:12px; display:flex; align-items:center;" onclick="Onboarding.searchAddress('work')">
              <span class="address-icon" style="margin-right:12px; font-size:18px;">🏢</span>
              <div id="ob-office-label" style="flex:1; color:var(--text-400); font-size:15px; font-weight:600;">회사 주소 검색하기 (터치)</div>
            </div>
          </div>
        </div>

        <div class="ob-footer">
          <button class="btn-primary" onclick="Onboarding.complete()">설정 완료 및 시작하기</button>
        </div>
      </div>
    `;
    
    // Inject custom fonts if not already there
    this.injectFonts();
  },

  injectFonts() {
    if (!document.getElementById('ob-custom-fonts')) {
      const link = document.createElement('link');
      link.id = 'ob-custom-fonts';
      link.href = 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Nanum+Myeongjo:wght@400;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  },

  setFont(font, btn) {
    this.fontFamily = font;
    U.$$('#ob-fonts .ob-pill').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    
    // Live preview
    const fontStr = font === 'Pretendard' ? "'Pretendard Variable', 'Pretendard', sans-serif" : `'${font}', sans-serif`;
    document.documentElement.style.setProperty('--font-sans', fontStr);
    U.haptic();
  },

  setSize(size, btn) {
    this.fontSize = size;
    U.$$('#ob-sizes .ob-pill').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    
    // Live preview
    let basePx = 16;
    if (size === 'small') basePx = 14;
    if (size === 'large') basePx = 18;
    document.documentElement.style.fontSize = basePx + 'px';
    U.haptic();
  },

  searchAddress(type) {
    const title = type === 'home' ? '🏠 집 주소 검색' : '🏢 회사 주소 검색';
    App.openAddressSearch(title, (selectedPlace) => {
      if (type === 'home') {
        this.homeObj = selectedPlace;
        const el = U.$('#ob-home-label');
        if (el) {
          el.textContent = selectedPlace.name;
          el.style.color = 'var(--text-800)';
        }
      } else {
        this.officeObj = selectedPlace;
        const el = U.$('#ob-office-label');
        if (el) {
          el.textContent = selectedPlace.name;
          el.style.color = 'var(--text-800)';
        }
      }
      U.toast('✅ 주소가 정확히 등록되었습니다.');
      U.haptic();
    });
  },

  complete() {
    // Save state
    localStorage.setItem('bp_onboarded', 'true');
    localStorage.setItem('bp_font', this.fontFamily);
    localStorage.setItem('bp_size', this.fontSize);
    
    if (!State.userAddresses) State.userAddresses = { home: '', office: '' };
    if (this.homeObj) {
      State.userAddresses.home = this.homeObj;
      localStorage.setItem('bp_home', JSON.stringify(this.homeObj));
    }
    if (this.officeObj) {
      State.userAddresses.office = this.officeObj;
      localStorage.setItem('bp_office', JSON.stringify(this.officeObj));
    }
    
    U.toast('✅ 설정이 완료되었습니다!');
    
    setTimeout(() => {
      App.navigate('home');
    }, 400);
  }
};
