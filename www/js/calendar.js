/* =========================================
   BuddyPlanner v2 — Calendar Screen
   Calendar Main + Upcoming Schedules
   ========================================= */

const Calendar = {
  init() { this.render(); },

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

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; min-height:100vh; min-height:100dvh;">

        <!-- Scrollable calendar area -->
        <div class="screen-scroll bg-light dash-scroll" style="padding-bottom: calc(var(--nav-h) + 100px);">
          
          <!-- Calendar Section (Full View) -->
          <div class="cal-section full-cal" style="padding: 12px var(--sp-4) var(--sp-4);">
            <div class="cal-card" style="box-shadow:none; border:none; background:transparent; padding: 0;">
              <div class="cal-header">
                <h3 class="cal-month">
                  ${State.calMonth + 1}
                </h3>
                <div class="cal-nav">
                  <button class="cal-today-btn" onclick="Calendar.initCal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> TODAY
                  </button>
                  <button class="cal-arrow-btn" onclick="Calendar.prevMonth()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button class="cal-arrow-btn" onclick="Calendar.nextMonth()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><polyline points="9 18 15 12 9 6"></polyline></svg>
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
                ${this.getSelectedDateLabel(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())}
              </div>
              <!-- 새로운 일정 버튼은 캘린더 그리드 안으로 이동됨 -->
            </div>
          </div>
        </div>
      </div>
    `;
    } catch (e) {
      console.error('Calendar Render Error:', e);
      el.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-200);">캘린더를 렌더링하는 중 오류가 발생했습니다.<br><br>앱을 새로고침 해주세요.</div>`;
    }
  },

  // 날짜 레이블 + 일정 목록만 (버튼 제외 — 버튼은 하단 고정)
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
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; ${isPast ? 'opacity:0.55;' : ''}" onclick="App.viewTimeline(${idx})">
            <div style="flex:1; background:var(--bg-input); border-radius:12px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
              <span style="font-size:16px; font-weight:700; color:var(--text-100); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; padding-right:8px;">${s.course ? s.course.name : (s.courseName || '골프장')}</span>
              <span style="font-size:14px; font-weight:600; color:var(--text-300); white-space:nowrap;">${teeTime} <span style="color:var(--accent); font-size:12px; margin-left:2px;">${dday}</span></span>
            </div>
            <button onclick="event.stopPropagation(); Calendar.deleteSchedule(${idx})" style="width:36px; height:36px; border-radius:50%; background:rgba(255,59,48,0.08); border:none; color:var(--danger); font-size:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">✕</button>
          </div>
        `;
      });
    }

    // 선택 날짜를 버튼에 저장
    Calendar._selectedY = y; Calendar._selectedM = m; Calendar._selectedD = d;

    return `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: ${scheds.length > 0 ? '12px' : '4px'};">
        <div style="font-size: 20px; font-weight: 800; color: var(--text-100);">${dateStr}</div>
        <button onclick="Calendar._addForSelected()" style="background:var(--gray-900); color:#fff; border:none; padding:10px 18px; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:var(--shadow-sm); display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          새로운 일정
        </button>
      </div>
      ${schedHtml}
      <button onclick="Calendar._addTestAlarm()" style="display:none; margin-top:16px; width:100%; background:rgba(255,59,48,0.1); color:var(--danger); border:1px solid rgba(255,59,48,0.3); padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">
        🔔 1분 뒤 알람 (타임라인 포함 테스트)
      </button>
      <button onclick="Calendar._addDirectTestAlarm()" style="display:none; margin-top:8px; width:100%; background:rgba(0,122,255,0.1); color:#007AFF; border:1px solid rgba(0,122,255,0.3); padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">
        ⚡ 1분 후 알람울리기 (타임라인 생략)
      </button>
    `;
  },

  _addTestAlarm() {
    const now = new Date();
    
    // 알람(준비 시작)이 현재 시간으로부터 '정확히 1분 뒤'에 울리게 하면서도,
    // 타임라인 단계(출발, 도착, 티오프)가 각각 1분 간격으로 예쁘게 보이도록 설정합니다.
    const teeOffDate = new Date(now.getTime() + (4 * 60 * 1000)); // 현재 + 4분 뒤 티오프
    
    const h = teeOffDate.getHours().toString().padStart(2, '0');
    const m = teeOffDate.getMinutes().toString().padStart(2, '0');
    const teeOffTime = `${h}:${m}`;
    
    const testSched = {
      date: now, // 오늘 날짜로 달력 표기
      teeOff: teeOffTime,
      startPoint: "테스트 출발지",
      course: { name: "알람 테스트용 가상 골프장", lat: 37.5, lng: 127.0 },
      companions: [],
      prepTime: 1,      // 1분
      travelTime: 1,    // 1분
      hasMeal: false,
      isTestAlarm: true // data.js에서 매너타임 1분으로 처리하기 위한 플래그
    };
    
    // addSchedule 함수를 통해 타임라인까지 모두 정상 계산하여 등록합니다.
    State.addSchedule(testSched);
    
    // 타임라인 단계가 각각 1분 간격으로 계산되었으므로, 실제 알람도 1분 간격으로 예약합니다.
    if (window.NativeApp) {
      const nowMs = Date.now();
      const getHm = (ms) => {
        const d = new Date(ms);
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      };
      const dummyData = [
        { time: getHm(nowMs + 60000), title: '준비중', subtitle: '준비 시작 - 보스턴백과 준비물을 챙겨주세요!', emoji: '🎒' },
        { time: getHm(nowMs + 120000), title: '이동중', subtitle: '출발 시간입니다! 목적지로 출발하세요 🚗', emoji: '🚗' },
        { time: getHm(nowMs + 180000), title: '도착', subtitle: '클럽하우스 도착 시간입니다. 환복을 준비하세요 🏌️', emoji: '🏌️' },
        { time: getHm(nowMs + 240000), title: '티오프', subtitle: '곧 티오프 시간입니다! 멋진 라운딩 되세요 ⛳', emoji: '⛳' }
      ];
      if (typeof window.NativeApp.setAlarmWithData === 'function') {
        window.NativeApp.setAlarmWithData(nowMs + 60000, JSON.stringify(dummyData));
      } else if (typeof window.NativeApp.setAlarm === 'function') {
        window.NativeApp.setAlarm(nowMs + 60000);  // 1분 뒤: 준비 시작
      }
      console.log("네이티브 테스트 알람 설정 완료");
    }
    
    U.toast('정확히 1분 간격으로 총 4번의 알람이 차례대로 울립니다! 화면을 끄고 기다려보세요.');
    Calendar.updateCalendar();
    Calendar.selectDate(null, now.getFullYear(), now.getMonth(), now.getDate());
    
    // 네이티브 알람과 정확히 동시에 인앱 메시지 알림(웹 푸시/팝업)도 차례대로 띄웁니다.
    const events = [
      { delay: 60000, msg: '준비 시작 - 보스턴백과 준비물을 챙겨주세요!', icon: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>` },
      { delay: 120000, msg: '출발 시간입니다! 목적지로 출발하세요 🚗', icon: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>` },
      { delay: 180000, msg: '클럽하우스 도착 시간입니다. 환복을 준비하세요 🏌️', icon: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 21h18M9 21V10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11M2 14h20"></path></svg>` },
      { delay: 240000, msg: '곧 티오프 시간입니다! 멋진 라운딩 되세요 ⛳', icon: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--gold-500)" stroke-width="2"><path d="M4 22V2l10 5-10 5"></path></svg>` }
    ];
    
    events.forEach(ev => {
      // 네이티브 알람이 켜질 때 인앱 팝업도 같이 띄웁니다.
      // 웹 푸시(new Notification)는 안드로이드 알림과 충돌하므로 제거합니다.
      setTimeout(() => {
        if (window.Timeline) {
          Timeline.initAudioContext();
          Timeline.playAlarmSound(ev.msg, '⏰ 타임라인 알람', ev.icon);
        }
      }, ev.delay);
    });
  },

  _addTrackerTest() {
    if (window.NativeApp && typeof window.NativeApp.startTrackerTest === 'function') {
      window.NativeApp.startTrackerTest();
      U.toast('배민 스타일 트래커가 실행되었습니다! 화면을 끄고 알림창을 확인하세요.', 5000);
    } else {
      U.toast('네이티브 트래커 기능을 지원하지 않는 환경입니다.');
    }
  },

  _addDirectTestAlarm() {
    const now = new Date();
    
    // 알람이 현재시간 + 1분에 무조건 울리게 하고, 타임라인 간격을 0으로 만듭니다.
    const teeOffDate = new Date(now.getTime() + (1 * 60 * 1000)); // 1분 뒤
    
    const h = teeOffDate.getHours().toString().padStart(2, '0');
    const m = teeOffDate.getMinutes().toString().padStart(2, '0');
    const teeOffTime = `${h}:${m}`;
    
    const testSched = {
      date: now,
      teeOff: teeOffTime,
      startPoint: "테스트 출발지",
      course: { name: "다이렉트 알람 골프장", lat: 37.5, lng: 127.0 },
      companions: [],
      prepTime: 0,      // 0분
      travelTime: 0,    // 0분
      hasMeal: false,
      isDirectAlarm: true // data.js에서 매너타임 0분으로 처리
    };
    
    State.addSchedule(testSched);
    
    // 타임라인 계산 시 초 단위가 :00으로 잘려 알람이 너무 빨리 울리는 것을 방지하기 위해,
    // 다이렉트 테스트는 무조건 '정확히 60초 뒤' 밀리초를 직접 전달합니다.
    if (window.NativeApp) {
      const d = new Date(Date.now() + 60000);
      const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      const dummyData = [
        { time: hm, title: '준비중', subtitle: msg, emoji: '🎒' }
      ];
      if (typeof window.NativeApp.setAlarmWithData === 'function') {
        window.NativeApp.setAlarmWithData(Date.now() + 60000, JSON.stringify(dummyData));
      } else if (typeof window.NativeApp.setAlarm === 'function') {
        window.NativeApp.setAlarm(Date.now() + 60000);
      }
    }
    
    U.toast('다이렉트: 정확히 60초 뒤에 알람이 무조건 울립니다!');
    Calendar.updateCalendar();
    Calendar.selectDate(null, now.getFullYear(), now.getMonth(), now.getDate());
    
    // 네이티브 알람(60초)이 켜질 때 인앱 팝업도 같이 띄웁니다.
    // 웹 푸시(new Notification)는 OS 알림과 충돌하므로 제거하고, 안드로이드 네이티브가 알림을 전담하도록 합니다.
    setTimeout(() => {
      const msg = '준비 시작 - 보스턴백과 준비물을 챙겨주세요!';
      const iPrep = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
      if (window.Timeline) {
        Timeline.playAlarmSound(msg, '⏰ 타임라인 알람', iPrep);
      }
    }, 60000);
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
      const s = State.schedules[idx];
      State.cancelNativeAlarm(s); // 알람 먼저 삭제
      const targetDate = new Date(s.date);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const d = targetDate.getDate();
      
      State.schedules.splice(idx, 1);
      State.saveSchedules();
      
      this.initCal();
      const newScheds = State.getSchedulesForDate(y, m, d);
      if (newScheds.length === 0) {
        App.navigate('calendar');
      } else {
        const area = U.$('#cal-selected-area');
        if (area) area.innerHTML = this.getSelectAreaHtml(y, m, d);
      }
      U.toast('🗑️ 일정이 삭제되었습니다.');
      
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
    const y = State.calYear, m = State.calMonth;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();

    let html = '';
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
        numStyle = isRedDay ? 'color: rgba(255, 59, 48, 0.4);' : 'color: var(--text-500);';
      } else if (isRedDay) {
        numStyle = 'color: var(--danger);';
      } else {
        numStyle = 'color: var(--text-200);';
      }

      let inner = `<div class="cal-day-num" style="${numStyle}">${d}</div>`;
      if (hasSched) {
        scheds.slice(0, 2).forEach((s, idx) => {
          const rawName = s.course ? s.course.name : (s.courseName || '');
          const cleanName = rawName.replace(/\s*(CC|GC|골프클럽|컨트리클럽|골프코스|하늘코스|GC\s*제주|CC\s*제주)\s*/gi, '').trim() || '일정';
          const shortName = cleanName.length > 4 ? cleanName.slice(0, 3) + '..' : cleanName;
          const bandColor = isPast ? 'rgba(255,255,255,0.2)' : 'var(--accent)';
          
          const tagStyle = isPast 
            ? `color:var(--text-400); background: transparent; box-shadow: none; margin-top:${idx===0?'2px':'2px'}; padding-left:2px; line-height:1; font-size:12px; font-weight:800; width:100%;` 
            : `color:var(--text-200); background: transparent; box-shadow: none; margin-top:${idx===0?'2px':'2px'}; padding-left:2px; line-height:1; font-size:12px; font-weight:800; width:100%;`;
            
          const barColor = idx === 0 ? '#007AFF' : '#FF3B30'; // 파란색, 빨간색
            
          const globalIdx = State.schedules.indexOf(s);
          inner += `
            <div class="cal-course-tag" style="display:flex; align-items:center; justify-content:flex-start; gap:4px; ${tagStyle}">
              <div style="width:2px; height:11px; background:${barColor}; border-radius:2px; flex-shrink:0;"></div>
              <span style="overflow:hidden; text-overflow:ellipsis;">${shortName}</span>
            </div>
          `;
        });
        if (scheds.length > 2) {
          inner += `<div style="font-size:8px; color:var(--text-500); margin-top:1px; line-height:1;">+${scheds.length - 2}</div>`;
        }
      }

      html += `<div class="${cls}" onclick="Calendar.selectDate(event, ${y},${m},${d})">
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
        grid.style.transition = 'all 0.3s cubic-bezier(0.22,1,0.36,1)';
        grid.style.opacity = '1';
        grid.style.transform = 'scale(1)';
      }, 150);
    }
    const label = U.$('.cal-month');
    if (label) label.textContent = `${State.calMonth+1}`;
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
