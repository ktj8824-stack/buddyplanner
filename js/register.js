/* =========================================
   BuddyPlanner v2 — Register Screen
   ========================================= */

/* 화면 아이콘 (이모지 대신 메인 화면과 같은 선 아이콘) */
const RI = (d, size = 16) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const REG_ICON = {
  flag:     '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  timer:    '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9.5 2.5h5"/>',
  car:      '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  pin:      '<path d="M12 21s-7-7.75-7-12a7 7 0 0 1 14 0c0 4.25-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  meet:     '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6"/><circle cx="17" cy="10" r="2.5"/><path d="M13 20c0-2.8 1.8-5 4-5s4 2.2 4 5"/>',
  meal:     '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2 1-3 3.5-3 7h3"/>',
  cheers:   '<path d="M7 3h5l-.5 7a2 2 0 0 1-4 0z"/><path d="M9.5 12v6M7 21h5"/><path d="M15 6h5l-.5 6a2 2 0 0 1-4 0z"/><path d="M17.5 14v4M15.5 21h4"/>',
  users:    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 13.8c2 .8 3.5 3 3.5 6.2"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  home:     '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  office:   '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
};
const regTitleIcon = (k) => `<span class="reg-ico">${RI(REG_ICON[k], 15)}</span>`;

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

  getStartPointValue() {
    if (!State.userAddresses) State.userAddresses = { home: '', office: '' };
    if (this.startPoint === '집') return State.userAddresses.home;
    if (this.startPoint === '회사') return State.userAddresses.office;
    return '';
  },

  reset() {
    this.editIdx = null;
    this.searchTimer = null;
    this.course = null;
    this.date = window._selectedDateForRegister || null;
    window._selectedDateForRegister = null;
    this.timeH = null; this.timeM = null;
    this.prep = 30;
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
  },

  edit(idx) {
    const s = State.schedules[idx];
    if (!s) return;
    this.editIdx = idx;
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
    this.hasMeetingPoint = s.hasMeetingPoint || false;
    this.meetingPointObj = s.meetingPointObj || null;
    
    if (s.startPoint === '직접 입력' && s.startAddress) {
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
      if (hint) { hint.innerHTML = `<span style="display:inline-flex;vertical-align:-2px;margin-right:3px;">${RI(REG_ICON.pin, 13)}</span>${U.esc(course.addr || '')}`; hint.style.color = 'var(--accent)'; }
    }
    if (date && !isNaN(date.getTime())) {
      this.date = date;
      const el = U.$('#r-date');
      if (el) { el.textContent = U.fmtDate(date); el.classList.remove('is-empty'); }
    }
    if (Number.isFinite(h) && Number.isFinite(m)) {
      this.timeH = h; this.timeM = m;
      const t = U.$('#r-time');
      if (t) { t.textContent = U.fmtTimeKo(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`); t.classList.remove('is-empty'); }
    }
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
      if (this.editIdx !== null) {
        if (this.course) {
          U.$('#r-search').value = this.course.name;
          const hint = U.$('#r-hint');
          if(hint) {
            hint.innerHTML = `<span style="display:inline-flex;vertical-align:-2px;margin-right:3px;">${RI(REG_ICON.pin, 13)}</span>${U.esc(this.course.addr)}`;
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

  render() {
    const el = U.$('#screen-register');
    const isEdit = this.editIdx !== null;
    el.innerHTML = `
      <div class="header" style="height:52px; padding:0 var(--sp-4); background:#ffffff; border-bottom:1px solid #f1f5f9; box-shadow:none;">
        <button class="header-btn" onclick="Register.editIdx=null; App.navigate('calendar')" aria-label="뒤로가기">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 class="header-title" style="font-size:17px; font-weight:800; color:var(--text-100); letter-spacing:-0.4px;">${isEdit ? '라운딩 일정 수정' : '새 라운딩 등록'}</h1>
        <div class="header-btn" style="visibility:hidden; width:22px;"></div>
      </div>

      <div class="screen-scroll" style="padding-top: 0; background: #f8fafc;">
        <div class="reg-content">
          <div class="reg-form">
            
            <!-- 1. Golf Course Selection Card -->
            <div class="reg-card">
              <div class="reg-card-title">
                ${regTitleIcon('flag')} 골프장 선택 <span class="req" style="color:#ef4444;">*</span>
              </div>
              <div class="search-wrap">
                <div class="field-input">
                  <input type="text" id="r-search" placeholder="골프장 이름을 검색하세요" autocomplete="off"/>
                  <span class="fi-icon">${RI(REG_ICON.search, 17)}</span>
                </div>
                <div class="search-drop" id="r-results"></div>
              </div>
              <p class="field-hint" id="r-hint" style="margin-top:6px; font-size:11.5px;"></p>
              
              <!-- Quick Course Recommendation Chips -->
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                <span style="font-size:11px; color:#64748b; font-weight:700; width:100%; margin-bottom:2px;">추천 골프장:</span>
                <span onclick="U.$('#r-search').value='남서울 CC'; Register.onSearch('남서울 CC');" style="font-size:11px; font-weight:700; color:#007aff; background:rgba(0,122,255,0.08); border:1px solid rgba(0,122,255,0.2); padding:3px 9px; border-radius:6px; cursor:pointer;">남서울 CC</span>
                <span onclick="U.$('#r-search').value='아난티남해 CC'; Register.onSearch('아난티남해 CC');" style="font-size:11px; font-weight:700; color:#007aff; background:rgba(0,122,255,0.08); border:1px solid rgba(0,122,255,0.2); padding:3px 9px; border-radius:6px; cursor:pointer;">아난티남해</span>
                <span onclick="U.$('#r-search').value='파인크리크 CC'; Register.onSearch('파인크리크 CC');" style="font-size:11px; font-weight:700; color:#007aff; background:rgba(0,122,255,0.08); border:1px solid rgba(0,122,255,0.2); padding:3px 9px; border-radius:6px; cursor:pointer;">파인크리크</span>
                <span onclick="U.$('#r-search').value='해슬리 나인브릿지'; Register.onSearch('해슬리 나인브릿지');" style="font-size:11px; font-weight:700; color:#007aff; background:rgba(0,122,255,0.08); border:1px solid rgba(0,122,255,0.2); padding:3px 9px; border-radius:6px; cursor:pointer;">해슬리</span>
              </div>
            </div>

            <!-- 2. Date & Time Dual Pickers Card -->
            <div class="reg-card">
              <div class="reg-card-title">
                ${regTitleIcon('calendar')} 라운딩 일시 & 티오프 <span class="req" style="color:#ef4444;">*</span>
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                <div>
                  <label style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:4px; display:block;">날짜</label>
                  <button class="picker-btn picker-date" onclick="Register.openDatePicker()">
                    <span class="picker-val is-empty" id="r-date">날짜 선택</span>
                    <span class="picker-ico">${RI(REG_ICON.calendar)}</span>
                  </button>
                </div>
                <div>
                  <label style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:4px; display:block;">티오프 시간</label>
                  <button class="picker-btn picker-time" onclick="Register.openTimePicker()">
                    <span class="picker-val ${this.timeH === null ? 'is-empty' : ''}" id="r-time">${this.timeH === null ? '시간 선택' : U.fmtTimeKo(String(this.timeH).padStart(2,'0')+':'+String(this.timeM).padStart(2,'0'))}</span>
                    <span class="picker-ico">${RI(REG_ICON.clock)}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 3. Prep Time Card -->
            <div class="reg-card">
              <div class="reg-card-title">
                ${regTitleIcon('timer')} 나의 외출 준비 시간 <span class="req" style="color:#ef4444;">*</span>
              </div>
              <div class="pills" id="r-pills">
                ${PREP_OPTIONS.map(t => `<button class="pill ${t===this.prep?'on':''}" data-t="${t}" onclick="Register.setPrepTime(${t},this)">${t}분</button>`).join('')}
              </div>
              <p class="field-hint" style="margin-top:6px; font-size:11px; color:#94a3b8;">샤워, 골프백 챙기기 등 집에서 출발 전 소요 시간</p>
            </div>

            <!-- 4. Start Point Card -->
            <div class="reg-card">
              <div class="reg-card-title">
                ${regTitleIcon('car')} 출발지 설정 <span class="req" style="color:#ef4444;">*</span>
              </div>
              <div class="pills" id="r-startpoint-pills">
                <button type="button" class="pill ${this.startPoint==='집'?'on':''}" onclick="Register.setStartPoint('집',this)">${RI(REG_ICON.home, 14)} 집</button>
                <button type="button" class="pill ${this.startPoint==='회사'?'on':''}" onclick="Register.setStartPoint('회사',this)">${RI(REG_ICON.office, 14)} 회사</button>
                <button type="button" class="pill ${this.startPoint==='직접 입력'?'on':''}" onclick="Register.setStartPoint('직접 입력',this)">${RI(REG_ICON.pin, 14)} 직접 입력</button>
              </div>
              <div class="field-input" id="r-startpoint-custom-wrap" style="display:flex;margin-top:8px; height:40px;">
                <div id="r-startpoint-custom" class="address-input" style="flex:1; display:flex; align-items:center; justify-content:space-between; cursor:pointer; background:#f8fafc; border:1px solid #e2e8f0; padding:6px 12px; border-radius:8px;" onclick="Register.searchMode='start';Register.searchCustomAddress()">
                  <span id="r-startpoint-text" style="color:#64748b; font-size:12.5px;">출발지 주소를 검색하세요</span>
                  <span style="color:#94a3b8; display:inline-flex;">${RI(REG_ICON.search, 16)}</span>
                </div>
              </div>
            </div>

            <!-- 5. Meeting Point Toggle -->
            <div class="meal-section">
              <div class="meal-header">
                <span class="meal-title">${regTitleIcon('meet')} 동반자 픽업 / 집결지</span>
                <div class="toggle ${this.hasMeetingPoint?'on':''}" id="meeting-toggle" onclick="Register.toggleMeetingPoint()"></div>
              </div>
              <div class="meal-body ${this.hasMeetingPoint?'show':''}" id="meeting-body">
                <div class="field" style="margin-bottom:0">
                  <div class="field-input" style="height:40px;">
                    <div id="r-meetingpoint-custom" class="address-input" style="flex:1; display:flex; align-items:center; justify-content:space-between; cursor:pointer; background:#f8fafc; border:1px solid #e2e8f0; padding:6px 12px; border-radius:8px;" onclick="Register.searchMode='meeting';Register.searchCustomAddress()">
                      <span id="r-meetingpoint-text" style="font-size:12.5px; color:${this.meetingPointObj ? 'var(--text-100)' : '#94a3b8'}">${this.meetingPointObj ? this.meetingPointObj.name : '집결지 주소(장소명)를 검색하세요'}</span>
                      <span style="color:#94a3b8; display:inline-flex;">${RI(REG_ICON.search, 16)}</span>
                    </div>
                  </div>
                  <p class="field-hint" style="margin-top:6px; font-size:11px; color:#94a3b8;">집결지에서 만나서 출발 시 약 10분의 대기/탑승 시간이 타임라인에 자동 추가됩니다.</p>
                </div>
              </div>
            </div>

            <!-- 6. Pre-Meal Toggle -->
            <div class="meal-section">
              <div class="meal-header">
                <span class="meal-title">${regTitleIcon('meal')} 라운딩 전 아침 식사</span>
                <div class="toggle ${this.hasMeal?'on':''}" id="meal-toggle" onclick="Register.toggleMeal('pre')"></div>
              </div>
              <div class="meal-body ${this.hasMeal?'show':''}" id="meal-body">
                <!-- Meal Duration -->
                <div class="field" style="margin-bottom:8px">
                  <label style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:4px; display:block;">식사 소요 시간</label>
                  <div class="pills" id="meal-pills">
                    ${MEAL_TIME_OPTIONS.map(t => `<button class="pill ${t===this.mealDuration?'on':''}" data-t="${t}" onclick="Register.setMealTime(${t},this)">${t}분</button>`).join('')}
                  </div>
                </div>
                <!-- Restaurant Selection -->
                <div class="field" style="margin-bottom:0">
                  <label style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:4px; display:block;">아침 맛집 선택</label>
                  <button class="picker-btn" onclick="Register.openRestaurantPicker('pre')">
                    <span class="picker-val ${!this.mealRestaurant?'is-empty':''}" id="r-restaurant">${this.mealRestaurant ? this.mealRestaurant.name : '골프장 주변 맛집 선택하기'}</span>
                    <span class="picker-ico">${RI(REG_ICON.search)}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 7. Post Meal Toggle -->
            <div class="meal-section">
              <div class="meal-header">
                <span class="meal-title">${regTitleIcon('cheers')} 라운딩 후 식사 (뒷풀이)</span>
                <div class="toggle ${this.hasPostMeal?'on':''}" id="postmeal-toggle" onclick="Register.toggleMeal('post')"></div>
              </div>
              <div class="meal-body ${this.hasPostMeal?'show':''}" id="postmeal-body">
                <div class="field" style="margin-bottom:0">
                  <label style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:4px; display:block;">뒷풀이 식당 선택</label>
                  <button class="picker-btn" onclick="Register.openRestaurantPicker('post')">
                    <span class="picker-val ${!this.postMealRestaurant?'is-empty':''}" id="r-post-restaurant">${this.postMealRestaurant ? this.postMealRestaurant.name : '식당을 선택하세요 (반경 10km 검색)'}</span>
                    <span class="picker-ico">${RI(REG_ICON.search)}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 8. Companions Card -->
            <div class="reg-card">
              <div class="reg-card-title">
                ${regTitleIcon('users')} 동반자 초대 (선택)
              </div>
              <button class="invite-btn" id="r-invite" onclick="Register.openCompanionModal()">
                <span>카카오톡 동반자 선택 및 초대</span><span class="picker-ico">${RI(REG_ICON.plus)}</span>
              </button>
              <div class="invite-tags" id="r-tags"></div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="reg-submit">
            <button class="btn btn-primary" id="r-submit" onclick="Register.createPlan()">
              ${isEdit ? '라운딩 일정 수정 완료' : '스마트 플랜 & 타임라인 생성'}
            </button>
          </div>
        </div>
      </div>
    `;
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
    
    this.searchResults = await TmapAPI.searchPlace(q);
    
    if (!this.searchResults || !this.searchResults.length) { 
      drop.innerHTML = '<div class="search-item" style="justify-content:center;color:var(--text-500)">검색 결과 없음</div>'; 
      return; 
    }
    
    drop.innerHTML = this.searchResults.map(c => `
      <div class="search-item" onclick="Register.selectCourse('${c.id}')">
        <div class="search-item-icon">${RI(REG_ICON.flag, 16)}</div>
        <div class="search-item-info">
          <div class="search-item-name">${U.hlMatch(c.place_name, q)}</div>
          <div class="search-item-addr">${c.address_name}</div>
        </div>
      </div>`).join('');
  },

  selectCourse(id) {
    const c = this.searchResults.find(x => String(x.id) === String(id)); if(!c) return;
    
    this.course = {
      id: c.id,
      name: c.place_name,
      region: c.address_name.split(' ').slice(0, 2).join(' '),
      addr: c.address_name,
      lat: parseFloat(c.y),
      lng: parseFloat(c.x)
    };
    
    U.$('#r-search').value = this.course.name;
    U.$('#r-results').classList.remove('show');
    const hint = U.$('#r-hint');
    if (hint) {
      hint.innerHTML = `<span style="display:inline-flex;vertical-align:-2px;margin-right:3px;">${RI(REG_ICON.pin, 13)}</span>${U.esc(this.course.addr)}`;
      hint.style.color = 'var(--accent)';
    }
    
    // Clear restaurant when course changes
    this.mealRestaurant = null;
    const restDisplay = U.$('#r-restaurant');
    if (restDisplay) {
      restDisplay.textContent = '식당을 선택하세요';
      restDisplay.classList.add('empty');
    }
    
    U.toast(`${this.course.name} 선택 완료`); U.haptic();
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
    
    App.showModal('라운딩 날짜 선택', content);

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
    this.selectDate(selDate.toISOString());
  },

  selectDate(iso) {
    this.date = new Date(iso);
    const display = U.$('#r-date');
    display.textContent = U.fmtDate(this.date); display.classList.remove('is-empty');
    App.closeModal(); U.haptic();
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

    App.showModal('티오프 시간 선택', content);

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
    display.textContent = U.fmtTimeKo(`${hh}:${mm}`);
    display.classList.remove('is-empty');
    App.closeModal();
    U.haptic();
  },

  setPrepTime(t, btn) { this.prep=t; U.$$('#r-pills .pill').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); U.haptic(); },

  setStartPoint(type, btn) {
    this.startPoint = type;
    U.$$('#r-startpoint-pills .pill').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    this.updateStartPointUI();
    U.haptic();
  },

  updateStartPointUI() {
    const textEl = U.$('#r-startpoint-text');
    if (!textEl) return;
    
    let valObj = null;
    if (this.startPoint === '집') valObj = State.userAddresses?.home;
    else if (this.startPoint === '회사') valObj = State.userAddresses?.office;
    else valObj = this.customStartObj; // directly inputted place

    if (valObj && valObj.name) {
      textEl.textContent = valObj.name;
      textEl.style.color = 'var(--text-800)';
    } else {
      textEl.textContent = this.startPoint === '직접 입력' ? '출발지 주소를 검색하세요' : `${this.startPoint} 주소를 등록해주세요`;
      textEl.style.color = 'var(--text-400)';
    }
  },

  searchCustomAddress() {
    let title = '출발지 주소 검색';
    if (this.searchMode === 'meeting') {
      title = '집결지 주소 검색';
    } else {
      if (this.startPoint === '집') title = '집 주소 검색';
      else if (this.startPoint === '회사') title = '회사 주소 검색';
    }

    App.openAddressSearch(title, (selectedPlace) => {
      if (this.searchMode === 'meeting') {
        this.meetingPointObj = selectedPlace;
        const textEl = U.$('#r-meetingpoint-text');
        if (textEl) {
          textEl.textContent = selectedPlace.name;
          textEl.style.color = 'var(--text-100)';
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
    U.haptic();
  },

  setMealTime(t, btn) { this.mealDuration=t; U.$$('#meal-pills .pill').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); U.haptic(); },

  async openRestaurantPicker(type = 'pre') {
    if (!this.course || !this.course.lat) { U.toast('골프장을 먼저 선택해주세요'); return; }
    
    window._currentMealType = type;
    const isPost = type === 'post';
    const title = isPost ? '뒷풀이 식당 선택' : '라운딩 전 식당 선택';
    const radius = isPost ? 10 : 5; // 뒷풀이는 10km
    
    // 모달을 띄우되, 로딩 상태로 먼저 보여줍니다.
    App.showModal(title, '<div style="padding:var(--sp-4); text-align:center;">주변 맛집을 검색 중입니다...</div>');
    
    const rests = await TmapAPI.searchNearbyPlaces(this.course.lat, this.course.lng, '맛집', radius);
    // 골프장에서 가까운 순으로 정렬
    const sorted = (rests || []).sort((a, b) => parseFloat(a.distance || 999) - parseFloat(b.distance || 999));
    window._nearbyRestsAll = sorted;
    Register.renderRestaurantModalList(title, '골퍼추천');
  },
  
  
  renderRestaurantModalList(title, filterKeyword = '') {
    const isGolferPick = filterKeyword === '골퍼추천';
    
    // ── 필터 바 (⛳ 골퍼추천 탭 최상단) ──
    const filters = ['골퍼추천', '전체', '해장/국밥', '고기/구이', '한식', '중식'];
    const filterHtml = `
      <div style="display:flex; overflow-x:auto; gap:var(--sp-2); padding-bottom:var(--sp-3); margin-bottom:var(--sp-2); border-bottom:1px solid var(--border); scrollbar-width:none;">
        ${filters.map(f => {
          const key = f === '골퍼추천' ? '골퍼추천' : (f === '전체' ? '' : f);
          const isOn = filterKeyword === key || (f === '골퍼추천' && isGolferPick) || (f === '전체' && !filterKeyword && !isGolferPick);
          const style = f === '골퍼추천' 
            ? `flex-shrink:0; padding:6px 12px; font-size:var(--text-sm); ${isOn ? 'background:linear-gradient(135deg,#22c987,#0c5c3f); color:#fff; border-color:transparent;' : 'border:1px solid #22c987; color:#22c987;'}`
            : `flex-shrink:0; padding:6px 12px; font-size:var(--text-sm);`;
          return `<button class="pill ${isOn?'on':''}" style="${style}" onclick="Register.renderRestaurantModalList('${title}', '${key}')">${f}</button>`;
        }).join('')}
      </div>
      <div class="list-item" style="cursor:pointer; background:var(--bg); border:1px solid var(--border); margin-bottom:var(--sp-3); display:flex; align-items:center; gap:var(--sp-2); padding:12px; border-radius:var(--r-md);" onclick="Register.searchCustomRestaurant()">
        <span style="display:inline-flex;color:#94a3b8;">${RI(REG_ICON.search, 18)}</span>
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
            <button type="button" onclick="window.open('${reviewUrl}', '_blank')" style="padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:var(--text-sm); color:var(--text-600); background:transparent; cursor:pointer; white-space:nowrap; margin-top:4px;">★ 리뷰보기</button>
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
            <div style="flex:1;" onclick="Register.selectRestaurant(${i}, '${r.id}')">
              <div class="modal-item-text" style="font-weight:bold;">${r.place_name || r.name} <span style="font-size:0.75rem; font-weight:normal; color:var(--text-400); margin-left:4px;">${r.category}</span></div>
              <div class="modal-item-sub">${r.distance ? parseFloat(r.distance).toFixed(1) + 'km' : ''} · ${r.tel || '전화번호 없음'}</div>
            </div>
            <button type="button" onclick="window.open('${reviewUrl}', '_blank')" style="padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:var(--text-sm); color:var(--text-600); background:transparent; cursor:pointer; white-space:nowrap;">★ 리뷰보기</button>
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
      display.classList.remove('is-empty');
    } else {
      this.mealRestaurant = restObj;
      const display = U.$('#r-restaurant');
      display.textContent = restObj.name; 
      display.classList.remove('is-empty');
    }
    
    App.closeModal(); 
    U.toast(`${restObj.name} 선택 완료`); 
    U.haptic();
  },

  searchCustomRestaurant() {
    const isPost = window._currentMealType === 'post';
    App.openAddressSearch('식당 직접 검색', (selectedPlace) => {
      const restObj = {
        name: selectedPlace.name || selectedPlace.place_name,
        lat: selectedPlace.lat || selectedPlace.y,
        lng: selectedPlace.lng || selectedPlace.x
      };
      
      if (isPost) {
        this.postMealRestaurant = restObj;
        const display = U.$('#r-post-restaurant');
        display.textContent = this.postMealRestaurant.name; 
        display.classList.remove('is-empty');
      } else {
        this.mealRestaurant = restObj;
        const display = U.$('#r-restaurant');
        display.textContent = this.mealRestaurant.name; 
        display.classList.remove('is-empty');
      }
      
      App.closeModal(); 
      U.toast(`${restObj.name} 선택 완료`); 
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
      display.classList.remove('is-empty');
    } else {
      this.mealRestaurant = restObj;
      const display = U.$('#r-restaurant');
      display.textContent = this.mealRestaurant.name; 
      display.classList.remove('is-empty');
    }
    
    App.closeModal(); 
    U.toast(`${restObj.name} 선택 완료`); 
    U.haptic();
  },

  openCompanionModal() {
    let items = `
      <div style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; margin: -24px -24px 16px -24px; position: sticky; top: -24px; background: white; z-index: 10;">
        <div style="font-size: 16px; font-weight: 700; text-align: center;">카카오톡 친구 선택</div>
        <div style="position: absolute; right: 16px; top: 12px; cursor: pointer;" onclick="App.closeModal()">✕</div>
      </div>
      <div style="margin-bottom: 12px; position: relative;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" style="position: absolute; left: 12px; top: 10px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="companion-search" placeholder="이름(초성), 전화번호 검색" onkeyup="Register.filterCompanions(this.value)" style="width: 100%; background: #f5f5f5; border: none; border-radius: 6px; padding: 8px 12px 8px 36px; color: #333; font-size: 14px; outline: none;">
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
    const btn = U.$('#r-invite span:first-child');
    if(btn) btn.textContent = this.invited.length ? `${this.invited.length}명 선택됨` : '+ 카카오톡 동반자 선택';
  },

  removeInvite(id) { this.invited=this.invited.filter(c=>c.id!==id); this.updateTags(); U.haptic(); },

  async createPlan() {
    if (!this.course) { U.toast('골프장을 선택해주세요'); return; }
    if (!this.date) { U.toast('날짜를 선택해주세요'); return; }
    if (this.timeH === null || this.timeM === null) { U.toast('시간을 선택해주세요'); return; }
    if (this.hasMeal && !this.mealRestaurant) { U.toast('식당을 선택하거나 식사를 끄세요'); return; }
    if (this.hasPostMeal && !this.postMealRestaurant) { U.toast('뒷풀이 식당을 선택하거나 기능을 끄세요'); return; }
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
      U.toast('출발지 주소를 정확히 검색하여 등록해주세요.'); 
      btn.innerHTML = originalText; btn.disabled = false;
      return;
    }

    if (this.startPoint === '직접 입력') {
      finalStartPoint = valObj.name;
    }

    // TMAP 도착 목표 시간 기반 예측 경로 소요 시간 계산
    let travelTime = 60; // 총 이동 관련 소요 시간 (집결지 대기 포함)
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
        restTravelDur = this.mealRestaurant.distMin || 15;
        const restArrivalTime = new Date(arrivalTime.getTime() - restTravelDur * 60000 - this.mealDuration * 60000);

        if (this.hasMeetingPoint && this.meetingPointObj) {
          // 집결지 -> 식당
          const meetLat = this.meetingPointObj.lat;
          const meetLng = this.meetingPointObj.lng;
          let rtMeetToRest = await TmapAPI.getPredictiveRouteTime(meetLng, meetLat, this.mealRestaurant.lng, this.mealRestaurant.lat, restArrivalTime.toISOString(), "W02");
          if (!rtMeetToRest) rtMeetToRest = await TmapAPI.getRouteTime(meetLng, meetLat, this.mealRestaurant.lng, this.mealRestaurant.lat) || 30;
          travelToRest = rtMeetToRest;

          const meetWaitTime = 10;
          const meetArrivalTime = new Date(restArrivalTime.getTime() - travelToRest * 60000 - meetWaitTime * 60000);

          // 출발지 -> 집결지
          let rtStartToMeet = await TmapAPI.getPredictiveRouteTime(startLng, startLat, meetLng, meetLat, meetArrivalTime.toISOString(), "W02");
          if (!rtStartToMeet) rtStartToMeet = await TmapAPI.getRouteTime(startLng, startLat, meetLng, meetLat) || 30;
          travelToMeeting = rtStartToMeet;

          travelTime = travelToMeeting + meetWaitTime + travelToRest + restTravelDur;
        } else {
          // 출발지 -> 식당
          let rt = await TmapAPI.getPredictiveRouteTime(startLng, startLat, this.mealRestaurant.lng, this.mealRestaurant.lat, restArrivalTime.toISOString(), "W02");
          if (!rt) rt = await TmapAPI.getRouteTime(startLng, startLat, this.mealRestaurant.lng, this.mealRestaurant.lat) || 60;
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
          if (!rtMeetToGolf) rtMeetToGolf = await TmapAPI.getRouteTime(meetLng, meetLat, this.course.lng, this.course.lat) || 40;
          
          const meetWaitTime = 10;
          const meetArrivalTime = new Date(arrivalTime.getTime() - rtMeetToGolf * 60000 - meetWaitTime * 60000);

          // 출발지 -> 집결지
          let rtStartToMeet = await TmapAPI.getPredictiveRouteTime(startLng, startLat, meetLng, meetLat, meetArrivalTime.toISOString(), "W02");
          if (!rtStartToMeet) rtStartToMeet = await TmapAPI.getRouteTime(startLng, startLat, meetLng, meetLat) || 30;
          travelToMeeting = rtStartToMeet;

          travelTime = travelToMeeting + meetWaitTime + rtMeetToGolf;
        } else {
          // 출발지 -> 골프장
          let rt = await TmapAPI.getPredictiveRouteTime(startLng, startLat, this.course.lng, this.course.lat, arrivalTime.toISOString(), "W02");
          if (!rt) rt = await TmapAPI.getRouteTime(startLng, startLat, this.course.lng, this.course.lat) || 60;
          travelTime = rt;
        }
      }
    } catch (e) {
      console.error("TMAP 연동 중 에러 발생:", e);
      U.toast('예측 경로 탐색 오류. 기본 소요시간으로 계산됩니다.');
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
      travelToMeeting
    };

    if (this.editIdx !== null) {
      State.updateSchedule(this.editIdx, schedData);
      U.toast('스마트 플랜이 수정되었습니다!');
      const idx = this.editIdx;
      this.editIdx = null;
      btn.innerHTML = originalText; btn.disabled = false;
      App.viewTimeline(idx);
      Timeline.toggleAlarm();
      App.showInterstitialAd();
    } else {
      State.addSchedule(schedData);
      U.toast('스마트 플랜이 생성되었습니다!');
      btn.innerHTML = originalText; btn.disabled = false;
      App.viewTimeline(State.schedules.length - 1);
      Timeline.toggleAlarm();
      App.showInterstitialAd();
    }
  }
};
