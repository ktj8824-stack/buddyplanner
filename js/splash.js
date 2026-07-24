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

    // Use a high-quality golf slow-motion video as placeholder
    // Users can replace this URL with their own video
    const videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-golf-player-hitting-the-ball-in-slow-motion-41857-large.mp4';
    
    container.innerHTML = `
      <video class="splash-video-bg" autoplay loop muted playsinline>
        <source src="${videoUrl}" type="video/mp4">
      </video>
      <div class="splash-overlay"></div>
      <div class="splash-content">
        <p class="splash-top-text">나만의 골프 비서</p>
        <h1 class="splash-logo-title">myB</h1>
        <p class="splash-subtitle">my-buddybirdie</p>
      </div>
      <button class="splash-skip-btn" onclick="Splash.nextScreen()">시작하기</button>
    `;
  },

  startTransitionTimer() {
    // Automatically transition after 3.5 seconds
    this.timeoutId = setTimeout(() => {
      this.nextScreen();
    }, 3500);
  },

  nextScreen() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
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
