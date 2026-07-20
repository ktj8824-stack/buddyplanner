/* =========================================
   BuddyPlanner v2 — Profile Screen Logic
   ========================================= */

const Profile = {
  fontMap: { 'sans': '고딕', 'serif': '명조', 'round': '둥근고딕' },
  sizeMap: { 'sm': '작게', 'md': '보통', 'lg': '크게' },

  render() {
    const app = U.$('#screen-profile');
    if (!app) return;

    // 현재 설정 불러오기
    const currentFont = localStorage.buddy_fontType || 'sans';
    const currentSize = localStorage.buddy_fontSize || 'md';
    
    const hData = State.userAddresses?.home || {name:''};
    const wData = State.userAddresses?.office || {name:''};
    const homeName = hData.name || '';
    const workName = wData.name || '';
    
    // 로그인된 사용자 정보 불러오기
    const userName = localStorage.getItem('bp_user_name') || '버디 골퍼';
    const userEmail = localStorage.getItem('bp_user_email') || 'buddygolfer@example.com';
    const provider = localStorage.getItem('bp_provider');
    const avatarLetter = userName.charAt(0).toUpperCase();

    app.innerHTML = `
      <div class="header">
        <button class="header-btn" onclick="App.navigate('home')">
          <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 class="header-title">마이페이지</h1>
        <div class="header-btn" style="visibility:hidden"></div>
      </div>

      <div class="screen-scroll">
        <div class="profile-hero">
          <div class="profile-avatar">${avatarLetter}</div>
          <div class="profile-name">${userName} <span style="font-size:10px; color:var(--text-400); font-weight:normal;">(${provider||'mock'})</span></div>
          <div class="profile-email">${userEmail}</div>
          ${State.isPro ? '<div style="margin-top:8px; display:inline-block; padding:4px 12px; background:var(--gold-dim); color:var(--gold-500); border:1px solid rgba(217,119,6,0.3); border-radius:var(--r-full); font-size:12px; font-weight:bold;">👑 PRO 멤버</div>' : ''}
        </div>
        
        ${!State.isPro ? `
        <div style="margin: 0 var(--sp-5) var(--sp-6);">
          <div style="background:linear-gradient(135deg, #0f172a, #1e293b); border-radius:var(--r-xl); padding:var(--sp-4); color:#fff; display:flex; align-items:center; justify-content:space-between; box-shadow:var(--shadow-md);">
            <div>
              <div style="font-size:var(--fs-sm); color:var(--gold-300); font-weight:bold; margin-bottom:2px;">버디플래너 PRO</div>
              <div style="font-size:var(--fs-lg); font-weight:800;">프리미엄 혜택 만나보기</div>
            </div>
            <button onclick="App.navigate('upgrade')" style="background:var(--gold-400); color:#fff; padding:8px 16px; border-radius:var(--r-full); font-weight:bold; font-size:var(--fs-sm); box-shadow:var(--glow-gold);">업그레이드</button>
          </div>
        </div>
        ` : ''}

        <div class="profile-section">
          <div class="profile-section-title">기본 설정</div>
          
          <div class="setting-card">
            <div class="setting-item">
              <div class="setting-item-header">글꼴 스타일</div>
              <div class="setting-options">
                <button class="setting-opt-btn ${currentFont==='sans'?'active':''}" onclick="Profile.setFont('sans', this)">고딕 (기본)</button>
                <button class="setting-opt-btn ${currentFont==='serif'?'active':''}" onclick="Profile.setFont('serif', this)">명조체</button>
                <button class="setting-opt-btn ${currentFont==='round'?'active':''}" onclick="Profile.setFont('round', this)">둥근고딕</button>
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-item-header">글자 크기</div>
              <div class="setting-options">
                <button class="setting-opt-btn ${currentSize==='sm'?'active':''}" onclick="Profile.setSize('sm', this)">작게</button>
                <button class="setting-opt-btn ${currentSize==='md'?'active':''}" onclick="Profile.setSize('md', this)">보통</button>
                <button class="setting-opt-btn ${currentSize==='lg'?'active':''}" onclick="Profile.setSize('lg', this)">크게</button>
              </div>
            </div>
          </div>

          <div class="profile-section-title">자주 출발하는 장소</div>
          
          <div class="setting-card">
            <div class="setting-item" style="cursor:pointer" onclick="Profile.searchAndSaveAddress('home')">
              <div class="address-input-wrap" style="flex:1">
                <span class="address-icon">🏠</span>
                <div class="address-input" style="display:flex; align-items:center; background:transparent; color:${homeName?'var(--text-800)':'var(--text-400)'}">
                  ${homeName ? homeName : '집 주소 검색하기 (터치)'}
                </div>
              </div>
            </div>
            
            <div class="setting-item" style="cursor:pointer" onclick="Profile.searchAndSaveAddress('work')">
              <div class="address-input-wrap" style="flex:1">
                <span class="address-icon">🏢</span>
                <div class="address-input" style="display:flex; align-items:center; background:transparent; color:${workName?'var(--text-800)':'var(--text-400)'}">
                  ${workName ? workName : '회사 주소 검색하기 (터치)'}
                </div>
              </div>
            </div>
          </div>
          
          <div class="profile-section-title">데이터 관리</div>
          
          <div class="setting-card">
            <div class="setting-item" style="cursor:pointer" onclick="Profile.exportData()">
              <div class="address-input-wrap" style="flex:1">
                <span class="address-icon">📤</span>
                <div class="address-input" style="display:flex; align-items:center; background:transparent; color:var(--text-800)">
                  데이터 백업하기 (기기 저장)
                </div>
              </div>
            </div>
            
            <div class="setting-item" style="cursor:pointer" onclick="Profile.importData()">
              <div class="address-input-wrap" style="flex:1">
                <span class="address-icon">📥</span>
                <div class="address-input" style="display:flex; align-items:center; background:transparent; color:var(--text-800)">
                  데이터 불러오기 (파일 선택)
                </div>
              </div>
            </div>
          </div>
          
          <div class="logout-wrap">
            <button class="logout-btn" onclick="Profile.logout()">로그아웃</button>
          </div>
        </div>
      </div>
    `;
  },

  setFont(type, el) {
    localStorage.buddy_fontType = type;
    document.documentElement.setAttribute('data-font', type);
    
    // Update UI active state
    const siblings = el.parentElement.querySelectorAll('.setting-opt-btn');
    siblings.forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    
    U.toast(`글꼴이 '${this.fontMap[type]}'으로 변경되었습니다.`);
    U.haptic();
  },

  setSize(size, el) {
    localStorage.buddy_fontSize = size;
    document.documentElement.setAttribute('data-size', size);
    
    // Update UI active state
    const siblings = el.parentElement.querySelectorAll('.setting-opt-btn');
    siblings.forEach(s => s.classList.remove('active'));
    el.classList.add('active');

    U.toast(`글자 크기가 '${this.sizeMap[size]}'로 변경되었습니다.`);
    U.haptic();
  },

  searchAndSaveAddress(type) {
    const title = type === 'home' ? '🏠 집 주소 검색' : '🏢 회사 주소 검색';
    App.openAddressSearch(title, (selectedPlace) => {
      if (type === 'home') {
        State.userAddresses.home = selectedPlace;
        localStorage.setItem('bp_home', JSON.stringify(selectedPlace));
      } else {
        State.userAddresses.office = selectedPlace;
        localStorage.setItem('bp_office', JSON.stringify(selectedPlace));
      }
      U.toast('✅ 주소가 좌표와 함께 정확히 저장되었습니다.');
      U.haptic();
      Profile.render(); // 화면 갱신
    });
  },

  logout() {
    if (confirm('정말 로그아웃 하시겠습니까?')) {
      const provider = localStorage.getItem('bp_provider');
      
      // 카카오 로그아웃 처리
      if (provider === 'kakao' && typeof Kakao !== 'undefined' && Kakao.Auth) {
        Kakao.Auth.logout(() => {
          console.log('카카오 세션 만료');
        });
      }
      
      // 구글 로그아웃 처리
      if (provider === 'google' && typeof google !== 'undefined') {
        google.accounts.id.disableAutoSelect();
      }

      localStorage.removeItem('bp_logged_in');
      localStorage.removeItem('bp_provider');
      localStorage.removeItem('bp_user_name');
      localStorage.removeItem('bp_user_email');
      
      U.toast('로그아웃 되었습니다.');
      App.navigate('login');
    }
  },

  exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buddyplanner_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    U.toast('데이터가 다운로드되었습니다.');
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          for (const key in data) {
            localStorage.setItem(key, data[key]);
          }
          U.toast('데이터가 성공적으로 복원되었습니다.');
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          U.toast('잘못된 파일 형식입니다.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
};
