/* js/community.js */
const Community = {
  init() {
    this.render();
  },

  toggleGoodshot(btn) {
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
      U.toast('굿샷! 포인트가 지급되었습니다 🎾');
      const pointEl = U.$('.my-points span');
      if (pointEl) {
        let pts = parseInt(pointEl.innerText.replace(/,/g, ''));
        pts += 10;
        pointEl.innerText = pts.toLocaleString();
      }
    }
  },

  joinMatch() {
    App.showModal('조인 신청', '정말 조인을 신청하시겠습니까?<br><br><button class="btn btn-primary" onclick="App.closeModal(); U.toast(`신청이 완료되었습니다!`)">신청하기</button>');
  },

  render() {
    const container = U.$('#screen-community');
    container.innerHTML = `
      <div class="screen-scroll">
        <div class="community-header">
          <h2>커뮤니티</h2>
          <!-- [앱스토어 심사 임시 숨김] 커뮤니티 포인트
          <div class="my-points">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="10"></circle></svg>
            <span>1,500</span>
          </div>
          -->
        </div>
        <div class="feed-list">
          <!-- Feed Item 1 (Join) -->
          <div class="feed-card">
            <div class="feed-author">
              <div class="author-avatar" style="background: url('https://i.pravatar.cc/100?img=3') center/cover;"></div>
              <span class="author-name">골프홀릭</span>
              <span class="feed-time">10분 전</span>
            </div>
            <div class="feed-tags">
              <span class="tag-join">조인 모집 (1명)</span>
            </div>
            <div class="feed-content">
              이번 주 토요일(25일) 안양베네스트 07:30 티업 조인 한 분 모십니다!<br>
              끝나고 근처 장어집(동선 짜놨어요!) 갈 예정입니다.
            </div>
            <div class="feed-actions">
              <button class="btn-goodshot" onclick="Community.toggleGoodshot(this)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                굿샷
              </button>
              <button class="btn-join" onclick="Community.joinMatch()">참여 신청</button>
            </div>
          </div>

          <!-- Feed Item 2 (Plan Share) -->
          <div class="feed-card">
            <div class="feed-author">
              <div class="author-avatar" style="background: url('https://i.pravatar.cc/100?img=5') center/cover;"></div>
              <span class="author-name">버디사냥꾼</span>
              <span class="feed-time">1시간 전</span>
            </div>
            <div class="feed-content">
              <b>스카이72 오션코스 완벽 루트 공유!</b><br>
              아침엔 해장국, 점심엔 바지락칼국수 동선입니다. 시간 역산 다 해놨으니 캘린더에 담아가세요.
            </div>
            <div class="feed-actions" style="justify-content: flex-start; gap: var(--sp-4);">
              <button class="btn-goodshot" onclick="Community.toggleGoodshot(this)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                굿샷
              </button>
              <button class="btn-goodshot">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
                퍼가기
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
