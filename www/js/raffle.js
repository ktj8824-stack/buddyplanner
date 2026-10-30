const Raffle = {
  init() {
    this.render();
  },

  render() {
    const el = U.$('#screen-raffle');
    const currentPoints = parseInt(localStorage.getItem('bp_points') || '0', 10);
    let currentEntries = parseInt(localStorage.getItem('bp_raffle_entries') || '8', 10);
    const maxEntries = 200;
    const progressPercent = Math.min(100, (currentEntries / maxEntries) * 100);

    el.innerHTML = `
      <div class="header">
        <button class="back-btn" onclick="App.navigate('home')">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="header-title">공동구매 럭키드로우</div>
        <div style="width:24px;"></div>
      </div>
      <div class="screen-scroll bg-light" style="display:flex; flex-direction:column; padding: 20px;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; color:#fff; padding:16px 20px; border-radius:12px; margin-bottom:20px; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          <span style="font-size:15px; font-weight:600;">내 잔여 포인트</span>
          <span style="font-size:18px; font-weight:800; color:var(--accent);"><span id="raffle-points">${currentPoints.toLocaleString()}</span> P</span>
        </div>
        
        <div style="background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px; text-align:center;">
          <div style="background: linear-gradient(135deg, #047857, #065f46); padding: 40px 20px; color: #fff;">
            <div style="font-size:40px; margin-bottom:12px;">☕</div>
            <h2 style="font-size:20px; font-weight:800; margin-bottom:8px;">스타벅스 아이스 아메리카노 T</h2>
            <p style="font-size:14px; opacity:0.9;">${maxEntries}명 응모 완료 시 즉시 1명 추첨!</p>
          </div>
          <div style="padding: 24px 20px;">
            
            <div style="margin-bottom:20px;">
              <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:8px; color:var(--text-100);">
                <span>현재 진행률</span>
                <span style="color:var(--accent);"><span id="raffle-entries">${currentEntries}</span> / ${maxEntries}명</span>
              </div>
              <div style="width:100%; height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                <div id="raffle-bar" style="width:${progressPercent}%; height:100%; background:var(--accent); border-radius:4px; transition:width 0.3s ease;"></div>
              </div>
            </div>

            <p style="font-size:13px; color:var(--text-400); margin-bottom:20px; line-height:1.5;">
              1회 응모 시 <strong>100P</strong>가 차감됩니다.<br>목표 인원 달성 시 즉시 결과가 발표됩니다.
            </p>
            <button id="btn-draw" onclick="Raffle.draw()" style="width:100%; background:var(--accent); color:#fff; border:none; padding:16px; border-radius:12px; font-size:16px; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(37,99,235,0.2); transition:transform 0.1s;">
              100P로 응모하기
            </button>
          </div>
        </div>
        
        <div style="background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05); padding: 20px;">
          <h3 style="font-size:15px; font-weight:700; color:var(--text-100); margin-bottom:12px;">이벤트 유의사항</h3>
          <ul style="font-size:13px; color:var(--text-400); line-height:1.6; padding-left:20px; margin:0; margin-bottom:16px;">
            <li>본 응모는 오직 무료 획득 포인트로만 참여 가능합니다.</li>
            <li>응모 인원이 모두 차면 무작위로 1명의 당첨자를 선정합니다.</li>
            <li>당첨 시 입력하신 배송지로 영업일 기준 3일 이내에 발송됩니다.</li>
          </ul>

        </div>

      </div>
    `;
  },
  
  draw() {
    let currentPoints = parseInt(localStorage.getItem('bp_points') || '0', 10);
    let currentEntries = parseInt(localStorage.getItem('bp_raffle_entries') || '8', 10);
    const maxEntries = 200;

    if (currentPoints < 100) {
      App.showModal('포인트 부족', '<div style="padding:20px; text-align:center; color:var(--text-400);">응모에 필요한 포인트가 부족합니다.<br>무료 광고 시청을 통해 포인트를 모아보세요.</div>');
      return;
    }

    // Deduct points and increment entries
    currentPoints -= 100;
    currentEntries += 1;
    localStorage.setItem('bp_points', currentPoints);
    localStorage.setItem('bp_raffle_entries', currentEntries);
    
    // Update UI immediately
    const ptsEl = document.getElementById('raffle-points');
    const entEl = document.getElementById('raffle-entries');
    const barEl = document.getElementById('raffle-bar');
    if (ptsEl) ptsEl.textContent = currentPoints.toLocaleString();
    if (entEl) entEl.textContent = currentEntries;
    if (barEl) barEl.style.width = Math.min(100, (currentEntries / maxEntries) * 100) + '%';

    if (currentEntries < maxEntries) {
      App.showModal('응모 완료!', `<div style="padding:20px; text-align:center; color:var(--text-100);"><div style="font-size:40px; margin-bottom:10px;">🎟️</div>성공적으로 응모되었습니다!<br>현재 <strong style="color:var(--accent);">${currentEntries}명</strong> 참여 중이며, ${maxEntries}명이 차면 추첨이 진행됩니다.</div>`);
      return;
    }

    // Max entries reached -> Perform Draw!
    // Show loading spinner
    App.showModal('목표 달성! 추첨 중...', '<div style="padding:40px; text-align:center; font-size:40px; animation:spin 1s linear infinite;">🎰</div><style>@keyframes spin { 100% { transform:rotate(360deg); } }</style>');

    setTimeout(() => {
      // Reset entries for next round
      localStorage.setItem('bp_raffle_entries', '0');
      if (entEl) entEl.textContent = '0';
      if (barEl) barEl.style.width = '0%';

      // 1 out of 10 chance to win for this user specifically (mocking real chance)
      const isWin = Math.random() < 0.1;

      if (isWin) {
        App.showModal('🎉 당첨 축하합니다! 🎉', `
          <div style="padding:20px; text-align:center;">
            <div style="font-size:50px; margin-bottom:16px;">☕</div>
            <div style="font-size:18px; font-weight:800; color:var(--text-100); margin-bottom:8px;">스타벅스 아메리카노 T</div>
            <div style="font-size:14px; color:var(--text-400); margin-bottom:24px;">경품 당첨을 축하드립니다!<br>마이페이지에서 기프티콘을 수령할 번호를 입력해 주세요.</div>
            <button onclick="App.navigate('profile'); App.closeModal();" style="background:var(--accent); color:#fff; border:none; padding:12px 24px; border-radius:8px; font-weight:700; cursor:pointer;">전화번호 입력하러 가기</button>
          </div>
        `);
      } else {
        App.showModal('아쉽게도 다음 기회에...', `
          <div style="padding:20px; text-align:center;">
            <div style="font-size:50px; margin-bottom:16px;">😥</div>
            <div style="font-size:16px; font-weight:700; color:var(--text-100); margin-bottom:8px;">다른 분이 당첨되었습니다.</div>
            <div style="font-size:14px; color:var(--text-400); margin-bottom:24px;">포인트를 모아 새로운 럭키드로우에 도전해 보세요!</div>
            <button onclick="App.closeModal();" style="background:#e2e8f0; color:#475569; border:none; padding:12px 24px; border-radius:8px; font-weight:700; cursor:pointer;">확인</button>
          </div>
        `);
      }
    }, 1500);
  }
};
