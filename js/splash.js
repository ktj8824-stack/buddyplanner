/* =========================================
   Splash Screen Logic
   ========================================= */

const Splash = {
  init() {
    this.render();
    this.startTransitionTimer();
  },

  render() {
    const container = U.$('#screen-splash');
    if (!container) return;

    container.innerHTML = `
      <div class="splash-overlay"></div>
      <div class="splash-content">
        <p class="splash-top-text">나만의 비서</p>
        <h1 class="splash-logo-title">myB</h1>
        <p class="splash-subtitle">my-buddybirdie</p>
      </div>
      <button class="splash-skip-btn" onclick="Splash.nextScreen()">시작하기</button>
    `;
  },

  startTransitionTimer() {
    // Automatically transition after 4 seconds
    this.timeoutId = setTimeout(() => {
      this.nextScreen();
    }, 4000);
  },

  nextScreen() {
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
      setTimeout(() => U.toast('⛳ myB에 오신 것을 환영합니다!'), 700);
    }
  }
};
