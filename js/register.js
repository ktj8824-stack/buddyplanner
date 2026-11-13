/* =========================================
   BuddyPlanner v2 — Register Screen
   ========================================= */

const Register = {
  searchTimer: null,
  course: null,
  date: null,
  timeH: 7, timeM: 0,
  prep: 30,
  invited: [],
  hasMeal: false,
  mealDuration: 50,
  mealRestaurant: null,
  hasPostMeal: false,
  postMealRestaurant: null,
  startPoint: '집',
  hasMeetingPoint: false,
  meetingPointObj: null,
  searchMode: 'start',
  editIdx: null,
  roundLength: '18',
  showerMin: 30,
  afterMeet: { mode: 'asap', time: '' },

  getStartPointValue() {
    if (!State.userAddresses) State.userAddresses = { home: '', office: '' };
    if (this.startPoint === '집') return State.userAddresses.home;
    if (this.startPoint === '회사') return State.userAddresses.office;
    return '';
  },

  reset() {
    this.editIdx = null;
    this.groupCode = null;
    this.searchTimer = null;
    this.course = null;
    this.date = window._selectedDateForRegister || null;
    window._selectedDateForRegister = null;
    this.timeH = null; this.timeM = null;
    this.prep = (() => { try { const v = parseInt(localStorage.getItem('bp_last_prep'), 10); return v > 0 && v <= 180 ? v : 30; } catch (e) { return 30; } })();
    this.invited = [];
    this.hasMeal = false;
    this.mealDuration = 50;
    this.mealRestaurant = null;
    this.hasPostMeal = false;
    this.postMealRestaurant = null;
    this.startPoint = '집';
    this.hasMeetingPoint = false;
    this.meetingPointObj = null;
    this.searchMode = 'start';
    this.roundLength = '18';
    this.showerMin = this._lastShower();
    this.afterMeet = { mode: 'asap', time: '' };
    this.customStartObj = null;
    // 공유 링크로 들어온 일정 (App.showSharedScheduleModal 에서 넘김)
    this.shared = this._pendingShared || null;
    this._pendingShared = null;
    this.sg = null;
    if (this.shared) {
      const sh = this.shared;
      // 공유받은 사람 안내 단계: ① 출발지 → ② 준비 시간 → ③ 먼저 갈 곳 (직접 눌러야 완료)
      this.sg = { startTapped: false, start: false, prep: false, route: false };
      if (sh.mealDuration) this.mealDuration = sh.mealDuration;
      if (sh.post) { this.hasPostMeal = true; this.postMealRestaurant = sh.post; }
      if (sh.roundLength && ROUND_LENGTHS[sh.roundLength]) this.roundLength = sh.roundLength;
      if (sh.afterMeet && sh.afterMeet.mode) this.afterMeet = { mode: sh.afterMeet.mode, time: sh.afterMeet.time || '' };
      this._applySharedRoute(sh.route);
    }
  },

  /** 공유받은 일정: 어디로 먼저 갈지 (meet: 집결지 → 식당 → 골프장 / meal: 식당 → 골프장 / course: 골프장 바로) */
  _applySharedRoute(k) {
    const sh = this.shared; if (!sh) return;
    sh.route = k;
    this.hasMeetingPoint = k === 'meet' && !!sh.meet;
    this.meetingPointObj = this.hasMeetingPoint ? sh.meet : null;
    this.hasMeal = (k === 'meet' || k === 'meal') && !!sh.meal;
    this.mealRestaurant = this.hasMeal ? sh.meal : null;
  },

  setSharedRoute(k) {
    this._applySharedRoute(k);
    const first = this.sg && !this.sg.route;
    if (this.sg) this.sg.route = true;
    U.$$('#r-shared-routes .sr-opt').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    const set = (tg, body, on) => { const t = U.$(tg), b = U.$(body); if (t) t.classList.toggle('on', on); if (b) b.classList.toggle('show', on); };
    set('#meal-toggle', '#meal-body', this.hasMeal);
    set('#meeting-toggle', '#meeting-body', this.hasMeetingPoint);
    const r = U.$('#r-restaurant');
    if (r) { r.textContent = this.mealRestaurant ? this.mealRestaurant.name : '골프장 주변 맛집 고르기'; r.classList.toggle('is-empty', !this.mealRestaurant); }
    const m = U.$('#r-meetingpoint-text');
    if (m) { m.textContent = this.meetingPointObj ? this.meetingPointObj.name : '집결지 주소(장소명) 검색'; m.classList.toggle('is-empty', !this.meetingPointObj); }
    this.updateProgress();
    this._refreshSharedSteps(first);
    U.haptic();
  },

  /** 공유받은 일정: 지금 해야 할 단계 (start → prep → route → done) */
  _sharedStep() {
    const g = this.sg; if (!g) return 'done';
    if (!g.start) return 'start';
    if (!g.prep) return 'prep';
    if (this._sharedRouteOpts().length && !g.route) return 'route';
    return 'done';
  },

  _sharedRouteOpts() {
    const sh = this.shared || {}; const c = sh.course || {};
    const opts = [];
    if (sh.meet) opts.push(['meet', '🤝', '집결지', [sh.meet.name, sh.meal ? '식당' : null, '골프장'].filter(Boolean).join(' → ')]);
    if (sh.meal) opts.push(['meal', '🍽️', '식당으로 바로', `${sh.meal.name} → 골프장`]);
    if (opts.length) opts.push(['course', '⛳', '골프장으로 바로', c.name || '골프장']);
    return opts;
  },

  _sharedCardHTML() {
    const sh = this.shared; if (!sh) return '';
    const c = sh.course || {};
    const g = this.sg || {};
    const dt = sh.date && !isNaN(new Date(sh.date)) ? U.fmtDateShort(new Date(sh.date)) : '';
    const opts = this._sharedRouteOpts();
    const P = [20, 30, 40, 50, 60, 70, 80, 90];
    const prep = P.concat(P.includes(this.prep) ? [] : [this.prep]).sort((a, b) => a - b);
    return `
          <div class="v2-card r-shared">
            <div class="rs-tag">⛳ 공유받은 일정</div>
            <div class="rs-name">${U.esc(c.name || '골프장')}</div>
            <div class="rs-when">${dt}${sh.teeOff ? ' ' + U.esc(sh.teeOff) + ' 티오프' : ''}</div>
            <div class="rs-step" id="rs-step-start" data-step="start">
              <div class="rs-q"><em>1</em>어디서 출발하세요?</div>
              <div class="rs-now">👇 출발지를 골라 주세요</div>
              <div class="v2-opts c3" id="r-startpoint-pills">
                ${['집', '회사', '직접 입력'].map(t => `<button type="button" class="pill ${g.startTapped && this.startPoint === t ? 'on' : ''}" onclick="Register.setStartPoint('${t}',this)">${t}</button>`).join('')}
              </div>
              <div class="v2-hint" id="r-startpoint-custom" style="cursor:pointer;" onclick="Register.searchMode='start';Register.searchCustomAddress()"><span id="r-startpoint-text">출발지 주소를 검색하세요</span></div>
            </div>
            <div class="rs-step" id="rs-step-prep" data-step="prep">
              <div class="rs-q"><em>2</em>나가기 전 준비 시간</div>
              <div class="rs-now">👇 준비 시간을 골라 주세요</div>
              <div class="v2-opts c4" id="r-pills" style="grid-template-columns:repeat(${prep.length > 8 ? 5 : 4},1fr);">
                ${prep.map(t => `<button type="button" class="pill ${g.prep && t === this.prep ? 'on' : ''}" data-t="${t}" onclick="Register.setPrepTime(${t},this)">${t}분</button>`).join('')}
              </div>
              <p class="v2-hint">샤워·화장·골프백 챙기기까지. 사람마다 달라서 직접 골라요</p>
            </div>
            ${opts.length ? `<div class="rs-step" id="rs-step-route" data-step="route">
              <div class="rs-q"><em>3</em>어디로 먼저 가세요?</div>
              <div class="rs-now">👇 먼저 갈 곳을 골라 주세요</div>
              <div id="r-shared-routes">
                ${opts.map(([k, ic, t, sub]) => `<button type="button" class="sr-opt ${g.route && sh.route === k ? 'on' : ''}" data-k="${k}" onclick="Register.setSharedRoute('${k}')">
                  <span class="ic">${ic}</span><span class="tx"><b>${t}</b><small>${U.esc(sub)}</small></span><span class="ck"></span></button>`).join('')}
              </div>
            </div>` : ''}
          </div>`;
  },

  /** 단계 표시 갱신. scroll=true면 다음 단계를 화면 맨 위로 올림 */
  _refreshSharedSteps(scroll) {
    if (!this.sg) return;
    const now = this._sharedStep();
    const order = ['start', 'prep', 'route'];
    const ni = now === 'done' ? 99 : order.indexOf(now);
    order.forEach((k, i) => {
      const el = U.$('#rs-step-' + k); if (!el) return;
      el.classList.toggle('now', i === ni);
      el.classList.toggle('done', i < ni);
      el.classList.toggle('wait', i > ni);
      const em = el.querySelector('.rs-q em'); if (em) em.textContent = i < ni ? '✓' : String(i + 1);
    });
    const st = U.$('#rs-step-start'); if (st) st.classList.toggle('tapped', !!this.sg.startTapped);
    const sub = U.$('#r-submit');
    if (sub) sub.classList.toggle('rs-ready', now === 'done');
    if (!scroll) return;
    setTimeout(() => {
      const target = now === 'done' ? sub : U.$('#rs-step-' + now);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: now === 'done' ? 'center' : 'start' });
    }, 250);
  },

  edit(idx) {
    const s = State.schedules[idx];
    if (!s) return;
    this.editIdx = idx;
    this.groupCode = s.groupCode || null;
    this.course = s.course;
    this.date = s.date;
    const [th, tm] = s.teeOff.split(':').map(Number);
    this.timeH = th;
    this.timeM = tm;
    this.prep = s.prepTime;
    this.invited = [...s.companions];
    this.hasMeal = s.hasMeal;
    this.mealDuration = s.mealDuration;
    this.mealRestaurant = s.mealRestaurant;
    this.hasPostMeal = s.hasPostMeal || false;
    this.postMealRestaurant = s.postMealRestaurant || null;
    this.startPoint = s.startPoint || '집';
    // '직접 입력' 출발지는 저장 때 주소 이름으로 바뀌어 있음 → 다시 '직접 입력'과 좌표로 되살림
    if (!['집', '회사'].includes(this.startPoint)) {
      this.startPoint = '직접 입력';
      this.customStartObj = s.startLat ? { name: s.startAddress || s.startPoint, lat: s.startLat, lng: s.startLng } : null;
    }
    this.hasMeetingPoint = s.hasMeetingPoint || false;
    this.meetingPointObj = s.meetingPointObj || null;
    this.roundLength = ROUND_LENGTHS[s.roundLength] ? s.roundLength : '18';
    this.showerMin = SHOWER_OPTS.includes(Number(s.showerMin)) ? Number(s.showerMin) : SHOWER_DEFAULT;
    this.afterMeet = s.afterMeet && s.afterMeet.mode ? { mode: s.afterMeet.mode, time: s.afterMeet.time || '' } : { mode: 'asap', time: '' };
    
    if (this.startPoint === '직접 입력' && s.startAddress) {
      setTimeout(() => {
        const customInput = U.$('#r-startpoint-text');
        if (customInput) customInput.textContent = s.startAddress;
      }, 150);
    }
    if (this.hasMeetingPoint && this.meetingPointObj) {
      setTimeout(() => {
        const meetInput = U.$('#r-meetingpoint-text');
        if (meetInput) meetInput.textContent = this.meetingPointObj.name;
      }, 150);
    }
    
    // 타임라인 알람 초기화 방지/해제 (수정 시 기존 알람 무효화)
    if (Timeline && Timeline.stopAlarmSound) Timeline.stopAlarmSound();
    
    App.navigate('register');
  },

  /** AI 비서가 제안한 일정으로 등록 화면 채우기 (화면이 열린 뒤 호출) */
  prefill({ course, date, h, m }) {
    if (course) {
      this.course = course;
      const search = U.$('#r-search');
      if (search) search.value = course.name;
      const hint = U.$('#r-hint');
      if (hint) { hint.innerHTML = `📍 ${U.esc(course.addr || '')}`; hint.style.color = 'var(--accent)'; }
      this.renderCourseChips();
    }
    if (date && !isNaN(date.getTime())) {
      this.date = date;
      const el = U.$('#r-date');
      if (el) { el.textContent = U.fmtDateShort(date); el.classList.remove('is-empty'); }
    }
    if (Number.isFinite(h) && Number.isFinite(m)) {
      this.timeH = h; this.timeM = m;
      const t = U.$('#r-time');
      if (t) { t.textContent = this._hm(h, m); t.classList.remove('is-empty'); }
    }
    this.updateProgress();
  },

  /** AI 비서가 제안한 식당을 식사 코스로 넣기 (일정 수정 화면이 열린 뒤 호출) */
  setMealFromAI(timing, rest) {
    if (timing === 'after') {
      this.postMealRestaurant = rest;
      if (!this.hasPostMeal) this.toggleMeal('post');
      const d = U.$('#r-post-restaurant');
      if (d) { d.textContent = rest.name; d.classList.remove('is-empty'); }
    } else {
      this.mealRestaurant = rest;
      if (!this.hasMeal) this.toggleMeal('pre');
      const d = U.$('#r-restaurant');
      if (d) { d.textContent = rest.name; d.classList.remove('is-empty', 'empty'); }
    }
  },

  init() { 
    if (this.editIdx === null) this.reset(); // only reset if not editing
    this.render(); 
    setTimeout(() => {
      this.bind();
      this.updateStartPointUI();
      if (this.editIdx !== null) {
        if (this.course) {
          U.$('#r-search').value = this.course.name;
          const hint = U.$('#r-hint');
          if(hint) {
            hint.innerHTML = `📍 ${U.esc(this.course.addr)}`;
            hint.style.color = 'var(--accent)';
          }
        }
        if (this.date) {
          const el = U.$('#r-date');
          el.textContent = U.fmtDateShort(this.date);
          el.classList.remove('is-empty');
        }
        this.updateTags();
      }
    }, 100); 
  },

  _hm(h, m) { return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },

  render() {
    const el = U.$('#screen-register');
    const isEdit = this.editIdx !== null;
    const PREP = [20, 30, 40, 50, 60, 70, 80, 90];
    const prepOpts = PREP.concat(PREP.includes(this.prep) ? [] : [this.prep]).sort((a, b) => a - b);
    const sw = (id, on, fn, label) => `<button class="v2-switch ${on ? 'on' : ''}" id="${id}" role="switch" aria-label="${label}" onclick="${fn}"></button>`;
    const last = isEdit ? null : this.lastSchedule();
    const back = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
    const chevUp = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>';
    el.innerHTML = `
      <div class="v2-pagehead center">
        <button class="v2-iconbtn" onclick="Register.editIdx=null; App.navigate('calendar')" aria-label="뒤로가기">${back}</button>
        <h1>${isEdit ? '라운딩 일정 수정' : '새 라운딩 등록'}</h1>
        <span style="width:40px;"></span>
      </div>
      <div class="v2-reg-progress">
        <div class="row"><b>필수 정보</b><span id="r-prog-txt">0 / 4 완료</span></div>
        <div class="bar"><i id="r-prog-bar" style="width:0%"></i></div>
      </div>
      <div class="v2-scroll" style="padding-bottom:16px;">
        <div class="v2-body">
${this._sharedCardHTML()}
          <div class="v2-card">
            <div class="v2-q"><em id="r-q1">1</em>어느 골프장인가요?</div>
            <div class="search-wrap" style="position:relative;">
              <div class="v2-search">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#475569" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input type="text" id="r-search" placeholder="골프장 이름으로 검색" autocomplete="off"/>
              </div>
              <div class="search-drop" id="r-results"></div>
            </div>
            <p class="v2-hint" id="r-hint" style="margin-top:8px;"></p>
            ${this.quickCoursesHTML()}
            ${isEdit ? '' : `<div style="display:flex; gap:14px; margin-top:12px; flex-wrap:wrap;">
              ${last ? `<button class="v2-link" style="font-size:14px;" onclick="Register.fillFromLast()">↺ 지난번처럼 채우기</button>` : ''}
              <button class="v2-link" style="font-size:14px;" onclick="Register.openPasteBooking()">📋 예약 문자로 채우기</button>
            </div>`}
          </div>

          <div class="v2-card">
            <div class="v2-q"><em id="r-q2">2</em>언제 티오프인가요?</div>
            <div class="v2-field2">
              <button class="v2-field" onclick="Register.openDatePicker()"><span>날짜</span><b class="${this.date ? '' : 'is-empty'}" id="r-date">${this.date ? U.fmtDateShort(new Date(this.date)) : '날짜 선택'}</b></button>
              <button class="v2-field" onclick="Register.openTimePicker()"><span>티오프 시간</span><b class="${this.timeH === null ? 'is-empty' : ''}" id="r-time">${this.timeH === null ? '시간 선택' : this._hm(this.timeH, this.timeM)}</b></button>
            </div>
          </div>

          ${this.shared ? '' : `<div class="v2-card">
            <div class="v2-q"><em id="r-q3">3</em>어디서 출발하나요?</div>
            <div class="v2-opts c3" id="r-startpoint-pills">
              ${['집', '회사', '직접 입력'].map(t => `<button type="button" class="pill ${this.startPoint === t ? 'on' : ''}" onclick="Register.setStartPoint('${t}',this)">${t}</button>`).join('')}
            </div>
            <div class="v2-hint" id="r-startpoint-custom" style="cursor:pointer;" onclick="Register.searchMode='start';Register.searchCustomAddress()"><span id="r-startpoint-text">출발지 주소를 검색하세요</span></div>
          </div>`}

          ${this.shared ? '' : `<div class="v2-card">
            <div class="v2-q"><em class="ok" id="r-q4">4</em>나가기 전 준비 시간</div>
            <div class="v2-opts c4" id="r-pills" style="${prepOpts.length > 8 ? 'grid-template-columns:repeat(5,1fr);' : ''}">
              ${prepOpts.map(t => `<button class="pill ${t === this.prep ? 'on' : ''}" data-t="${t}" onclick="Register.setPrepTime(${t},this)">${t}분</button>`).join('')}
            </div>
            <p class="v2-hint">샤워, 골프백 챙기기 등. 다음부터는 마지막 값을 기억해요</p>
          </div>`}

          <div class="v2-opt-card">
            <div class="v2-opt-head" onclick="Register.toggleOptional()">
              <div><b>선택 사항</b><small>식사 · 동반자 픽업 · 동반자 초대</small></div>
              <span id="r-opt-chev" style="color:#475569; transition:transform .2s;">${chevUp}</span>
            </div>
            <div id="r-opt-body">
              <div class="v2-opt-row">
                <div class="r"><span>라운딩 전 아침 식사</span>${sw('meal-toggle', this.hasMeal, "Register.toggleMeal('pre')", '라운딩 전 식사')}</div>
                <div class="v2-opt-sub meal-body ${this.hasMeal ? 'show' : ''}" id="meal-body">
                  <div class="v2-opts c4" id="meal-pills" style="grid-template-columns:repeat(4,1fr); margin-bottom:8px;">
                    ${[30, 40, 50, 60, 70, 80, 90].map(t => `<button class="pill ${t === this.mealDuration ? 'on' : ''}" data-t="${t}" onclick="Register.setMealTime(${t},this)">${t}분</button>`).join('')}
                  </div>
                  <button class="v2-field" style="width:100%;" onclick="Register.openRestaurantPicker('pre')"><span>식당</span><b class="${!this.mealRestaurant ? 'is-empty' : ''}" id="r-restaurant">${this.mealRestaurant ? U.esc(this.mealRestaurant.name) : '골프장 주변 맛집 고르기'}</b></button>
                </div>
              </div>
              <div class="v2-opt-row">
                <div class="r"><span>라운딩 후 식사 (뒤풀이)</span>${sw('postmeal-toggle', this.hasPostMeal, "Register.toggleMeal('post')", '뒤풀이')}</div>
                <div class="v2-opt-sub meal-body ${this.hasPostMeal ? 'show' : ''}" id="postmeal-body">
                  <button class="v2-field" style="width:100%;" onclick="Register.openRestaurantPicker('post')"><span>뒤풀이 식당</span><b class="${!this.postMealRestaurant ? 'is-empty' : ''}" id="r-post-restaurant">${this.postMealRestaurant ? U.esc(this.postMealRestaurant.name) : '식당 고르기 (반경 10km)'}</b></button>
                </div>
              </div>
              <div class="v2-opt-row">
                <div class="r"><span>동반자 픽업 · 집결지</span>${sw('meeting-toggle', this.hasMeetingPoint, 'Register.toggleMeetingPoint()', '집결지')}</div>
                <div class="v2-opt-sub meal-body ${this.hasMeetingPoint ? 'show' : ''}" id="meeting-body">
                  <button class="v2-field" style="width:100%;" id="r-meetingpoint-custom" onclick="Register.searchMode='meeting';Register.searchCustomAddress()"><span>집결지</span><b class="${this.meetingPointObj ? '' : 'is-empty'}" id="r-meetingpoint-text">${this.meetingPointObj ? U.esc(this.meetingPointObj.name) : '집결지 주소(장소명) 검색'}</b></button>
                  <p class="v2-hint" style="margin-top:8px;">집결지에서 약 10분 대기·탑승 시간이 자동으로 들어가요.</p>
                </div>
              </div>
              <div class="v2-opt-row" id="r-after">
${this._afterHTML()}
              </div>
              <button class="v2-invite" id="r-invite" onclick="Register.openCompanionModal()">카카오톡으로 동반자 초대</button>
              <div class="invite-tags" id="r-tags" style="padding:0 18px;"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="v2-reg-foot">
        <div class="pre" id="r-preview">골프장·티오프·출발지를 넣으면 출발 시간을 미리 계산해요</div>
        <button class="v2-btn-navy" id="r-submit" onclick="Register.createPlan()">${isEdit ? '라운딩 일정 수정 완료' : '스마트 플랜 만들기'}</button>
      </div>
    `;
    setTimeout(() => this.updateProgress(), 0);
  },

  toggleOptional() {
    const b = U.$('#r-opt-body'), c = U.$('#r-opt-chev');
    if (!b) return;
    const hide = b.style.display !== 'none';
    b.style.display = hide ? 'none' : '';
    if (c) c.style.transform = hide ? 'rotate(180deg)' : '';
  },

  /** 출발지 좌표 (없으면 null) */
  _startObj() {
    const v = this.startPoint === '집' ? State.userAddresses?.home : this.startPoint === '회사' ? State.userAddresses?.office : this.customStartObj;
    return v && v.lat ? v : null;
  },

  /** 필수 정보 진행 막대 + 미리 계산한 일정 */
  updateProgress() {
    // '라운딩 끝나고' 미리보기: 티오프·뒤풀이가 바뀌면 바로 다시 계산 (뒤풀이를 켜고 끄면 '뒤풀이 장소에서' 선택지도 바뀜)
    try {
      const post = !!this.hasPostMeal;
      if (this._afterPost !== post) { this._afterPost = post; if (!post && this.afterMeet && this.afterMeet.mode === 'place') this.afterMeet = { mode: 'asap', time: '' }; this._refreshAfter(); }
      else { const pv = U.$('#r-after-pv'); if (pv) pv.innerHTML = this._afterPreview(); }
    } catch (e) { }
    const okCourse = !!(this.course && this.course.lat);
    const okTime = !!this.date && this.timeH !== null && this.timeH !== undefined;
    const st = this._startObj();
    const okStart = !!st;
    const n = [okCourse, okTime, okStart, true].filter(Boolean).length;
    const t = U.$('#r-prog-txt'), bar = U.$('#r-prog-bar');
    if (t) t.textContent = `${n} / 4 완료`;
    if (bar) bar.style.width = (n / 4 * 100) + '%';
    [['#r-q1', okCourse], ['#r-q2', okTime], ['#r-q3', okStart], ['#r-q4', true]].forEach(([id, ok]) => { const e = U.$(id); if (e) e.classList.toggle('ok', ok); });
    const pv = U.$('#r-preview');
    if (!pv) return;
    if (!(okCourse && okTime && okStart)) { pv.textContent = '골프장·티오프·출발지를 넣으면 출발 시간을 미리 계산해요'; return; }
    const meal = this.hasMeal && this.mealRestaurant && this.mealRestaurant.lat;
    const manner = meal ? 30 : 40;
    let travel;
    if (meal) travel = this.estimateDriveMin(st.lng, st.lat, this.mealRestaurant.lng, this.mealRestaurant.lat) + this.mealDuration + (this.mealRestaurant.distMin || 15);
    else travel = this.estimateDriveMin(st.lng, st.lat, this.course.lng, this.course.lat);
    const tee = this.timeH * 60 + this.timeM;
    const dep = tee - manner - travel, prep = dep - this.prep;
    const f = (x) => { x = ((x % 1440) + 1440) % 1440; return this._hm(Math.floor(x / 60), x % 60); };
    pv.innerHTML = `미리 계산한 일정 <b>준비 ${f(prep)} → 출발 ${f(dep)} → 티오프 ${f(tee)}</b>`;
  },

  bind() {
    const input = U.$('#r-search');
    if (!input) return;
    input.addEventListener('input', e => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        if (e.target.value.trim().length > 1) this.search(e.target.value.trim());
      }, 300);
    });
    input.addEventListener('focus', () => { if (input.value.trim().length > 1) this.search(input.value.trim()); });
    document.addEventListener('click', e => {
      const w = U.$('.search-wrap');
      if (w && !w.contains(e.target)) { const r = U.$('#r-results'); if (r) r.classList.remove('show'); }
    });
  },

  searchResults: [],

  async search(q) {
    const drop = U.$('#r-results'); if (!drop || !q) { drop?.classList.remove('show'); return; }
    
    drop.innerHTML = '<div class="search-item" style="justify-content:center;color:var(--text-500)">검색 중...</div>';
    drop.classList.add('show');
    
    this.searchResults = await TmapAPI.searchPlace(q, true, { quiet: true });
    
    if (!this.searchResults || !this.searchResults.length) { 
      // 검색이 실패했으면 '결과 없음' 대신 실패 안내 하나만 (인터넷이 끊겼으면 연결 확인 안내)
      const msg = TmapAPI.searchFailText() || '검색 결과 없음';
      drop.innerHTML = `<div class="search-item" style="justify-content:center;color:var(--text-500)">${msg}</div>`; 
      return; 
    }
    
    drop.innerHTML = this.searchResults.map(c => `
      <div class="search-item" onclick="Register.selectCourse('${U.esc(c.id)}')">
        <div class="search-item-icon">⛳</div>
        <div class="search-item-info">
          <div class="search-item-name">${U.hlMatch(c.place_name, q)}</div>
          <div class="search-item-addr">${c.jibun_name ? '<span class="addr-k">도로명</span>' : ''}${U.esc(c.address_name)}</div>
          ${c.jibun_name ? `<div class="search-item-addr"><span class="addr-k">지번</span>${U.esc(String(c.jibun_name).replace(/^\S+\s+\S+[시군구]\s+/, ''))}</div>` : ''}
        </div>
      </div>`).join('');
  },

  /** 주소 → 추천 목록 지역 키 ('경남 남해군 …' → '경남 남해', 제주는 '제주') */
  regionOf(addr) {
    const p = String(addr || '').split(' ');
    if (/^제주/.test(p[0] || '')) return '제주';
    return [p[0] || '', (p[1] || '').replace(/(시|군)$/, '')].filter(Boolean).join(' ');
  },

  selectCourse(id) {
    const c = this.searchResults.find(x => String(x.id) === String(id)); if(!c) return;
    
    this.course = {
      id: c.id,
      name: c.place_name,
      region: Register.regionOf(c.address_name),
      addr: c.address_name,
      lat: parseFloat(c.y),
      lng: parseFloat(c.x)
    };
    
    U.$('#r-search').value = this.course.name;
    U.$('#r-results').classList.remove('show');
    const hint = U.$('#r-hint');
    if (hint) {
      hint.innerHTML = `📍 ${U.esc(this.course.addr)}`;
      hint.style.color = 'var(--accent)';
    }
    
    // Clear restaurant when course changes
    this.resetMealDisplay();
    
    this.renderCourseChips();
    this.updateProgress();
    U.toast(`⛳ ${this.course.name || c.place_name || c.name || '골프장'} 선택 완료`); U.haptic();
  },

  openDatePicker() {
    const today = new Date();
    const curDate = this.date || today;
    const cy = curDate.getFullYear();
    const cm = curDate.getMonth() + 1;
    const cd = curDate.getDate();

    const currentYear = today.getFullYear();
    const years = [currentYear, currentYear + 1, currentYear + 2];

    const REPEAT = 40;
    const MID = Math.floor(REPEAT / 2);

    let yearHtml = years.map(y => `<div class="wheel-item" data-val="${y}">${y}년</div>`).join('');
    
    let monthItemsHtml = '';
    for(let i=1; i<=12; i++) {
      monthItemsHtml += `<div class="wheel-item" data-val="${i}">${i}월</div>`;
    }
    let monthHtml = monthItemsHtml.repeat(REPEAT);
    
    let dayItemsHtml = '';
    for(let i=1; i<=31; i++) {
      dayItemsHtml += `<div class="wheel-item" data-val="${i}">${i}일</div>`;
    }
    let dayHtml = dayItemsHtml.repeat(REPEAT);

    const content = `
      <div class="wheel-picker" id="r-date-wheel-picker">
        <div class="wheel-sel-bar"></div>
        <div class="wheel-col" id="w-year">${yearHtml}</div>
        <div class="wheel-col" id="w-month">${monthHtml}</div>
        <div class="wheel-col" id="w-day">${dayHtml}</div>
      </div>
      <button class="btn btn-gold" onclick="Register.confirmDatePicker()" style="width:100%">날짜 선택 완료</button>
    `;
    
    App.showModal('📅 라운딩 날짜 선택', content);

    setTimeout(() => {
      const hYear = U.$('#w-year');
      const hMonth = U.$('#w-month');
      const hDay = U.$('#w-day');
      
      const ITEM_HEIGHT = 44;
      const yIdx = years.indexOf(cy);
      hYear.scrollTop = (yIdx > -1 ? yIdx : 0) * ITEM_HEIGHT;
      hMonth.scrollTop = (MID * 12 + cm - 1) * ITEM_HEIGHT;
      hDay.scrollTop = (MID * 31 + cd - 1) * ITEM_HEIGHT;

      [hYear, hMonth, hDay].forEach(col => {
        col.addEventListener('scroll', () => {
          clearTimeout(col.snapTimer);
          col.snapTimer = setTimeout(() => Register.updateWheelActive(col), 50);
        });
        Register.updateWheelActive(col);
      });
    }, 100);
  },

  confirmDatePicker() {
    const ITEM_HEIGHT = 44;
    const getVal = (id) => {
      const col = U.$('#' + id);
      const idx = Math.round(col.scrollTop / ITEM_HEIGHT);
      const item = col.querySelectorAll('.wheel-item')[idx];
      return item ? parseInt(item.dataset.val, 10) : 1;
    };

    const y = getVal('w-year');
    const m = getVal('w-month') - 1;
    const d = getVal('w-day');

    const selDate = new Date(y, m, d);
    // 2월 31일처럼 달력에 없는 날짜는 다음 달로 넘어가지 않게 막음
    if (selDate.getMonth() !== m) { U.toast(`${m + 1}월 ${d}일은 없는 날짜예요. 날짜를 다시 골라 주세요.`); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selDate < today) {
      App.ask('지난 날짜예요', `${U.fmtDateShort(selDate)}, 이미 지난 날짜예요. 그래도 이 날짜로 할까요?`, { ok: '이 날짜로' })
        .then(ok => { if (ok) this.selectDate(selDate.toISOString()); });
      return;
    }
    this.selectDate(selDate.toISOString());
  },

  selectDate(iso) {
    this.date = new Date(iso);
    const display = U.$('#r-date');
    display.textContent = U.fmtDateShort(this.date); display.classList.remove('is-empty', 'empty');
    App.closeModal(); U.haptic();
    this.updateProgress();
  },

  openTimePicker() {
    const defaultH = this.timeH !== null ? this.timeH : 7;
    const defaultM = this.timeM !== null ? this.timeM : 0;
    
    const isPM = defaultH >= 12;
    const h12 = defaultH % 12 || 12;

    const REPEAT = 40;
    const MID = Math.floor(REPEAT / 2);

    let ampmHtml = ['오전', '오후'].map(v => `<div class="wheel-item" data-val="${v}">${v}</div>`).join('');
    let hourItems = '';
    for (let i = 1; i <= 12; i++) {
      hourItems += `<div class="wheel-item" data-val="${i}">${i}</div>`;
    }
    let hourHtml = hourItems.repeat(REPEAT);
    
    let minItems = '';
    for (let i = 0; i < 60; i++) {
      minItems += `<div class="wheel-item" data-val="${i}">${String(i).padStart(2, '0')}</div>`;
    }
    let minHtml = minItems.repeat(REPEAT);

    const content = `
      <div class="wheel-picker" id="r-wheel-picker">
        <div class="wheel-sel-bar"></div>
        <div class="wheel-col" id="w-ampm">${ampmHtml}</div>
        <div class="wheel-col" id="w-hour">${hourHtml}</div>
        <div class="wheel-col" id="w-min">${minHtml}</div>
      </div>
      <button class="btn btn-gold" onclick="Register.confirmTimePicker()" style="width:100%">선택 완료</button>
    `;

    App.showModal('⏰ 티오프 시간 선택', content);

    setTimeout(() => {
      const hAmPm = U.$('#w-ampm');
      const hHour = U.$('#w-hour');
      const hMin = U.$('#w-min');
      
      const ITEM_HEIGHT = 44;
      hAmPm.scrollTop = (isPM ? 1 : 0) * ITEM_HEIGHT;
      hHour.scrollTop = (MID * 12 + h12 - 1) * ITEM_HEIGHT;
      hMin.scrollTop = (MID * 60 + defaultM) * ITEM_HEIGHT;

      [hAmPm, hHour, hMin].forEach(col => {
        col.addEventListener('scroll', () => {
          clearTimeout(col.snapTimer);
          col.snapTimer = setTimeout(() => Register.updateWheelActive(col), 50);
        });
        Register.updateWheelActive(col);
      });
    }, 100);
  },

  updateWheelActive(col) {
    const ITEM_HEIGHT = 44;
    const idx = Math.round(col.scrollTop / ITEM_HEIGHT);
    const activeItem = col.querySelector('.wheel-item.active');
    if (activeItem) activeItem.classList.remove('active');
    
    const items = col.querySelectorAll('.wheel-item');
    if (items[idx]) items[idx].classList.add('active');
  },

  confirmTimePicker() {
    const ITEM_HEIGHT = 44;
    const getVal = (id) => {
      const col = U.$('#' + id);
      const idx = Math.round(col.scrollTop / ITEM_HEIGHT);
      return col.querySelectorAll('.wheel-item')[idx].dataset.val;
    };

    const ampm = getVal('w-ampm');
    let h = parseInt(getVal('w-hour'), 10);
    const m = parseInt(getVal('w-min'), 10);

    if (ampm === '오후' && h !== 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;

    this.selectTime(h, m);
  },

  selectTime(h, m) {
    this.timeH = h;
    this.timeM = m;
    const display = U.$('#r-time');
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    display.textContent = `${hh}:${mm}`;
    display.classList.remove('is-empty', 'empty');
    App.closeModal();
    U.haptic();
    this.updateProgress();
  },

  /* ── 라운딩 끝나고: 라운딩 길이 · 샤워·환복 · 모이는 방식 (고르면 아래 미리보기가 바로 바뀜) ── */
  _lastShower() {
    try { const v = Number(localStorage.getItem('bp_last_shower')); if (SHOWER_OPTS.includes(v) && localStorage.getItem('bp_last_shower') !== null) return v; } catch (e) { }
    return SHOWER_DEFAULT;
  },

  _afterHTML() {
    const am = this.afterMeet || { mode: 'asap', time: '' };
    if (am.mode === 'place' && !this.hasPostMeal) am.mode = 'asap';
    const modes = [['asap', '끝나는 대로'], ['lobby', '로비에서 만나기']];
    if (this.hasPostMeal) modes.push(['place', '뒤풀이 장소에서']);
    const def = am.time || this._defaultMeetTime(am.mode);
    return `
                <div class="r" style="margin-bottom:10px;"><span>라운딩 끝나고</span></div>
                <div class="v2-after-l">라운딩</div>
                <div class="v2-opts c2" id="r-round-pills">
                  ${Object.keys(ROUND_LENGTHS).map(k => `<button type="button" class="pill v2-pill2 ${k === this.roundLength ? 'on' : ''}" onclick="Register.setRoundLength('${k}', this)"><b>${ROUND_LENGTHS[k].label}</b><small>${ROUND_LENGTHS[k].desc.replace('라운딩 약 ', '')}</small></button>`).join('')}
                </div>
                <div class="v2-after-l">샤워·환복</div>
                <div class="v2-opts" id="r-shower-pills" style="grid-template-columns:repeat(${SHOWER_OPTS.length},1fr);">
                  ${SHOWER_OPTS.map(t => `<button type="button" class="pill ${t === this.showerMin ? 'on' : ''}" onclick="Register.setShower(${t}, this)">${t ? t + '분' : '안 함'}</button>`).join('')}
                </div>
                <div class="v2-after-l">끝나고 어떻게 모여요?</div>
                <div class="v2-opts" id="r-meet-pills" style="grid-template-columns:repeat(${modes.length},1fr);">
                  ${modes.map(([k, t]) => `<button type="button" class="pill ${k === am.mode ? 'on' : ''}" onclick="Register.setAfterMode('${k}')">${t}</button>`).join('')}
                </div>
                ${am.mode !== 'asap' ? `<label class="v2-after-time"><span>${am.mode === 'lobby' ? '로비에서 만나는 시간' : '뒤풀이 장소 약속 시간'}</span><input type="time" id="r-meet-time" value="${def}" onchange="Register.setMeetTime(this.value)"></label>` : ''}
                <div class="v2-after-pv" id="r-after-pv">${this._afterPreview()}</div>`;
  },

  _refreshAfter() {
    const el = U.$('#r-after'); if (el) el.innerHTML = this._afterHTML();
  },

  /** 약속 시각 기본값: 라운딩 끝 + 샤워 (뒤풀이 장소면 이동 20분 더) */
  _defaultMeetTime(mode) {
    const t = String(this.timeH != null ? `${String(this.timeH).padStart(2, '0')}:${String(this.timeM || 0).padStart(2, '0')}` : '07:00');
    const [h, m] = t.split(':').map(Number);
    let v = h * 60 + m + (ROUND_LENGTHS[this.roundLength] || ROUND_LENGTHS['18']).min + this.showerMin + (mode === 'place' ? 20 : 0);
    v = Math.ceil(v / 10) * 10;
    return `${String(Math.floor(v / 60) % 24).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
  },

  /** 고른 대로 바로 계산한 '라운딩 끝나고' 미리보기 */
  _afterPreview() {
    if (this.timeH == null) return '티오프 시간을 고르면 끝나는 시간을 계산해 보여 드려요';
    const fake = {
      date: this.date || new Date(), teeOff: `${String(this.timeH).padStart(2, '0')}:${String(this.timeM || 0).padStart(2, '0')}`,
      prepTime: this.prep || 30, travelTime: 60, course: this.course || { name: '' }, startPoint: '집',
      hasMeal: false, roundLength: this.roundLength, showerMin: this.showerMin,
      hasPostMeal: !!(this.hasPostMeal && this.postMealRestaurant), postMealRestaurant: this.postMealRestaurant,
      afterMeet: this.afterMeet
    };
    try { State.calculateTimeline(fake); } catch (e) { return ''; }
    const tl = fake.timeline; if (!tl || !tl.roundEnd) return '';
    const parts = [`<b>${tl.roundEnd}</b> 라운딩 끝`];
    const showerDone = tl.showerShort != null ? tl.leaveCourse : tl.showerEnd;
    const sameLeave = showerDone === tl.leaveCourse && tl.afterMode !== 'lobby';
    if (tl.showerMin) parts.push(`<b>${showerDone}</b> 샤워·환복 끝${sameLeave ? '·출발' : ''}`);
    else if (tl.afterMode !== 'lobby') parts.push(`<b>${tl.leaveCourse}</b> 골프장 출발`);
    if (tl.afterMode === 'lobby') parts.push(`<b>${tl.meetTime}</b> 로비에서 만나기·출발`);
    else if (tl.showerMin && !sameLeave) parts.push(`<b>${tl.leaveCourse}</b> 골프장 출발`);
    if (tl.hasPostMeal) parts.push(`<b>${tl.postMealStart}</b> 뒤풀이${tl.afterMode === 'place' ? ' 약속' : ' 도착'}`);
    const warn = tl.showerShort != null ? `<div class="warn">⚠️ 약속 시간까지 샤워·환복 시간이 ${tl.showerShort}분뿐이에요</div>` : '';
    return parts.join(' → ') + warn;
  },

  setRoundLength(k, btn) {
    if (!ROUND_LENGTHS[k]) return;
    this.roundLength = k;
    this._refreshAfter();
    U.haptic();
  },

  setShower(t) {
    if (!SHOWER_OPTS.includes(t)) return;
    this.showerMin = t;
    try { localStorage.setItem('bp_last_shower', String(t)); } catch (e) { }
    this._refreshAfter();
    U.haptic();
  },

  setAfterMode(k) {
    this.afterMeet = { mode: k, time: k === 'asap' ? '' : this._defaultMeetTime(k) };
    this._refreshAfter();
    U.haptic();
  },

  setMeetTime(v) {
    if (!/^\d{1,2}:\d{2}$/.test(v || '')) return;
    this.afterMeet = { mode: this.afterMeet.mode, time: v };
    const pv = U.$('#r-after-pv'); if (pv) pv.innerHTML = this._afterPreview();
  },

  setPrepTime(t, btn) {
    this.prep=t; try { localStorage.setItem('bp_last_prep', String(t)); } catch (e) {}
    U.$$('#r-pills .pill').forEach(b=>b.classList.remove('on')); btn.classList.add('on');
    const first = this.sg && !this.sg.prep;
    if (this.sg) this.sg.prep = true;
    this.updateProgress(); this._refreshSharedSteps(first); U.haptic();
  },

  setStartPoint(type, btn) {
    this.startPoint = type;
    const autoSearch = !!this.sg;
    if (this.sg) this.sg.startTapped = true;
    U.$$('#r-startpoint-pills .pill').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    this.updateStartPointUI();
    U.haptic();
    // 공유받은 사람: 주소가 아직 없으면 바로 주소 검색 열기 (다음에 뭘 할지 헤매지 않게)
    if (autoSearch && this.sg && !this.sg.start) { this.searchMode = 'start'; this.searchCustomAddress(); }
  },

  updateStartPointUI() {
    const textEl = U.$('#r-startpoint-text');
    if (!textEl) return;
    let valObj = null;
    if (this.startPoint === '집') valObj = State.userAddresses?.home;
    else if (this.startPoint === '회사') valObj = State.userAddresses?.office;
    else valObj = this.customStartObj;
    const box = U.$('#r-startpoint-custom');
    const ok = !!(valObj && valObj.lat);
    if (valObj && valObj.name && ok) {
      textEl.textContent = (this.startPoint === '직접 입력' ? '출발지: ' : '저장된 주소: ') + valObj.name;
    } else {
      textEl.textContent = this.startPoint === '직접 입력' ? '출발지 주소를 검색해 주세요 ›' : `${this.startPoint} 주소를 한 번만 등록해 주세요 (출발 시간 계산에 필요해요) ›`;
    }
    if (box) box.classList.toggle('warn', !ok);
    this.updateProgress();
    if (this.sg) {
      const was = this.sg.start;
      this.sg.start = this.sg.startTapped && ok;
      this._refreshSharedSteps(!was && this.sg.start);
    }
  },

  /* ── 빠르게 채우기: 지난번처럼 · 예약 문자 ── */
  lastSchedule() {
    const list = (State.schedules || []).filter(x => x && x.course && x.course.lat);
    if (!list.length) return null;
    return list.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  },

  quickFillHTML() {
    const last = this.lastSchedule();
    const btn = 'flex:1; min-width:0; display:flex; align-items:center; gap:8px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; cursor:pointer; text-align:left;';
    return `
      <div style="display:flex; gap:8px; margin-bottom:10px;">
        ${last ? `<button type="button" style="${btn}" onclick="Register.fillFromLast()">
          <span style="font-size:18px;">↺</span>
          <span style="min-width:0;"><b style="display:block; font-size:13px; color:#0f172a;">지난번처럼</b>
          <span style="display:block; font-size:11px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${U.esc(last.course.name)}${(last.companions || []).length ? ` · 동반자 ${last.companions.length}명` : ''}</span></span>
        </button>` : ''}
        <button type="button" style="${btn}" onclick="Register.openPasteBooking()">
          <span style="font-size:18px;">📋</span>
          <span style="min-width:0;"><b style="display:block; font-size:13px; color:#0f172a;">예약 문자로 채우기</b>
          <span style="display:block; font-size:11px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">골프장·날짜·시간 자동 입력</span></span>
        </button>
      </div>`;
  },

  /** 지난 일정의 골프장·티오프·준비시간·출발지·동반자·식당을 그대로 (날짜만 새로 고르기) */
  fillFromLast() {
    const l = this.lastSchedule();
    if (!l) return;
    this.course = l.course;
    const [h, m] = String(l.teeOff || '07:00').split(':').map(Number);
    this.timeH = h; this.timeM = m;
    this.prep = l.prepTime || 30;
    this.invited = [...(l.companions || [])];
    this.startPoint = ['집', '회사'].includes(l.startPoint) ? l.startPoint : '직접 입력';
    if (this.startPoint === '직접 입력') this.customStartObj = { name: l.startAddress, lat: l.startLat, lng: l.startLng };
    this.hasMeetingPoint = !!l.hasMeetingPoint; this.meetingPointObj = l.meetingPointObj || null;
    this.hasMeal = !!l.hasMeal; this.mealDuration = l.mealDuration || 50; this.mealRestaurant = l.mealRestaurant || null;
    this.hasPostMeal = !!l.hasPostMeal; this.postMealRestaurant = l.postMealRestaurant || null;
    this.roundLength = ROUND_LENGTHS[l.roundLength] ? l.roundLength : '18';
    this.afterMeet = { mode: 'asap', time: '' };
    this.date = null;
    this.render();
    setTimeout(() => {
      this.bind();
      U.$('#r-search').value = this.course.name;
      const hint = U.$('#r-hint'); if (hint) { hint.innerHTML = `📍 ${U.esc(this.course.addr || '')}`; hint.style.color = 'var(--accent)'; }
      if (this.startPoint === '직접 입력') { const t = U.$('#r-startpoint-text'); if (t) t.textContent = l.startAddress || ''; }
      this.updateStartPointUI();
      this.updateTags();
      U.toast('지난번 일정으로 채웠어요. 날짜만 골라 주세요.');
      this.openDatePicker();
    }, 60);
  },

  openPasteBooking() {
    App.showModal('📋 예약 문자로 채우기', `
      <p style="font-size:13px; color:#64748b; margin:0 0 8px;">골프장 예약 확정 문자나 카톡을 그대로 붙여넣으세요.</p>
      <textarea id="r-paste" rows="6" style="width:100%; box-sizing:border-box; border:1px solid #e2e8f0; border-radius:10px; padding:10px; font-size:16px; line-height:1.5; resize:none;" placeholder="[레이크사이드CC] 예약 확정&#10;11/15(토) 07:12 남코스 4인"></textarea>
      <button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="Register.applyPastedBooking()">채우기</button>`);
    setTimeout(async () => {
      const ta = U.$('#r-paste'); if (!ta) return;
      ta.focus();
      // 클립보드에 예약 문자가 있으면 미리 넣어 둠 (권한이 없으면 그냥 빈 칸)
      try {
        const clip = navigator.clipboard && navigator.clipboard.readText ? await navigator.clipboard.readText() : '';
        if (clip && !ta.value) { const p = Register.parseBookingText(clip); if (p.date || p.time || p.course) ta.value = clip; }
      } catch (e) {}
    }, 120);
  },

  /** 예약 문자에서 골프장·날짜·티오프 시각 뽑기 (못 찾은 것은 null) */
  parseBookingText(text, now = new Date()) {
    const t = String(text || '').replace(/\r/g, '');
    const out = { course: null, date: null, time: null };

    // 날짜: 2026-11-15 / 2026.11.15 / 2026년 11월 15일 / 11/15 / 11.15 / 11월 15일
    let y = null, mo = null, d = null, mm;
    if ((mm = t.match(/(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/))) { y = +mm[1]; mo = +mm[2]; d = +mm[3]; }
    else if ((mm = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)) || (mm = t.match(/(?:^|[^\d:])(\d{1,2})\s*[\/.]\s*(\d{1,2})(?![\d:])/))) { mo = +mm[1]; d = +mm[2]; }
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      if (!y) {
        y = now.getFullYear();
        const cand = new Date(y, mo - 1, d);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (cand < today - 30 * 864e5) y += 1;   // 지난 날짜면 내년
      }
      const dt = new Date(y, mo - 1, d);
      if (dt.getMonth() === mo - 1) out.date = dt;
    }

    // 시각: 07:12 / 7시 12분 / 오후 1시 / 13시20분
    const re = /(오전|오후|AM|PM|am|pm)?\s*(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*분?/g;
    let best = null;
    while ((mm = re.exec(t))) {
      let h = +mm[2]; const mi = mm[3] ? +mm[3] : 0;
      if (mi > 59 || h > 23) continue;
      const ap = (mm[1] || '').toLowerCase();
      if ((ap === '오후' || ap === 'pm') && h < 12) h += 12;
      if ((ap === '오전' || ap === 'am') && h === 12) h = 0;
      if (h >= 4 && h <= 17) { best = { h, m: mi }; break; }   // 티오프로 그럴듯한 시각
      if (!best) best = { h, m: mi };
    }
    if (best) out.time = best;

    // 골프장: [○○CC] 또는 '○○ CC / 컨트리클럽 / 골프클럽 / GC / 골프장 / 골프&리조트'
    const SUF = '(?:CC|C\\.C|GC|cc|gc|컨트리\\s?클럽|골프\\s?클럽|골프장|골프\\s?[&앤]\\s?리조트|골프리조트)';
    // 골프장 이름은 여러 단어일 수 있음 (오렌지듄스 영종 골프클럽) → 접미사 앞 단어를 3개까지
    const W = '[가-힣A-Za-z0-9&]+';
    const STOP = /^(예약|확정|안내|알림|이용|이용안내|예약확정|예약안내|알림톡|도착|님|고객님)$/;
    const lines = t.split('\n').map(x => x.trim()).filter(Boolean);
    const nameRe = new RegExp('((?:' + W + '\\s+){0,2}' + W + '\\s?' + SUF + ')');
    let named = null;
    for (const ln of lines) { const m = ln.match(nameRe); if (m) { named = m[1]; break; } }
    if (named) {
      const words = named.replace(/[\[\]()]/g, ' ').split(/\s+/).filter(Boolean);
      while (words.length > 1 && STOP.test(words[0])) words.shift();
      out.course = words.join(' ').trim();
    }
    else if ((mm = t.match(/\[([^\]]{2,20})\]/))) out.course = mm[1].replace(/(예약|확정|안내|알림|골프)$/g, '').trim() || null;
    return out;
  },

  async applyPastedBooking() {
    const ta = U.$('#r-paste');
    const p = this.parseBookingText(ta ? ta.value : '');
    if (!p.course && !p.date && !p.time) { U.toast('골프장·날짜·시간을 찾지 못했어요. 문자 내용을 확인해 주세요.'); return; }
    App.closeModal();
    const filled = [];
    if (p.date) {
      this.date = p.date;
      const el = U.$('#r-date'); if (el) { el.textContent = U.fmtDateShort(p.date); el.classList.remove('is-empty'); }
      filled.push('날짜');
    }
    if (p.time) {
      this.timeH = p.time.h; this.timeM = p.time.m;
      const el = U.$('#r-time'); if (el) { el.textContent = this._hm(p.time.h, p.time.m); el.classList.remove('is-empty'); }
      filled.push('티오프');
    }
    if (p.course) {
      const input = U.$('#r-search'); if (input) input.value = p.course;
      try {
        const res = await TmapAPI.searchPlace(p.course);
        this.searchResults = res || [];
        const hit = this.bestCourseMatch(p.course, this.searchResults);
        if (hit) { this.selectCourse(hit.id); filled.push('골프장'); }
        else if (input) this.search(p.course);   // 후보 목록에서 고르게
      } catch (e) { if (input) this.search(p.course); }
    }
    this.updateProgress();
    U.toast(filled.length ? `${U.josa(filled.join('·'), '을/를')} 채웠어요. 확인해 주세요.` : '골프장 이름으로 검색했어요. 목록에서 골라 주세요.');
  },

  /** 예약 문자 속 골프장 이름과 가장 잘 맞는 검색 결과 (가장 긴 이름 조각이 들어 있어야 함, 아니면 null → 목록에서 고르게) */
  bestCourseMatch(name, results) {
    const norm = x => String(x || '').replace(/\s/g, '').toLowerCase();
    const toks = String(name || '').replace(/CC|C\.C|GC|cc|gc|컨트리\s?클럽|골프\s?클럽|골프장|골프\s?[&앤]\s?리조트|골프리조트|골프|클럽/g, ' ')
      .split(/\s+/).map(norm).filter(x => x.length >= 2);
    if (!toks.length || !results || !results.length) return null;
    const main = toks.slice().sort((a, b) => b.length - a.length)[0];
    let best = null, bestScore = 0;
    results.forEach(r => {
      const n = norm(r.place_name || r.name);
      if (!n.includes(main)) return;
      const sc = toks.filter(k => n.includes(k)).length;
      if (sc > bestScore) { best = r; bestScore = sc; }
    });
    return best;
  },

  /** 최근·자주 간 골프장 칩 (기록이 없으면 추천 골프장) */
  recentCourses() {
    const map = {};
    (State.schedules || []).forEach(x => {
      if (!x || !x.course || !x.course.lat) return;
      const k = x.course.id || x.course.name;
      const t = new Date(x.date).getTime() || 0;
      if (!map[k]) map[k] = { course: x.course, n: 0, last: 0 };
      map[k].n++; map[k].last = Math.max(map[k].last, t);
    });
    return Object.values(map).sort((a, b) => b.n - a.n || b.last - a.last).slice(0, 4).map(v => v.course);
  },

  quickCoursesHTML() {
    return `<div class="v2-chips" id="r-course-chips">${this.courseChipsInner()}</div>`;
  },

  courseChipsInner() {
    const recent = this.recentCourses();
    this._recent = recent;
    const cur = this.course ? (this.course.id || this.course.name) : null;
    if (recent.length) return recent.map((c, i) => `<button type="button" class="v2-chip ${cur && (c.id || c.name) === cur ? 'on' : ''}" onclick="Register.pickRecentCourse(${i})">${U.esc(c.name)}</button>`).join('');
    return [['남서울 CC', '남서울 CC'], ['아난티남해 CC', '아난티남해'], ['파인크리크 CC', '파인크리크'], ['해슬리 나인브릿지', '해슬리']]
      .map(([q, l]) => `<button type="button" class="v2-chip ${this.course && this.course.name && this.course.name.indexOf(l.replace(' CC', '')) >= 0 ? 'on' : ''}" onclick="U.$('#r-search').value=${U.jsq(q)}; Register.search(${U.jsq(q)});">${l}</button>`).join('');
  },

  renderCourseChips() { const w = U.$('#r-course-chips'); if (w) w.innerHTML = this.courseChipsInner(); },

  pickRecentCourse(i) {
    const c = (this._recent || [])[i]; if (!c) return;
    this.course = c;
    U.$('#r-search').value = c.name;
    const hint = U.$('#r-hint'); if (hint) { hint.innerHTML = `📍 ${U.esc(c.addr || '')}`; hint.style.color = 'var(--accent)'; }
    this.resetMealDisplay();
    this.renderCourseChips();
    this.updateProgress();
    U.haptic();
  },

  /** 골프장이 바뀌면 고른 식당을 지우고 표시도 '식당을 선택하세요'로 되돌림 */
  resetMealDisplay() {
    this.mealRestaurant = null;
    const d = U.$('#r-restaurant');
    if (d) { d.textContent = '식당을 선택하세요'; d.classList.add('is-empty'); }
  },

  searchCustomAddress() {
    if (this.sg && this.searchMode === 'start') this.sg.startTapped = true;
    let title = '📍 출발지 주소 검색';
    if (this.searchMode === 'meeting') {
      title = '🤝 집결지 주소 검색';
    } else {
      if (this.startPoint === '집') title = '🏠 집 주소 검색';
      else if (this.startPoint === '회사') title = '🏢 회사 주소 검색';
    }

    App.openAddressSearch(title, (selectedPlace) => {
      if (this.searchMode === 'meeting') {
        this.meetingPointObj = selectedPlace;
        const textEl = U.$('#r-meetingpoint-text');
        if (textEl) {
          textEl.textContent = selectedPlace.name;
          textEl.classList.remove('is-empty');
        }
      } else {
        if (this.startPoint === '집') {
          if (!State.userAddresses) State.userAddresses = { home: null, office: null };
          State.userAddresses.home = selectedPlace;
          localStorage.setItem('bp_home', JSON.stringify(selectedPlace));
        } else if (this.startPoint === '회사') {
          if (!State.userAddresses) State.userAddresses = { home: null, office: null };
          State.userAddresses.office = selectedPlace;
          localStorage.setItem('bp_office', JSON.stringify(selectedPlace));
        } else {
          this.customStartObj = selectedPlace;
        }
        this.updateStartPointUI();
      }
    });
  },

  toggleMeetingPoint() {
    this.hasMeetingPoint = !this.hasMeetingPoint;
    U.$('#meeting-toggle').classList.toggle('on', this.hasMeetingPoint);
    U.$('#meeting-body').classList.toggle('show', this.hasMeetingPoint);
    U.haptic();
  },

  toggleMeal(type) {
    if (type === 'pre') {
      this.hasMeal = !this.hasMeal;
      U.$('#meal-toggle').classList.toggle('on', this.hasMeal);
      U.$('#meal-body').classList.toggle('show', this.hasMeal);
    } else {
      this.hasPostMeal = !this.hasPostMeal;
      U.$('#postmeal-toggle').classList.toggle('on', this.hasPostMeal);
      U.$('#postmeal-body').classList.toggle('show', this.hasPostMeal);
    }
    this.updateProgress();
    U.haptic();
  },

  setMealTime(t, btn) { this.mealDuration=t; U.$$('#meal-pills .pill').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); this.updateProgress(); U.haptic(); },

  async openRestaurantPicker(type = 'pre') {
    if (!this.course || !this.course.lat) { U.toast('⚠️ 골프장을 먼저 선택해주세요'); return; }
    
    window._currentMealType = type;
    const isPost = type === 'post';
    const title = isPost ? '🍻 뒷풀이 식당 선택' : '🍽️ 라운딩 전 식당 선택';
    const radius = isPost ? 10 : 5; // 뒷풀이는 10km
    
    // 모달을 띄우되, 로딩 상태로 먼저 보여줍니다.
    App.showModal(title, '<div style="padding:var(--sp-4); text-align:center;">주변 맛집을 검색 중입니다...</div>');
    
    const rests = await TmapAPI.searchNearbyPlaces(this.course.lat, this.course.lng, '맛집', radius);
    // 골프장에서 가까운 순으로 정렬
    const sorted = (rests || []).sort((a, b) => parseFloat(a.distance || 999) - parseFloat(b.distance || 999));
    window._nearbyRestsAll = sorted;
    const hasPicks = (GOLFER_PICKS[(this.course && this.course.region) || ''] || []).length > 0;
    Register.renderRestaurantModalList(title, hasPicks ? '골퍼추천' : '');
  },
  
  
  renderRestaurantModalList(title, filterKeyword = '') {
    const isGolferPick = filterKeyword === '골퍼추천';
    
    // ── 필터 바 (⛳ 골퍼추천 탭 최상단) ──
    const filters = ['⛳ 골퍼추천', '전체', '해장/국밥', '고기/구이', '한식', '중식'];
    const filterHtml = `
      <div style="display:flex; overflow-x:auto; gap:var(--sp-2); padding-bottom:var(--sp-3); margin-bottom:var(--sp-2); border-bottom:1px solid var(--border); scrollbar-width:none;">
        ${filters.map(f => {
          const key = f === '⛳ 골퍼추천' ? '골퍼추천' : (f === '전체' ? '' : f);
          const isOn = filterKeyword === key || (f === '⛳ 골퍼추천' && isGolferPick) || (f === '전체' && !filterKeyword && !isGolferPick);
          const style = f === '⛳ 골퍼추천' 
            ? `flex-shrink:0; padding:6px 12px; font-size:var(--text-sm); ${isOn ? 'background:linear-gradient(135deg,#22c987,#0c5c3f); color:#fff; border-color:transparent;' : 'border:1px solid #22c987; color:#22c987;'}`
            : `flex-shrink:0; padding:6px 12px; font-size:var(--text-sm);`;
          return `<button class="pill ${isOn?'on':''}" style="${style}" onclick="Register.renderRestaurantModalList('${title}', '${key}')">${f}</button>`;
        }).join('')}
      </div>
      <div class="list-item" style="cursor:pointer; background:var(--bg); border:1px solid var(--border); margin-bottom:var(--sp-3); display:flex; align-items:center; gap:var(--sp-2); padding:12px; border-radius:var(--r-md);" onclick="Register.searchCustomRestaurant()">
        <span style="font-size:1.2rem;">🔍</span>
        <div>
          <div style="color:var(--primary-600); font-weight:bold; font-size:var(--fs-md);">식당 이름 직접 검색하기</div>
          <div style="font-size:var(--text-sm); color:var(--text-400);">원하는 식당이 없다면 직접 찾아보세요</div>
        </div>
      </div>
    `;

    let itemsHtml = '';

    // ── 골퍼추천 탭 선택 시 ──
    if (isGolferPick) {
      const region = Register.course?.region || '';
      const picks = GOLFER_PICKS[region] || [];
      
      if (picks.length === 0) {
        itemsHtml += `<div style="padding:var(--sp-4); text-align:center; color:var(--text-400);">이 지역(${region})의 골퍼 추천 맛집은 준비 중입니다.<br>직접 검색을 이용해주세요!</div>`;
      } else {
        itemsHtml += picks.map((p, i) => {
          const regionQuery = (p.address_name || '').split(' ').slice(0, 2).join(' ');
          const reviewUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent((p.place_name) + ' ' + regionQuery)}`;
          const rv = ReviewStore.getReviews(p.place_name);
          const rvHtml = rv.count > 0 ? `<div style="margin-top:2px;">${ReviewStore.renderStars(rv.avgRating, rv.count)}</div>` : '<div style="font-size:0.7rem; color:var(--text-500); margin-top:2px;">아직 평가 없음</div>';
          return `
          <div class="modal-item" style="display:flex; align-items:flex-start; gap:var(--sp-3); padding:var(--sp-3); border:1px solid var(--border); border-radius:var(--r-md); margin-bottom:var(--sp-2); background:linear-gradient(135deg, #f0fdf4, #ffffff);">
            <div style="flex:1;" onclick="Register.selectGolferPick(${i})">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-weight:bold; font-size:var(--fs-md);">${p.place_name}</span>
                <span style="font-size:0.65rem; padding:2px 6px; border-radius:10px; background:linear-gradient(135deg,#22c987,#0c5c3f); color:#fff; white-space:nowrap;">${p.tag}</span>
              </div>
              <div style="font-size:var(--text-sm); color:var(--text-300); margin-bottom:2px;">${p.desc}</div>
              ${rvHtml}
              <div class="modal-item-sub">${p.category} · ${p.tel || '전화번호 없음'}</div>
            </div>
            <button type="button" onclick="window.open(${U.jsq(reviewUrl)}, '_blank')" style="padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:var(--text-sm); color:var(--text-600); background:transparent; cursor:pointer; white-space:nowrap; margin-top:4px;">★ 리뷰보기</button>
          </div>
        `}).join('');
      }
      
    } else {
      // ── 기존 TMAP 검색 결과 (전체 / 카테고리 필터) ──
      let rests = window._nearbyRestsAll || [];
      
      if (filterKeyword) {
        const kw = filterKeyword.toLowerCase();
        rests = rests.filter(r => {
          const cat = r.category ? r.category.toLowerCase() : '';
          const name = r.place_name ? r.place_name.toLowerCase() : '';
          if (kw === '해장/국밥') return cat.includes('국밥') || cat.includes('해장') || name.includes('국밥') || name.includes('해장');
          if (kw === '고기/구이') return cat.includes('고기') || cat.includes('구이') || cat.includes('육류') || name.includes('고기') || name.includes('구이') || name.includes('가든');
          if (kw === '중식') return cat.includes('중식') || cat.includes('중국') || name.includes('반점') || name.includes('각');
          if (kw === '한식') return cat.includes('한식');
          return true;
        });
      }

      if (!rests || rests.length === 0) {
        itemsHtml += `<div style="padding:var(--sp-4); text-align:center; color:var(--text-400);">해당 조건의 식당이 없습니다. 직접 검색을 이용해주세요.</div>`;
      } else {
        itemsHtml += rests.map((r, i) => {
          const regionQuery = (r.address_name || '').split(' ').slice(0, 2).join(' ');
          const reviewUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent((r.place_name || r.name) + ' ' + regionQuery)}`;
          return `
          <div class="modal-item" style="display:flex; align-items:center; gap:var(--sp-3);">
            <div style="flex:1;" onclick="Register.selectRestaurant(${i}, ${U.jsq(r.id)})">
              <div class="modal-item-text" style="font-weight:bold;">${U.esc(r.place_name || r.name)} <span style="font-size:0.75rem; font-weight:normal; color:var(--text-400); margin-left:4px;">${U.esc(r.category || '')}</span></div>
              <div class="modal-item-sub">${r.distance ? parseFloat(r.distance).toFixed(1) + 'km' : ''} · ${U.esc(r.tel || '전화번호 없음')}</div>
            </div>
            <button type="button" onclick="window.open(${U.jsq(reviewUrl)}, '_blank')" style="padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:var(--text-sm); color:var(--text-600); background:transparent; cursor:pointer; white-space:nowrap;">★ 리뷰보기</button>
          </div>
        `}).join('');
      }
    }
    
    const modalList = U.$('#app-modal .modal-list');
    if (modalList) {
      modalList.innerHTML = filterHtml + itemsHtml;
      modalList.scrollTop = 0;
    }
  },

  selectGolferPick(idx) {
    const region = Register.course?.region || '';
    const picks = GOLFER_PICKS[region] || [];
    const p = picks[idx];
    if (!p) return;
    
    const isPost = window._currentMealType === 'post';
    const restObj = {
      name: p.place_name,
      tel: p.tel,
      lat: Register.course?.lat || 0,
      lng: Register.course?.lng || 0
    };
    
    if (isPost) {
      this.postMealRestaurant = restObj;
      const display = U.$('#r-post-restaurant');
      display.textContent = restObj.name; 
      display.classList.remove('is-empty', 'empty');
      setTimeout(() => this.updateProgress(), 0);
    } else {
      this.mealRestaurant = restObj;
      const display = U.$('#r-restaurant');
      display.textContent = restObj.name; 
      display.classList.remove('is-empty', 'empty');
    }
    
    App.closeModal(); 
    U.toast(`${isPost?'🍻':'⛳'} ${restObj.name} 선택 완료`); 
    U.haptic();
  },

  searchCustomRestaurant() {
    const isPost = window._currentMealType === 'post';
    App.openAddressSearch('🔍 식당 직접 검색', (selectedPlace) => {
      const restObj = {
        name: selectedPlace.name || selectedPlace.place_name,
        lat: selectedPlace.lat || selectedPlace.y,
        lng: selectedPlace.lng || selectedPlace.x
      };
      
      if (isPost) {
        this.postMealRestaurant = restObj;
        const display = U.$('#r-post-restaurant');
        display.textContent = this.postMealRestaurant.name; 
        display.classList.remove('is-empty', 'empty');
        setTimeout(() => this.updateProgress(), 0);
      } else {
        this.mealRestaurant = restObj;
        const display = U.$('#r-restaurant');
        display.textContent = this.mealRestaurant.name; 
        display.classList.remove('is-empty', 'empty');
      }
      
      App.closeModal(); 
      U.toast(`${isPost?'🍻':'🍽️'} ${restObj.name} 선택 완료`); 
      U.haptic();
    });
  },

  selectRestaurant(idx, idStr) {
    let rests = window._nearbyRestsAll || [];
    const r = rests.find(x => String(x.id) === String(idStr));
    if (!r) return;
    
    const isPost = window._currentMealType === 'post';
    const restObj = {
      name: r.place_name || r.name,
      tel: r.tel,
      lat: r.y || r.lat,
      lng: r.x || r.lng
    };
    
    if (isPost) {
      this.postMealRestaurant = restObj;
      const display = U.$('#r-post-restaurant');
      display.textContent = this.postMealRestaurant.name; 
      display.classList.remove('is-empty', 'empty');
      setTimeout(() => this.updateProgress(), 0);
    } else {
      this.mealRestaurant = restObj;
      const display = U.$('#r-restaurant');
      display.textContent = this.mealRestaurant.name; 
      display.classList.remove('is-empty', 'empty');
    }
    
    App.closeModal(); 
    U.toast(`${isPost?'🍻':'🍽️'} ${restObj.name} 선택 완료`); 
    U.haptic();
  },

  openCompanionModal() {
    // 카카오톡 친구 목록은 아직 연결 전 → 예시 이름을 보여 주지 않음
    if (!this._friendsReady) { U.toast('카카오톡 친구 불러오기는 준비 중이에요. 동반자는 단체등록으로 초대해 주세요.', 3500); return; }
    let items = `
      <div style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; margin: -24px -24px 16px -24px; position: sticky; top: -24px; background: white; z-index: 10;">
        <div style="font-size: 16px; font-weight: 700; text-align: center;">카카오톡 친구 선택</div>
        <div style="position: absolute; right: 16px; top: 12px; cursor: pointer;" onclick="App.closeModal()">✕</div>
      </div>
      <div style="margin-bottom: 12px; position: relative;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" style="position: absolute; left: 12px; top: 10px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="companion-search" placeholder="이름(초성), 전화번호 검색" onkeyup="Register.filterCompanions(this.value)" style="width: 100%; background: #f5f5f5; border: none; border-radius: 6px; padding: 8px 12px 8px 36px; color: #333; font-size: 16px; outline: none;">
      </div>
      <div style="font-size: 12px; color: #888; margin-bottom: 8px; font-weight: 600;">친구 ${COMPANIONS.length}</div>
      <div id="companion-list-container" style="max-height: 50vh; overflow-y: auto; margin: 0 -8px; padding: 0 8px;">
        ${this.renderCompanionItems(COMPANIONS)}
      </div>
      <button style="margin-top: 16px; width: 100%; padding: 14px; border-radius: 8px; background: #FEE500; color: #191919; font-weight: 700; font-size: 16px; border: none; cursor: pointer; box-shadow: 0 2px 8px rgba(254, 229, 0, 0.3);" onclick="App.closeModal();Register.updateTags()">확인</button>
    `;
    
    App.showModal('', items);
  },

  renderCompanionItems(list) {
    if (list.length === 0) {
      return `<div style="text-align:center; padding: 20px; color: #999; font-size: 14px;">검색 결과가 없습니다.</div>`;
    }
    return list.map(c => {
      const sel = this.invited.find(x => x.id === c.id);
      return `<div style="display: flex; align-items: center; padding: 10px 8px; cursor: pointer; border-radius: 8px; transition: background 0.2s;" onclick="Register.toggleCompanion(${c.id}, this)">
        <div style="width: 44px; height: 44px; border-radius: 18px; background: ${c.color}; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 12px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);">${c.emoji}</div>
        <div style="flex: 1; font-size: 15px; font-weight: 500; color: #111;">${c.name}</div>
        <div class="check-circle" style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${sel ? '#FEE500' : '#ddd'}; background: ${sel ? '#FEE500' : 'transparent'}; display: flex; align-items: center; justify-content: center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${sel ? '#000' : 'transparent'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      </div>`;
    }).join('');
  },

  filterCompanions(query) {
    const q = query.trim().toLowerCase();
    const filtered = COMPANIONS.filter(c => c.name.toLowerCase().includes(q));
    const container = document.getElementById('companion-list-container');
    if (container) {
      container.innerHTML = this.renderCompanionItems(filtered);
    }
  },

  toggleCompanion(id, el) {
    const i = this.invited.findIndex(x => x.id === id);
    const checkCircle = el.querySelector('.check-circle');
    const checkIcon = checkCircle.querySelector('svg');
    if (i === -1) { 
      const c = COMPANIONS.find(x => x.id === id); 
      if(c) this.invited.push(c); 
      checkCircle.style.borderColor = '#FEE500';
      checkCircle.style.background = '#FEE500';
      checkIcon.setAttribute('stroke', '#000');
    } else { 
      this.invited.splice(i, 1); 
      checkCircle.style.borderColor = '#ddd';
      checkCircle.style.background = 'transparent';
      checkIcon.setAttribute('stroke', 'transparent');
    }
    U.haptic();
  },

  updateTags() {
    const c = U.$('#r-tags'); if(!c)return;
    c.innerHTML = this.invited.map(x=>`<div class="invite-tag">${x.emoji} ${x.name} <span class="x" onclick="Register.removeInvite(${x.id})">✕</span></div>`).join('');
    const btn = U.$('#r-invite');
    if(btn) btn.textContent = this.invited.length ? `동반자 ${this.invited.length}명 선택됨` : '카카오톡으로 동반자 초대';
  },

  removeInvite(id) { this.invited=this.invited.filter(c=>c.id!==id); this.updateTags(); U.haptic(); },

  /**
   * 길찾기(TMAP)를 못 받았을 때 쓰는 어림 이동 시간(분).
   * 직선거리 × 1.4(도로가 돌아가는 정도) → 거리별 평균 속도로 나눔 + 출발·주차 5분.
   * 예: 시흥 → 동두천 직선 약 65km → 도로 약 94km → 약 92분 (실제 TMAP 1시간 35분)
   */
  estimateDriveMin(x1, y1, x2, y2) {
    const lat1 = Number(y1), lng1 = Number(x1), lat2 = Number(y2), lng2 = Number(x2);
    if (![lat1, lng1, lat2, lng2].every(isFinite)) return 60;
    const R = 6371, rad = d => d * Math.PI / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    const km = 2 * R * Math.asin(Math.sqrt(a));
    const road = km * (km > 100 ? 1.25 : 1.4) + 2;        // 먼 길일수록 고속도로라 덜 돌아감
    const speed = road < 15 ? 30 : road < 50 ? 50 : road < 150 ? 65 : 85;   // 시내 / 근교 / 수도권 외곽 / 장거리 고속도로
    return Math.max(10, Math.round(road / speed * 60 + 5));
  },

  async createPlan() {
    if (!this.course) { U.toast('⚠️ 골프장을 선택해주세요'); return; }
    if (!this.date) { U.toast('⚠️ 날짜를 선택해주세요'); return; }
    if (this.timeH === null || this.timeM === null) { U.toast('⚠️ 시간을 선택해주세요'); return; }
    if (this.sg) {
      const st = this._sharedStep();
      const msg = { start: '① 출발지를 골라 주세요', prep: '② 준비 시간을 골라 주세요', route: '③ 먼저 갈 곳을 골라 주세요' }[st];
      if (msg) { U.toast(msg); this._refreshSharedSteps(true); return; }
    }
    if (this.hasMeal && !this.mealRestaurant) { U.toast('⚠️ 식당을 선택하거나 식사를 끄세요'); return; }
    if (this.hasPostMeal && !this.postMealRestaurant) { U.toast('⚠️ 뒷풀이 식당을 선택하거나 기능을 끄세요'); return; }
    // 무료 회원 일정 개수 제한 (수정은 제외)
    if (this.editIdx === null && !Billing.guardScheduleLimit()) return;

    const btn = U.$('#r-submit');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="dots"><span></span><span></span><span></span></span>'; btn.disabled = true;

    const teeOff = `${String(this.timeH).padStart(2,'0')}:${String(this.timeM).padStart(2,'0')}`;
    let finalStartPoint = this.startPoint;
    // 등록된 출발지 객체 가져오기
    let valObj = null;
    if (this.startPoint === '집') valObj = State.userAddresses?.home;
    else if (this.startPoint === '회사') valObj = State.userAddresses?.office;
    else valObj = this.customStartObj;
    
    if (!valObj || !valObj.lat) {
      U.toast(this.startPoint === '직접 입력' ? '⚠️ 출발지 주소를 검색해 주세요.' : `⚠️ ${this.startPoint} 주소를 먼저 등록해 주세요.`);
      btn.innerHTML = originalText; btn.disabled = false;
      this.updateStartPointUI();
      this.searchMode = 'start';
      this.searchCustomAddress();
      return;
    }

    if (this.startPoint === '직접 입력') {
      finalStartPoint = valObj.name;
    }

    // TMAP 도착 목표 시간 기반 예측 경로 소요 시간 계산
    let travelTime = 60; // 총 이동 관련 소요 시간 (집결지 대기 포함)
    let estimated = false; // 길찾기를 못 받아 기본값으로 잡은 구간이 있는지
    let travelToRest = 0; // 출발지(또는 집결지) -> 식당 소요시간
    let travelToMeeting = 0; // 출발지 -> 집결지 소요시간
    let restTravelDur = 0; // 식당 -> 골프장 소요시간
    let startLat = valObj.lat;
    let startLng = valObj.lng;

    // 목표 골프장 도착 시간: 식사 유무에 따라 30분 또는 40분
    const mannerTime = (this.hasMeal && this.mealRestaurant) ? 30 : 40;
    const d = new Date(this.date);
    d.setHours(this.timeH, this.timeM, 0, 0);
    const arrivalTime = new Date(d.getTime() - mannerTime * 60000);  

    try {
      if (this.hasMeal && this.mealRestaurant) {
        // 식당 → 골프장: 실제 길찾기로 계산 (실패하면 거리로 어림). 늘 15분으로 잡던 것 고침
        restTravelDur = null;
        const R = this.mealRestaurant, C = this.course;
        const near = R && C && Math.abs(Number(R.lat) - Number(C.lat)) < 1e-6 && Math.abs(Number(R.lng) - Number(C.lng)) < 1e-6;
        if (R && C && R.lat && C.lat && !near) {
          try { restTravelDur = await TmapAPI.getRouteTime(R.lng, R.lat, C.lng, C.lat); } catch (e) { restTravelDur = null; }
          if (!restTravelDur) { estimated = true; restTravelDur = this.estimateDriveMin(R.lng, R.lat, C.lng, C.lat); }
        }
        if (!restTravelDur) restTravelDur = R.distMin || 15;
        this.mealRestaurant.distMin = restTravelDur;
        const restArrivalTime = new Date(arrivalTime.getTime() - restTravelDur * 60000 - this.mealDuration * 60000);

        if (this.hasMeetingPoint && this.meetingPointObj) {
          // 집결지 -> 식당
          const meetLat = this.meetingPointObj.lat;
          const meetLng = this.meetingPointObj.lng;
          let rtMeetToRest = await TmapAPI.getPredictiveRouteTime(meetLng, meetLat, this.mealRestaurant.lng, this.mealRestaurant.lat, restArrivalTime.toISOString(), "W02");
          if (!rtMeetToRest) rtMeetToRest = await TmapAPI.getRouteTime(meetLng, meetLat, this.mealRestaurant.lng, this.mealRestaurant.lat) || (estimated = true, this.estimateDriveMin(meetLng, meetLat, this.mealRestaurant.lng, this.mealRestaurant.lat));
          travelToRest = rtMeetToRest;

          const meetWaitTime = 10;
          const meetArrivalTime = new Date(restArrivalTime.getTime() - travelToRest * 60000 - meetWaitTime * 60000);

          // 출발지 -> 집결지
          let rtStartToMeet = await TmapAPI.getPredictiveRouteTime(startLng, startLat, meetLng, meetLat, meetArrivalTime.toISOString(), "W02");
          if (!rtStartToMeet) rtStartToMeet = await TmapAPI.getRouteTime(startLng, startLat, meetLng, meetLat) || (estimated = true, this.estimateDriveMin(startLng, startLat, meetLng, meetLat));
          travelToMeeting = rtStartToMeet;

          travelTime = travelToMeeting + meetWaitTime + travelToRest + restTravelDur;
        } else {
          // 출발지 -> 식당
          let rt = await TmapAPI.getPredictiveRouteTime(startLng, startLat, this.mealRestaurant.lng, this.mealRestaurant.lat, restArrivalTime.toISOString(), "W02");
          if (!rt) rt = await TmapAPI.getRouteTime(startLng, startLat, this.mealRestaurant.lng, this.mealRestaurant.lat) || (estimated = true, this.estimateDriveMin(startLng, startLat, this.mealRestaurant.lng, this.mealRestaurant.lat));
          travelToRest = rt;
          travelTime = travelToRest + restTravelDur;
        }
      } else {
        // 식사 없음
        if (this.hasMeetingPoint && this.meetingPointObj) {
          // 집결지 -> 골프장
          const meetLat = this.meetingPointObj.lat;
          const meetLng = this.meetingPointObj.lng;
          let rtMeetToGolf = await TmapAPI.getPredictiveRouteTime(meetLng, meetLat, this.course.lng, this.course.lat, arrivalTime.toISOString(), "W02");
          if (!rtMeetToGolf) rtMeetToGolf = await TmapAPI.getRouteTime(meetLng, meetLat, this.course.lng, this.course.lat) || (estimated = true, this.estimateDriveMin(meetLng, meetLat, this.course.lng, this.course.lat));
          
          const meetWaitTime = 10;
          const meetArrivalTime = new Date(arrivalTime.getTime() - rtMeetToGolf * 60000 - meetWaitTime * 60000);

          // 출발지 -> 집결지
          let rtStartToMeet = await TmapAPI.getPredictiveRouteTime(startLng, startLat, meetLng, meetLat, meetArrivalTime.toISOString(), "W02");
          if (!rtStartToMeet) rtStartToMeet = await TmapAPI.getRouteTime(startLng, startLat, meetLng, meetLat) || (estimated = true, this.estimateDriveMin(startLng, startLat, meetLng, meetLat));
          travelToMeeting = rtStartToMeet;

          travelTime = travelToMeeting + meetWaitTime + rtMeetToGolf;
        } else {
          // 출발지 -> 골프장
          let rt = await TmapAPI.getPredictiveRouteTime(startLng, startLat, this.course.lng, this.course.lat, arrivalTime.toISOString(), "W02");
          if (!rt) rt = await TmapAPI.getRouteTime(startLng, startLat, this.course.lng, this.course.lat) || (estimated = true, this.estimateDriveMin(startLng, startLat, this.course.lng, this.course.lat));
          travelTime = rt;
        }
      }
    } catch (e) {
      console.error("TMAP 연동 중 에러 발생:", e);
      estimated = true;
      travelTime = this.estimateDriveMin(startLng, startLat, this.course.lng, this.course.lat);
      U.toast('⚠️ 예측 경로 탐색 오류. 기본 소요시간으로 계산됩니다.');
    }

    const schedData = {
      course: this.course,
      date: this.date,
      teeOff,
      prepTime: this.prep,
      companions: [...this.invited],
      travelTime,
      hasMeal: this.hasMeal,
      mealDuration: this.mealDuration,
      mealRestaurant: this.mealRestaurant,
      hasPostMeal: this.hasPostMeal,
      postMealRestaurant: this.postMealRestaurant,
      travelToRestaurant: travelToRest,
      startPoint: finalStartPoint,
      startAddress: valObj.name,
      startLat,
      startLng,
      hasMeetingPoint: this.hasMeetingPoint,
      meetingPointObj: this.meetingPointObj,
      travelToMeeting,
      groupCode: this.groupCode || null,
      roundLength: this.roundLength || '18',
      showerMin: this.showerMin,
      afterMeet: this.afterMeet && this.afterMeet.mode !== 'asap' && this.afterMeet.time ? { mode: this.afterMeet.mode, time: this.afterMeet.time } : { mode: 'asap', time: '' },
      routeEstimated: estimated
    };

    if (this.editIdx !== null) {
      const prev = State.schedules[this.editIdx];
      // 이전 시각으로 걸린 알람(앱 켤 때 자동 예약분 포함)을 먼저 지움 → 수정 후 한 번만 울림
      if (typeof Timeline !== 'undefined' && Timeline.clearSchedAlarms) Timeline.clearSchedAlarms(prev, true);
      State.updateSchedule(this.editIdx, schedData);
      if (State.saveFailed) { State.schedules[this.editIdx] = prev; try { Timeline.autoScheduleAllAlarms(); } catch (e) {} btn.innerHTML = originalText; btn.disabled = false; return; }
      U.toast('✅ 스마트 플랜이 수정되었습니다!');
      const idx = this.editIdx;
      this.editIdx = null;
      btn.innerHTML = originalText; btn.disabled = false;
      App.viewTimeline(idx);
      Timeline.alarmOn();
      App.showInterstitialAd();
    } else {
      State.addSchedule(schedData);
      if (State.saveFailed) { State.schedules.pop(); btn.innerHTML = originalText; btn.disabled = false; return; }
      U.toast('✅ 스마트 플랜이 생성되었습니다!');
      btn.innerHTML = originalText; btn.disabled = false;
      const fromShare = !!this.shared;
      this.shared = null;
      App.viewTimeline(State.schedules.length - 1);
      Timeline.alarmOn();
      // 공유받은 일정을 웹에서 저장 → 앱 설치 / 홈 화면 추가 안내 (광고 대신)
      if (fromShare && !U.isNativeApp() && typeof HomeAdd !== 'undefined') setTimeout(() => HomeAdd.offer(State.schedules.length - 1), 700);
      else App.showInterstitialAd();
    }
  }
};
