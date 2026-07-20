/* =========================================
   BuddyPlanner v2 — App Router
   ========================================= */

const App = {
  screens: ['home','register','timeline','restaurant','login','onboarding','profile','upgrade'],

  init() {
    if (!State.loadSchedules()) {
      State.initDemo();
    }
    this.loadPreferences();
    this.renderNav();
    this.renderAdMockup();
    
    const isLoggedIn = localStorage.getItem('bp_logged_in') === 'true';
    const hasOnboarded = localStorage.getItem('bp_onboarded') === 'true';
    State.isPro = localStorage.getItem('bp_pro') === 'true';

    if (!isLoggedIn) {
      this.navigate('login');
    } else if (!hasOnboarded) {
      this.navigate('onboarding');
    } else {
      this.navigate('home');
      setTimeout(()=>U.toast('⛳ 버디플래너에 오신 것을 환영합니다!'), 700);
    }
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Service Worker Registered!', reg.scope))
          .catch(err => console.error('Service Worker Registration Failed:', err));
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
    const target = U.$(`#screen-${name}`);
    if (target) {
      target.classList.add('active');
      switch(name) {
        case 'home': Home.init(); break;
        case 'register': Register.init(); break;
        case 'timeline': Timeline.init(); break;
        case 'restaurant': Restaurant.init(); break;
        case 'login': Login.init(); break;
        case 'onboarding': Onboarding.init(); break;
        case 'profile': Profile.render(); break;
        case 'upgrade': Upgrade.init(); break;
      }
    }
    this.updateNav(name === 'timeline' ? 'home' : name);
    
    const nav = U.$('#top-header');
    if (nav) {
      if (name === 'login' || name === 'onboarding') {
        nav.style.display = 'none';
      } else {
        nav.style.display = 'flex';
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
    const nav = U.el('header','top-header');
    nav.id = 'top-header';
    nav.innerHTML = `
      <div class="top-nav-left">
        <button class="top-nav-item active" data-s="home" onclick="App.navigate('home')">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span class="nav-label">홈</span>
        </button>
        <button class="top-nav-item" data-s="profile" onclick="App.navigate('profile')">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span class="nav-label">내 정보</span>
        </button>
      </div>
      <div class="top-brand">
        ⛳ 버디플래너
      </div>
      <div class="top-nav-right">
        <button class="top-nav-item" data-s="restaurant" onclick="App.navigate('restaurant')">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="1.8" fill="none"><path d="M12 2c3.866 0 7 3.134 7 7 0 5.25-7 13-7 13S5 14.25 5 9c0-3.866 3.134-7 7-7z"></path><circle cx="12" cy="9" r="2.5"></circle></svg>
          <span class="nav-label">맛집 찾기</span>
        </button>
        <button class="top-nav-item membership-nav" data-s="upgrade" onclick="App.navigate('upgrade')">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M2 19h20v2H2v-2zm19-11c-.55 0-1 .45-1 1v4l-3-2-2 3-3-4-3 4-2-3-3 2v-4c0-.55-.45-1-1-1s-1 .45-1 1v7h20V9c0-.55-.45-1-1-1zM7 6c.83 0 1.5-.67 1.5-1.5S7.83 3 7 3s-1.5.67-1.5 1.5S6.17 6 7 6zm10 0c.83 0 1.5-.67 1.5-1.5S17.83 3 17 3s-1.5.67-1.5 1.5S16.17 6 17 6zm-5-2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>
          <span class="nav-label">멤버쉽등록</span>
        </button>
      </div>
    `;
    // Prepend to app instead of append so it's logically first
    U.$('#app').prepend(nav);
  },

  renderAdMockup() {
    const ad = U.el('div','sticky-ad-mockup');
    ad.innerHTML = `<span>광고 1안: 하단 고정 배너 (Sticky)</span>`;
    U.$('#app').appendChild(ad);
  },

  updateNav(name) {
    U.$$('.top-nav-item').forEach(i => i.classList.toggle('active', i.dataset.s === name));
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
