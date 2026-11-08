/* =========================================
   BuddyPlanner v2 — Login Screen (OAuth)
   ========================================= */

const Login = {
  // 키는 js/config.js(깃허브에 올라가지 않음)에서 읽어옵니다.
  KAKAO_JS_KEY: (window.APP_CONFIG || {}).KAKAO_JS_KEY || 'YOUR_KAKAO_JS_KEY',
  // 구글 클라우드의 '웹 애플리케이션' 클라이언트 ID (안드로이드 네이티브 로그인에도 이 값을 사용)
  GOOGLE_CLIENT_ID: (window.APP_CONFIG || {}).GOOGLE_WEB_CLIENT_ID || '',

  init() {
    this.render();
    this.initOAuth();
    // Capacitor 환경이라면 네이티브 카카오 로그인 초기화
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      if (!window.Capacitor.Plugins.CapacitorKakaoLogin && window.Capacitor.registerPlugin) {
        window.Capacitor.Plugins.CapacitorKakaoLogin = window.Capacitor.registerPlugin('CapacitorKakaoLogin');
      }
      if (window.Capacitor.Plugins.CapacitorKakaoLogin) {
        window.Capacitor.Plugins.CapacitorKakaoLogin.initialize({ appKey: (window.APP_CONFIG || {}).KAKAO_NATIVE_APP_KEY || '' })
          .catch(e => console.error('Kakao native init err', e));
      }
    }
  },

  render() {
    const el = U.$('#screen-login');
    el.innerHTML = `
      <div class="login-wrap" style="padding-top: 15vh;">
        <div class="login-logo" style="display:flex; flex-direction:column; align-items:center;">
          <img src="./img/buddybirdie_app_icon.png" style="width:80px; height:80px; border-radius:20px; box-shadow:var(--glow-accent); margin-bottom:16px; object-fit:cover;" alt="BuddyPlanner 로고" />
          <h1 class="login-title">BuddyPlanner</h1>
          <p class="login-subtitle">골프 일정 관리의 새로운 기준</p>
        </div>
        
        <div class="login-actions" style="align-items: center;">
          <!-- 구글 로그인 고유 버튼이 여기에 렌더링 됩니다 -->
          <div id="google_btn_wrapper" style="display:flex; justify-content:center; margin-bottom:12px; width:100%; max-width:320px;"></div>
          
          <button class="btn-social btn-kakao" onclick="Login.doKakaoLogin()" style="margin-left:auto; margin-right:auto; width:300px; height:40px; border-radius:4px; padding:0; font-size:14px; font-weight:500; box-shadow:none;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000">
              <path d="M12 3C6.48 3 2 6.47 2 10.75c0 2.76 1.84 5.17 4.67 6.49-.15.54-.53 1.96-.6 2.27-.08.35.12.35.3.23.14-.09 1.94-1.32 2.75-1.89.92.26 1.88.4 2.88.4 5.52 0 10-3.47 10-7.75S17.52 3 12 3z"/>
            </svg>
            카카오 로그인
          </button>
          ${this.appleEnabled() ? `
          <button class="btn-social" onclick="Login.doAppleLogin()" style="margin:12px auto 0; width:300px; height:40px; border-radius:4px; padding:0; font-size:14px; font-weight:500; background:#000; color:#fff; border:none; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.97.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.39-3.69zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.59.68-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28z"/></svg>
            Apple로 로그인
          </button>` : ''}
        </div>
      </div>
    `;
  },

  initOAuth() {
    // 1. 카카오 초기화
    if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
      if (this.KAKAO_JS_KEY !== 'YOUR_KAKAO_JS_KEY') {
        Kakao.init(this.KAKAO_JS_KEY);
      }
    }

    // 2. 구글 초기화
    this.initGoogle();
  },

  isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  },

  socialLoginPlugin() {
    const cap = window.Capacitor;
    if (!cap) return null;
    if (!cap.Plugins.SocialLogin && cap.registerPlugin) cap.Plugins.SocialLogin = cap.registerPlugin('SocialLogin');
    return cap.Plugins.SocialLogin || null;
  },

  initGoogle() {
    const wrapper = document.getElementById('google_btn_wrapper');
    if (!wrapper) return;

    // 클라이언트 ID가 없으면 구글 로그인 버튼을 표시하지 않음
    if (!this.GOOGLE_CLIENT_ID) {
      wrapper.style.display = 'none';
      return;
    }

    // ① 안드로이드 앱: 웹뷰 안에서는 구글 로그인이 차단되므로 네이티브 로그인 사용
    if (this.isNative()) {
      const plugin = this.socialLoginPlugin();
      if (!plugin) { wrapper.style.display = 'none'; return; }
      // 아이폰은 '아이폰용' 구글 클라이언트 ID가 따로 있어야 함 (없이 초기화하면 앱이 멈춤) → 없으면 버튼 숨김
      const isIOS = window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'ios';
      const iosId = (window.APP_CONFIG || {}).GOOGLE_IOS_CLIENT_ID || '';
      if (isIOS && !iosId) { wrapper.style.display = 'none'; return; }
      if (!this._googleNativeReady) {
        const g = isIOS ? { iOSClientId: iosId, iOSServerClientId: this.GOOGLE_CLIENT_ID, mode: 'online' } : { webClientId: this.GOOGLE_CLIENT_ID, mode: 'online' };
        this._googleNativeReady = plugin.initialize({ google: g })
          .catch(e => { console.error('Google native init err', e); this._googleNativeReady = null; throw e; });
      }
      wrapper.innerHTML = `
        <button class="btn-social" onclick="Login.doGoogleLoginNative()" style="background:#fff; color:#3c4043; border:1px solid #dadce0; width:300px; height:40px; border-radius:4px; padding:0; font-size:14px; font-weight:500; display:flex; align-items:center; justify-content:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Google 로그인
        </button>`;
      return;
    }

    // ② 웹: 구글 공식 로그인 버튼 (스크립트가 늦게 로드되면 잠시 대기)
    const render = (tries = 0) => {
      if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
        if (tries < 25) return setTimeout(() => render(tries + 1), 200);
        wrapper.style.display = 'none';
        return;
      }
      google.accounts.id.initialize({
        client_id: this.GOOGLE_CLIENT_ID,
        callback: this.handleGoogleResponse.bind(this)
      });
      google.accounts.id.renderButton(wrapper, { theme: 'outline', size: 'large', type: 'standard', width: 300 });
    };
    render();
  },

  /** 아이폰 앱에서만, 설정(APP_CONFIG.APPLE_LOGIN)을 켰을 때만 Apple 로그인 사용 */
  appleEnabled() {
    const isIOS = this.isNative() && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'ios';
    return isIOS && !!(window.APP_CONFIG || {}).APPLE_LOGIN && !!this.socialLoginPlugin();
  },

  async doAppleLogin() {
    const plugin = this.socialLoginPlugin();
    if (!plugin) { U.toast('Apple 로그인을 사용할 수 없습니다.'); return; }
    try {
      if (!this._appleReady) {
        this._appleReady = plugin.initialize({ apple: {} }).catch(e => { this._appleReady = null; throw e; });
      }
      await this._appleReady;
      // 애플에는 해시한 nonce, 서버(Supabase)에는 원래 값을 보냄
      const rawNonce = this.randomNonce();
      const hashedNonce = await this.sha256Hex(rawNonce);
      const res = await plugin.login({ provider: 'apple', options: { scopes: ['email', 'name'], nonce: hashedNonce } });
      const r = (res && res.result) || {};
      const idToken = r.idToken || (r.accessToken && r.accessToken.token) || '';
      if (!idToken) throw new Error('no id token');
      const claims = this.decodeJwt(idToken) || {};
      const p = r.profile || {};
      const name = [p.familyName, p.givenName].filter(Boolean).join('') || p.name || 'Apple 유저';
      this.finishLogin('apple', { name, email: p.email || claims.email || '' }, { idToken, nonce: rawNonce });
    } catch (e) {
      const msg = String((e && (e.message || e.code)) || e || '');
      console.error('Apple login err:', e);
      if (/cancel|1001/i.test(msg)) { U.toast('Apple 로그인을 취소했습니다.'); return; }
      U.toast('Apple 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  },

  async doGoogleLoginNative() {
    const plugin = this.socialLoginPlugin();
    if (!plugin) { U.toast('구글 로그인을 사용할 수 없습니다.'); return; }
    try {
      if (this._googleNativeReady) await this._googleNativeReady;
      // 일회용 확인값(nonce): 구글에는 해시값을, 서버(Supabase)에는 원래 값을 보내 토큰 재사용을 막음
      const rawNonce = this.randomNonce();
      const hashedNonce = await this.sha256Hex(rawNonce);
      const res = await plugin.login({ provider: 'google', options: { nonce: hashedNonce } });
      const r = (res && res.result) || {};
      const claims = (r.idToken && this.decodeJwt(r.idToken)) || {};
      // 토큰에 넣은 nonce가 그대로 들어온 경우에만 서버에 원래 값을 함께 보냄 (없으면 생략)
      const nonce = claims.nonce && claims.nonce === hashedNonce ? rawNonce : undefined;
      if (claims.nonce && !nonce) console.warn('Google id_token nonce mismatch');
      let profile = r.profile || {};
      // 프로필이 비어 있으면 ID 토큰에서 이름·이메일을 읽음
      if ((!profile.name || !profile.email) && r.idToken) profile = Object.assign(this.decodeJwt(r.idToken) || {}, profile);
      this.finishLogin('google', { name: profile.name || profile.givenName || '구글 유저', email: profile.email || '' }, { idToken: r.idToken, nonce });
    } catch (e) {
      const msg = String((e && (e.message || e.code)) || e || '');
      console.error('Google native login err:', e);
      if (/cancel/i.test(msg)) { U.toast('구글 로그인을 취소했습니다.'); return; }
      U.toast('구글 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  },

  randomNonce() {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  },

  async sha256Hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  },

  /** JWT payload 디코딩 (base64url + UTF-8, 한글 이름 깨짐 방지) */
  decodeJwt(token) {
    try {
      let b64 = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      return null;
    }
  },

  doKakaoLogin() {
    console.log('doKakaoLogin called');
    U.toast('카카오 로그인을 시도합니다...');
    
    if (this.KAKAO_JS_KEY === 'YOUR_KAKAO_JS_KEY') {
      U.toast('카카오 로그인 설정이 아직 안 돼 있어요. 잠시 후 다시 시도해 주세요.');
      return;
    }

    // [추가] 모바일(Capacitor) 환경일 경우 네이티브 로그인 사용
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      // 앱 안에서는 웹(브라우저) 카카오 로그인을 쓰지 않음: 로그인 후 앱으로 돌아오지 못하고
      // 브라우저의 웹사이트로 가 버리기 때문. 네이티브 카카오 로그인이 준비되지 않은 기기면 안내만 함.
      const avail = typeof window.Capacitor.isPluginAvailable === 'function'
        ? window.Capacitor.isPluginAvailable('CapacitorKakaoLogin') : true;
      if (!avail) {
        U.toast('이 기기에서는 카카오 로그인을 준비 중이에요. 구글 로그인을 이용해 주세요.', 3500);
        return;
      }
      if (!window.Capacitor.Plugins.CapacitorKakaoLogin && window.Capacitor.registerPlugin) {
        window.Capacitor.Plugins.CapacitorKakaoLogin = window.Capacitor.registerPlugin('CapacitorKakaoLogin');
      }
      if (window.Capacitor.Plugins.CapacitorKakaoLogin) {
        window.Capacitor.Plugins.CapacitorKakaoLogin.login()
          .then(res => {
            // 카카오 인증은 끝남 → 이름·이메일은 ID 토큰에서 바로 꺼냄
            // (예전처럼 카카오 JS SDK로 프로필을 다시 묻지 않음: 앱 안(아이폰)에서는 그 요청이 응답 없이 멈출 수 있음)
            U.toast('카카오 인증 완료. 로그인하는 중...');
            const p = (res && res.idToken && this.decodeJwt(res.idToken)) || {};
            const name = p.nickname || p.name || '카카오 유저';
            const email = p.email || '';
            if (!res || !res.idToken) console.warn('[Login] 카카오 ID 토큰이 없어요 (OpenID Connect 설정 확인)');
            this.finishLogin('kakao', { name, email }, { idToken: res && res.idToken });
          })
          .catch(err => {
            console.error('Kakao login err:', err);
            const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
            U.toast('카카오 네이티브 로그인 실패: ' + msg);
          });
        return;
      }
      U.toast('카카오 로그인을 시작하지 못했어요. 앱을 최신 버전으로 업데이트해 주세요.', 3500);
      return;
    }

    // 웹 + 클라우드 사용: Supabase의 카카오 로그인 페이지로 이동 (돌아오면 App.init에서 로그인 완료)
    if (typeof Cloud !== 'undefined' && Cloud.isConfigured()) {
      Cloud.startOAuth('kakao');
      return;
    }

    if (typeof Kakao === 'undefined') {
      alert('카카오 SDK가 로드되지 않았습니다.');
      return;
    }
    
    if (!Kakao.isInitialized()) {
      try {
        Kakao.init(this.KAKAO_JS_KEY);
      } catch(e) {
        alert('카카오 초기화 실패: ' + e.message);
        return;
      }
    }

    Kakao.Auth.login({
      success: (authObj) => {
        Kakao.API.request({
          url: '/v2/user/me',
          success: (res) => {
            const name = res.properties && res.properties.nickname ? res.properties.nickname : '카카오 유저';
            const email = res.kakao_account && res.kakao_account.email ? res.kakao_account.email : '';
            this.finishLogin('kakao', { name, email });
          },
          fail: (err) => {
            console.error(err);
            U.toast('카카오 사용자 정보를 가져오는데 실패했습니다.');
          }
        });
      },
      fail: (err) => {
        console.error(err);
        U.toast('카카오 로그인이 취소되었거나 실패했습니다.');
      }
    });
  },

  handleGoogleResponse(response) {
    if (!response.credential) {
      U.toast('구글 로그인에 실패했습니다.');
      return;
    }
    const payload = this.decodeJwt(response.credential);
    if (!payload) {
      U.toast('구글 정보를 읽을 수 없습니다.');
      return;
    }
    this.finishLogin('google', { name: payload.name || '구글 유저', email: payload.email || '' }, { idToken: response.credential });
  },

  /**
   * 로그인 완료 처리.
   * @param cloud {idToken} 이 있으면 Supabase에 로그인하고 서버 데이터를 받아온 뒤 화면을 엽니다.
   *              {already:true} 는 이미 클라우드 세션이 있는 경우(웹 리디렉트 로그인).
   */
  async finishLogin(provider, user, cloud) {
    localStorage.setItem('bp_logged_in', 'true');
    localStorage.setItem('bp_provider', provider);
    localStorage.setItem('bp_user_email', user.email || '');
    // 닉네임: 기기에 이미 있으면(사용자가 바꾼 닉네임) 유지하고, 없을 때만 로그인 이름 사용.
    // 서버에 저장된 닉네임이 있으면 아래 동기화에서 그 값으로 바뀜.
    if (!localStorage.getItem('bp_user_name')) {
      const setName = () => localStorage.setItem('bp_user_name', user.name);
      if (typeof Cloud !== 'undefined') Cloud.withoutTracking(setName); else setName();
    }

    if (typeof Cloud !== 'undefined' && Cloud.isConfigured() && cloud && (cloud.idToken || cloud.already)) {
      U.toast('☁️ 내 데이터를 불러오는 중...');
      try {
        if (cloud.idToken) await Cloud.signInWithIdToken(provider, cloud.idToken, cloud.nonce);
        if (typeof Billing !== 'undefined') Billing.linkCloudUser();
        await Cloud.sync();
        if (typeof State !== 'undefined') State.loadSchedules();
        if (typeof App !== 'undefined') App.loadPreferences();
      } catch (e) {
        console.warn('[Login] 클라우드 연결 실패', e);
        U.toast('클라우드에 연결하지 못했어요. 이 기기에만 저장되며, 연결되면 자동으로 동기화돼요.', 3500);
      }
    }


    const hasOnboarded = localStorage.getItem('bp_onboarded') === 'true';
    App.navigate(hasOnboarded ? 'home' : 'onboarding');
  },

  /** 웹: 카카오 OAuth 리디렉트로 돌아온 뒤 로그인 완료 */
  async completeRedirectLogin(redirected) {
    let name = '카카오 유저', email = '';
    try {
      const u = await Cloud.fetchUser();
      const m = (u && u.user_metadata) || {};
      name = m.name || m.full_name || m.nickname || m.preferred_username || name;
      email = (u && u.email) || m.email || '';
    } catch (e) { console.warn('[Login] 사용자 정보 조회 실패', e); }
    await this.finishLogin(redirected.provider || 'kakao', { name, email }, { already: true });
  }
};

window.Login = Login;
