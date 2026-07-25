/* =========================================
   BuddyPlanner v3 — Home Dashboard Screen (SmartScore Clone)
   ========================================= */

const Home = {
  init() { this.render(); },

  render() {
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
    
    // 현재 포인트 및 일일 광고 시청 횟수 불러오기
    const currentPoints = parseInt(localStorage.getItem('bp_points') || '0', 10);
    const todayStr = new Date().toLocaleDateString('ko-KR');
    const adCount = (localStorage.getItem('bp_ad_date') === todayStr) ? parseInt(localStorage.getItem('bp_ad_count') || '0', 10) : 0;
    
    
    // 최대 2개의 일정 추출
    const nextSchedules = upcomingScheds.slice(0, 2);
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
          <!-- Row 1: Points (Full Width) -->
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
          
          <!-- Row 2: Schedule & Score (Asymmetric Grid) -->
          <div style="display: grid; grid-template-columns: 1.8fr 1fr; gap: 8px;">
            <div class="stat-card" style="width: 100%; padding: 8px 10px;" onclick="App.navigate('calendar')">
              <span class="stat-label" style="color:var(--text-100); font-weight:700; font-size:14px;">다음 라운딩 일정 <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
              <div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
                ${schedsHtml}
              </div>
            </div>
            
            <div class="stat-card" style="width: 100%; display: flex; flex-direction: column; padding: 8px 10px; justify-content: space-between;" onclick="App.navigate('record')">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="stat-label" style="color:var(--text-100); font-weight:700; font-size:14px;">최근 스코어</span>
                <span style="font-size:18px; font-weight:800; color:var(--text-100);">89<span style="font-size:13px; font-weight:600;">타</span></span>
              </div>
              <div onclick="Record.showRecordForm(); event.stopPropagation();" style="font-size:12px; color:#fff; background:var(--gray-800); padding:4px 0; border-radius:6px; font-weight:600; display:flex; justify-content:center; align-items:center; gap:4px; width:100%; margin-top:4px;">
                <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 스코어등록
              </div>
            </div>
          </div>
        </div>        <!-- 2. Weekly Calendar -->
        <div style="padding: 0 var(--sp-4) var(--sp-4);">
          <div class="stat-card" style="padding: 16px; border:none; background:#fff; border-radius:16px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
              <span style="font-size: 20px; font-weight: 800; color:var(--text-100);">${new Date().getMonth() + 1}월 일정</span>
              <div style="font-size: 13px; font-weight:700; color:var(--accent); cursor:pointer; padding: 4px 8px; border-radius: 4px; background: rgba(255, 91, 41, 0.05);" onclick="App.navigate('calendar')">전체보기</div>
            </div>
            
            <div style="display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px;" class="hide-scrollbar">
              ${Array.from({length: 30}).map((_, i) => {
                 let d = new Date();
                 d.setDate(d.getDate() + i);
                 let dayName = U.DAYS[d.getDay()];
                 let isToday = i === 0;
                 
                 let hasSchedule = State.getSchedulesForDate(d.getFullYear(), d.getMonth(), d.getDate()).length > 0;
                 let highlight = isToday ? `background:var(--gray-900); color:#fff;` : `background:rgba(0,0,0,0.02);`;
                 let dateColor = isToday ? `#fff` : `var(--text-100)`;
                 let dayColor = isToday ? `#fff` : (d.getDay() === 0 ? 'var(--ios-red)' : d.getDay() === 6 ? 'var(--ios-blue)' : 'var(--text-400)');
                 
                 return `
                   <div style="min-width: 45px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; padding:10px 0; border-radius:12px; cursor:pointer; ${highlight}" onclick="Calendar._selectedY=${d.getFullYear()}; Calendar._selectedM=${d.getMonth()}; Calendar._selectedD=${d.getDate()}; State.calYear=${d.getFullYear()}; State.calMonth=${d.getMonth()}; App.navigate('calendar'); setTimeout(()=>{ Calendar.selectDate(null, ${d.getFullYear()}, ${d.getMonth()}, ${d.getDate()}); const els=document.querySelectorAll('.cal-day-num'); for(let el of els){if(el.textContent.trim()==='${d.getDate()}' && !el.parentElement.classList.contains('empty')){el.parentElement.classList.add('selected'); break;}} }, 250);">
                     <div style="font-size:11px; font-weight:700; color:${dayColor};">${dayName}</div>
                     <div style="font-size:18px; font-weight:800; margin-top:2px; color:${dateColor};">${d.getDate()}</div>
                     <div style="height:8px;"></div>
                   </div>
                 `;
              }).join('')}
            </div>
            <style>
              .hide-scrollbar::-webkit-scrollbar { display: none; }
            </style>
          </div>
        </div>


        <!-- 4. Round Icon Grid (2 Rows) -->
        <div class="round-menu-grid">
          <style>
            @keyframes floatAnim { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
            @keyframes pulseAnim { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
            @keyframes swayAnim { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(3deg); } 75% { transform: rotate(-3deg); } }
            @keyframes bounceAnim { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
            .round-icon { border: 1px solid rgba(0,0,0,0.03) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
            .icon-diary { background: rgba(37, 99, 235, 0.05) !important; color: #2563eb; animation: floatAnim 4s ease-in-out infinite; }
            .icon-market { background: rgba(234, 88, 12, 0.05) !important; color: #ea580c; animation: bounceAnim 3s ease-in-out infinite; }
            .icon-domestic { background: rgba(22, 163, 74, 0.05) !important; color: #16a34a; animation: pulseAnim 4s ease-in-out infinite alternate; }
            .icon-overseas { background: rgba(147, 51, 234, 0.05) !important; color: #9333ea; animation: swayAnim 4s ease-in-out infinite; }
          </style>

          <!-- 1. 라운딩 일지 -->
          <div class="round-menu-item" onclick="App.navigate('record')">
            <div class="round-icon icon-diary" style="border:none;">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span style="position:absolute; top:-4px; right:-8px; background:#ef4444; color:#fff; font-size:9px; font-weight:800; padding:2px 5px; border-radius:4px; line-height:1;">HOT</span>
            </div>
            <span style="font-weight:700;">라운딩 일지</span>
          </div>

          <!-- 2. 골마켓 -->
          <div class="round-menu-item" onclick="App.navigate('restaurant')">
            <div class="round-icon icon-market" style="border:none;">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            </div>
            <span style="font-weight:700;">골마켓</span>
          </div>

          <!-- 3. 국내투어 -->
          <div class="round-menu-item" onclick="App.navigate('calendar')">
            <div class="round-icon icon-domestic" style="border:none;">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <span style="font-weight:700;">국내투어</span>
          </div>

          <!-- 4. 해외투어 -->
          <div class="round-menu-item" onclick="App.navigate('community')">
            <div class="round-icon icon-overseas" style="border:none;">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L3 8l6 5.5-4 4-2.5-1-1.5 1.5 4.5 4.5 1.5-1.5-1-2.5 4-4 5.5 6l1.2-.7c.4-.2.7-.6.6-1.1z"></path></svg>
            </div>
            <span style="font-weight:700;">해외투어</span>
          </div>

          <!-- 5. 홀인원보험 -->
          <div class="round-menu-item" onclick="App.navigate('profile')">
            <div class="round-icon" style="background: rgba(71, 85, 105, 0.05); color: #475569; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 2px 8px rgba(0,0,0,0.02); animation: pulseAnim 4s ease-in-out infinite alternate;">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span style="position:absolute; top:-4px; right:-12px; background:#6b7280; color:#fff; font-size:9px; font-weight:800; padding:2px 5px; border-radius:4px; line-height:1; white-space:nowrap;">준비중</span>
            </div>
            <span style="font-weight:700;">홀인원보험</span>
          </div>

          <!-- 6. 게임 -->
          <div class="round-menu-item" onclick="App.navigate('profile')">
            <div class="round-icon" style="background: rgba(190, 24, 93, 0.05); color: #be185d; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 2px 8px rgba(0,0,0,0.02); animation: floatAnim 3.5s ease-in-out infinite;">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </div>
            <span style="font-weight:700;">게임</span>
          </div>

          <!-- 7. 조인양도 -->
          <div class="round-menu-item" onclick="App.navigate('community')">
            <div class="round-icon" style="background: rgba(3, 105, 161, 0.05); color: #0369a1; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 2px 8px rgba(0,0,0,0.02); animation: bounceAnim 3s ease-in-out infinite;">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <span style="font-weight:700;">조인양도</span>
          </div>

          <!-- 8. 커뮤니티 -->
          <div class="round-menu-item" onclick="App.navigate('timeline')">
            <div class="round-icon" style="background: rgba(161, 98, 7, 0.05); color: #a16207; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 2px 8px rgba(0,0,0,0.02); animation: swayAnim 3.5s ease-in-out infinite;">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </div>
            <span style="font-weight:700;">커뮤니티</span>
          </div>
        </div>

      </div>
    `;
  }
};
