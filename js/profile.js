/* =========================================
   BuddyPlanner v2 — Profile Screen Logic
   ========================================= */

const Profile = {
  fontMap: { 'Pretendard': '고딕', 'Nanum Myeongjo': '명조', 'Gowun Dodum': '둥근고딕' },
  sizeMap: { 'small': '작게', 'medium': '보통', 'large': '크게' },

  render() {
    const app = U.$('#screen-profile');
    if (!app) return;

    // 현재 설정 불러오기
    const currentFont = localStorage.getItem('bp_font') || 'Pretendard';
    const currentSize = localStorage.getItem('bp_size') || 'medium';
    
    const hData = State.userAddresses?.home || {name:''};
    const wData = State.userAddresses?.office || {name:''};
    const homeName = hData.name || '';
    const workName = wData.name || '';
    
    // 로그인된 사용자 정보 불러오기
    const userName = localStorage.getItem('bp_user_name') || '버디 골퍼';
    const userEmail = localStorage.getItem('bp_user_email') || '';
    const provider = localStorage.getItem('bp_provider');
    const avatarLetter = userName.charAt(0).toUpperCase();
    const currentPoints = parseInt(localStorage.getItem('bp_points') || '0', 10);
    const todayStr = new Date().toLocaleDateString('ko-KR');
    const adCount = (localStorage.getItem('bp_ad_date') === todayStr) ? parseInt(localStorage.getItem('bp_ad_count') || '0', 10) : 0;

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
          <div class="profile-name">${U.esc(userName)}</div>
          <div class="profile-email">${U.esc(userEmail)}</div>
          ${State.isPro ? '<div style="margin-top:8px; display:inline-block; padding:4px 12px; background:var(--gold-dim); color:var(--gold-500); border:1px solid rgba(217,119,6,0.3); border-radius:var(--r-full); font-size:12px; font-weight:bold;">👑 PRO 멤버</div>' : ''}
        </div>
        
        <div style="margin: var(--sp-4) var(--sp-5) var(--sp-6);">
          <div style="background:var(--bg-100); border-radius:var(--r-xl); padding:var(--sp-4); display:flex; align-items:center; justify-content:space-between; box-shadow:var(--shadow-sm); border:1px solid var(--border-default);">
            <div>
              <div style="font-size:var(--fs-sm); color:var(--text-400); font-weight:bold; margin-bottom:4px;">내 포인트</div>
              <div style="font-size:1.5rem; font-weight:800; color:var(--text-900); font-family:'Montserrat', sans-serif;">
                <span style="color:var(--primary); margin-right:4px;">P</span>${currentPoints.toLocaleString()}
              </div>
            </div>
            <button onclick="Profile.watchAd()" class="ad-reward-btn">
              <span>광고 보고 50P 받기 <span style="font-size:11px; font-weight:normal; opacity:0.9;">(${adCount}/20)</span></span>
            </button>
          </div>
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
            <div class="setting-item" style="flex-direction:column; align-items:flex-start; border-bottom:1px solid var(--border-default);">
              <div class="setting-item-header" style="margin-bottom:8px;">닉네임</div>
              <input type="text" id="prof-nickname" class="form-input" value="${userName}" placeholder="사용하실 닉네임을 입력하세요" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border-default); background:var(--bg-input); font-size:15px;" onchange="Profile.saveNickname(this.value)" />
            </div>
            
            <div class="setting-item">
              <div class="setting-item-header">글꼴 스타일</div>
              <div class="setting-options">
                <button class="setting-opt-btn ${currentFont==='Pretendard'?'active':''}" onclick="Profile.setFont('Pretendard', this)">고딕 (기본)</button>
                <button class="setting-opt-btn ${currentFont==='Nanum Myeongjo'?'active':''}" onclick="Profile.setFont('Nanum Myeongjo', this)">명조체</button>
                <button class="setting-opt-btn ${currentFont==='Gowun Dodum'?'active':''}" onclick="Profile.setFont('Gowun Dodum', this)">둥근고딕</button>
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-item-header">글자 크기</div>
              <div class="setting-options">
                <button class="setting-opt-btn ${currentSize==='small'?'active':''}" onclick="Profile.setSize('small', this)">작게</button>
                <button class="setting-opt-btn ${currentSize==='medium'?'active':''}" onclick="Profile.setSize('medium', this)">보통</button>
                <button class="setting-opt-btn ${currentSize==='large'?'active':''}" onclick="Profile.setSize('large', this)">크게</button>
              </div>
            </div>
          </div>

          <div class="profile-section-title">자주 출발하는 장소</div>
          
          <div style="display:flex; flex-direction:row; gap:8px;">
            <div class="setting-card" style="flex:1; min-width:0; padding:16px 8px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;" onclick="Profile.searchAndSaveAddress('home')">
              <span class="address-icon" style="font-size:24px; margin-bottom:8px;">🏠</span>
              <div id="prof-home-container" style="width:100%; overflow:hidden;">
                ${homeName ? `<div style="font-size:15px; font-weight:700; color:var(--text-100); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding: 0 4px;">${homeName}</div>` : `<div style="font-size:14px; color:var(--text-400); font-weight:600;">집 주소 검색</div>`}
              </div>
            </div>
            <div class="setting-card" style="flex:1; min-width:0; padding:16px 8px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;" onclick="Profile.searchAndSaveAddress('work')">
              <span class="address-icon" style="font-size:24px; margin-bottom:8px;">🏢</span>
              <div id="prof-office-container" style="width:100%; overflow:hidden;">
                ${workName ? `<div style="font-size:15px; font-weight:700; color:var(--text-100); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding: 0 4px;">${workName}</div>` : `<div style="font-size:14px; color:var(--text-400); font-weight:600;">회사 주소 검색</div>`}
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
          
          ${(window.APP_CONFIG || {}).ADMIN_MODE ? `
          <div class="setting-card" style="margin-top:20px;">
            <div class="setting-item" style="cursor:pointer" onclick="Profile.openAdmin()">
              <div class="address-input-wrap" style="flex:1">
                <span class="address-icon">⚙️</span>
                <div class="address-input" style="display:flex; align-items:center; background:transparent; color:var(--text-800); font-weight:700;">
                  [대표님 전용] 버디마켓 관리자 모드
                </div>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="logout-wrap">
            <button class="logout-btn" onclick="Profile.logout()">로그아웃</button>
          </div>
        </div>
      </div>
    `;
  },

  async watchAd() {
    // 하루 20회 제한 로직
    const todayStr = new Date().toLocaleDateString('ko-KR');
    let lastAdDate = localStorage.getItem('bp_ad_date');
    let adCount = parseInt(localStorage.getItem('bp_ad_count') || '0', 10);
    
    if (lastAdDate !== todayStr) {
      adCount = 0;
      localStorage.setItem('bp_ad_date', todayStr);
    }
    
    if (adCount >= 20) {
      U.toast('하루 최대 시청 횟수(20회)를 모두 소진하셨습니다. 내일 다시 시도해주세요!');
      return;
    }

    // 모바일 네이티브 애드몹 연동
    if (window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.AdMob) {
      const AdMob = window.Capacitor.Plugins.AdMob;
      try {
        // 보상형 광고 준비
        await AdMob.prepareRewardVideoAd({
          adId: App.ADMOB_REWARD_ID, // app.js에 선언된 ID 사용
          isTesting: App.adsTestMode()
        });
        
        // 보상형 광고 재생 (재생 완료 시 app.js에 등록된 리스너에서 포인트 지급)
        await AdMob.showRewardVideoAd();
        return;
      } catch (err) {
        console.error('AdMob Reward Error:', err);
        U.toast('광고를 불러오는 데 실패했습니다.');
        return;
      }
    }

    // 네이티브 환경이 아닌 경우(웹/PC) 가짜 광고 UI 띄우기
    const overlay = document.createElement('div');
    overlay.className = 'fake-ad-overlay';
    overlay.innerHTML = `
      <div class="fake-ad-content">
        <div class="spinner"></div>
        <h3>스폰서 영상 시청 중...</h3>
        <p>영상을 끝까지 시청하시면 50P가 적립됩니다.<br><span style="color:#888; font-size:12px;">(오늘 시청 횟수: ${adCount + 1}/20)</span></p>
      </div>
    `;
    document.body.appendChild(overlay);

    // 3.5초 대기 후 보상 지급 (가짜 로직 유지)
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
        
        let pts = parseInt(localStorage.getItem('bp_points') || '0', 10);
        pts += 50;
        localStorage.setItem('bp_points', pts.toString());
        
        // 횟수 증가 및 저장
        adCount++;
        localStorage.setItem('bp_ad_count', adCount.toString());
        
        U.toast(`🎉 50 포인트 적립! (오늘 ${adCount}/20회 완료)`);
        U.haptic();
        Profile.render(); // 프로필 갱신
        if(typeof Home !== 'undefined') Home.render(); // 홈 화면도 갱신
      }
    }, 3500);
  },

  setFont(font, el) {
    localStorage.setItem('bp_font', font);
    const fontStr = font === 'Pretendard' ? "'Pretendard Variable', 'Pretendard', sans-serif" : `'${font}', sans-serif`;
    document.documentElement.style.setProperty('--font-sans', fontStr);
    
    // Update UI active state
    const siblings = el.parentElement.querySelectorAll('.setting-opt-btn');
    siblings.forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    
    U.toast(`글꼴이 '${this.fontMap[font]}'으로 변경되었습니다.`);
    U.haptic();
  },

  saveNickname(val) {
    const newVal = val.trim();
    if (newVal) {
      localStorage.setItem('bp_user_name', newVal);
      U.toast('✅ 닉네임이 변경되었습니다.');
      // Update profile name display instantly
      const nameEl = document.querySelector('.profile-name');
      if (nameEl) {
        nameEl.textContent = newVal;
      }
      const avatarEl = document.querySelector('.profile-avatar');
      if (avatarEl) {
        avatarEl.textContent = newVal.charAt(0).toUpperCase();
      }
    }
  },

  setSize(size, el) {
    localStorage.setItem('bp_size', size);
    let basePx = 16;
    if (size === 'small') basePx = 14;
    if (size === 'large') basePx = 18;
    document.documentElement.style.fontSize = basePx + 'px';
    
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

  openAdmin() {
    // 출시 빌드(config.js의 ADMIN_MODE: false)에서는 진입 불가
    if (!(window.APP_CONFIG || {}).ADMIN_MODE) return;
    U.toast('관리자 모드에 진입합니다.');
    App.navigate('admin');
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
