/* js/record.js */
const Record = {
  init() {
    this.render();
  },

  render() {
    const container = U.$('#screen-record');
    container.innerHTML = `
      <div class="screen-scroll">
        <div class="record-header">
          <h2>라운드 기록</h2>
        </div>
        <div class="record-list">
          <div class="record-card">
            <div class="record-card-top">
              <span class="record-date">2026년 7월 15일</span>
              <span class="record-score">82</span>
            </div>
            <div class="record-stats">
              <div class="stat-item">
                <span class="stat-label">퍼트</span>
                <span class="stat-value">32</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">페어웨이</span>
                <span class="stat-value">60%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">그린적중</span>
                <span class="stat-value">45%</span>
              </div>
            </div>
            <div style="font-size: var(--fs-sm); color: var(--text-300);">
              📍 남서울CC · ☀️ 맑음<br>
              동반자: 김프로, 이프로, 박아마
            </div>
            <button class="record-action" onclick="Record.showDetail()">기록 상세 보기</button>
          </div>

          <div class="record-card">
            <div class="record-card-top">
              <span class="record-date">2026년 7월 8일</span>
              <span class="record-score">85</span>
            </div>
            <div class="record-stats">
              <div class="stat-item">
                <span class="stat-label">퍼트</span>
                <span class="stat-value">36</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">페어웨이</span>
                <span class="stat-value">55%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">그린적중</span>
                <span class="stat-value">40%</span>
              </div>
            </div>
            <div style="font-size: var(--fs-sm); color: var(--text-300);">
              📍 레이크사이드CC · ☁️ 흐림<br>
              동반자: 조인 라운드
            </div>
            <button class="record-action" onclick="Record.showDetail()">기록 상세 보기</button>
          </div>
        </div>
      </div>
    `;
  },

  showDetail() {
    U.toast('기록 상세 보기 준비중입니다!');
  }
};
