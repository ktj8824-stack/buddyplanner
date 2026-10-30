/* js/community.js */
const Community = {
  init() {
    this.render();
  },

  toggleGoodshot(btn) {
    btn.classList.toggle('active');
    const on = btn.classList.contains('active');
    // 굿샷 취소 시 포인트도 회수 (반복 클릭으로 무한 적립 방지)
    let pts = parseInt(localStorage.getItem('bp_points') || '0', 10) || 0;
    pts = Math.max(0, pts + (on ? 10 : -10));
    localStorage.setItem('bp_points', String(pts));
    const pointEl = U.$('#comm-points');
    if (pointEl) pointEl.textContent = `${pts.toLocaleString()} P`;
    if (on) U.toast('굿샷! 10 포인트가 적립되었습니다 🎾');
  },

  joinMatch() {
    App.showModal('조인 신청', '정말 조인을 신청하시겠습니까?<br><br><button class="btn btn-primary" onclick="App.closeModal(); U.toast(`신청이 완료되었습니다!`)">신청하기</button>');
  },

  render() {
    const container = U.$('#screen-community');
    container.innerHTML = `
      <div class="screen-scroll" style="background:#f8fafc; padding-bottom:calc(var(--safe-bottom) + 120px);">
        
        <!-- Header -->
        <div class="community-header">
          <h2>버디 커뮤니티</h2>
          <div class="my-points">
            <span>🪙</span>
            <span id="comm-points">${(parseInt(localStorage.getItem('bp_points') || '0', 10) || 0).toLocaleString()} P</span>
          </div>
        </div>

        <!-- Category Pills -->
        <div class="community-cats">
          <button class="comm-cat-pill active">전체 피드</button>
          <button class="comm-cat-pill">⛳ 조인 모집</button>
          <button class="comm-cat-pill">🏆 라운딩 후기</button>
          <button class="comm-cat-pill">🚗 카풀/동선 공유</button>
        </div>

        <div class="comm-preview-notice">
          <b>커뮤니티 정식 오픈 준비 중이에요</b>
          <span>아래 글은 기능을 보여드리기 위한 예시예요.</span>
        </div>

        <div class="feed-list">
          <!-- Feed Item 1 (Join Match) -->
          <div class="feed-card">
            <div class="feed-author">
              <div class="author-avatar" style="background:#0ea5e9; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16px;">골</div>
              <div class="author-info">
                <div class="author-name-row">
                  <span class="author-name">골프홀릭</span>
                  <span class="author-badge">핸디 14</span>
                </div>
                <span class="feed-time">10분 전 · 안양베네스트 CC</span>
              </div>
            </div>
            <div class="feed-tags">
              <span class="tag-join">⛳ 조인 모집 (1명 남음)</span>
              <span class="tag-course">이번 주 토요일 07:30</span>
            </div>
            <div class="feed-content">
              이번 주 토요일 안양베네스트 07:30 티업 조인 한 분 모십니다!<br>
              끝나고 근처 장어 명가(버디플래너 동선 완벽 연동!) 함께 가실 분 환영해요 🏌️
            </div>
            <div class="feed-actions">
              <button class="btn-goodshot" onclick="Community.toggleGoodshot(this)">
                <span>👍</span>
                <span>굿샷 14</span>
              </button>
              <button class="btn-join" onclick="Community.joinMatch()">참여 신청하기</button>
            </div>
          </div>

          <!-- Feed Item 2 (Course Route Share) -->
          <div class="feed-card">
            <div class="feed-author">
              <div class="author-avatar" style="background:#22c55e; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16px;">버</div>
              <div class="author-info">
                <div class="author-name-row">
                  <span class="author-name">버디사냥꾼</span>
                  <span class="author-badge" style="color:#059669; background:#ecfdf5;">싱글 골퍼</span>
                </div>
                <span class="feed-time">1시간 전 · 남서울 CC</span>
              </div>
            </div>
            <div class="feed-tags">
              <span class="tag-course" style="color:#0284c7; background:#f0f9ff; border-color:#e0f2fe;">🏆 코스 공략 & 맛집 루트</span>
              <span class="tag-course">남서울 CC</span>
            </div>
            <div class="feed-content">
              <strong>남서울 CC 새벽 라운딩 최적 타임라인 공유합니다!</strong><br>
              집에서 40분 전 출발해서 클럽하우스 50분 전 도착, 티오프 후 근처 능이백숙집까지 동선 완벽 역산 완료! 필요하신 분 캘린더에 담아가세요.
            </div>
            <div class="feed-actions">
              <button class="btn-goodshot" onclick="Community.toggleGoodshot(this)">
                <span>👍</span>
                <span>굿샷 28</span>
              </button>
              <button class="btn-join" style="background:#eff6ff; color:#007aff; border:1px solid #bfdbfe;" onclick="U.toast('루트가 내 일정으로 복사되었습니다 ⛳')">일정 담아가기</button>
            </div>
          </div>

          <!-- Feed Item 3 (Join 2) -->
          <div class="feed-card">
            <div class="feed-author">
              <div class="author-avatar" style="background:#f59e0b; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16px;">나</div>
              <div class="author-info">
                <div class="author-name-row">
                  <span class="author-name">나이스샷김프로</span>
                  <span class="author-badge">핸디 11</span>
                </div>
                <span class="feed-time">3시간 전 · 파인크리크 CC</span>
              </div>
            </div>
            <div class="feed-tags">
              <span class="tag-join">⛳ 조인 모집 (2명 남음)</span>
              <span class="tag-course">다음 주 토요일 06:40</span>
            </div>
            <div class="feed-content">
              파인크리크 CC 주말 첫 티업 조인 모십니다. 매너 좋고 명랑 골프 지향하시는 분 편하게 신청해주세요!
            </div>
            <div class="feed-actions">
              <button class="btn-goodshot" onclick="Community.toggleGoodshot(this)">
                <span>👍</span>
                <span>굿샷 8</span>
              </button>
              <button class="btn-join" onclick="Community.joinMatch()">참여 신청하기</button>
            </div>
          </div>

        </div>
      </div>
    `;
  }
};
