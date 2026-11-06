const Insurance = {
  init() {
    this.render();
  },

  render() {
    const el = U.$('#screen-insurance');
    el.innerHTML = `
      <div class="header">
        <button class="back-btn" onclick="App.navigate('home')">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="header-title">홀인원 보험</div>
        <div style="width:24px;"></div>
      </div>
      <div class="screen-scroll bg-light" style="display:flex; flex-direction:column; align-items:center; padding: 40px 20px; text-align:center;">
        <div style="background:#fff; width:100%; border-radius:16px; padding:40px 20px; box-shadow:0 4px 12px rgba(0,0,0,0.05); margin-top:20px;">
          <div style="width:80px; height:80px; background:rgba(71, 85, 105, 0.05); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
            <svg viewBox="0 0 24 24" width="40" height="40" stroke="#475569" stroke-width="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <h2 style="font-size:22px; font-weight:800; color:var(--text-100); margin-bottom:12px;">BuddyPlanner 홀인원 보험<br><span style="color:var(--accent);">출시 준비 중!</span></h2>
          <p style="font-size:15px; color:var(--text-400); line-height:1.6; margin-bottom:30px; word-break:keep-all;">
            합리적인 가격으로 필드에서의 짜릿한 순간을 든든하게 대비하세요.<br>다양한 혜택이 포함된 전용 상품이 곧 찾아옵니다.
          </p>
          <button onclick="Insurance.subscribe()" style="width:100%; background:var(--accent); color:#fff; border:none; padding:16px; border-radius:12px; font-size:16px; font-weight:700; cursor:pointer; box-shadow:0 4px 12px rgba(37,99,235,0.2);">
            출시 알림 받기
          </button>
        </div>
      </div>
    `;
  },
  
  subscribe() {
    alert("출시 알림 신청이 완료되었습니다! 런칭 시 푸시 알림으로 안내해 드립니다.");
    App.navigate('home');
  }
};
