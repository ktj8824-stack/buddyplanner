/* =========================================
   BuddyPlanner v3 — Home Dashboard Screen (SmartScore Clone)
   ========================================= */

const Home = {
  init() { this.render(); },

  render() {
    try {
      if (State.calYear === undefined || State.calMonth === undefined) {
        const today = new Date();
        State.calYear = today.getFullYear();
        State.calMonth = today.getMonth();
      }
      
      const el = U.$('#screen-home');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcomingScheds = (State.schedules || []).filter(s => {
        const d = s.date instanceof Date ? s.date : new Date(s.date);
        return d >= today;
      }).sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db = b.date instanceof Date ? b.date : new Date(b.date);
        return da - db;
      });
      
      const currentPoints = parseInt(localStorage.getItem('bp_points') || '0', 10);
      const todayStr = new Date().toLocaleDateString('ko-KR');
      const adCount = (localStorage.getItem('bp_ad_date') === todayStr) ? parseInt(localStorage.getItem('bp_ad_count') || '0', 10) : 0;
      
      const nextSchedules = upcomingScheds.slice(0, 1);
      let schedsHtml = '';
      
      if (nextSchedules.length > 0) {
        schedsHtml = nextSchedules.map(sch => {
          const cName = sch.course ? sch.course.name : sch.courseName || '코스 정보 없음';
          const tTime = sch.teeOff || sch.teeTime || '--:--';
          return `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:2px; gap:2px;">
              <span style="color:#444444; font-size:15px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${cName}</span>
              <span style="color:var(--text-300); font-size:13px; font-weight:500; white-space:nowrap; flex-shrink:0;">${tTime}</span>
            </div>
          `;
        }).join('');
      } else {
        schedsHtml = `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:2px;">
            <span style="color:var(--text-400); font-size:13px; font-weight:600;">일정 없음</span>
            <span style="color:var(--accent); font-size:13px; font-weight:700; cursor:pointer;" onclick="Record.showRecordForm(); event.stopPropagation();">+ 추가</span>
          </div>
        `;
      }

      el.innerHTML = `
        <div class="screen-scroll dash-scroll bg-light">
          <!-- 1. Dashboard Stats (Points & Info) -->
          <div style="padding: var(--sp-4); display: flex; flex-direction: column; gap: 10px;">
            <!-- [앱스토어 심사 임시 숨김] Row 1: Points (Full Width) 
            <div class="stat-card" style="border:1.5px solid rgba(0,0,0,0.2); background:#fff; width: 100%; display: flex; align-items: center; justify-content: space-between; flex-direction: row; padding: 12px 16px; min-height: 44px; border-radius: 12px;">
              <div style="display:flex; align-items:baseline; gap:8px;">
                <div style="font-size:18px; color:#000; font-weight:800;">내 포인트</div>
                <div style="font-size:18px; font-weight:800; color:var(--accent); font-family:'Montserrat', sans-serif;">${currentPoints.toLocaleString()} <span style="font-size:18px; color:#666666;">P</span></div>
              </div>
              <button class="ad-reward-btn" style="padding: 8px 12px; font-size: 12px; display: flex; align-items: center; gap: 4px;" onclick="Profile.watchAd()">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> 
                시청 50P <span style="font-size:10px; opacity:0.9;">(${adCount}/20)</span>
              </button>
            </div>
            -->
            <!-- Row 2: Schedule (Full Width) -->
          <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
            <div class="stat-card" style="width: 100%; padding: 12px 16px;" onclick="App.navigate('calendar')">
              <span class="stat-label" style="color:var(--text-100); font-weight:700; font-size:14px; margin-bottom: 8px; display: block;">다음 라운딩 일정 <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" style="vertical-align: middle;"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
              <div style="display:flex; flex-direction:column; gap:4px;">
                ${schedsHtml}
              </div>
            </div>
            
            <!-- [앱스토어 심사 임시 숨김] 최근 스코어
            <div class="stat-card" style="width: 100%; display: flex; flex-direction: column; padding: 8px 10px; justify-content: space-between;" onclick="App.navigate('record')">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="stat-label" style="color:var(--text-100); font-weight:700; font-size:14px;">최근 스코어</span>
                <span style="font-size:18px; font-weight:800; color:var(--text-100);">89<span style="font-size:13px; font-weight:600;">타</span></span>
              </div>
              <div onclick="App.navigate('record'); event.stopPropagation();" style="font-size:12px; color:#fff; background:var(--gray-800); padding:4px 0; border-radius:6px; font-weight:600; display:flex; justify-content:center; align-items:center; gap:4px; width:100%; margin-top:4px;">
                <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 스코어등록
              </div>
            </div>
            -->
          </div>
          </div>        <!-- 2. Full Month Calendar -->
          <div style="padding: 0 var(--sp-4) var(--sp-4);">
            <div class="stat-card" style="padding: 16px; border:none; background:#fff; border-radius:16px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
              <div class="cal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span class="cal-month" style="font-size: 20px; font-weight: 800; color:var(--text-100);">${State.calMonth !== undefined ? State.calMonth + 1 : new Date().getMonth() + 1}월 일정</span>
                <div class="cal-nav" style="display:flex; gap:8px;">
                  <button class="cal-today-btn" onclick="Calendar.initCal(); App.navigate('home');" style="background:rgba(255,91,41,0.1); border:none; color:var(--accent); font-size:12px; font-weight:700; padding:4px 8px; border-radius:6px; cursor:pointer;">TODAY</button>
                  <button class="cal-arrow-btn" onclick="Calendar.prevMonth(); App.navigate('home');" style="background:none; border:none; cursor:pointer;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button class="cal-arrow-btn" onclick="Calendar.nextMonth(); App.navigate('home');" style="background:none; border:none; cursor:pointer;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              </div>
              
              <div class="cal-weekdays" style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:12px; font-weight:700; color:var(--text-300); margin-bottom:8px;">
                ${U.DAYS.map((d,i)=>`<div style="${i===0?'color:var(--ios-red);':''}">${d}</div>`).join('')}
              </div>
              
              <div class="cal-days" id="cal-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px; min-height: 250px;">
                ${typeof Calendar !== 'undefined' ? Calendar.renderCalDays() : ''}
              </div>
              
              <div id="cal-selected-area" style="margin-top: 16px; padding: 0 4px;">
                ${typeof Calendar !== 'undefined' ? Calendar.getSelectedDateLabel(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) : ''}
              </div>
            </div>
          </div>

          <!-- 4. Round Icon Grid (2 Rows) -->
          <!-- [앱스토어 심사 임시 숨김]
          <div class="round-menu-grid">
            <div class="round-menu-item" onclick="App.navigate('restaurant')">
              <div class="round-icon icon-market" style="border:none;">
                <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2c3.866 0 7 3.134 7 7 0 5.25-7 13-7 13S5 14.25 5 9c0-3.866 3.134-7 7-7z"></path><circle cx="12" cy="9" r="2.5"></circle></svg>
              </div>
              <span style="font-weight:700;">주변 맛집</span>
            </div>
            <div class="round-menu-item" onclick="App.navigate('community')">
              <div class="round-icon icon-domestic" style="border:none;">
                <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <span style="font-weight:700;">커뮤니티</span>
            </div>
            <div class="round-menu-item" onclick="App.navigate('profile')">
              <div class="round-icon icon-overseas" style="border:none;">
                <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <span style="font-weight:700;">내 프로필</span>
            </div>
          </div>
          -->
        </div>
      `;
    } catch (e) {
      console.error(e);
      document.getElementById('screen-home').innerHTML = `<div style="padding:20px; color:red;">Home Error: ${e.message}</div>`;
    }
  }
};
