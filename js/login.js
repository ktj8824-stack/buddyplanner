/* =========================================
   BuddyPlanner v2 — Login Screen (OAuth)
   ========================================= */

const Login = {
  // TODO: 대표님의 실제 발급받은 API 키로 교체해야 합니다!
  KAKAO_JS_KEY: '5729341d219d8cb6f0a189fa86c91456',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

  init() {
    this.render();
    this.initOAuth();
  },

  render() {
    const el = U.$('#screen-login');
    el.innerHTML = `
      <div class="login-container">
        <div class="login-logo" style="display:flex; flex-direction:column; align-items:center;">
          <div style="width:72px; height:72px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:36px; box-shadow:var(--glow-accent); margin-bottom:16px;">⛳</div>
          <h1 class="login-title">버디플래너</h1>
          <p class="login-subtitle">골프 일정 관리의 새로운 기준</p>
        </div>
        
        <div class="login-actions">
          <!-- 구글 로그인 고유 버튼이 여기에 렌더링 됩니다 -->
          <div id="google_btn_wrapper" style="display:flex; justify-content:center; margin-bottom:12px;"></div>
          
          <button class="btn-social btn-kakao" onclick="Login.doKakaoLogin()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#000000">
              <path d="M12 3C6.48 3 2 6.47 2 10.75c0 2.76 1.84 5.17 4.67 6.49-.15.54-.53 1.96-.6 2.27-.08.35.12.35.3.23.14-.09 1.94-1.32 2.75-1.89.92.26 1.88.4 2.88.4 5.52 0 10-3.47 10-7.75S17.52 3 12 3z"/>
            </svg>
            카카오 로그인
          </button>
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
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: this.GOOGLE_CLIENT_ID,
        callback: this.handleGoogleResponse.bind(this)
      });
      // 구글 공식 로그인 버튼 렌더링
      google.accounts.id.renderButton(
        document.getElementById('google_btn_wrapper'),
        { theme: 'outline', size: 'large', type: 'standard', width: 300 }
      );
    }
  },

  doKakaoLogin() {
    console.log('doKakaoLogin called');
    if (this.KAKAO_JS_KEY === 'YOUR_KAKAO_JS_KEY') {
      U.toast('⚠️ 카카오 API 키가 설정되지 않았습니다. (임시 로그인 처리)');
      this.finishLogin('kakao', { name: '카카오 유저', email: 'kakao@example.com' });
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
    // JWT 토큰 디코딩 (프론트엔드 전용 야매 파싱)
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const name = payload.name || '구글 유저';
      const email = payload.email || '';
      this.finishLogin('google', { name, email });
    } catch (e) {
      console.error(e);
      U.toast('구글 정보를 읽을 수 없습니다.');
    }
  },

  finishLogin(provider, user) {
    localStorage.setItem('bp_logged_in', 'true');
    localStorage.setItem('bp_provider', provider);
    localStorage.setItem('bp_user_name', user.name);
    localStorage.setItem('bp_user_email', user.email);

    U.toast(`✅ ${user.name}님 환영합니다!`);

    const hasOnboarded = localStorage.getItem('bp_onboarded') === 'true';
    if (hasOnboarded) {
      App.navigate('home');
    } else {
      App.navigate('onboarding');
    }
  }
};
