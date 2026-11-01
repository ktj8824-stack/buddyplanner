/* =========================================
   BuddyPlanner v2 — Calendar Screen
   Calendar Main + Upcoming Schedules
   ========================================= */

const Calendar = {
  init() {
    this.render();
    setTimeout(() => {
      const grid = U.$('#cal-grid');
      if (grid) {
        const todayCell = grid.querySelector('.cal-day.today');
        if (todayCell) todayCell.classList.add('selected');
      }
    }, 100);
  },

  render() {
    const el = U.$('#screen-calendar');
    if (!el) {
      console.error('Calendar element not found');
      return;
    }
    try {
      const nextSch = (State.schedules && State.schedules.length > 0) ? State.schedules[0] : null;
      const courseName = nextSch ? (nextSch.course ? nextSch.course.name : (nextSch.courseName || '아난티남해 CC')) : '아난티남해 CC';
      const teeTime = nextSch ? (nextSch.teeTime || nextSch.teeOff || '08:30') : '08:30';

    const y = State.calYear !== undefined ? State.calYear : new Date().getFullYear();
    const m = State.calMonth !== undefined ? State.calMonth : new Date().getMonth();

    el.innerHTML = `
      <div class="screen-scroll" style="padding-top: var(--header-h); padding-bottom: calc(var(--nav-h) + var(--safe-bottom, 0px) + 16px); background:#f8fafc;">
        <div class="cal-main-container">
          <!-- 1. 화이트 캘린더 카드 컨테이너 -->
          <div class="cal-card-box">
            <div class="cal-nav-header">
              <button class="cal-nav-arrow" onclick="Calendar.prevMonth()" aria-label="이전 달">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div class="cal-nav-title">${y}년 ${m + 1}월</div>
              <button class="cal-nav-arrow" onclick="Calendar.nextMonth()" aria-label="다음 달">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
            
            <div class="cal-weekdays-row">
              <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
            </div>
            
            <div class="cal-days-grid" id="cal-grid">
              ${this.renderCalDays()}
            </div>
          </div>

          <!-- 2. 선택된 날짜 상세 및 등록 목록 -->
          <div id="cal-selected-area">
            ${this.getSelectedDateLabel(y, m, new Date().getDate())}
          </div>
        </div>
      </div>
    `;
    } catch (e) {
      console.error('Calendar Render Error:', e);
      el.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-200);">캘린더를 렌더링하는 중 오류가 발생했습니다.<br><br>앱을 새로고침 해주세요.</div>`;
    }
  },

  // 날짜 레이블 + 일정 목록
  getSelectAreaHtml(y, m, d) {
    return this.getSelectedDateLabel(y, m, d);
  },

  getSelectedDateLabel(y, m, d) {
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
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; ${isPast ? 'opacity:0.6;' : ''}" onclick="App.viewTimeline(${idx})">
            <div style="flex:1; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease;">
              <span style="font-size:15px; font-weight:800; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; padding-right:8px;">${s.course ? s.course.name : (s.courseName || '골프장')}</span>
              <span style="font-size:13px; font-weight:700; color:#64748b; white-space:nowrap;">${teeTime} <span style="color:#007aff; font-size:12px; font-weight:800; margin-left:4px;">${dday}</span></span>
            </div>
            <button onclick="event.stopPropagation(); Calendar.deleteSchedule(${idx})" style="width:34px; height:34px; border-radius:50%; background:rgba(255,59,48,0.08); border:none; color:#ef4444; font-size:16px; display:flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer;" aria-label="일정 삭제">✕</button>
          </div>
        `;
      });
    }

    // 선택 날짜를 버튼에 저장
    Calendar._selectedY = y; Calendar._selectedM = m; Calendar._selectedD = d;

    return `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: ${scheds.length > 0 ? '10px' : '4px'}; padding: 0 4px;">
        <div style="font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">${dateStr}</div>
        <button onclick="Calendar._addForSelected()" style="background:#04122d; color:#fff; border:none; padding:8px 14px; border-radius:9999px; font-size:12.5px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(4,18,45,0.15); display:flex; align-items:center; gap:5px;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          새로운 일정
        </button>
      </div>
      ${schedHtml}
    `;
  },

  // 고정 버튼 클릭 시 선택된 날짜로 일정 등록
  _addForSelected() {
    const y = Calendar._selectedY ?? new Date().getFullYear();
    const m = Calendar._selectedM ?? new Date().getMonth();
    const d = Calendar._selectedD ?? new Date().getDate();
    window._selectedDateForRegister = new Date(y, m, d);
    App.navigate('register');
  },

  _selectedY: null, _selectedM: null, _selectedD: null,

  deleteSchedule(idx) {
    if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
      const targetDate = new Date(State.schedules[idx].date);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const d = targetDate.getDate();

      State.schedules.splice(idx, 1);
      State.saveSchedules();
      U.toast('🗑️ 일정이 삭제되었습니다.');
      
      State.calYear = y;
      State.calMonth = m;
      this.updateCalendar();
      
      setTimeout(() => {
        this.selectDate(null, y, m, d);
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
    const y = State.calYear !== undefined ? State.calYear : new Date().getFullYear();
    const m = State.calMonth !== undefined ? State.calMonth : new Date().getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const isThisMonth = today.getFullYear() === y && today.getMonth() === m;

    let html = '';
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="cal-day empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = isThisMonth && today.getDate() === d;
      const cellDate = new Date(y, m, d);
      const dayOfWeek = cellDate.getDay();
      const scheds = State.getSchedulesForDate(y, m, d);
      const hasSched = scheds.length > 0;

      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isPast = cellDate < todayDate;

      let cls = 'cal-day';
      if (isToday) cls += ' today';
      if (hasSched) cls += ' has-record';
      if (isPast) cls += ' past-date';

      let inner = `<div class="cal-day-num">${d}</div>`;

      if (hasSched) {
        const s = scheds[0];
        const rawName = s.course ? s.course.name : (s.courseName || '');
        const cleanName = rawName.replace(/\s*(CC|GC|골프클럽|컨트리클럽|골프코스|하늘코스|GC\s*제주|CC\s*제주)\s*/gi, '').trim() || '일정';
        const shortName = cleanName.length > 4 ? cleanName.slice(0, 3) + '..' : cleanName;

        inner += `
          <div class="cal-event-chip">
            <div class="cal-chip-bar"></div>
            <span class="cal-chip-name">${shortName}</span>
          </div>
        `;
      }

      html += `<div class="${cls}" onclick="Calendar.selectDate(event, ${y}, ${m}, ${d})">
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
        grid.style.transition = 'all 0.25s cubic-bezier(0.22,1,0.36,1)';
        grid.style.opacity = '1';
        grid.style.transform = 'scale(1)';
      }, 120);
    }
    const label = U.$('.cal-nav-title');
    if (label) label.textContent = `${State.calYear}년 ${State.calMonth + 1}월`;
  },

  selectDate(evt, y, m, d) {
    U.$$('.cal-day').forEach(el => el.classList.remove('selected'));
    if (evt && evt.currentTarget) {
      evt.currentTarget.classList.add('selected');
    }
    const area = U.$('#cal-selected-area');
    if (area) {
      area.innerHTML = this.getSelectAreaHtml(y, m, d);
    }
  }
};
