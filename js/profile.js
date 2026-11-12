/* =========================================
   BuddyPlanner v2 — Profile Screen Logic
   ========================================= */

const Profile = {
  fontMap: { 'Pretendard': '고딕', 'Nanum Myeongjo': '명조', 'Gowun Dodum': '둥근고딕' },
  sizeMap: { 'small': '작게', 'medium': '보통', 'large': '크게' },

  render() {
    const app = U.$('#screen-profile');
    if (!app) return;

    // 관리자 계정인지 서버에 한 번 확인하고, 맞으면 메뉴를 보여 주려고 다시 그림
    if (typeof Admin !== 'undefined' && Admin.isAdmin !== true) {
      Admin.checkAdmin().then(ok => { if (ok && State.screen === 'profile') this.render(); });
    }

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
    const avatarLetter = U.esc(userName.charAt(0).toUpperCase());
    const currentPoints = Points.balance();
    const pm = Points.meta();

    const chev = '<svg class="v2-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
    const provName = { kakao: '카카오', google: '구글', apple: 'Apple' }[provider];
    const prep = (() => { const v = parseInt(localStorage.getItem('bp_last_prep'), 10); return v > 0 ? v : 30; })();
    const navPref = (typeof AutoNav !== 'undefined' ? AutoNav.pref() : 'choice');
    const navName = { tmap: 'TMAP', kakao: '카카오내비', choice: '매번 선택' }[navPref] || '매번 선택';
    const alarmSt = Profile.alarmStatusText();
    const cloudOn = typeof Cloud !== 'undefined' && Cloud.isConfigured() && Cloud.isSignedIn();
    const seg = (cur, items, fn) => items.map(([v, l]) => `<button class="setting-opt-btn ${cur === v ? 'on active' : ''}" onclick="${fn}('${v}', this)">${l}</button>`).join('');
    const homeRow = homeName
      ? `<button class="v2-li" onclick="Profile.searchAndSaveAddress('home')"><span class="k">집 주소</span><span class="v">${U.esc(homeName)}</span>${chev}</button>`
      : `<button class="v2-li warn" onclick="Profile.searchAndSaveAddress('home')">
          <span class="ico"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 11 12 4l8 7v9H4z"/></svg></span>
          <span class="k"><b>집 주소</b><small>아직 없어요 · 등록하면 출발 시간이 정확해져요</small></span><span class="go">등록</span></button>`;

    app.innerHTML = `
      <div class="v2-pagehead"><h1>마이</h1></div>
      <div class="v2-scroll">
        <div class="v2-body">
          <div class="v2-card v2-me">
            <div class="v2-avatar profile-avatar">${avatarLetter}</div>
            <div class="t"><b class="profile-name">${U.esc(userName)}</b><small>${provName ? provName + ' 계정으로 로그인' : (userEmail ? U.esc(userEmail) : '로그인하지 않음')}</small></div>
            <button class="v2-me-edit" onclick="Profile.editProfile()">프로필 편집</button>
          </div>
          <div class="v2-me-grid">
            <div class="v2-me-box pt" onclick="Profile.watchAd()">
              <span>내 포인트</span><b><span data-points>${currentPoints.toLocaleString()}</span> P</b>
              <small>광고 보고 ${pm.ad_points}P 받기 · 오늘 <span data-ad-count>${pm.ad_today}/${pm.ad_limit}</span></small>
            </div>
            <div class="v2-me-box pro" onclick="App.navigate('upgrade')">
              <span>현재 이용권</span><b>${State.isPro || Billing.promoActive() ? 'PRO' : '무료'}</b>
              <small>${State.isPro ? 'PRO 이용 중 · 관리' : (Billing.promoActive() ? `출시 기념 무료 · ${Billing.promoLabel()}까지` : 'PRO 혜택 보기')}</small>
            </div>
          </div>

          <div class="v2-sec-title">타임라인 설정</div>
          <div class="v2-list">
            ${homeRow}
            <button class="v2-li" onclick="Profile.searchAndSaveAddress('work')"><span class="k">회사 주소</span><span class="v">${workName ? U.esc(workName) : '등록'}</span>${chev}</button>
            <button class="v2-li" onclick="Profile.pickPrep()"><span class="k">기본 준비 시간</span><span class="v">${prep}분</span>${chev}</button>
            <button class="v2-li" onclick="AutoNav.openGuide()"><span class="k">길안내 앱<small>차에 타면 자동 길안내도 여기서 켜요</small></span><span class="v">${navName}</span>${chev}</button>
            <button class="v2-li" onclick="Profile.previewAlarm()"><span class="k">알람 소리<small data-alarm-status style="${alarmSt ? '' : 'display:none'}">${alarmSt}</small></span><span class="v">버디 알람</span>${chev}</button>
          </div>

          <div class="v2-sec-title">화면</div>
          <div class="v2-list">
            <div class="v2-li-block"><span>글자 크기</span><div class="v2-seg setting-options">${seg(currentSize, [['small', '작게'], ['medium', '보통'], ['large', '크게']], 'Profile.setSize')}</div></div>
            <div class="v2-li-block"><span>글꼴</span><div class="v2-seg setting-options">${seg(currentFont, [['Pretendard', '고딕'], ['Nanum Myeongjo', '명조'], ['Gowun Dodum', '둥근고딕']], 'Profile.setFont')}</div></div>
          </div>

          <div class="v2-sec-title">데이터</div>
          <div class="v2-list">
            ${(typeof Cloud !== 'undefined' && Cloud.isConfigured()) ? `
            <div class="v2-li" style="cursor:default;">
              <span class="k">클라우드 자동 백업<small id="cloud-status-text">${cloudOn ? '라운드 기록과 일정을 자동으로 보관해요' : U.esc(Cloud.statusText())}</small></span>
              <button class="v2-switch ${cloudOn ? 'on' : ''}" role="switch" aria-checked="${cloudOn}" aria-label="클라우드 자동 백업" onclick="Profile.cloudSwitch()"></button>
            </div>` : ''}
            <button class="v2-li" onclick="Profile.exportData()"><span class="k">기기에 파일로 백업</span>${chev}</button>
            <button class="v2-li" onclick="Profile.importData()"><span class="k">파일에서 불러오기</span>${chev}</button>
          </div>

          <div class="v2-sec-title">계정</div>
          <div class="v2-list">
            ${this.canAdmin() ? `<button class="v2-li" onclick="Profile.openAdmin()"><span class="k" style="font-weight:700;">[대표님 전용] 버디마켓 관리자 모드</span>${chev}</button>` : ''}
            <a class="v2-li" href="./privacy.html" style="text-decoration:none;"><span class="k">개인정보처리방침</span>${chev}</a>
            <button class="v2-li" id="v2-logout" onclick="Profile.logout()"><span class="k">로그아웃</span></button>
          </div>
          <button class="v2-quit" onclick="Profile.deleteAllData()">회원 탈퇴 및 데이터 삭제</button>
        </div>
      </div>
    `;
  },

  editProfile() {
    const name = localStorage.getItem('bp_user_name') || '';
    App.showModal('프로필 편집', `
      <div style="font-size:14px; color:#475569; margin-bottom:8px;">닉네임</div>
      <input type="text" id="prof-nickname" value="${U.esc(name)}" maxlength="20" placeholder="사용하실 닉네임" style="width:100%; box-sizing:border-box; height:50px; padding:0 14px; border-radius:12px; border:1px solid #e2e8f0; background:#f8fafc; font-size:16px;">
      <button class="v2-btn-navy" style="margin-top:14px;" onclick="Profile.saveNickname(U.$('#prof-nickname').value); App.closeModal(); Profile.render();">저장</button>`);
  },

  pickPrep() {
    const cur = (() => { const v = parseInt(localStorage.getItem('bp_last_prep'), 10); return v > 0 ? v : 30; })();
    App.showModal('기본 준비 시간', `
      <div style="font-size:14px; color:#475569; margin-bottom:12px;">새 라운딩을 등록할 때 이 시간으로 시작해요.</div>
      <div class="v2-opts c3">${[20, 30, 40, 60, 90, 120].map(t => `<button class="${t === cur ? 'on' : ''}" onclick="Profile.setPrep(${t})">${t}분</button>`).join('')}</div>`);
  },

  setPrep(t) {
    try { localStorage.setItem('bp_last_prep', String(t)); } catch (e) {}
    App.closeModal(); U.toast(`기본 준비 시간을 ${t}분으로 바꿨어요.`); this.render();
  },

  /** 아이폰 앱이 실제로 예약한 알람 상태 한 줄 (앱에서 예약을 마친 뒤에만) */
  alarmStatusText() {
    const s = window.__bpAlarmSync;
    if (!s) return '';
    if (s.denied) return '알림이 꺼져 있어 알람이 울리지 않아요';
    if (s.failed) return '알람 예약에 실패했어요 · 앱을 다시 열어 주세요';
    if (!s.n) return '예약된 알람 없음';
    const d = new Date(s.first), dow = '일월화수목금토'[d.getDay()];
    const h = d.getHours(), ap = h < 12 ? '오전' : '오후', h12 = h % 12 || 12;
    return `예약된 알람 ${s.n}개 · 가장 가까운 알람 ${d.getMonth() + 1}/${d.getDate()}(${dow}) ${ap} ${h12}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  previewAlarm() {
    try { Timeline.initAudioContext(); Timeline.playAlarmSound('출발 시간이 되면 이 소리로 알려 드려요.', '🔔 버디 알람 미리 듣기', null, { preview: true }); }
    catch (e) { U.toast('알람 소리를 재생하지 못했어요.'); }
  },

  /** 클라우드 백업 스위치: 로그인돼 있으면 지금 동기화, 아니면 로그인 안내 */
  cloudSwitch() {
    if (typeof Cloud === 'undefined') return;
    if (Cloud.isSignedIn()) { this.syncNow(); return; }
    if (App.offerCloudConnect) { try { localStorage.removeItem('bp_cloud_offer_day'); } catch (e) {} App.offerCloudConnect(); }
  },

  async watchAd() {
    // 로그인·하루 한도 확인 (최종 판단은 서버)
    if (!Points.canWatchAd()) return;

    // 모바일 네이티브 애드몹
    if (window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.AdMob) {
      const AdMob = window.Capacitor.Plugins.AdMob;
      try {
        await AdMob.prepareRewardVideoAd({
          adId: App.ADMOB_REWARD_ID,
          isTesting: App.adsTestMode(),
          ssv: Points.ssvOptions()   // AdMob 서버 검증: 누구에게 적립할지 서버에 전달
        });
        // 끝까지 보면 app.js의 리스너가 Points.onAdRewarded()로 서버에 적립 요청
        await AdMob.showRewardVideoAd();
      } catch (err) {
        console.error('AdMob Reward Error:', err);
        U.toast('광고를 불러오는 데 실패했습니다.');
      }
      return;
    }

    // 웹(PC)에서는 실제 광고가 없음 → 개발용 테스트 모드에서만 흉내 내기
    if (!App.adsTestMode()) {
      U.toast('광고 보상은 BuddyPlanner 앱에서 받을 수 있어요.');
      return;
    }
    const m = Points.meta();
    const overlay = document.createElement('div');
    overlay.className = 'fake-ad-overlay';
    overlay.innerHTML = `
      <div class="fake-ad-content">
        <div class="spinner"></div>
        <h3>테스트 광고 재생 중...</h3>
        <p>개발용 테스트 모드예요.<br><span style="color:#888; font-size:12px;">(오늘 ${m.ad_today + 1}/${m.ad_limit})</span></p>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
      if (document.body.contains(overlay)) document.body.removeChild(overlay);
      Points.onAdRewarded();
    }, 2000);
  },

  setFont(font, el) {
    localStorage.setItem('bp_font', font);
    const fontStr = font === 'Pretendard' ? "'Pretendard Variable', 'Pretendard', sans-serif" : `'${font}', sans-serif`;
    document.documentElement.style.setProperty('--font-sans', fontStr);
    
    // Update UI active state
    const siblings = el.parentElement.querySelectorAll('.setting-opt-btn');
    siblings.forEach(s => s.classList.remove('active', 'on'));
    el.classList.add('active', 'on');
    
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
    siblings.forEach(s => s.classList.remove('active', 'on'));
    el.classList.add('active', 'on');

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

  async syncNow() {
    if (!Cloud.isSignedIn()) { U.toast('로그인하면 데이터가 클라우드에 저장돼요.'); return; }
    try {
      await Cloud.sync();
      U.toast('☁️ 동기화가 완료되었어요.');
    } catch (e) {
      U.toast('동기화에 실패했어요. 인터넷 연결을 확인해 주세요.');
    }
  },

  /**
   * 회원 탈퇴: 기기에 저장된 모든 데이터 삭제 + 소셜 로그인 연결 해제 + 예약된 알람 취소.
   * (BuddyPlanner는 서버에 개인정보를 저장하지 않으므로 기기 데이터 삭제로 탈퇴가 완료됩니다)
   */
  async deleteAllData() {
    const proNote = State.isPro
      ? `\n\n※ PRO 구독은 자동으로 해지되지 않습니다. ${Billing.manageHint()}에서 직접 해지해 주세요.`
      : '';
    if (!confirm('회원 탈퇴 시 기기에 저장된 일정, 라운딩 기록, 사진, 포인트, 설정이 모두 삭제되며 복구할 수 없습니다.' + proNote + '\n\n계속하시겠습니까?')) return;
    if (!confirm('정말 모든 데이터를 삭제하고 탈퇴하시겠습니까?')) return;

    const provider = localStorage.getItem('bp_provider');

    // 0) 클라우드에 저장된 사진·데이터·계정 삭제 (실패하면 중단: 서버에 데이터가 남지 않게)
    if (typeof Cloud !== 'undefined' && Cloud.isSignedIn()) {
      try {
        U.toast('서버에 저장된 데이터를 삭제하는 중...');
        await Cloud.deleteAccount();
      } catch (e) {
        console.error('[Profile] 서버 데이터 삭제 실패', e);
        alert('서버 데이터를 삭제하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
        return;
      }
    }

    // 1) 폰에 예약된 알람 취소
    try {
      if (window.NativeApp && typeof window.NativeApp.cancelAlarm === 'function' && typeof Timeline !== 'undefined') {
        (State.schedules || []).forEach(s => Timeline.nativeAlarmTimes(s).forEach(t => window.NativeApp.cancelAlarm(t)));
      }
    } catch (e) { console.warn('alarm cancel', e); }

    // 2) 소셜 로그인 연결 해제
    try {
      if (provider === 'kakao' && typeof Kakao !== 'undefined' && Kakao.isInitialized && Kakao.isInitialized() && Kakao.Auth.getAccessToken()) {
        await new Promise(resolve => Kakao.API.request({ url: '/v1/user/unlink', success: resolve, fail: resolve }));
      }
      if (provider === 'google') {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
        if (isNative && typeof Login !== 'undefined' && Login.socialLoginPlugin()) {
          await Login.socialLoginPlugin().logout({ provider: 'google' }).catch(() => {});
        } else if (typeof google !== 'undefined' && google.accounts) {
          google.accounts.id.disableAutoSelect();
        }
      }
    } catch (e) { console.warn('social unlink', e); }

    // 3) 기기 데이터 전체 삭제
    try {
      Object.keys(localStorage).filter(k => k.startsWith('bp_')).forEach(k => localStorage.removeItem(k));
    } catch (e) { localStorage.clear(); }
    State.schedules = [];
    State.isPro = false;

    alert('탈퇴가 완료되었습니다. 그동안 BuddyPlanner를 이용해 주셔서 감사합니다.');
    window.location.reload();
  },

  async logout() {
    if (this._loggingOut) return;
    const ok = await App.ask('로그아웃할까요?', '다시 로그인하면 일정과 기록을 그대로 불러와요.',
      { ok: '로그아웃', cancel: '취소', busyText: '로그아웃 중…' });
    if (!ok) return;
    this._loggingOut = true;
    try {
      const provider = localStorage.getItem('bp_provider');

      // 클라우드 사용 중: 남은 변경을 올린 뒤, 다음 로그인 계정과 섞이지 않게 기기 데이터를 정리
      if (typeof Cloud !== 'undefined' && Cloud.isSignedIn()) {
        // 네트워크가 느려도 최대 3초만 기다림
        try { await Promise.race([Cloud.push(), new Promise(r => setTimeout(r, 3000))]); } catch (e) { /* 오프라인 등 */ }
        if (Cloud.pendingCount() > 0) {
          const go = await App.ask('저장 안 된 변경이 있어요',
            '아직 서버에 올라가지 않은 변경이 있어요.<br>지금 로그아웃하면 이 변경은 사라져요.',
            { ok: '그래도 로그아웃', cancel: '취소', busyText: '로그아웃 중…' });
          if (!go) return;
        }
        await Cloud.signOut();
        Cloud.clearLocalData();
        if (typeof Billing !== 'undefined') Billing.unlinkCloudUser();
        State.schedules = [];
      }

      // 카카오 로그아웃 처리
      if (provider === 'kakao' && typeof Kakao !== 'undefined' && Kakao.Auth) {
        try { Kakao.Auth.logout(() => console.log('카카오 세션 만료')); } catch (e) { /* SDK 미초기화 */ }
      }

      // 구글 로그아웃 처리 (앱: 네이티브 계정 선택 상태 초기화 / 웹: 자동 로그인 해제)
      if (provider === 'google') {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
        if (isNative && typeof Login !== 'undefined' && Login.socialLoginPlugin()) {
          Login.socialLoginPlugin().logout({ provider: 'google' }).catch(e => console.warn('Google logout', e));
        } else if (typeof google !== 'undefined' && google.accounts) {
          google.accounts.id.disableAutoSelect();
        }
      }

      localStorage.removeItem('bp_logged_in');
      localStorage.removeItem('bp_provider');
      localStorage.removeItem('bp_user_name');
      localStorage.removeItem('bp_user_email');

      U.toast('로그아웃 되었습니다.');
      App.navigate('login');
    } finally {
      this._loggingOut = false;
      document.querySelectorAll('#app-modal').forEach(bg => { delete bg.dataset.busy; });
      App.closeModal();
    }
  },

  /** 관리자 메뉴 표시: 개발용 ADMIN_MODE 또는 서버가 확인한 관리자 계정 */
  canAdmin() {
    return !!(window.APP_CONFIG || {}).ADMIN_MODE || (typeof Admin !== 'undefined' && Admin.isAdmin === true);
  },

  openAdmin() {
    // 실제 상품 변경 권한은 서버가 다시 확인함 (관리자 계정만)
    if (!this.canAdmin()) return;
    U.toast('관리자 모드에 진입합니다.');
    App.navigate('admin');
  },

  /** 백업·불러오기에서 빼는 값: 로그인·동기화 상태·구독 캐시·기기별 알람 예약 (다른 기기·계정을 덮어쓰지 않게) */
  _skipBackupKey(key) {
    return /session|token/i.test(key) || /^bp_sync_/.test(key) || /^sb-/.test(key)
      || ['bp_pro_cache', 'bp_cloud_session', 'bp_logged_in', 'bp_ios_ack_at', 'bp_ios_snooze'].includes(key);
  },

  exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (this._skipBackupKey(key)) continue;   // 로그인·동기화·구독 정보는 백업 파일에 넣지 않음
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
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!data || typeof data !== 'object') throw new Error('bad');
          const ok = await App.ask('데이터를 불러올까요?', '지금 기기의 일정·기록이 이 파일 내용으로 바뀌어요. 되돌릴 수 없어요.', { ok: '불러오기' });
          if (!ok) return;
          for (const key in data) {
            if (this._skipBackupKey(key) || !/^bp_|^buddy/.test(key)) continue;   // 버디플래너 값만, 로그인·동기화 값은 빼고
            if (typeof data[key] !== 'string') continue;
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
