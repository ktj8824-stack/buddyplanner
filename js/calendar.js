/* =========================================
   BuddyPlanner — 일정 (월 달력 + 선택한 날의 라운딩)
   ========================================= */

const Calendar = {
  _sel: null,          // { y, m, d } 선택한 날
  _pendingSel: null,   // 홈 '이번 주'에서 누른 날

  init() {
    const today = new Date();
    if (State.calYear === undefined || State.calMonth === undefined) { State.calYear = today.getFullYear(); State.calMonth = today.getMonth(); }
    if (this._pendingSel) {
      this._sel = this._pendingSel; this._pendingSel = null;
      State.calYear = this._sel.y; State.calMonth = this._sel.m;
    } else {
      // 처음 열면: 가장 가까운 예정 라운딩 날 (없으면 오늘)
      const t0 = new Date(today); t0.setHours(0, 0, 0, 0);
      const next = (State.schedules || []).map(s => new Date(s.date)).filter(d => d >= t0).sort((a, b) => a - b)[0];
      const d = next || today;
      this._sel = { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
      State.calYear = d.getFullYear(); State.calMonth = d.getMonth();
    }
    this.render();
    // 단체 일정은 서버 목록 → 받아 오면 달력 점·선택한 날 다시 그림
    if (typeof Group !== 'undefined' && Group.refreshListQuiet) {
      Group.refreshListQuiet().then(() => { if (State.screen === 'calendar') { this.updateCalendar(); const a = U.$('#cal-selected-area'); if (a) a.innerHTML = this.selectedHtml(); } }).catch(() => {});
    }
  },

  _groups(y, m, d) { return (typeof Group !== 'undefined' && Group.groupsOn) ? Group.groupsOn(y, m, d) : []; },

  render() {
    const el = U.$('#screen-calendar');
    if (!el) return;
    try {
      el.innerHTML = `
        <div class="v2-pagehead"><h1>일정</h1></div>
        <div class="v2-scroll">
          <div class="v2-body">
            <div class="v2-card" style="padding:18px 14px 14px;">
              <div class="v2-cal-nav">
                <button class="v2-iconbtn" onclick="Calendar.prevMonth()" aria-label="이전 달"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
                <b class="cal-nav-title">${State.calYear}년 ${State.calMonth + 1}월</b>
                <button class="v2-iconbtn" onclick="Calendar.nextMonth()" aria-label="다음 달"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
              </div>
              <div class="v2-cal-grid" id="cal-grid">${this.renderCalDays()}</div>
              <div class="v2-cal-legend">
                <span><i style="width:16px;height:16px;border:2px solid var(--v2-blue);"></i>오늘</span>
                <span><i style="width:16px;height:16px;background:var(--v2-navy);"></i>선택한 날</span>
                <span><i style="width:7px;height:7px;background:var(--v2-green);"></i>라운딩</span>
                <span><i style="width:7px;height:7px;background:#7048e8;"></i>단체</span>
              </div>
            </div>
            <div id="cal-selected-area">${this.selectedHtml()}</div>
          </div>
        </div>`;
    } catch (e) {
      console.error('Calendar Render Error:', e);
      el.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-200);">캘린더를 렌더링하는 중 오류가 발생했습니다.<br><br>앱을 새로고침 해주세요.</div>`;
    }
  },

  renderCalDays() {
    const y = State.calYear, m = State.calMonth;
    const firstDay = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const sel = this._sel;
    let html = ['일', '월', '화', '수', '목', '금', '토'].map((w, i) => `<div class="wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${w}</div>`).join('');
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const dt = new Date(y, m, d);
      const cls = ['v2-cal-cell'];
      if (dt.getDay() === 0) cls.push('sun');
      if (dt.getDay() === 6) cls.push('sat');
      if (dt < t0) cls.push('past');
      if (dt.getTime() === t0.getTime()) cls.push('today');
      if (sel && sel.y === y && sel.m === m && sel.d === d) cls.push('sel');
      const mine = State.hasScheduleOnDate(y, m, d);
      const grp = this._groups(y, m, d).length > 0 || State.getSchedulesForDate(y, m, d).some(s => s.groupCode);
      if (mine) cls.push('has');
      if (grp) cls.push('grp');
      html += `<div class="${cls.join(' ')}" onclick="Calendar.selectDate(event, ${y}, ${m}, ${d})"><span class="n cal-day-num">${d}</span><span class="cal-dots">${mine ? '<i class="dot"></i>' : ''}${grp ? '<i class="dot g"></i>' : ''}</span></div>`;
    }
    return html;
  },

  selectedHtml() {
    const sel = this._sel;
    if (!sel) return '';
    const { y, m, d } = sel;
    const date = new Date(y, m, d);
    const scheds = State.getSchedulesForDate(y, m, d);
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const cards = scheds.map(s => {
      const idx = State.schedules.indexOf(s);
      if (!s.timeline && State.calculateTimeline) { try { State.calculateTimeline(idx); } catch (e) {} }
      const tl = s.timeline || {};
      const diff = Math.round((date - t0) / 864e5);
      const n = (s.companions || []).length;
      const on = !s.alarmOff;
      return `
        <div class="v2-card">
          <div class="v2-rcard-top" onclick="App.viewTimeline(${idx})">
            <b>${U.esc(s.course ? s.course.name : (s.courseName || '골프장'))}</b>
            ${s.groupCode ? '<span class="v2-pill grp">단체</span>' : ''}<span class="v2-pill blue">${diff === 0 ? 'D-Day' : diff > 0 ? 'D-' + diff : '지난 라운딩'}</span>
          </div>
          <div class="v2-rcard-times" onclick="App.viewTimeline(${idx})">
            <div><span>출발</span><b>${tl.homeDepart || '--:--'}</b></div>
            <div><span>도착</span><b>${tl.arrival || '--:--'}</b></div>
            <div class="tee"><span>티오프</span><b>${tl.teeOff || s.teeOff || '--:--'}</b></div>
          </div>
          <div class="v2-rcard-foot">
            <span class="st${on ? '' : ' off'}">${on ? '알람 켜짐' : '알람 꺼짐'}${n ? ` · 동반자 ${n}명` : ''}</span>
            <button class="v2-link" onclick="App.viewTimeline(${idx})">타임라인 보기</button>
          </div>
        </div>`;
    }).join('');
    // 단체 일정 (이미 내 일정으로 넣은 단체는 위 카드에 '단체' 표시가 있으니 빼고)
    const linked = new Set(scheds.map(s => s.groupCode).filter(Boolean));
    const gcards = this._groups(y, m, d).filter(g => !linked.has(g.code)).map(g => `
        <div class="v2-card v2-grpcard" onclick="Group.openCode(${U.jsq(g.code)})">
          <div class="v2-rcard-top">
            <b>${U.esc(g.title || '단체 라운딩')}</b>
            <span class="v2-pill grp">단체 · ${g.i_am_owner ? '총무' : '참석'}</span>
          </div>
          <div class="v2-hint" style="margin-top:6px;">⛳ ${U.esc(g.course_name || '')}${g.tee_off ? ' · 티오프 ' + U.esc(g.tee_off) : ''}</div>
          <div class="v2-rcard-foot"><span class="st">참석 ${g.yes_count || 0}/${g.total || 0}</span><span class="v2-link">단체 일정 보기</span></div>
        </div>`).join('');
    return `
      <div class="v2-cal-day">${m + 1}월 ${d}일 (${U.DAYS[date.getDay()]})</div>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
        ${gcards}${cards || (gcards ? '' : '<div class="v2-cal-empty">이 날은 라운딩이 없어요</div>')}
        <button class="v2-btn-navy" onclick="Calendar._addForSelected()"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> 새 라운딩 등록</button>
      </div>`;
  },

  // 선택한 날짜로 일정 등록
  _addForSelected() {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const sel = this._sel;
    const d = sel ? new Date(sel.y, sel.m, sel.d) : t;
    window._selectedDateForRegister = d >= t ? d : null;
    App.navigate('register');
  },

  async deleteSchedule(idx) {
    if (!State.schedules[idx]) return;
    if (await App.ask('일정을 삭제할까요?', '일정과 알람이 함께 지워져요.', { ok: '삭제' })) {
      const s = State.schedules[idx];
      if (typeof Timeline !== 'undefined' && Timeline.clearSchedAlarms) Timeline.clearSchedAlarms(s, true);
      State.schedules.splice(idx, 1);
      State.saveSchedules();
      U.toast('🗑️ 일정이 삭제되었습니다.');
      this.render();
    }
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
    this._sel = { y: State.calYear, m: State.calMonth, d: today.getDate() };
    this.render();
  },

  updateCalendar() {
    const grid = U.$('#cal-grid');
    if (grid) grid.innerHTML = this.renderCalDays();
    const label = U.$('.cal-nav-title');
    if (label) label.textContent = `${State.calYear}년 ${State.calMonth + 1}월`;
  },

  selectDate(evt, y, m, d) {
    this._sel = { y, m, d };
    this.updateCalendar();
    const area = U.$('#cal-selected-area');
    if (area) area.innerHTML = this.selectedHtml();
  },

  // 예전 이름 호환
  getSelectAreaHtml(y, m, d) { this._sel = { y, m, d }; return this.selectedHtml(); },
  getSelectedDateLabel(y, m, d) { return this.getSelectAreaHtml(y, m, d); }
};
