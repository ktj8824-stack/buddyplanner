/* =========================================
   BuddyPlanner v2 — App Router
   ========================================= */

const App = {
  screens: ['home','calendar','register','timeline','restaurant','splash','onboarding','profile','upgrade','record','community'],

  init() {
    // 실시간 플러그인 획득 도우미 함수
    window.getNativeAlarmPlugin = function() {
      if (window.Capacitor && window.Capacitor.Plugins) {
        if (window.Capacitor.Plugins.NativeAlarm) return window.Capacitor.Plugins.NativeAlarm;
        if (window.Capacitor.Plugins.NativeAlarmPlugin) return window.Capacitor.Plugins.NativeAlarmPlugin;
      }
      if (window.NativeAlarm) return window.NativeAlarm;
      if (window.Capacitor && typeof window.Capacitor.registerPlugin === 'function') {
        try {
          window.NativeAlarm = window.Capacitor.registerPlugin('NativeAlarm');
          return window.NativeAlarm;
        } catch(e) {}
      }
      return null;
    };
    if (!State.loadSchedules()) {
      State.initDemo();
    }
    this.loadPreferences();
    this.renderNav();
    // this.renderAdBanner(); // 심사 통과 전까지 임시로 주석 처리 (빈 광고 영역으로 인한 심사 거절 방지)
    
    const hasOnboarded = localStorage.getItem('bp_onboarded') === 'true';
    State.isPro = localStorage.getItem('bp_pro') === 'true';

    // [임시] 과거 테스트 알람 찌꺼기 1~1000번 강제 취소 클리닝
    if (window.Capacitor && Capacitor.Plugins.NativeAlarm) {
      for (let i = 1; i <= 1000; i++) {
        Capacitor.Plugins.NativeAlarm.cancelAlarm({ id: i }).catch(e => {});
      }
      console.log('과거 테스트 알람 클리닝 완료');
    }

    // iOS 폴리필 — 공식 @capacitor/local-notifications 사용
    if (window.Capacitor && Capacitor.getPlatform() === 'ios') {
      console.log('iOS 환경 감지: NativeAlarm Plugin으로 NativeApp 설정');

      window.NativeApp = {
        setAlarm: async (timeInMillis, body) => {
            const scheduleAt = new Date(timeInMillis);
            const payload = {
                action: 'start',
                id: String(timeInMillis),
                title: '버디플래너',
                body: body || '골프 일정 준비 시간입니다!',
                scheduleAt: scheduleAt.toISOString()
            };
            
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeAlarm) {
                window.webkit.messageHandlers.nativeAlarm.postMessage(payload);
            }
            console.log('iOS Alarm scheduled:', new Date(timeInMillis));
        },
        clearAll: async () => {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeAlarm) {
                window.webkit.messageHandlers.nativeAlarm.postMessage({
                    action: 'clearAll'
                });
            }
            console.log('iOS Alarm clearAll requested');
        },
        cancelAlarm: async (alarmId) => {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeAlarm) {
                const idStr = String(alarmId);
                window.webkit.messageHandlers.nativeAlarm.postMessage({
                    action: 'cancel',
                    id: idStr
                });
                window.webkit.messageHandlers.nativeAlarm.postMessage({
                    action: 'cancel',
                    id: idStr + '_2nd'
                });
                if (!isNaN(Number(alarmId))) {
                    window.webkit.messageHandlers.nativeAlarm.postMessage({
                        action: 'cancel',
                        id: String(Number(alarmId) + 60000)
                    });
                }
            }
            console.log('iOS Alarm cancelled:', alarmId);
        },
        setAlarmWithData: async (timeInMillis, timelineJson, body, customId) => {
            const scheduleAt = new Date(timeInMillis);
            const alarmId = customId ? String(customId) : String(timeInMillis);
            const payload = {
                action: 'start',
                id: alarmId,
                title: '버디플래너',
                body: body || '골프 일정 준비 시간입니다!',
                scheduleAt: scheduleAt.toISOString()
            };
            
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeAlarm) {
                window.webkit.messageHandlers.nativeAlarm.postMessage(payload);
            }
            console.log('iOS Alarm (with data) scheduled:', new Date(timeInMillis), 'ID:', alarmId);
        },
        startTrackerTest: () => { console.log('startTrackerTest: Live Activity 미구현'); },
        stopTrackerTest: () => { console.log('stopTrackerTest: Live Activity 미구현'); }
      };
    }

    // 앱 시작 시 과거 유령 알람을 일괄 초기화하고, 오늘의 일정을 재등록합니다.
    if (window.NativeApp && typeof window.NativeApp.clearAll === 'function') {
        window.NativeApp.clearAll();
    }
    
    // Automatically schedule alarms for today's events in the background
    // setTimeout을 줘서 clearAll이 완전히 처리된 후 스케줄링되도록 보장합니다.
    setTimeout(() => {
        Timeline.autoScheduleAllAlarms();
    }, 500);


    // Check for shared schedule link (두 가지 형식 모두 지원)
    const searchParams = new URLSearchParams(window.location.search);
    let sharedPayload = searchParams.get('s');
    const hash = window.location.hash;
    let hasShared = false;

    if (sharedPayload) {
      while (sharedPayload.includes('%')) {
        try {
          const decoded = decodeURIComponent(sharedPayload);
          if (decoded === sharedPayload) break;
          sharedPayload = decoded;
        } catch(e) { break; }
      }
      
      // 카카오톡 공유 링크 (?s= 형식, 초경량 압축)
      try {
        const arr = sharedPayload.split('|');
        // iOS Safari 날짜 파싱 호환: "2026-10-14T00:00:00.000Z" 형식 정규화
        let rawDate = arr[0] || '';
        // Safari는 "2026-10-14T00:00:00.000Z" 는 OK, 일부 다른 형식은 NaN
        // 확실하게 ISO 형식으로 변환
        if (rawDate && !rawDate.includes('T')) {
          rawDate = rawDate.trim() + 'T00:00:00';
        }
        const parsedDate = rawDate ? new Date(rawDate) : new Date();
        const safeDate = (!isNaN(parsedDate.getTime())) ? parsedDate : new Date();

        const schedData = {
          date: safeDate,
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
          schedData.mealRestaurant = { name: arr[6], lat: parseFloat(arr[7]) || 0, lng: parseFloat(arr[8]) || 0 };
        }
        // 중복 방지: 같은 날짜+골프장+티오프 시간이 이미 있으면 새로 추가하지 않음
        const dupIdx = State.schedules.findIndex(ex => {
          if (!ex || !ex.date) return false;
          const ed = new Date(ex.date);
          return ed.getFullYear() === safeDate.getFullYear() &&
                 ed.getMonth() === safeDate.getMonth() &&
                 ed.getDate() === safeDate.getDate() &&
                 ex.teeOff === schedData.teeOff &&
                 ex.course && ex.course.name === schedData.course.name;
        });
        if (dupIdx !== -1) {
          State.currentScheduleIdx = dupIdx;
        } else {
          State.addSchedule(schedData);
          State.currentScheduleIdx = State.schedules.length - 1;
        }
        window.history.replaceState('', document.title, window.location.pathname);
        hasShared = true;
      } catch (e) {
        console.error('Kakao shared schedule import failed', e);
        U.toast('공유된 일정을 불러오는데 실패했습니다.');
      }
    } else if (hash && hash.startsWith('#shared=')) {
      // 타임라인 공유하기 링크 (#shared= 형식, 풀 JSON)
      try {
        const rawPayload = hash.substring(8);
        // URL 디코딩 (중첩 인코딩 처리)
        let payload = rawPayload;
        while (payload.includes('%')) {
          try {
            const decoded = decodeURIComponent(payload);
            if (decoded === payload) break;
            payload = decoded;
          } catch(e) { break; }
        }
        // iOS Safari 호환 base64 디코딩
        // base64url 문자를 standard base64로 변환
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        let decoded;
        try {
          decoded = decodeURIComponent(atob(padded));
        } catch (e) {
          // iOS: atob 실패 시 직접 UTF-8 디코딩 시도
          const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
          decoded = new TextDecoder().decode(bytes);
        }
        const schedData = JSON.parse(decoded);
        if (schedData.date) schedData.date = new Date(schedData.date);
        // 중복 방지: 같은 날짜+골프장+티오프 시간이 이미 있으면 새로 추가하지 않음
        const sd = new Date(schedData.date);
        const dupIdx2 = State.schedules.findIndex(ex => {
          if (!ex || !ex.date) return false;
          const ed = new Date(ex.date);
          return ed.getFullYear() === sd.getFullYear() &&
                 ed.getMonth() === sd.getMonth() &&
                 ed.getDate() === sd.getDate() &&
                 ex.teeOff === schedData.teeOff &&
                 ex.course && schedData.course && ex.course.name === schedData.course.name;
        });
        if (dupIdx2 !== -1) {
          State.currentScheduleIdx = dupIdx2;
        } else {
          State.addSchedule(schedData);
          State.currentScheduleIdx = State.schedules.length - 1;
        }
        window.history.replaceState('', document.title, window.location.pathname);
        hasShared = true;
      } catch (e) {
        console.error('Text shared schedule import failed', e);
        U.toast('공유된 일정을 불러오는데 실패했습니다.');
      }
    }

    if (hasShared) {
      // 공유 링크: 스플래시 없이 바로 타임라인으로 이동
      // setTimeout으로 DOM/nav 렌더링이 완전히 완료된 후 실행 보장 (rAF보다 안정적)
      this.navigate('timeline'); // 먼저 화면을 active로 만들고
      setTimeout(() => {
        App.viewTimeline(State.currentScheduleIdx);
      }, 80);

    } else {
      this.navigate('splash');
      
      // Automatically transition from splash
      setTimeout(() => {
        if (hasOnboarded) {
          this.navigate('calendar');
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

  requestNotificationPermission(callback) {
    // [테스트용] 항상 모달이 뜨도록 강제 초기화
    localStorage.removeItem('bp_noti_requested');
    // 이미 권한 요청한 경우 스킵 (위에서 지워서 항상 false가 됨)
    const hasRequested = localStorage.getItem('bp_noti_requested') === 'true';
    if (hasRequested) {
      if (callback) callback(true);
      return;
    }

    const content = `
      <div style="padding:var(--sp-4); text-align:center;">
        <div style="font-size:48px; margin-bottom:16px;">🔔</div>
        <p style="font-size:16px; font-weight:700; color:var(--text-100); margin-bottom:8px;">앱 알림을 허용해주세요!</p>
        <p style="font-size:14px; color:var(--text-400); margin-bottom:24px; line-height:1.5;">
          준비 시간, 출발 시간, 티오프 시간 등 라운딩에 필요한 모든 일정을 제시간에 알려드립니다.
        </p>
        <button class="btn btn-primary" style="width:100%; margin-bottom:8px;" onclick="App._doRequestPermission()">알림 허용하기</button>
        <button class="btn" style="width:100%; background:var(--gray-800); color:var(--text-400);" onclick="App._skipRequestPermission()">나중에 하기</button>
      </div>
    `;
    this.showModal('알림 권한 설정', content);
    this._notiCallback = callback;
  },

  _doRequestPermission() {
    this.closeModal();
    localStorage.setItem('bp_noti_requested', 'true');
    if (this._notiCallback) this._notiCallback(true);
  },

  _skipRequestPermission() {
    this.closeModal();
    localStorage.setItem('bp_noti_requested', 'true');
    if (this._notiCallback) this._notiCallback(false);
  },

  navigate(name) {
    if (name === 'home') name = 'calendar';
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
    this.navigate('timeline');
  },

  renderNav() {
    if (U.$('#top-header')) return; // Prevent duplicate injection
    
    const nav = U.el('header','top-header');
    nav.id = 'top-header';
    nav.innerHTML = `
      <div class="top-nav-left" style="display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="App.navigate('calendar')">
        <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg, #222 0%, #000 100%);color:#bf953f;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display', serif;font-size:14px;font-weight:700;font-style:italic;text-shadow:0 1px 3px rgba(0,0,0,0.8);box-shadow:0 2px 5px rgba(0,0,0,0.2);">myB</div>
        <div style="font-family:'Montserrat', sans-serif;font-size:18px;font-weight:600;color:var(--text-100);letter-spacing:0.02em;">buddyplanner</div>
      </div>
      <div class="top-nav-right" style="display:flex; align-items:center; gap:16px; margin-left:auto;">
        <!-- [앱스토어 심사 임시 숨김] 날씨/검색/알림 아이콘 
        <button class="top-nav-item" style="padding:0;color:#f59e0b;" aria-label="날씨" onclick="App.showWeather()">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </button>
        <button class="top-nav-item" style="padding:0;color:var(--text-100);" aria-label="검색">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
        <button class="top-nav-item" style="padding:0;color:var(--text-100);position:relative;" aria-label="알림">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <div style="position:absolute;top:-2px;right:-2px;background:#ef4444;color:#fff;font-size:9px;font-weight:800;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid #fff;">N</div>
        </button>
        -->
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
      <button class="gnb-item active" data-s="calendar" onclick="App.navigate('calendar')">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span class="nav-label">홈</span>
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
