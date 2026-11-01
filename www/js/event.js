const EventPage = {
  init() {
    this.render();
  },

  render() {
    const el = U.$('#screen-event');
    el.innerHTML = `
      <div class="header">
        <button class="back-btn" onclick="App.navigate('home')">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="header-title">이벤트</div>
        <div style="width:24px;"></div>
      </div>
      <div class="screen-scroll bg-light" style="display:flex; flex-direction:column; padding: 20px;">
        
        <div style="background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #ea580c); padding: 40px 20px; text-align: center; color: #fff;">
            <div style="font-size:36px; margin-bottom:12px;">🍂</div>
            <h2 style="font-size:22px; font-weight:800; margin-bottom:8px;">가을 라운딩 리뷰 이벤트!</h2>
            <p style="font-size:14px; opacity:0.9;">라운딩 후기를 남기면 스타벅스 쿠폰 100% 증정</p>
          </div>
          <div style="padding: 24px 20px;">
            <div style="margin-bottom:16px;">
              <span style="font-size:12px; font-weight:800; color:#fff; background:var(--accent); padding:4px 8px; border-radius:4px;">진행중</span>
              <span style="font-size:13px; color:var(--text-400); margin-left:8px;">2026.09.01 ~ 2026.10.31</span>
            </div>
            <h3 style="font-size:16px; font-weight:700; color:var(--text-100); margin-bottom:12px;">참여 방법</h3>
            <ul style="font-size:14px; color:var(--text-400); line-height:1.6; padding-left:20px; margin-bottom:24px;">
              <li>앱 내 '커뮤니티' 게시판에 사진과 함께 가을 라운딩 후기 작성</li>
              <li>해시태그 <strong>#BuddyPlanner가을</strong> 필수 포함</li>
              <li>작성 완료 시 자동 응모!</li>
            </ul>
            <button onclick="EventPage.participate()" style="width:100%; background:var(--accent); color:#fff; border:none; padding:14px; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer;">
              지금 바로 참여하기
            </button>
          </div>
        </div>
        
        <div style="background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05); opacity: 0.6;">
          <div style="background: #e2e8f0; padding: 24px 20px; text-align: center; color: #64748b;">
            <div style="font-size:28px; margin-bottom:8px;">🎁</div>
            <h2 style="font-size:18px; font-weight:700;">앱 런칭 기념 포인트 2배</h2>
          </div>
          <div style="padding: 16px 20px;">
            <div style="margin-bottom:8px;">
              <span style="font-size:12px; font-weight:800; color:#fff; background:#94a3b8; padding:4px 8px; border-radius:4px;">종료</span>
            </div>
            <p style="font-size:14px; color:var(--text-400);">종료된 이벤트입니다.</p>
          </div>
        </div>

      </div>
    `;
  },
  
  participate() {
    App.navigate('community');
  }
};
