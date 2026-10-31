/* =========================================
   BuddyPlanner v2 — App Router
   ========================================= */

const App = {
  screens: ['home','calendar','register','timeline','restaurant','splash','onboarding','profile','upgrade','record','community','login','market','admin','insurance','event','raffle','ai'],

  init() {
    // 클라우드 동기화 준비 (설정이 없으면 아무 동작 안 함). 웹 카카오 로그인에서 돌아온 경우 그 정보를 받음
    const cloudRedirect = (typeof Cloud !== 'undefined') ? Cloud.init() : null;

    // 처음 설치 시에는 빈 일정으로 시작 (예전에는 지난 날짜의 예시 일정 2개가 들어갔음)
    if (!State.loadSchedules()) State.schedules = [];
    this.loadPreferences();
    // PRO 여부를 먼저 복원해야 PRO 회원에게 광고가 뜨지 않음
    Billing.loadCachedStatus();
    this.renderNav();
    this.renderAdBanner();
    this.initRewardedAd();
    this.prepareInterstitialAd();
    
    const hasOnboarded = localStorage.getItem('bp_onboarded') === 'true';
    // 구글 플레이 결제(RevenueCat)로 실제 구독 상태 확인 (비동기)
    Billing.init();

    // Automatically schedule alarms for today's events in the background
    Timeline.autoScheduleAllAlarms();
    
    // Capacitor Native DeepLink Event Listener
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      try {
        window.Capacitor.Plugins.App.addListener('appUrlOpen', (data) => {
          if (data && data.url) {
            console.log('🔗 DeepLink appUrlOpen triggered:', data.url);
            App.handleIncomingUrl(data.url);
          }
        });
      } catch (e) {
        console.warn('Capacitor App listener setup warning:', e);
      }
    }

    // Check for shared schedule link on direct startup (웹 & 앱 구동 시)
    let hasShared = false;
    const initialSched = this.handleIncomingUrl(window.location.href);
    if (initialSched) {
      window.history.replaceState('', document.title, window.location.pathname);
      hasShared = true;
    }

    // 업데이트 전부터 로그인해 쓰던 사용자는 클라우드 세션이 없으므로 연결 안내 (하루 1회)
    if (!cloudRedirect && typeof Cloud !== 'undefined' && Cloud.isConfigured() && !Cloud.isSignedIn()
        && localStorage.getItem('bp_logged_in') === 'true') {
      setTimeout(() => this.offerCloudConnect(), 5000);
    }

    if (cloudRedirect) {
      // 웹 카카오 로그인 후 돌아옴 → 서버 데이터를 받아 로그인 완료
      Login.completeRedirectLogin(cloudRedirect);
    } else if (!hasShared) {
      // Start with splash screen
      this.navigate('splash');
    }

    // Register Service Worker for PWA (웹 환경 전용)
    if ('serviceWorker' in navigator && (!window.Capacitor || !window.Capacitor.isNativePlatform())) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Service Worker Registered!', reg.scope))
          .catch(err => console.log('Service Worker registration failed:', err));
      });
    }
  },

  loadPreferences() {
    const font = localStorage.getItem('bp_font');
    if (font) {
      const fontStr = font === 'Pretendard' ? "'Pretendard Variable', 'Pretendard', sans-serif" : `'${font}', sans-serif`;
      document.documentElement.style.setProperty('--font-sans', fontStr);
      if (font !== 'Pretendard') {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Nanum+Myeongjo:wght@400;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
    }
    const size = localStorage.getItem('bp_size');
    if (size) {
      let basePx = 16;
      if (size === 'small') basePx = 14;
      if (size === 'large') basePx = 18;
      document.documentElement.style.fontSize = basePx + 'px';
    }
    const home = localStorage.getItem('bp_home');
    const office = localStorage.getItem('bp_office');
    if (!State.userAddresses) State.userAddresses = { home: null, office: null };
    
    try {
      if (home) State.userAddresses.home = home.startsWith('{') ? JSON.parse(home) : { name: home, lat: 0, lng: 0 };
    } catch(e) { State.userAddresses.home = { name: home, lat: 0, lng: 0 }; }
    
    try {
      if (office) State.userAddresses.office = office.startsWith('{') ? JSON.parse(office) : { name: office, lat: 0, lng: 0 };
    } catch(e) { State.userAddresses.office = { name: office, lat: 0, lng: 0 }; }
  },

  navigate(name) {
    if (!this.screens.includes(name)) return;
    this.screens.forEach(s => { const el=U.$(`#screen-${s}`); if(el)el.classList.remove('active'); });
    let target = U.$(`#screen-${name}`);
    if (!target) {
      target = U.el('div', 'screen');
      target.id = `screen-${name}`;
      const appContainer = U.$('#app');
      if (appContainer) appContainer.appendChild(target);
    }
    if (target) {
      target.classList.add('active');
      switch(name) {
        case 'home': Home.init(); break;
        case 'calendar': Calendar.init(); break;
        case 'register': Register.init(); break;
        case 'timeline': Timeline.init(); break;
        case 'restaurant': Restaurant.init(); break;
        case 'splash': Splash.init(); break;
        case 'onboarding': Onboarding.init(); break;
        case 'profile': Profile.render(); break;
        case 'upgrade': Upgrade.init(); break;
        case 'record': Record.init(); break;
        case 'community': Community.init(); break;
        case 'login': Login.init(); break;
        case 'market': Market.init(); break;
        case 'admin': Admin.init(); break;
        case 'insurance': Insurance.init(); break;
        case 'event': EventPage.init(); break;
        case 'raffle': Raffle.init(); break;
        case 'ai': AI.init(); break;
      }
    }
    this.updateNav(['timeline', 'register'].includes(name) ? 'calendar' : name);
    
    const hideHeaderScreens = ['splash', 'onboarding', 'login', 'timeline', 'register', 'restaurant', 'insurance', 'event', 'raffle', 'upgrade'];
    const nav = U.$('#top-header');
    if (nav) {
      if (hideHeaderScreens.includes(name)) {
        nav.style.display = 'none';
      } else {
        nav.style.display = 'flex';
      }
    }

    const bottomNav = U.$('#gnb');
    if (bottomNav) {
      if (name === 'splash' || name === 'onboarding' || name === 'login') {
        bottomNav.style.display = 'none';
      } else {
        bottomNav.style.display = 'flex';
      }
    }
    
    const adBanner = U.$('#adfit-banner-wrap');
    const hideBannerScreens = ['splash', 'onboarding', 'profile', 'record', 'community', 'login', 'admin', 'ai', 'upgrade'];
    // PRO 회원은 광고 제거
    const shouldHideBanner = hideBannerScreens.includes(name) || State.isPro;

    // 광고 배너가 보이는 화면은 하단 여백을 늘려 마지막 내용이 가려지지 않게
    document.body.classList.toggle('ad-visible', !shouldHideBanner);

    // 웹 환경 (AdFit) 배너 토글
    if (adBanner) {
      if (shouldHideBanner) {
        adBanner.style.display = 'none';
      } else {
        adBanner.style.display = 'flex';
      }
    }

    // 모바일 네이티브 (AdMob) 배너 토글
    if (window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.AdMob) {
      if (shouldHideBanner) {
        window.Capacitor.Plugins.AdMob.hideBanner().catch(e=>console.error('AdMob hide Error',e));
      } else {
        // 이미 렌더링 된 상태라면 다시 show 호출
        window.Capacitor.Plugins.AdMob.resumeBanner().catch(e=>console.error('AdMob resume Error',e));
      }
    }
    
    State.screen = name;
    window.scrollTo(0,0);
  },

  viewTimeline(idx) {
    State.currentScheduleIdx = idx;
    this.navigate('timeline');
  },

  renderNav() {
    if (U.$('#top-header')) return; // Prevent duplicate injection
    
    const nav = U.el('header','top-header');
    nav.id = 'top-header';
    nav.innerHTML = `
      <div class="top-nav-left" style="display:flex; align-items:center; cursor:pointer;" onclick="App.navigate('home')">
        <div class="glounge-brand-logo">
          <img src="img/buddybirdie_app_icon.png" class="brand-logo-icon" alt="" />
          버디플래너
          <span class="glounge-brand-badge" id="nav-pro-badge" style="${State.isPro ? '' : 'display:none'}">PRO</span>
        </div>
      </div>
      <div class="top-nav-right glounge-nav-actions" style="display:flex; align-items:center; gap:16px; margin-left:auto;">
        <!-- 전체 메뉴: 하단 탭에 없는 화면(커뮤니티, 마켓, 맛집, PRO) -->
        <button class="glounge-icon-btn" onclick="App.openMenu()" aria-label="전체 메뉴">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none">
            <line x1="3" y1="7" x2="21" y2="7"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="17" x2="21" y2="17"></line>
          </svg>
        </button>
      </div>
    `;
    U.$('#app').prepend(nav);

    const bottomNav = U.el('nav','bottom-nav');
    bottomNav.id = 'gnb';
    bottomNav.innerHTML = `
      <button class="gnb-item" data-s="home" onclick="App.navigate('home')">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>
        <span class="nav-label">홈</span>
      </button>
      <button class="gnb-item" data-s="calendar" onclick="App.navigate('calendar')">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span class="nav-label">일정</span>
      </button>
      <button class="gnb-item gnb-item-ai" data-s="ai" onclick="App.navigate('ai')">
        <div class="gnb-ai-btn-bubble">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
        <span class="nav-label ai-label">버디 AI</span>
      </button>
      <button class="gnb-item" data-s="record" onclick="App.navigate('record')">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
        <span class="nav-label">기록</span>
      </button>
      <button class="gnb-item" data-s="profile" onclick="App.navigate('profile')">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span class="nav-label">마이</span>
      </button>
    `;
    U.$('#app').appendChild(bottomNav);
  },

  // 카카오 AdFit 광고 단위 ID (발급 후 교체)
  ADFIT_UNIT_ID: 'DAN-XXXXXXXXXXXXXXXX',

  // 구글 애드몹 배너 ID (실제 광고 단위)
  ADMOB_BANNER_ID: 'ca-app-pub-6195996093323539/4522782054',
  // 구글 애드몹 전면(전환) 광고 ID (실제 광고 단위)
  ADMOB_INTERSTITIAL_ID: 'ca-app-pub-6195996093323539/7047651850',
  // 구글 애드몹 보상형 동영상 광고 ID (실제 광고 단위)
  ADMOB_REWARD_ID: 'ca-app-pub-6195996093323539/4620360062',

  /** 상단 ≡ 전체 메뉴: 하단 탭에 없는 화면으로 이동 */
  openMenu() {
    const items = [
      { s: 'community', icon: '💬', name: '버디 커뮤니티', desc: '조인 모집 · 라운딩 후기' },
      { s: 'market', icon: '🛒', name: '버디마켓', desc: '골프 용품 추천' },
      { s: 'raffle', icon: '🎁', name: '포인트 럭키드로우', desc: '무료 포인트로 응모' },
      { s: 'restaurant', icon: '🍽️', name: '추천 맛집', desc: '골프장 근처 식당' },
      { s: 'upgrade', icon: '👑', name: '버디플래너 PRO', desc: State.isPro ? 'PRO 이용 중' : 'AI 비서 · 무제한 일정 · 당일 예보 · 광고 제거' }
    ];
    this.showModal('전체 메뉴', `
      <div class="menu-sheet">
        ${items.map(i => `
          <button class="menu-sheet-item" onclick="App.closeModal(); App.navigate('${i.s}')">
            <span class="menu-sheet-icon">${i.icon}</span>
            <span class="menu-sheet-text"><b>${i.name}</b><small>${i.desc}</small></span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>`).join('')}
      </div>`);
  },

  /** 기존 사용자: 데이터를 지우지 않고 다시 로그인해 클라우드 백업을 켜도록 안내 */
  offerCloudConnect() {
    const today = new Date().toDateString();
    if (localStorage.getItem('bp_cloud_offer_day') === today) return;
    if (['splash', 'login', 'onboarding'].indexOf(State.screen) >= 0) return;
    localStorage.setItem('bp_cloud_offer_day', today);
    this.showModal('클라우드 백업을 켜세요', `
      <div class="pay-success" style="padding-top:var(--sp-2);">
        <p>이제 일정과 라운딩 기록을 클라우드에 안전하게 보관할 수 있어요.<br>
        폰을 바꿔도 같은 계정으로 로그인하면 그대로 불러와요.<br><br>
        한 번만 다시 로그인하면 이 기기의 데이터가 그대로 올라가요.</p>
        <button class="btn-primary" style="width:100%; margin-bottom:var(--sp-2);" onclick="App.closeModal(); App.navigate('login');">다시 로그인하고 백업 켜기</button>
        <button class="btn-ghost" style="width:100%;" onclick="App.closeModal();">나중에</button>
      </div>`);
  },

  /**
   * 테스트 광고 여부. 개발 중 실제 광고를 노출·클릭하면 애드몹 정책 위반이므로
   * 설정이 없으면 테스트 모드로 동작합니다. 출시 빌드는 config.js에서 ADS_TEST_MODE: false.
   */
  adsTestMode() {
    return (window.APP_CONFIG || {}).ADS_TEST_MODE !== false;
  },

  /** 구독 상태가 바뀌었을 때 광고 표시를 맞춤 (Billing에서 호출) */
  applyProStatus() {
    const badge = U.$('#nav-pro-badge');
    if (badge) badge.style.display = State.isPro ? '' : 'none';
    const adfit = U.$('#adfit-banner-wrap');
    const AdMob = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
    if (State.isPro) {
      document.body.classList.remove('ad-visible');
      if (adfit) adfit.style.display = 'none';
      if (AdMob && this.adMobActive) {
        AdMob.removeBanner().catch(e => console.warn('AdMob remove Error', e));
        this.adMobActive = false;
      }
    } else {
      this.renderAdBanner();
      this.prepareInterstitialAd();
    }
  },

  async prepareInterstitialAd() {
    if (State.isPro) return;
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      if (!window.Capacitor.Plugins.AdMob) {
        window.Capacitor.Plugins.AdMob = window.Capacitor.registerPlugin('AdMob');
      }
      const AdMob = window.Capacitor.Plugins.AdMob;
      if (AdMob) {
        try {
          await AdMob.prepareInterstitial({
            adId: this.ADMOB_INTERSTITIAL_ID,
            isTesting: App.adsTestMode()
          });
        } catch (e) {
          console.warn('AdMob Prepare Interstitial Warn:', e);
        }
      }
    }
  },

  async showInterstitialAd() {
    if (State.isPro) return; // PRO 회원은 전면 광고 없음
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      if (!window.Capacitor.Plugins.AdMob) {
        window.Capacitor.Plugins.AdMob = window.Capacitor.registerPlugin('AdMob');
      }
      const AdMob = window.Capacitor.Plugins.AdMob;
      if (AdMob) {
        try {
          await AdMob.showInterstitial();
          // 표시 후 다음 전환을 위해 백그라운드에서 재준비
          this.prepareInterstitialAd();
        } catch (e) {
          console.warn('AdMob Show Interstitial Warn:', e);
          this.prepareInterstitialAd();
        }
      }
    }
  },

  async initRewardedAd() {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      if (!window.Capacitor.Plugins.AdMob) {
        window.Capacitor.Plugins.AdMob = window.Capacitor.registerPlugin('AdMob');
      }
      const AdMob = window.Capacitor.Plugins.AdMob;
      if (AdMob) {
        try {
          // 리워드 지급 이벤트 리스너 등록
          // 광고를 끝까지 보면 서버에 적립 요청 (포인트는 서버 장부가 기준)
          AdMob.addListener('onRewardedVideoAdReward', () => {
            if (typeof Points !== 'undefined') Points.onAdRewarded();
          });
        } catch (e) {
          console.error('AdMob Rewarded Listener Error:', e);
        }
      }
    }
  },

  async renderAdBanner() {
    if (State.isPro) return; // PRO 회원은 배너 광고 없음
    // 모바일(Capacitor) 네이티브 환경인 경우 구글 애드몹 사용
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      if (!window.Capacitor.Plugins.AdMob) {
        window.Capacitor.Plugins.AdMob = window.Capacitor.registerPlugin('AdMob');
      }
      const AdMob = window.Capacitor.Plugins.AdMob;
      if (AdMob) {
        try {
          await AdMob.initialize({});
          
          // 하단 네비게이션 바 높이만큼 margin-bottom 설정 (네비바 바로 위에 표시)
          // CSS variables(--nav-h)나 안전 영역 등을 고려해 대략 60px ~ 70px 정도 띄웁니다.
          const bottomMargin = 65; 
          
          const options = {
            adId: this.ADMOB_BANNER_ID,
            adSize: 'BANNER', // BannerAdSize.BANNER
            position: 'BOTTOM_CENTER', // BannerAdPosition.BOTTOM_CENTER
            margin: bottomMargin,
            isTesting: App.adsTestMode()
          };
          await AdMob.showBanner(options);
          
          // 전역 광고 상태 저장 (앱 전환 시 숨김/보임 처리용)
          this.adMobActive = true;
          return;
        } catch (e) {
          console.error('AdMob Init/Show Error:', e);
        }
      }
    }

    // 네이티브가 아닌 경우(웹)이거나 애드몹 초기화 실패 시 기존 카카오 AdFit 실행 (옵션)
    // 이미 광고 있으면 중복 생성 방지
    if (U.$('#adfit-banner-wrap')) return;

    const wrap = U.el('div', '');
    wrap.id = 'adfit-banner-wrap';
    wrap.style.cssText = `
      position: fixed;
      bottom: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px));
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: var(--app-w);
      z-index: 999;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(10,10,15,0.95);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255,255,255,0.08);
      padding: 6px 0;
      min-height: 62px;
    `;

    // AdFit 스크립트 삽입
    const ins = document.createElement('ins');
    ins.className = 'kakao_ad_area';
    ins.style.cssText = 'display:none;';
    ins.setAttribute('data-ad-unit', this.ADFIT_UNIT_ID);
    ins.setAttribute('data-ad-width', '320');
    ins.setAttribute('data-ad-height', '50');

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;

    wrap.appendChild(ins);
    wrap.appendChild(script);
    document.body.appendChild(wrap);


    // 광고 영역만큼 하단 여백 추가
    document.documentElement.style.setProperty('--ad-banner-height', '62px');
  },


  updateNav(name) {
    U.$$('.gnb-item').forEach(i => i.classList.toggle('active', i.dataset.s === name));
  },

  /** @param {number} [schedIdx] 특정 일정의 골프장 날씨 (없으면 가장 가까운 예정 라운딩) */
  async showWeather(schedIdx) {
    let targetName = '서울특별시 강남구';
    let targetLat = 37.4979;
    let targetLng = 127.0276;
    let roundSched = null;
    const picked = (typeof schedIdx === 'number') ? State.schedules[schedIdx] : null;

    if (picked && picked.course && picked.course.lat && picked.course.lng) {
      targetName = picked.course.name;
      targetLat = picked.course.lat;
      targetLng = picked.course.lng;
      const now = new Date();
      // 지난 일정이면 당일 예보는 표시하지 않음
      if (new Date(picked.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) roundSched = picked;
    } else if (State.schedules && State.schedules.length > 0) {
      const now = new Date();
      const futureScheds = State.schedules
        .filter(s => s && s.date && new Date(s.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
        .sort((a,b) => new Date(a.date) - new Date(b.date));
      roundSched = futureScheds[0] || null;
      const targetSched = roundSched || State.schedules[State.currentScheduleIdx] || State.schedules[0];
      if (targetSched && targetSched.course && targetSched.course.lat && targetSched.course.lng) {
        targetName = targetSched.course.name;
        targetLat = targetSched.course.lat;
        targetLng = targetSched.course.lng;
      }
    }
    const safeName = U.esc(targetName);

    this.showModal('골프장 날씨', `
      <div style="padding: 32px 16px; text-align: center; color: var(--text-300); font-weight:600;">
        <div style="font-size:28px; margin-bottom:12px; animation:spin 1s infinite linear;">📡</div>
        <div style="font-size:15px; color:var(--text-100); margin-bottom:4px;">${safeName}</div>
        <div style="font-size:13px; color:var(--text-400);">기상 데이터를 불러오는 중입니다...</div>
      </div>
    `);

    // 2. 현재 날씨 + (PRO) 라운딩 당일 예보를 함께 조회
    const [weather, forecast] = await Promise.all([
      WeatherAPI.fetchWeather(targetLat, targetLng),
      (roundSched && State.isPro)
        ? WeatherAPI.fetchRoundForecast(targetLat, targetLng, roundSched.date, roundSched.teeOff)
        : Promise.resolve(null)
    ]);

    const bg = U.$('#app-modal');
    if (!bg) return;
    const list = bg.querySelector('.modal-list');
    if (!list) return;

    // 조회 실패 시 가짜 날씨 대신 안내 표시
    const currentHTML = weather ? `
          <div style="display:flex; align-items:center; gap:20px; margin-top:4px;">
            <div style="font-size:60px; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.15));">${weather.weatherIcon}</div>
            <div style="display:flex; flex-direction:column; align-items:flex-start;">
              <div style="font-size:12px; font-weight:700; color:var(--text-400);">지금 날씨</div>
              <div style="font-size:38px; font-weight:900; color:var(--text-900); font-family:'Montserrat', sans-serif; line-height:1;">
                ${weather.temp}<span style="font-size:22px; color:var(--text-300); font-weight:600;">°C</span>
              </div>
              <div style="font-size:16px; font-weight:700; color:var(--text-100); margin-top:4px;">${weather.weatherText}</div>
            </div>
          </div>

          <div style="width:100%; display:flex; justify-content:space-around; background:var(--bg-sub, #f9fafb); border:1px solid var(--border-default); border-radius:16px; padding:16px 8px; margin-top:4px;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:4px; flex:1;">
              <span style="font-size:12px; color:var(--text-400); font-weight:600;">체감 온도</span>
              <span style="font-size:15px; color:var(--text-100); font-weight:800;">${weather.feelsLike}°C</span>
            </div>
            <div style="width:1px; background:var(--border-default);"></div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:4px; flex:1;">
              <span style="font-size:12px; color:var(--text-400); font-weight:600;">바람 (풍속)</span>
              <span style="font-size:15px; color:${weather.windSpeed >= 4 ? '#ef4444' : 'var(--text-100)'}; font-weight:800;">${weather.windSpeed} m/s</span>
            </div>
            <div style="width:1px; background:var(--border-default);"></div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:4px; flex:1;">
              <span style="font-size:12px; color:var(--text-400); font-weight:600;">습도</span>
              <span style="font-size:15px; color:var(--text-100); font-weight:800;">${weather.humidity}%</span>
            </div>
          </div>` : `
          <div class="wx-empty">날씨 정보를 불러오지 못했어요.<br>인터넷 연결을 확인한 뒤 다시 시도해 주세요.</div>`;

    list.innerHTML = `
        <div style="padding: 16px; display:flex; flex-direction:column; align-items:center; gap:16px;">
          <div style="font-size:13px; font-weight:700; color:var(--text-400); background:rgba(0,0,0,0.04); padding:6px 14px; border-radius:12px; display:flex; align-items:center; gap:6px;">
            <span>📍</span> <span>${safeName}</span>
          </div>
          ${currentHTML}
          ${roundSched ? this.roundForecastHTML(roundSched, forecast) : ''}
          <button class="btn btn-primary" style="width:100%; margin-top:8px;" onclick="App.closeModal()">확인</button>
        </div>
      `;
  },

  /** 라운딩 당일 예보 영역 (PRO 전용) */
  roundForecastHTML(sched, forecast) {
    const d = new Date(sched.date);
    const title = `⛳ 라운딩 당일 예보 · ${d.getMonth() + 1}/${d.getDate()} ${U.esc(sched.teeOff || '')} 티오프`;

    if (!State.isPro) {
      return `
          <div class="wx-round is-locked">
            <div class="wx-round-title">${title}</div>
            <p>PRO 회원은 라운딩 당일 티오프 시간대의 기온·강수 확률·바람을<br>최대 ${WeatherAPI.FORECAST_DAYS}일 전부터 미리 볼 수 있어요.</p>
            <button class="btn-primary" style="width:100%;" onclick="App.closeModal(); App.navigate('upgrade');">👑 PRO로 당일 예보 보기</button>
          </div>`;
    }
    if (forecast && forecast.tooFar) {
      return `
          <div class="wx-round">
            <div class="wx-round-title">${title}</div>
            <p>예보는 라운딩 ${WeatherAPI.FORECAST_DAYS}일 전부터 볼 수 있어요. (${forecast.daysLeft}일 뒤 공개)</p>
          </div>`;
    }
    if (!forecast || !forecast.hours) {
      return `
          <div class="wx-round">
            <div class="wx-round-title">${title}</div>
            <p>예보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
          </div>`;
    }
    return `
          <div class="wx-round">
            <div class="wx-round-title">${title}</div>
            <div class="wx-hours">
              ${forecast.hours.map(h => `
                <div class="wx-hour">
                  <span class="wx-hour-label">${h.label}</span>
                  <span class="wx-hour-time">${h.time}</span>
                  <span class="wx-hour-icon">${h.icon}</span>
                  <span class="wx-hour-temp">${h.temp}°</span>
                  <span class="wx-hour-meta ${h.pop >= 60 ? 'is-warn' : ''}">☔ ${h.pop}%</span>
                  <span class="wx-hour-meta ${h.wind >= 5 ? 'is-warn' : ''}">💨 ${h.wind}m/s</span>
                </div>`).join('')}
            </div>
            <div class="wx-advice">${forecast.advice}</div>
          </div>`;
  },

  showModal(title, content) {
    this.closeModal();
    const bg = U.el('div','modal-bg');
    bg.id = 'app-modal';
    bg.innerHTML = `<div class="modal-panel"><div class="modal-handle"></div><h3 class="modal-title">${title}</h3><div class="modal-list">${content}</div></div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click', e => { if (e.target===bg) this.closeModal(); });
    requestAnimationFrame(() => bg.classList.add('open'));
  },

  closeModal() {
    const bg = U.$('#app-modal');
    if (bg) {
      bg.classList.remove('open');
      setTimeout(() => bg.remove(), 300);
    }
  },

  openAddressSearch(title, onSelectCallback) {
    this.closeModal();
    const bg = U.el('div','modal-bg');
    bg.id = 'app-modal';
    
    // We attach search logic to window so HTML string buttons can call it
    window._searchAddress = async () => {
      const input = U.$('#addr-search-input');
      const keyword = input.value.trim();
      if (!keyword) { U.toast('검색어를 입력해주세요'); return; }
      
      const resContainer = U.$('#addr-search-results');
      resContainer.innerHTML = '<div style="padding:var(--sp-4);text-align:center;color:var(--text-light)">검색 중...</div>';
      
      const places = await TmapAPI.searchPlace(keyword, false);
      if (!places || places.length === 0) {
        resContainer.innerHTML = '<div style="padding:var(--sp-4);text-align:center;color:var(--text-light)">검색 결과가 없습니다.</div>';
        return;
      }
      
      // Save globally for callback reference
      window._addrSearchResults = places;
      
      resContainer.innerHTML = places.map((p, i) => `
        <div class="list-item" style="cursor:pointer" onclick="window._selectAddress(${i})">
          <div class="item-title">${p.name || p.place_name}</div>
          ${(p.address || p.address_name) ? `<div class="item-sub">${p.address || p.address_name}</div>` : ''}
        </div>
      `).join('');
    };

    window._selectAddress = (idx) => {
      const p = window._addrSearchResults[idx];
      onSelectCallback({
        name: p.name || p.place_name,
        lat: p.lat || p.y,
        lng: p.lng || p.x
      });
      App.closeModal();
    };

    bg.innerHTML = `
      <div class="modal-panel" style="display:flex; flex-direction:column; height:80vh;">
        <div class="modal-handle"></div>
        <h3 class="modal-title">${title}</h3>
        <div style="padding:0 var(--sp-4) var(--sp-4) var(--sp-4); display:flex; gap:var(--sp-2);">
          <input type="text" id="addr-search-input" class="address-input" placeholder="정확한 주소 또는 건물명" style="flex:1" onkeypress="if(event.key==='Enter') window._searchAddress()" />
          <button class="btn btn-primary" onclick="window._searchAddress()" style="width:auto; padding:0 var(--sp-4);">검색</button>
        </div>
        <div id="addr-search-results" class="modal-list" style="flex:1; overflow-y:auto;">
          <div style="padding:var(--sp-4);text-align:center;color:var(--text-light)">검색어를 입력하고 검색 버튼을 누르세요.</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(bg);
    bg.addEventListener('click', e => { if (e.target===bg) this.closeModal(); });
    requestAnimationFrame(() => {
      bg.classList.add('open');
      const input = U.$('#addr-search-input');
      if (input) setTimeout(() => input.focus(), 100);
    });
  },

  parseSharedPayload(rawUrl) {
    if (!rawUrl) return null;
    try {
      let searchParams = null;
      let hash = '';
      if (rawUrl.includes('?')) {
        const queryStr = rawUrl.substring(rawUrl.indexOf('?'));
        searchParams = new URLSearchParams(queryStr);
      }
      if (rawUrl.includes('#')) {
        hash = rawUrl.substring(rawUrl.indexOf('#'));
      }
      
      let sharedPayload = searchParams ? searchParams.get('s') : null;
      
      if (sharedPayload) {
        while (sharedPayload.includes('%')) {
          try {
            const decoded = decodeURIComponent(sharedPayload);
            if (decoded === sharedPayload) break;
            sharedPayload = decoded;
          } catch(e) { break; }
        }
        
        const arr = sharedPayload.split('|');
        let schedData = null;

        if (arr[0] === 'v2') {
          // Version 2 format (주소, 집결지, 식후 식당 전체 포함)
          schedData = {
            date: arr[1] ? new Date(arr[1]) : new Date(),
            teeOff: arr[2] || '07:00',
            startPoint: arr[3] || '집',
            course: { name: arr[4] || '', addr: arr[5] || '', lat: parseFloat(arr[6]) || 0, lng: parseFloat(arr[7]) || 0, region: arr[25] || '' },
            companions: [],
            prepTime: parseInt(arr[11]) || 30,
            travelTime: parseInt(arr[12]) || 60,
            hasMeal: arr[13] === '1',
            mealDuration: parseInt(arr[14]) || 30,
            travelToRestaurant: parseInt(arr[15]) || 0,
            hasMeetingPoint: arr[16] === '1',
            travelToMeeting: parseInt(arr[20]) || 0,
            hasPostMeal: arr[21] === '1'
          };
          if (arr[8]) {
            schedData.mealRestaurant = { name: arr[8], lat: parseFloat(arr[9]) || 0, lng: parseFloat(arr[10]) || 0 };
          }
          if (arr[16] === '1') {
            schedData.meetingPointObj = { name: arr[17] || '집결지', lat: parseFloat(arr[18]) || 0, lng: parseFloat(arr[19]) || 0 };
          }
          if (arr[22]) {
            schedData.postMealRestaurant = { name: arr[22], lat: parseFloat(arr[23]) || 0, lng: parseFloat(arr[24]) || 0 };
          }
        } else {
          // Version 1 레거시 형식
          schedData = {
            date: arr[0] ? new Date(arr[0]) : new Date(),
            teeOff: arr[1] || '07:00',
            startPoint: arr[2] || '집',
            course: { name: arr[3] || '', addr: '', lat: parseFloat(arr[4]) || 0, lng: parseFloat(arr[5]) || 0 },
            companions: [],
            prepTime: parseInt(arr[9]) || 30,
            travelTime: parseInt(arr[10]) || 60,
            hasMeal: arr[11] === '1',
            mealDuration: parseInt(arr[12]) || 30,
            travelToRestaurant: parseInt(arr[13]) || 0
          };
          if (arr[6]) {
            schedData.mealRestaurant = { name: arr[6], lat: parseFloat(arr[7]) || 0, lng: parseFloat(arr[8]) || 0 };
          }
        }
        return schedData;
      } else if (hash && hash.startsWith('#shared=')) {
        const payload = decodeURIComponent(hash.substring(8));
        const decoded = decodeURIComponent(atob(payload));
        const schedData = JSON.parse(decoded);
        if (schedData.date) schedData.date = new Date(schedData.date);
        return schedData;
      }
    } catch (e) {
      console.error('Failed to parse shared payload:', e);
    }
    return null;
  },

  /**
   * 공유 링크로 들어온 일정은 외부에서 조작될 수 있으므로,
   * 문자열에서 HTML/스크립트에 쓰일 수 있는 문자를 제거하고 길이를 제한합니다.
   */
  sanitizeShared(data) {
    if (!data) return null;
    const clean = (v, depth = 0) => {
      if (typeof v === 'string') return v.replace(/[<>"'`\\]/g, '').slice(0, 200);
      if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
      if (v instanceof Date) return isNaN(v.getTime()) ? new Date() : v;
      if (Array.isArray(v)) return depth > 3 ? [] : v.slice(0, 20).map(x => clean(x, depth + 1));
      if (v && typeof v === 'object') {
        if (depth > 3) return {};
        const out = {};
        Object.keys(v).forEach(k => { out[k] = clean(v[k], depth + 1); });
        return out;
      }
      return v;
    };
    const out = clean(data);
    if (!/^\d{1,2}:\d{2}$/.test(out.teeOff || '')) out.teeOff = '07:00';
    return out;
  },

  handleIncomingUrl(urlStr) {
    if (!urlStr) return null;
    console.log('🔗 DeepLink URL received:', urlStr);
    const schedData = this.sanitizeShared(this.parseSharedPayload(urlStr));
    if (schedData) {
      State.incomingSchedule = schedData;
      console.log('✅ Shared schedule parsed successfully:', schedData);
      setTimeout(() => this.showSharedScheduleModal(schedData), 300);
      return schedData;
    }
    return null;
  },

  showSharedScheduleModal(schedData) {
    if (!schedData) return;
    const courseName = schedData.course && schedData.course.name ? schedData.course.name : '골프장';
    const courseAddr = schedData.course && schedData.course.addr ? ` (${schedData.course.addr})` : '';
    const dateStr = schedData.date ? U.fmtDateShort(schedData.date) : '';
    const teeOff = schedData.teeOff || '';
    const meetingName = (schedData.hasMeetingPoint && schedData.meetingPointObj) ? schedData.meetingPointObj.name : null;
    const mealName = (schedData.hasMeal && schedData.mealRestaurant) ? schedData.mealRestaurant.name : null;

    const modalId = 'shared-schedule-confirm-modal';
    const oldModal = document.getElementById(modalId);
    if (oldModal) oldModal.remove();

    const html = `
      <div id="${modalId}" class="modal-bg open" style="z-index:999999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6); position:fixed; top:0; left:0; right:0; bottom:0;">
        <div class="modal-card" style="background:#ffffff; border-radius:24px; padding:24px; width:90%; max-width:380px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.3); transform:scale(1); transition:transform 0.2s ease;">
          <div style="font-size:42px; margin-bottom:6px;">⛳</div>
          <h3 style="font-size:20px; font-weight:800; color:#111111; margin-bottom:6px;">공유받은 라운딩 일정</h3>
          <p style="font-size:13px; color:#666666; margin-bottom:18px;">카카오톡으로 공유된 일정을 내 스케줄에 등록할까요?</p>
          
          <div style="background:#f4f6f8; border-radius:16px; padding:16px; text-align:left; font-size:14px; margin-bottom:22px; line-height:1.7; color:#222;">
            <div><strong>📍 골프장:</strong> ${courseName}${courseAddr}</div>
            <div><strong>📅 라운딩 일시:</strong> ${dateStr} ${teeOff}</div>
            ${meetingName ? `<div style="color:#007aff;"><strong>🤝 중간 집결지:</strong> ${meetingName}</div>` : ''}
            ${mealName ? `<div style="color:#28a745;"><strong>🍽️ 식당:</strong> ${mealName}</div>` : ''}
            <div><strong>🚗 출발지 기준:</strong> ${schedData.startPoint || '집'}</div>
          </div>

          <div style="display:flex; gap:10px;">
            <button id="btn-cancel-shared-sched" style="flex:1; padding:14px; border:none; background:#e9ecef; color:#495057; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer;">취소</button>
            <button id="btn-accept-shared-sched" style="flex:2; padding:14px; border:none; background:#007aff; color:#ffffff; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; box-shadow:0 4px 12px rgba(0,122,255,0.3);">내 일정에 등록 ⛳</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('btn-cancel-shared-sched').onclick = () => {
      const el = document.getElementById(modalId);
      if (el) el.remove();
    };

    document.getElementById('btn-accept-shared-sched').onclick = () => {
      const el = document.getElementById(modalId);
      if (el) el.remove();
      if (!Billing.guardScheduleLimit()) return;
      State.addSchedule(schedData);
      State.currentScheduleIdx = State.schedules.length - 1;
      App.viewTimeline(State.currentScheduleIdx);
      U.toast('✅ 공유받은 일정이 내 플래너에 성공적으로 등록되었습니다!');
    };
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
