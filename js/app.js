/* =========================================
   BuddyPlanner v2 — App Router
   ========================================= */

const App = {
  screens: ['home','calendar','register','timeline','restaurant','splash','onboarding','profile','upgrade','record','community'],

  init() {
    if (!State.loadSchedules()) {
      State.initDemo();
    }
    this.loadPreferences();
    this.renderNav();
    this.renderAdBanner();
    
    const hasOnboarded = localStorage.getItem('bp_onboarded') === 'true';
    State.isPro = localStorage.getItem('bp_pro') === 'true';

    // Automatically schedule alarms for today's events in the background
    Timeline.autoScheduleAllAlarms();
    
    // Check for shared schedule link (두 가지 형식 모두 지원)
    const searchParams = new URLSearchParams(window.location.search);
    const sharedPayload = searchParams.get('s');
    const hash = window.location.hash;
    let hasShared = false;

    if (sharedPayload) {
      // 카카오톡 공유 링크 (?s= 형식, 초경량 압축)
      try {
        const arr = sharedPayload.split('|');
        const schedData = {
          date: arr[0] ? new Date(arr[0]) : new Date(),
          teeOff: arr[1] || '07:00',
          startPoint: arr[2] || '집',
          course: { name: arr[3] || '', lat: parseFloat(arr[4]) || 0, lng: parseFloat(arr[5]) || 0 },
          companions: [],
          prepTime: parseInt(arr[9]) || 30,
          travelTime: parseInt(arr[10]) || 60,
          hasMeal: arr[11] === '1',
          mealDuration: parseInt(arr[12]) || 30,
          travelToRestaurant: parseInt(arr[13]) || 0
        };
        if (arr[6]) {
          schedData.restaurant = { name: arr[6], lat: parseFloat(arr[7]) || 0, lng: parseFloat(arr[8]) || 0 };
        }
        State.addSchedule(schedData);
        State.currentScheduleIdx = State.schedules.length - 1;
        window.history.replaceState('', document.title, window.location.pathname);
        hasShared = true;
      } catch (e) {
        console.error('Kakao shared schedule import failed', e);
        U.toast('공유된 일정을 불러오는데 실패했습니다.');
      }
    } else if (hash && hash.startsWith('#shared=')) {
      // 타임라인 공유하기 링크 (#shared= 형식, 풀 JSON)
      try {
        const payload = decodeURIComponent(hash.substring(8));
        const decoded = decodeURIComponent(atob(payload));
        const schedData = JSON.parse(decoded);
        if (schedData.date) schedData.date = new Date(schedData.date);
        State.addSchedule(schedData);
        State.currentScheduleIdx = State.schedules.length - 1;
        window.history.replaceState('', document.title, window.location.pathname);
        hasShared = true;
      } catch (e) {
        console.error('Text shared schedule import failed', e);
        U.toast('공유된 일정을 불러오는데 실패했습니다.');
      }
    }

    if (hasShared) {
      this.navigate('timeline');
    } else {
      // Start with splash screen
      this.navigate('splash');
      
      // Automatically transition from splash
      setTimeout(() => {
        if (hasOnboarded) {
          if (State.schedules.length > 0) {
            this.navigate('calendar');
          } else {
            this.navigate('home');
          }
        } else {
          this.navigate('onboarding');
        }
      }, 2000);
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
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
      }
    }
    this.updateNav(name === 'timeline' ? 'home' : name);
    
    const nav = U.$('#top-header');
    if (nav) {
      if (name === 'splash' || name === 'onboarding') {
        nav.style.display = 'none';
      } else {
        nav.style.display = 'flex';
      }
    }

    const bottomNav = U.$('#gnb');
    if (bottomNav) {
      if (name === 'splash' || name === 'onboarding') {
        bottomNav.style.display = 'none';
      } else {
        bottomNav.style.display = 'flex';
      }
    }
    
    const adBanner = U.$('#adfit-banner-wrap');
    if (adBanner) {
      if (['splash', 'onboarding', 'profile', 'record', 'community'].includes(name)) {
        adBanner.style.display = 'none';
      } else {
        adBanner.style.display = 'flex';
      }
    }
    
    State.screen = name;
    window.scrollTo(0,0);
  },

  viewTimeline(idx) {
    State.currentScheduleIdx = idx;
    const target = U.$('#screen-timeline');
    if (target) {
      this.screens.forEach(s => { const el=U.$(`#screen-${s}`); if(el)el.classList.remove('active'); });
      target.classList.add('active');
      Timeline.init(idx);
    }
    this.updateNav('home');
    State.screen = 'timeline';
    window.scrollTo(0,0);
  },

  renderNav() {
    if (U.$('#top-header')) return; // Prevent duplicate injection
    
    const nav = U.el('header','top-header');
    nav.id = 'top-header';
    nav.innerHTML = `
      <div class="top-nav-left" style="display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="App.navigate('home')">
        <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg, #222 0%, #000 100%);color:#bf953f;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display', serif;font-size:14px;font-weight:700;font-style:italic;text-shadow:0 1px 3px rgba(0,0,0,0.8);box-shadow:0 2px 5px rgba(0,0,0,0.2);">myB</div>
        <div style="font-family:'Montserrat', sans-serif;font-size:18px;font-weight:600;color:var(--text-100);letter-spacing:0.02em;">buddybirdie</div>
      </div>
      <div class="top-nav-right" style="display:flex; align-items:center; gap:16px; margin-left:auto;">
        <!-- Weather Icon -->
        <button class="top-nav-item" style="padding:0;color:#f59e0b;" aria-label="날씨" onclick="App.showWeather()">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </button>
        <!-- Search -->
        <button class="top-nav-item" style="padding:0;color:var(--text-100);" aria-label="검색">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
        <!-- Notification -->
        <button class="top-nav-item" style="padding:0;color:var(--text-100);position:relative;" aria-label="알림">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <div style="position:absolute;top:-2px;right:-2px;background:#ef4444;color:#fff;font-size:9px;font-weight:800;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid #fff;">N</div>
        </button>
        <!-- Profile Image -->
        <button class="top-nav-item" style="padding:0;" onclick="App.navigate('profile')" aria-label="프로필">
          <div style="width:26px;height:26px;border-radius:50%;overflow:hidden;border:1px solid var(--border-default);">
            <img src="https://images.unsplash.com/photo-1587329310686-91414b8e3cb7?ixlib=rb-1.2.1&auto=format&fit=crop&w=64&q=80" alt="Profile" style="width:100%;height:100%;object-fit:cover;" />
          </div>
        </button>
        <!-- Menu -->
        <button class="top-nav-item" style="padding:0;color:var(--text-100);" aria-label="메뉴">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>
    `;
    U.$('#app').prepend(nav);

    const bottomNav = U.el('nav','bottom-nav');
    bottomNav.id = 'gnb';
    bottomNav.innerHTML = `
      <button class="gnb-item active" data-s="home" onclick="App.navigate('home')">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span class="nav-label">홈</span>
      </button>
      <button class="gnb-item" data-s="record" onclick="App.navigate('record')">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        <span class="nav-label">기록</span>
      </button>
      <button class="gnb-item" data-s="community" onclick="App.navigate('community')">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span class="nav-label">커뮤니티</span>
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

  renderAdBanner() {
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

  showWeather() {
    this.showModal('실시간 골프장 날씨', '<div style="padding: 32px 16px; text-align: center; color: var(--text-300); font-weight:600;"><div style="font-size:24px; margin-bottom:12px;">📡</div>기상청 데이터를 불러오는 중입니다...</div>');
    
    // Simulate API Fetch
    setTimeout(() => {
      const bg = U.$('#app-modal');
      if (!bg) return;
      const list = bg.querySelector('.modal-list');
      if (list) {
        list.innerHTML = `
          <div style="padding: 16px; display:flex; flex-direction:column; align-items:center; gap:16px;">
            <div style="font-size:14px; font-weight:700; color:var(--text-400); background:rgba(0,0,0,0.03); padding:4px 12px; border-radius:12px;">📍 현재 위치: 서울특별시 강남구</div>
            
            <div style="display:flex; align-items:center; gap:24px; margin-top:8px;">
              <div style="font-size:64px; text-shadow:0 4px 12px rgba(245,158,11,0.3);">☀️</div>
              <div style="display:flex; flex-direction:column; align-items:flex-start;">
                <div style="font-size:36px; font-weight:800; color:var(--text-900); font-family:'Montserrat', sans-serif;">24<span style="font-size:20px; color:var(--text-300);">°C</span></div>
                <div style="font-size:16px; font-weight:700; color:var(--text-100);">맑음, 화창함</div>
              </div>
            </div>
            
            <div style="width:100%; display:flex; justify-content:space-around; background:#f9fafb; border:1px solid var(--border-default); border-radius:16px; padding:16px; margin-top:8px;">
              <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                <span style="font-size:12px; color:var(--text-400); font-weight:600;">체감 온도</span>
                <span style="font-size:15px; color:var(--text-100); font-weight:800;">26°C</span>
              </div>
              <div style="width:1px; background:var(--border-default);"></div>
              <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                <span style="font-size:12px; color:var(--text-400); font-weight:600;">바람</span>
                <span style="font-size:15px; color:var(--text-100); font-weight:800;">남서 3m/s</span>
              </div>
              <div style="width:1px; background:var(--border-default);"></div>
              <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                <span style="font-size:12px; color:var(--text-400); font-weight:600;">습도</span>
                <span style="font-size:15px; color:var(--text-100); font-weight:800;">45%</span>
              </div>
            </div>
            
            <div style="width:100%; background:linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.05) 100%); border-radius:12px; padding:16px; margin-top:8px; text-align:center;">
              <div style="font-size:14px; font-weight:700; color:var(--accent);">"라운딩 가기 딱 좋은 훌륭한 날씨입니다! ⛳️"</div>
            </div>
            
            <button class="btn btn-primary" style="width:100%; margin-top:16px;" onclick="App.closeModal()">확인</button>
          </div>
        `;
      }
    }, 1500);
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
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
