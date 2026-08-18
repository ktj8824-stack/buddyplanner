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
    } else {
      setTimeout(() => {
        this.updateStartPointUI();
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

  init() { 
    if (this.editIdx === null) this.reset(); // only reset if not editing
    this.render(); 
    setTimeout(() => {
      this.bind();
      if (this.editIdx !== null) {
        if (this.course) {
          const searchEl = U.$('#r-search');
          if (searchEl) searchEl.value = this.course.name;
          const hintEl = U.$('#r-hint');
          if (hintEl) {
            hintEl.innerHTML = `📍 ${this.course.addr}`;
            hintEl.style.color = 'var(--accent)';
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
      <div class="header">
        <button class="header-btn" onclick="Register.editIdx=null; App.navigate('calendar')">
          <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 class="header-title">${isEdit ? '라운딩 일정 수정' : '새 라운딩 등록'}</h1>
        <div class="header-btn" style="visibility:hidden"></div>
      </div>

      <div class="screen-scroll" style="padding-top: 0;">
        <div class="reg-content">
          <div class="reg-form">
            <!-- Golf Course -->
            <div class="field">
              <label class="field-label"><span class="req">*</span> 골프장 선택</label>
              <div class="search-wrap">
                <div class="field-input">
                  <input type="text" id="r-search" placeholder="골프장 이름을 검색하세요" autocomplete="off"/>
                  <span class="fi-icon">🔍</span>
                </div>
                <div class="search-drop" id="r-results"></div>
              </div>
            </div>

            <!-- Date -->
            <div class="field">
              <label class="field-label"><span class="req">*</span> 라운딩 일시</label>
              <button class="picker-btn" onclick="Register.openDatePicker()">
                <span class="picker-val is-empty" id="r-date">날짜를 선택해주세요</span>
                <span class="picker-ico">📅</span>
              </button>
            </div>

            <!-- Tee-off time -->
            <div class="field">
              <label class="field-label"><span class="req">*</span> 티오프(Tee-Off) 시간</label>
              <button class="picker-btn" onclick="Register.openTimePicker()">
                <span class="picker-val ${this.timeH === null ? 'is-empty' : ''}" id="r-time">${this.timeH === null ? '시간을 선택해주세요' : U.fmtTimeKo(String(this.timeH).padStart(2,'0')+':'+String(this.timeM).padStart(2,'0'))}</span>
                <span class="picker-ico">⏰</span>
              </button>
            </div>

            <!-- Prep time -->
            <div class="field">
              <label class="field-label"><span class="req">*</span> 나의 외출 준비 시간</label>
              <div class="pills" id="r-pills">
                ${PREP_OPTIONS.map(t => `<button class="pill ${t===this.prep?'on':''}" data-t="${t}" onclick="Register.setPrepTime(${t},this)">${t}분</button>`).join('')}
              </div>
              <p class="field-hint">샤워, 짐 챙기기 등 출발 전 준비 시간</p>
            </div>

            <!-- Start Point -->
            <div class="field">
              <label class="field-label"><span class="req">*</span> 출발지 설정</label>
              <div class="pills" id="r-startpoint-pills">
                <button type="button" class="pill ${this.startPoint==='집'?'on':''}" onclick="Register.setStartPoint('집',this)">🏠 집</button>
                <button type="button" class="pill ${this.startPoint==='회사'?'on':''}" onclick="Register.setStartPoint('회사',this)">🏢 회사</button>
                <button type="button" class="pill ${this.startPoint==='직접 입력'?'on':''}" onclick="Register.setStartPoint('직접 입력',this)">📍 직접 입력</button>
              </div>
              <div class="field-input" id="r-startpoint-custom-wrap" style="display:flex;margin-top:var(--sp-2)">
                <div id="r-startpoint-custom" class="address-input" style="flex:1; display:flex; align-items:center; justify-content:space-between; cursor:pointer; background:var(--bg); border:1px solid var(--border); padding:12px 16px; border-radius:var(--r-sm);" onclick="Register.searchMode='start';Register.searchCustomAddress()">
                  <span id="r-startpoint-text" style="color:var(--text-400)">출발지 주소를 검색하세요</span>
                  <span style="opacity:0.5;">🔍</span>
                </div>
              </div>
            </div>

            <!-- Meeting Point Toggle -->
            <div class="meal-section">
              <div class="meal-header">
                <span class="meal-title">🤝 집결지 설정 (동반자 탑승)</span>
                <div class="toggle ${this.hasMeetingPoint?'on':''}" id="meeting-toggle" onclick="Register.toggleMeetingPoint()"></div>
              </div>
              <div class="meal-body ${this.hasMeetingPoint?'show':''}" id="meeting-body">
                <div class="field" style="margin-bottom:0">
                  <label class="field-label">집결지 선택</label>
                  <div class="field-input">
                    <div id="r-meetingpoint-custom" class="address-input" style="flex:1; display:flex; align-items:center; justify-content:space-between; cursor:pointer; background:var(--bg); border:1px solid var(--border); padding:12px 16px; border-radius:var(--r-sm);" onclick="Register.searchMode='meeting';Register.searchCustomAddress()">
                      <span id="r-meetingpoint-text" style="color:${this.meetingPointObj ? 'var(--text-100)' : 'var(--text-400)'}">${this.meetingPointObj ? this.meetingPointObj.name : '집결지 주소(장소명)를 검색하세요'}</span>
                      <span style="opacity:0.5;">🔍</span>
                    </div>
                  </div>
                  <p class="field-hint" style="margin-top:var(--sp-2)">집결지에서 만나서 출발하는 데 약 10분의 대기/탑승 시간이 추가됩니다.</p>
                </div>
              </div>
            </div>

            <!-- Meal Toggle -->
            <div class="meal-section" style="margin-top:var(--sp-4);">
              <div class="meal-header">
                <span class="meal-title">🍽️ 라운딩 전 식사</span>
                <div class="toggle ${this.hasMeal?'on':''}" id="meal-toggle" onclick="Register.toggleMeal('pre')"></div>
              </div>
              <div class="meal-body ${this.hasMeal?'show':''}" id="meal-body">
                <!-- Meal Duration -->
                <div class="field" style="margin-bottom:var(--sp-3)">
                  <label class="field-label">식사 시간</label>
                  <div class="pills" id="meal-pills">
                    ${MEAL_TIME_OPTIONS.map(t => `<button class="pill ${t===this.mealDuration?'on':''}" data-t="${t}" onclick="Register.setMealTime(${t},this)">${t}분</button>`).join('')}
                  </div>
                </div>
                <!-- Restaurant Selection -->
                <div class="field" style="margin-bottom:0">
                  <label class="field-label">식당 선택</label>
                  <button class="picker-btn" onclick="Register.openRestaurantPicker('pre')">
                    <span class="picker-val ${!this.mealRestaurant?'is-empty':''}" id="r-restaurant">${this.mealRestaurant ? this.mealRestaurant.name : '식당을 선택하세요'}</span>
                    <span class="picker-ico">🍽️</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Post Meal Toggle -->
            <div class="meal-section" style="margin-top:var(--sp-4);">
              <div class="meal-header">
                <span class="meal-title">🍻 라운딩 후 식사 (뒷풀이)</span>
                <div class="toggle ${this.hasPostMeal?'on':''}" id="postmeal-toggle" onclick="Register.toggleMeal('post')"></div>
              </div>
              <div class="meal-body ${this.hasPostMeal?'show':''}" id="postmeal-body">
                <!-- Post Restaurant Selection -->
                <div class="field" style="margin-bottom:0">
                  <label class="field-label">뒷풀이 식당 선택</label>
                  <button class="picker-btn" onclick="Register.openRestaurantPicker('post')">
                    <span class="picker-val ${!this.postMealRestaurant?'is-empty':''}" id="r-post-restaurant">${this.postMealRestaurant ? this.postMealRestaurant.name : '식당을 선택하세요 (반경 10km 검색)'}</span>
                    <span class="picker-ico">🍖</span>
                  </button>
                </div>
              </div>
            </div>


          </div>
        <!-- Submit -->
      <div class="reg-submit">
        <button class="btn btn-primary" id="r-submit" onclick="Register.createPlan()" style="width:100%">${isEdit ? '일정 수정하기' : '⛳ 자동으로 스마트 플랜 생성'}</button>
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
        <div class="search-item-icon">⛳</div>
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
    U.$('#r-hint').innerHTML = `📍 ${this.course.addr}`;
    U.$('#r-hint').style.color = 'var(--accent)';
    
    // Clear restaurant when course changes
    this.mealRestaurant = null;
    const restDisplay = U.$('#r-restaurant');
    if (restDisplay) {
      restDisplay.textContent = '식당을 선택하세요';
      restDisplay.classList.add('empty');
    }
    
    U.toast(`⛳ ${c.name} 선택 완료`); U.haptic();
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
    Register.renderRestaurantModalList(title, '골퍼추천');
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
        display.classList.remove('is-empty');
      } else {
        this.mealRestaurant = restObj;
        const display = U.$('#r-restaurant');
        display.textContent = this.mealRestaurant.name; 
        display.classList.remove('is-empty');
      }
      
      App.closeModal(); 
      U.toast(`${isPost?'🍻':'🍽️'} ${restObj.name} 선택 완료`); 
      U.haptic();
    });
  },

  selectRestaurant(idx, idStr) {
    // idx is based on filtered list, so we must find by idStr from _nearbyRestsAll
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
    U.toast(`${isPost?'🍻':'🍽️'} ${restObj.name} 선택 완료`); 
    U.haptic();
  },



  async createPlan() {
    if (!this.course) { U.toast('⚠️ 골프장을 선택해주세요'); return; }
    if (!this.date) { U.toast('⚠️ 날짜를 선택해주세요'); return; }
    if (this.timeH === null || this.timeM === null) { U.toast('⚠️ 시간을 선택해주세요'); return; }
    if (this.hasMeal && !this.mealRestaurant) { U.toast('⚠️ 식당을 선택하거나 식사를 끄세요'); return; }
    if (this.hasPostMeal && !this.postMealRestaurant) { U.toast('⚠️ 뒷풀이 식당을 선택하거나 기능을 끄세요'); return; }

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
      U.toast('⚠️ 출발지 주소를 정확히 검색하여 등록해주세요.'); 
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
      travelToMeeting
    };

    if (this.editIdx !== null) {
      State.updateSchedule(this.editIdx, schedData);
      U.toast('✅ 스마트 플랜이 수정되었습니다!');
      const idx = this.editIdx;
      this.editIdx = null;
      btn.innerHTML = originalText; btn.disabled = false;
      App.viewTimeline(idx);
      Timeline.refreshAlarm();
    } else {
      State.addSchedule(schedData);
      U.toast('✅ 스마트 플랜이 생성되었습니다!');
      btn.innerHTML = originalText; btn.disabled = false;
      App.viewTimeline(State.schedules.length - 1);
      Timeline.refreshAlarm();
    }
  }
};
