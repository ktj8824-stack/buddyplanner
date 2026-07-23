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
    
    // 최대 2개의 일정 추출
    const nextSchedules = upcomingScheds.slice(0, 2);
    let schedsHtml = '';
    
        if (nextSchedules.length > 0) {
      schedsHtml = nextSchedules.map(sch => {
        const cName = sch.course ? sch.course.name : sch.courseName || '코스 정보 없음';
        const tTime = sch.teeOff || sch.teeTime || '--:--';
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:2px; gap:2px;">
            <span style="color:var(--text-100); font-size:15px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${cName}</span>
            <span style="color:var(--text-300); font-size:13px; font-weight:600; white-space:nowrap; flex-shrink:0;">${tTime}</span>
          </div>
        `;
      }).join('');
    } else {
      schedsHtml = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:2px;">
          <span style="color:var(--text-400); font-size:13px; font-weight:600;">일정 없음</span>
          <span style="color:var(--accent); font-size:13px; font-weight:700;">+ 추가</span>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="screen-scroll dash-scroll bg-light">
        
        <!-- 1. Dashboard Stats (Points & Info) -->
        <div style="padding: var(--sp-4); display: flex; flex-direction: column; gap: 10px;">
          <!-- Row 1: Points (Full Width) -->
          <div class="stat-card" style="border:1px solid var(--accent); background:rgba(255, 91, 41, 0.03); width: 100%; display: flex; align-items: center; justify-content: space-between; flex-direction: row; padding: 10px 14px; min-height: 44px; border-radius: 12px;" onclick="App.showModal('포인트 적립', '동영상 광고를 시청하고 포인트를 적립하시겠습니까?<br><br><button class=\'btn btn-primary\' style=\'width:100%\'>광고 보고 50P 받기</button>')">
            <div style="display:flex; align-items:baseline; gap:8px;">
              <div style="font-size:14px; color:var(--text-400); font-weight:600;">내 포인트</div>
              <div style="font-size:18px; font-weight:800; color:var(--accent);">1,250 <span style="font-size:14px;">P</span></div>
            </div>
            <div style="font-size:12px; color:var(--text-100); background:#ffffff; border:1px solid var(--border-default); padding:5px 10px; border-radius:12px; display:flex; align-items:center; gap:4px; font-weight:600; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="var(--accent)" stroke-width="2" fill="none"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> 보고 받기
            </div>
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
                <span class="stat-label" style="color:var(--text-100); font-weight:700; font-size:14px;">스코어</span>
                <span style="font-size:18px; font-weight:800; color:var(--text-100);">89<span style="font-size:13px; font-weight:600;">타</span></span>
              </div>
              <div style="font-size:12px; color:#fff; background:var(--gray-800); padding:4px 0; border-radius:6px; font-weight:600; display:flex; justify-content:center; align-items:center; gap:4px; width:100%; margin-top:4px;">
                <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 등록
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Weekly Calendar -->
        <div style="padding: 0 var(--sp-4) var(--sp-4);">
          <div class="stat-card" style="padding: 16px; border:1px solid var(--border-default); background:#fff; border-radius:16px;">
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
                 let dotHtml = hasSchedule ? `<div style="width:4px;height:4px;border-radius:2px;background:var(--accent);margin-top:4px;"></div>` : `<div style="height:8px;"></div>`;
                 
                 return `
                   <div style="min-width: 48px; display:flex; flex-direction:column; align-items:center; padding:10px 0; border-radius:12px; cursor:pointer; ${highlight}" onclick="Calendar._selectedY=${d.getFullYear()}; Calendar._selectedM=${d.getMonth()}; Calendar._selectedD=${d.getDate()}; State.calYear=${d.getFullYear()}; State.calMonth=${d.getMonth()}; App.navigate('calendar'); setTimeout(()=>{ Calendar.selectDate(null, ${d.getFullYear()}, ${d.getMonth()}, ${d.getDate()}); const els=document.querySelectorAll('.cal-day-num'); for(let el of els){if(el.textContent.trim()==='${d.getDate()}' && !el.parentElement.classList.contains('empty')){el.parentElement.classList.add('selected'); break;}} }, 250);">
                     <div style="font-size:11px; font-weight:700; color:${dayColor};">${dayName}</div>
                     <div style="font-size:18px; font-weight:800; margin-top:2px; color:${dateColor};">${d.getDate()}</div>
                     ${dotHtml}
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
          <div class="round-menu-item" onclick="App.navigate('calendar')">
            <div class="round-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--accent)" stroke-width="1.5" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <span>예약/일정</span>
          </div>
          <div class="round-menu-item" onclick="App.navigate('record')">
            <div class="round-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--accent)" stroke-width="1.5" fill="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
            </div>
            <span>국내투어</span>
          </div>
          <div class="round-menu-item" onclick="App.navigate('community')">
            <div class="round-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--accent)" stroke-width="1.5" fill="none"><path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4 20-7z"></path></svg>
            </div>
            <span>해외투어</span>
          </div>
          <div class="round-menu-item" onclick="App.navigate('restaurant')">
            <div class="round-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--accent)" stroke-width="1.5" fill="none"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </div>
            <span>마켓</span>
          </div>
          <div class="round-menu-item" onclick="App.navigate('profile')">
            <div class="round-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--accent)" stroke-width="1.5" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <span>원게임보험</span>
          </div>
          <div class="round-menu-item" onclick="App.navigate('profile')">
            <div class="round-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--accent)" stroke-width="1.5" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </div>
            <span>스스+</span>
          </div>
          <div class="round-menu-item" onclick="App.navigate('community')">
            <div class="round-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--accent)" stroke-width="1.5" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <span>조인양도</span>
          </div>
          <div class="round-menu-item" onclick="App.navigate('timeline')">
            <div class="round-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--accent)" stroke-width="1.5" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </div>
            <span>라이브스코어</span>
          </div>
        </div>

      </div>
    `;
  }
};
