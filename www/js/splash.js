/* =========================================
   Splash Screen Logic
   ========================================= */

const Splash = {
  init() {
    this.done = false;
    this.render();
    this.startTransitionTimer();
  },

  render() {
    const container = U.$('#screen-splash');
    if (!container) return;

    // 시작 로딩 영상 (2.5초): 캐릭터 스윙 → 홀인 → BuddyPlanner 로고. 화면을 누르면 건너뜀.
    container.innerHTML = `
      <div class="splash-video-wrap" onclick="Splash.nextScreen()">
        <video class="splash-video" src="video/splash.mp4" poster="video/splash_start.jpg"
               autoplay muted playsinline webkit-playsinline preload="auto" disablepictureinpicture></video>
      </div>
    `;
    const v = container.querySelector('video');
    if (!v) return;
    v.addEventListener('ended', () => this.nextScreen());
    // 재생이 안 되는 기기: 마지막 로고 장면을 잠깐 보여 주고 넘어감
    v.addEventListener('error', () => this.showEndFrame());
    const tryPlay = v.play && v.play();
    if (tryPlay && tryPlay.catch) tryPlay.catch(() => this.showEndFrame());
  },

  showEndFrame() {
    if (this.done) return;
    const v = U.$('#screen-splash video');
    if (v) { v.removeAttribute('src'); v.poster = 'video/splash_end.jpg'; }
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.nextScreen(), 1200);
  },

  startTransitionTimer() {
    // 안전장치: 영상이 멈추거나 끝 이벤트가 오지 않아도 4초 뒤에는 넘어감
    this.timeoutId = setTimeout(() => {
      this.nextScreen();
    }, 4000);
  },

  nextScreen() {
    // 이미 다른 화면으로 넘어갔으면 아무것도 하지 않음
    if (this.done || (typeof State !== 'undefined' && State.screen && State.screen !== 'splash')) return;
    this.done = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    // Check login status
    const isLoggedIn = localStorage.getItem('bp_logged_in') === 'true';
    if (!isLoggedIn) {
      App.navigate('login');
      return;
    }
    
    // Check onboarding status
    const hasOnboarded = localStorage.getItem('bp_onboarded') === 'true';
    
    if (!hasOnboarded) {
      App.navigate('onboarding');
    } else {
      App.navigate('home');
      setTimeout(() => U.toast('⛳ BuddyPlanner에 오신 것을 환영합니다!'), 700);
    }
  }
};
