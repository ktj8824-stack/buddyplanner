/* =========================================
   BuddyPlanner v2 — Login Screen (OAuth)
   ========================================= */

const Login = {
  // 키는 js/config.js(깃허브에 올라가지 않음)에서 읽어옵니다.
  KAKAO_JS_KEY: (window.APP_CONFIG || {}).KAKAO_JS_KEY || 'YOUR_KAKAO_JS_KEY',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

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
          <img src="./img/buddybirdie_app_icon.png" style="width:80px; height:80px; border-radius:20px; box-shadow:var(--glow-accent); margin-bottom:16px; object-fit:cover;" alt="버디플래너 로고" />
          <h1 class="login-title">버디플래너</h1>
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
    if (this.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      // 임시 구글 로그인 버튼 (API 키 없을 때 테스트용)
      const wrapper = document.getElementById('google_btn_wrapper');
      if (wrapper) {
        wrapper.innerHTML = `
          <button class="btn-social" onclick="Login.doGoogleLoginMock()" style="background:#fff; color:#3c4043; border:1px solid #dadce0; width:300px; height:40px; border-radius:4px; padding:0; font-size:14px; font-weight:500; display:flex; align-items:center; justify-content:center; gap:8px;">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="Google">
            Google 로그인
          </button>
        `;
      }
    } else if (typeof google !== 'undefined') {
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

  doGoogleLoginMock() {
    const inputId = prompt("[테스트용 가상 구글 로그인]\n구글 아이디(이메일 또는 이름)를 입력해주세요.\n\n* 실제 구글 로그인은 구글 개발자 센터에서 발급받은 클라이언트 ID를 입력해야 작동합니다.", "구글 유저");
    if (inputId) {
      this.finishLogin('google', { name: inputId, email: 'google@example.com' });
    } else {
      U.toast('구글 로그인을 취소했습니다.');
    }
  },

  doKakaoLogin() {
    console.log('doKakaoLogin called');
    U.toast('카카오 로그인을 시도합니다...');
    
    if (this.KAKAO_JS_KEY === 'YOUR_KAKAO_JS_KEY') {
      U.toast('⚠️ 카카오 API 키가 설정되지 않았습니다. (임시 로그인 처리)');
      this.finishLogin('kakao', { name: '카카오 유저', email: 'kakao@example.com' });
      return;
    }

    // [추가] 모바일(Capacitor) 환경일 경우 네이티브 로그인 사용
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      if (!window.Capacitor.Plugins.CapacitorKakaoLogin && window.Capacitor.registerPlugin) {
        window.Capacitor.Plugins.CapacitorKakaoLogin = window.Capacitor.registerPlugin('CapacitorKakaoLogin');
      }
      if (window.Capacitor.Plugins.CapacitorKakaoLogin) {
        window.Capacitor.Plugins.CapacitorKakaoLogin.login()
          .then(res => {
            // 네이티브 로그인 성공 시 발급받은 토큰을 JS SDK에 세팅
            if (typeof Kakao !== 'undefined' && Kakao.isInitialized()) {
              Kakao.Auth.setAccessToken(res.accessToken);
              Kakao.API.request({
                url: '/v2/user/me',
                success: (profileRes) => {
                  const name = profileRes.properties && profileRes.properties.nickname ? profileRes.properties.nickname : '카카오 유저';
                  const email = profileRes.kakao_account && profileRes.kakao_account.email ? profileRes.kakao_account.email : '';
                  this.finishLogin('kakao', { name, email });
                },
                fail: (err) => {
                  console.error('프로필 조회 실패:', err);
                  this.finishLogin('kakao', { name: '카카오 유저', email: '' });
                }
              });
            } else {
              this.finishLogin('kakao', { name: '카카오(네이티브)', email: '' });
            }
          })
          .catch(err => {
            console.error('Kakao login err:', err);
            const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
            U.toast('카카오 네이티브 로그인 실패: ' + msg);
          });
        return;
      }
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

window.Login = Login;
