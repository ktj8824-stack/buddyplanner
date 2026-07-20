/* =========================================
   BuddyPlanner v2 — Home Screen
   Calendar Main + Upcoming Schedules
   ========================================= */

const Home = {
  init() { this.render(); },

  render() {
    const el = U.$('#screen-home');
    el.innerHTML = `
      <div class="screen-scroll">
        <!-- Calendar Section (Full View) -->
        <div class="cal-section full-cal" style="padding-top:var(--sp-2);">
          <div class="cal-card" style="box-shadow:none; border:none; background:transparent;">
            <div class="cal-header">
              <h3 class="cal-month">
                ${State.calMonth + 1}
              </h3>
              <div class="cal-nav">
                <button class="cal-nav-btn today-btn" onclick="Home.initCal()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> TODAY
                </button>
                <button class="cal-nav-btn" onclick="Home.prevMonth()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button class="cal-nav-btn" onclick="Home.nextMonth()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
            </div>
            <div class="cal-weekdays">
              ${U.DAYS.map((d,i)=>`<div class="cal-wd ${i===0||i===6?'weekend':''}" style="${i===0?'color:var(--ios-red);':''}">${d}</div>`).join('')}
            </div>
            <div class="cal-days" id="cal-grid">
              ${this.renderCalDays()}
            </div>
            <div id="cal-selected-area" style="margin-top: 16px; padding: 0 4px;">
              ${this.getSelectAreaHtml(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())}
            </div>
        </div>
      </div>
    `;
  },

  getSelectAreaHtml(y, m, d) {
    const dateStr = `${y}년 ${m+1}월 ${d}일 (${U.DAYS[new Date(y, m, d).getDay()]})`;
    const scheds = State.getSchedulesForDate(y, m, d);
    let schedHtml = '';
    
    if (scheds.length > 0) {
      scheds.forEach(s => {
        const idx = State.schedules.indexOf(s);
        const dday = U.dday(s.date);
        const teeTime = U.fmtTimeKo(s.teeOff);
        const cellDate = new Date(s.date);
        const todayDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        const isPast = cellDate < todayDate;
        
        schedHtml += `
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; ${isPast ? 'opacity:0.6;' : ''}">
            <div class="sched-card" onclick="App.viewTimeline(${idx})" style="margin-bottom:0; cursor:pointer; padding: 14px 16px; flex:1; box-shadow:0 2px 8px rgba(0,0,0,0.04); ${isPast ? 'background:#ffffff; border:1px solid var(--border-default);' : ''}">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div class="sched-course" style="margin-bottom:0; font-size:17px; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:8px;">${s.course.name}</div>
                <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                  <span class="sched-time" style="font-size:14px; font-weight:700; color:var(--text-200);">${teeTime}</span>
                  <span class="sched-dday" style="font-size:11px; padding:2px 8px; border-radius:4px;">${dday}</span>
                </div>
              </div>
            </div>
            <button onclick="event.stopPropagation(); Home.deleteSchedule(${idx})" style="padding:0 14px; height:50px; border-radius:25px; background:var(--bg-card); border:1px solid rgba(255,59,48,0.2); color:var(--red-500); font-size:13px; font-weight:700; flex-shrink:0; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
              삭제
            </button>
          </div>
        `;
      });
    }

    return `
      <div style="font-size: 20px; font-weight: 800; margin-bottom: 12px; color: var(--text-100);">${dateStr}</div>
      ${schedHtml}
      <div style="display:flex; gap:8px;">
        <button onclick="window._selectedDateForRegister = new Date(${y}, ${m}, ${d}); App.navigate('register')" style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--gray-800); padding:0 16px; height:54px; border-radius:12px; font-size:16px; font-weight:600; color:#ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 
          새로운 일정
        </button>
      </div>
    `;
  },

  deleteSchedule(idx) {
    if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
      const targetDate = new Date(State.schedules[idx].date);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const d = targetDate.getDate();

      State.schedules.splice(idx, 1);
      State.saveSchedules();
      U.toast('🗑️ 일정이 삭제되었습니다.');
      
      // Re-render calendar without jumping to TODAY
      State.calYear = y;
      State.calMonth = m;
      this.updateCalendar();
      
      // Re-select the original date after DOM updates
      setTimeout(() => {
        this.selectDate(null, y, m, d);
        
        // Visually highlight the correct day in the grid
        const days = U.$$('.cal-day:not(.empty)');
        days.forEach(el => {
          const numEl = el.querySelector('.cal-day-num');
          if (numEl && parseInt(numEl.textContent, 10) === d) {
            el.classList.add('selected');
          }
        });
      }, 160);
    }
  },

  renderCalDays() {
    const y = State.calYear, m = State.calMonth;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();

    let html = '';
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
      const dayOfWeek = new Date(y, m, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const scheds = State.getSchedulesForDate(y, m, d);
      const hasSched = scheds.length > 0;

      const cellDate = new Date(y, m, d);
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isPast = cellDate < todayDate;

      let cls = 'cal-day';
      if (isToday) cls += ' today';
      if (isWeekend) cls += ' weekend';
      if (hasSched) cls += ' has-event';
      if (isPast) cls += ' past-date';

      const isSunday = dayOfWeek === 0;
      const isHoliday = U.isHoliday && U.isHoliday(y, m, d);
      const isRedDay = isSunday || isHoliday;

      let numStyle = '';
      if (isPast) {
        numStyle = isRedDay ? 'color: rgba(255, 59, 48, 0.4);' : 'color: var(--text-400);';
      } else if (isRedDay) {
        numStyle = 'color: var(--ios-red);';
      }

      let inner = `<div class="cal-day-num" style="${numStyle}">${d}</div>`;
      if (hasSched) {
        const s = scheds[0];
        const cleanName = s.course.name.replace(/\s*(CC|GC|골프클럽|컨트리클럽|골프코스|하늘코스|GC\s*제주|CC\s*제주)\s*/gi, '').trim();
        const shortName = cleanName.length > 4 ? cleanName.slice(0, 3) + '..' : cleanName;
        // For upcoming: Red band. For past: Black band (dimmed text).
        const bandColor = isPast ? '#000000' : '#ff3b30';
        
        const tagStyle = isPast 
          ? `--comp-color: ${bandColor}; color:var(--text-400);` 
          : `--comp-color: ${bandColor};`;
          
        inner += `
          <div class="cal-course-tag" style="${tagStyle}">
            ${shortName}
          </div>
        `;
      }

      html += `<div class="${cls}" onclick="Home.selectDate(event, ${y},${m},${d})">
        ${inner}
      </div>`;
    }
    return html;
  },

  prevMonth() {
    State.calMonth--;
    if (State.calMonth < 0) { State.calMonth = 11; State.calYear--; }
    this.updateCalendar();
  },

  nextMonth() {
    State.calMonth++;
    if (State.calMonth > 11) { State.calMonth = 0; State.calYear++; }
    this.updateCalendar();
  },

  initCal() {
    const today = new Date();
    State.calYear = today.getFullYear();
    State.calMonth = today.getMonth();
    this.updateCalendar();
    
    // Slight delay to let DOM render before selecting today
    setTimeout(() => {
      const grid = U.$('#cal-grid');
      if (grid) {
        const todayEl = grid.querySelector('.cal-day.today');
        if (todayEl) {
          todayEl.click();
        } else {
          this.selectDate(null, State.calYear, State.calMonth, today.getDate());
        }
      }
    }, 160);
  },

  updateCalendar() {
    const grid = U.$('#cal-grid');
    if (grid) {
      grid.style.opacity = '0';
      grid.style.transform = 'scale(0.97)';
      setTimeout(() => {
        grid.innerHTML = this.renderCalDays();
        grid.style.transition = 'all 0.3s cubic-bezier(0.22,1,0.36,1)';
        grid.style.opacity = '1';
        grid.style.transform = 'scale(1)';
      }, 150);
    }
    // Update month label
    const label = U.$('.cal-month');
    if (label) label.innerHTML = `${State.calMonth+1}월<span class="cal-year">${State.calYear}</span>`;
  },

  selectDate(evt, y, m, d) {
    // Highlight selected day
    U.$$('.cal-day').forEach(el => el.classList.remove('selected'));
    if (evt && evt.currentTarget) {
      evt.currentTarget.classList.add('selected');
    }
    
    // Update selected date area below calendar
    const area = U.$('#cal-selected-area');
    if (area) {
      area.innerHTML = this.getSelectAreaHtml(y, m, d);
    }
  },

  showScheduleList(y, m, d) {
    const scheds = State.getSchedulesForDate(y, m, d);
    
    // Ensure sheet elements exist in document.body
    let listContainer = U.$('#home-schedule-list');
    let overlay = U.$('#home-sheet-overlay');
    if (!listContainer) {
      overlay = U.el('div');
      overlay.id = 'home-sheet-overlay';
      overlay.className = 'schedule-sheet-overlay';
      overlay.onclick = () => Home.closeScheduleSheet();
      document.body.appendChild(overlay);
      
      listContainer = U.el('div');
      listContainer.id = 'home-schedule-list';
      listContainer.className = 'schedule-sheet';
      document.body.appendChild(listContainer);
    }
    
      if (scheds.length > 0) {
      let html = `<div class="sheet-drag-handle"></div>`;
      html += `<div class="dash-grid-title" style="padding: 0 0 var(--sp-4); font-size:var(--fs-xs); font-weight:var(--fw-bold); color:var(--text-400); text-transform:uppercase; letter-spacing:var(--ls-wide); text-align:center;">
        ⛳ 선택한 날짜의 일정 (${scheds.length}건)
      </div>`;
      
      scheds.forEach(s => {
        const idx = State.schedules.indexOf(s);
        const dateStr = U.fmtDateShort(s.date);
        const teeTime = U.fmtTimeKo(s.teeOff);
        
        const cellDate = new Date(s.date);
        const todayDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        const isPast = cellDate < todayDate;
        
        html += `
          <div class="sched-card" onclick="Home.closeScheduleSheet(); setTimeout(() => App.viewTimeline(${idx}), 150);" style="${isPast ? 'opacity:0.6; background:#ffffff; border:1px solid var(--border-default);' : ''}">
            <div class="sched-top">
              <span class="sched-dday">${U.dday(s.date)}</span>
              <span class="sched-date">${dateStr}</span>
            </div>
            <div class="sched-course">${s.course.name}</div>
            <div class="sched-info">
              <span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                ${teeTime} 티오프
              </span>
            </div>
          </div>
        `;
      });
      
      listContainer.innerHTML = html;
      
      // Show bottom sheet
      requestAnimationFrame(() => {
        overlay.classList.add('active');
        listContainer.classList.add('active');
      });
      
    } else {
      U.toast('이 날짜에는 등록된 일정이 없습니다.');
    }
  },

  closeScheduleSheet() {
    const listContainer = U.$('#home-schedule-list');
    const overlay = U.$('#home-sheet-overlay');
    if(listContainer) listContainer.classList.remove('active');
    if(overlay) overlay.classList.remove('active');
  }
};
