/* =========================================
   BuddyPlanner — 단체 일정 (총무가 만드는 모임 라운딩)
   · 총무: 만들기, 참석자 관리, 조 편성·차량 배정 (로그인 필요)
   · 참석자: 카톡 링크로 들어와 내 이름 고르고 참석/불참 (로그인 없어도 됨)
   · 단체 톡방: 로그인한 총무·참석자만
   서버: supabase/010_group_events.sql (ge_* 함수)
   ========================================= */

const Group = {
  view: 'list',          // list | create | detail | chat | edit
  code: null,
  ev: null,
  list: [],
  pickId: null,          // (비로그인) 이 기기에서 고른 내 이름
  chat: [], chatTimer: null, chatMe: null, chatErr: '',
  loading: false,
  BASE_URL: 'https://buddyplanner.kr',

  /* ── 기기에 저장: 링크별 비밀 토큰과 내가 고른 이름 ── */
  _store(key) { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { return {}; } },
  _save(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { } },
  token(code) {
    const all = this._store('bp_ge_tok');
    if (!all[code]) {
      const a = new Uint8Array(16);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.random() * 256; });
      all[code] = 'ge-' + Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
      this._save('bp_ge_tok', all);
    }
    return all[code];
  },
  myPick(code) { return this._store('bp_ge_me')[code] || null; },
  setMyPick(code, id) { const all = this._store('bp_ge_me'); if (id) all[code] = id; else delete all[code]; this._save('bp_ge_me', all); },

  signedIn() { return typeof Cloud !== 'undefined' && Cloud.isConfigured() && Cloud.isSignedIn(); },
  async rpc(fn, body, anon = false) {
    const path = `rest/v1/rpc/${fn}`;
    return anon ? Cloud.publicApi(path, { method: 'POST', body }) : Cloud._api(path, { method: 'POST', body });
  },

  /* ── 진입 ── */
  init() {
    if (this.view !== 'chat') this.stopChat();
    if (this.view === 'detail' && this.code) { this.render(); this.load(); return; }
    if (this.view === 'chat' && this.code) { this.render(); this.startChat(); return; }
    if (this.view !== 'create' && this.view !== 'edit') this.view = 'list';
    this.render();
    if (this.view === 'list') this.loadList();
  },
  openList() { this.stopChat(); this.view = 'list'; App.navigate('group'); },
  openCode(code, memberId) {
    code = String(code || '').toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 16);
    if (code.length !== 16) return false;
    this.stopChat();
    this.code = code; this.ev = null; this.view = 'detail'; this.pickId = this.myPick(code);
    // 개인 문자 링크(&m=번호)로 열면 그 이름을 미리 골라 둠 (이미 다른 이름을 골랐으면 그대로)
    if (!this.pickId && memberId) { this.pickId = Number(memberId) || null; this._pickFromLink = true; }
    App.navigate('group');
    return true;
  },

  /** 캘린더 표시용: 내 단체 일정 목록 (마지막으로 받은 목록을 기기에 저장해 두고 씀) */
  cachedList() {
    if (this.list && this.list.length) return this.list;
    try { return JSON.parse(localStorage.getItem('bp_ge_list') || '[]') || []; } catch (e) { return []; }
  },
  _cacheList() { try { localStorage.setItem('bp_ge_list', JSON.stringify((this.list || []).map(x => ({ code: x.code, title: x.title, course_name: x.course_name, round_date: x.round_date, tee_off: x.tee_off, i_am_owner: x.i_am_owner, my_status: x.my_status, yes_count: x.yes_count, total: x.total })))); } catch (e) { } },
  /** 캘린더에서 부름: 서버에서 목록만 새로 받아 저장 (단체 화면은 다시 그리지 않음) */
  async refreshListQuiet() {
    if (!this.signedIn()) return this.cachedList();
    try { this.list = (await this.rpc('ge_my_list', {})) || []; this._cacheList(); } catch (e) { }
    return this.cachedList();
  },
  groupsOn(y, m, d) {
    const p = n => String(n).padStart(2, '0');
    const ymd = `${y}-${p(m + 1)}-${p(d)}`;
    return this.cachedList().filter(x => x && x.round_date === ymd);
  },

  async loadList() {
    if (!this.signedIn()) { this.list = []; this.render(); return; }
    try { this.list = (await this.rpc('ge_my_list', {})) || []; this._cacheList(); } catch (e) { this.list = this.cachedList(); }
    if (this.view === 'list') this.render();
  },

  async load() {
    if (!this.code) return;
    this.loading = !this.ev;
    try {
      const r = await this.rpc('ge_view', { p_code: this.code }, true);
      if (!r || !r.ok) { this.ev = null; this.err = '단체 일정을 찾을 수 없어요. 링크를 다시 확인해 주세요.'; }
      else {
        this.ev = r.event; this.err = '';
        if (this.ev.my_member_id) { this.pickId = this.ev.my_member_id; this.setMyPick(this.code, this.pickId); }
        if (this.pickId && !this.ev.members.some(m => m.id === this.pickId)) { this.pickId = null; this.setMyPick(this.code, null); }
        if (this._pickFromLink) {
          const pm = this._member(this.pickId);
          if (pm && !pm.claimed && !pm.is_owner) this.setMyPick(this.code, this.pickId); else this.pickId = this.myPick(this.code);
          this._pickFromLink = false;
        }
      }
    } catch (e) {
      this.err = '불러오지 못했어요. 인터넷 연결을 확인해 주세요.';
    }
    this.loading = false;
    if (this.view === 'detail' || this.view === 'edit') this.render();
  },

  /* ── 공통 ── */
  _date(d) {
    if (!d) return '';
    const x = new Date(String(d).length <= 10 ? d + 'T00:00:00' : d);
    return `${x.getMonth() + 1}월 ${x.getDate()}일(${['일', '월', '화', '수', '목', '금', '토'][x.getDay()]})`;
  },
  _minus(t, min) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); if (!m) return '';
    let v = (+m[1]) * 60 + (+m[2]) - min; v = (v + 1440) % 1440;
    return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
  },
  _el() { return U.$('#screen-group'); },
  _member(id) { return this.ev && this.ev.members.find(m => m.id === id); },
  _avatar(name) {
    const colors = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#ddd6fe', '#fed7aa', '#a5f3fc', '#fbcfe8'];
    let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `<div class="gp-av" style="background:${colors[h % colors.length]}">${U.esc(String(name).slice(0, 1))}</div>`;
  },
  _moveText(m) {
    if (m.status === 'no') return '이번엔 불참';
    if (m.transport === 'self') {
      const riders = this.ev.members.filter(x => x.car_driver_id === m.id).map(x => x.name);
      return `🚗 직접 운전${riders.length ? ` · ${riders.map(U.esc).join(', ')} 태움` : ''}`;
    }
    if (m.transport === 'ride') {
      const d = this._member(m.car_driver_id);
      return d ? `${U.esc(d.name)} 차 탑승${m.ride_note ? ` · ${U.esc(m.ride_note)}` : ''}` : `차 얻어 타기 희망${m.ride_note ? ` · ${U.esc(m.ride_note)}` : ''}`;
    }
    if (m.status === 'pending') return m.claimed ? '응답 중' : '아직 확인 안 함';
    return m.ride_note ? U.esc(m.ride_note) : '이동 방법 미정';
  },
  _statusChip(m) {
    if (m.status === 'yes') return '<span class="gp-st ok">참석</span>';
    if (m.status === 'no') return '<span class="gp-st no">불참</span>';
    return '<span class="gp-st wait">대기</span>';
  },

  /* ── 조편성 ── */
  _teamMeta(no) { const T = (this.ev && this.ev.teams) || []; return T.find(t => t.no === no) || null; },
  _hasTeamTimes() { return ((this.ev && this.ev.teams) || []).some(t => t.tee); },
  /** 그 사람의 티업: 조 티업 → 없으면 대표 티오프 */
  _teeFor(m) { const t = m && m.team_no ? this._teamMeta(m.team_no) : null; return (t && t.tee) || (this.ev && this.ev.tee_off) || ''; },
  _teamLabel(no) {
    const t = this._teamMeta(no);
    return `${no}조${t && t.tee ? ` · ${t.tee}` : ''}${t && t.course ? ` · ${U.esc(t.course)}` : ''}`;
  },
  personalUrl(m) { return `${this.shareUrl()}&m=${m.id}`; },
  /** 사람별 문자 (그 사람 링크로 열면 이름이 미리 골라져 있음) */
  _smsBody(m) {
    const e = this.ev; const t = this._teamMeta(m.team_no);
    const lines = [`⛳ ${e.title}`, `${this._date(e.round_date)} ${e.course.name}`];
    if (m.team_no) lines.push(`${m.name}님은 ${m.team_no}조 · 티업 ${this._teeFor(m)}${t && t.course ? ` · ${t.course}` : ''}`);
    if (e.meal_before && e.meal_time) lines.push(`아침 ${e.meal_time} ${e.meal_before.name}`);
    lines.push('', '내 일정·일어날 시간 보기 👇', this.personalUrl(m));
    return lines.join('\n');
  },
  _smsHref(phones, body) {
    const sep = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
    return `sms:${phones.join(',')}${sep}body=${encodeURIComponent(body)}`;
  },
  smsMember(id, ev) {
    if (ev) ev.stopPropagation();
    const m = this._member(id); if (!m || !m.phone) return;
    location.href = this._smsHref([m.phone], this._smsBody(m));
  },
  smsTeam(no) {
    const list = this.ev.members.filter(m => m.team_no === no && m.phone && !m.is_owner);
    if (!list.length) { U.toast('이 조에는 전화번호가 없어요.'); return; }
    const e = this.ev; const t = this._teamMeta(no);
    const body = [`⛳ ${e.title}`, `${this._date(e.round_date)} ${e.course.name}`, `${no}조 · 티업 ${(t && t.tee) || e.tee_off}${t && t.course ? ` · ${t.course}` : ''}`,
      `${this.ev.members.filter(m => m.team_no === no).map(m => m.name).join(', ')}`, '', '링크에서 내 이름을 누르면 일어날 시간까지 보여요 👇', this.shareUrl()].join('\n');
    location.href = this._smsHref(list.map(m => m.phone), body);
  },
  /** 조편성표 글 (카톡·복사용) */
  lineupText() {
    const e = this.ev;
    const nos = [...new Set(e.members.map(m => m.team_no).filter(Boolean))].sort((a, b) => a - b);
    return nos.map(no => `${this._teamLabel(no).replace(/&amp;/g, '&')}: ${e.members.filter(m => m.team_no === no).map(m => m.name).join(', ')}`).join('\n');
  },

  /* ── 내 일정 (받는 사람): 조·티업 + 몇 시에 일어나야 하는지 ── */
  _wake: {},
  _myCardHTML(me) {
    const e = this.ev; if (!me || me.status === 'no') return '';
    const tee = this._teeFor(me); const t = this._teamMeta(me.team_no);
    const w = this._wake[this.code + ':' + me.id];
    const meal = e.meal_before && e.meal_time ? `<div class="gm-row"><span>🍲 아침</span><b>${U.esc(e.meal_time)} ${U.esc(e.meal_before.name)}</b></div>` : '';
    let wake;
    if (!w) wake = `<button class="gp-btn navy" onclick="Group.calcWake()">⏰ 몇 시에 일어나야 하는지 보기</button>`;
    else if (w.loading) wake = `<div class="gm-wake wait">출발 시간을 계산하는 중…</div>`;
    else if (w.err) wake = `<div class="gm-wake wait">${U.esc(w.err)}</div><button class="gp-btn line" onclick="Group.calcWake(true)">다시 계산</button>`;
    else wake = `
      <div class="gm-wake">
        <div><span>기상</span><b>${w.wake}</b></div><i>›</i>
        <div><span>출발</span><b>${w.depart}</b></div><i>›</i>
        <div><span>${w.toMeal ? '식당 도착' : '도착'}</span><b>${w.arrive}</b></div>
      </div>
      <div class="gm-base">${w.base === 'home' ? '🏠 집' : '📍 지금 위치'}에서 차로 약 ${w.min}분${w.est ? ' (거리로 어림)' : ''} · 준비 ${w.prep}분 <button class="gp-link" onclick="Group.calcWake(true)">다시 계산</button></div>`;
    return `
      <div class="gp-card gm-card">
        <div class="gm-title">${U.esc(me.name)}님 일정</div>
        <div class="gm-row"><span>⛳ 내 조</span><b>${me.team_no ? `${me.team_no}조` : '조 미정'}${t && t.course ? ` · ${U.esc(t.course)}` : ''}</b></div>
        <div class="gm-row"><span>🕖 티업</span><b class="gold">${U.esc(tee)}</b></div>
        ${meal}
        ${wake}
        ${typeof AutoNav !== 'undefined' ? AutoNav.quickHTML([
          e.meal_before ? { label: '아침 식당', name: e.meal_before.name, lat: e.meal_before.lat, lng: e.meal_before.lng } : null,
          e.course ? { label: '골프장', name: e.course.name, lat: e.course.lat, lng: e.course.lng } : null,
          e.meal_after ? { label: '뒤풀이', name: e.meal_after.name, lat: e.meal_after.lat, lng: e.meal_after.lng } : null,
        ]) : ''}
      </div>`;
  },
  /** 기준: 집 주소가 있으면 집, 없으면 지금 위치 (앱 없이 카톡 링크로 열어도 동작) */
  async calcWake(force) {
    const e = this.ev; const me = this._member(this.pickId) || (e.i_am_owner ? e.members.find(m => m.is_owner) : null);
    if (!me) return;
    const key = this.code + ':' + me.id;
    if (this._wake[key] && !force && !this._wake[key].err) return;
    this._wake[key] = { loading: true }; this.render();
    const home = State.userAddresses && State.userAddresses.home && State.userAddresses.home.lat ? State.userAddresses.home : null;
    let from = home ? { lat: home.lat, lng: home.lng, base: 'home' } : null;
    if (!from) {
      from = await new Promise(res => {
        if (!navigator.geolocation) return res(null);
        let done = false; const fin = v => { if (!done) { done = true; res(v); } };
        setTimeout(() => fin(null), 9000);
        navigator.geolocation.getCurrentPosition(p => fin({ lat: p.coords.latitude, lng: p.coords.longitude, base: 'here' }), () => fin(null), { timeout: 8000, maximumAge: 600000 });
      });
    }
    if (!from) { this._wake[key] = { err: '위치를 알 수 없어요. 위치 권한을 켜거나, 앱에서 집 주소를 넣어 주세요.' }; this.render(); return; }
    const toMeal = !!(e.meal_before && e.meal_time && e.meal_before.lat);
    const dest = toMeal ? e.meal_before : e.course;
    let min = null, est = false;
    try { min = await TmapAPI.getRouteTime(from.lng, from.lat, dest.lng, dest.lat); } catch (err) { min = null; }
    if (!min) { est = true; min = (typeof Register !== 'undefined' && Register.estimateDriveMin) ? Register.estimateDriveMin(from.lng, from.lat, dest.lng, dest.lat) : 60; }
    const prep = 30;
    const arrive = toMeal ? e.meal_time : this._minus(this._teeFor(me), 40);   // 티업 40분 전 도착 (앱 일정과 같은 기준)
    const depart = this._minus(arrive, min);
    this._wake[key] = { wake: this._minus(depart, prep), depart, arrive, min, est, prep, base: from.base, toMeal };
    this.render();
  },

  render() {
    const el = this._el(); if (!el) return;
    if (this.view === 'import') return this.renderImport(el);
    if (this.view === 'create' || this.view === 'edit') return this.renderForm(el);
    if (this.view === 'chat') return this.renderChat(el);
    if (this.view === 'detail') return this.renderDetail(el);
    return this.renderList(el);
  },

  /* ── 목록 ── */
  renderList(el) {
    const signed = this.signedIn();
    const items = (this.list || []).map(x => `
      <div class="gp-item" onclick="Group.openCode('${U.esc(x.code)}')">
        <div class="gp-item-top"><span class="gp-item-t">${U.esc(x.title)}</span>${x.i_am_owner ? '<span class="gp-badge">총무</span>' : '<span class="gp-badge sub">참석</span>'}</div>
        <div class="gp-item-m">⛳ ${U.esc(x.course_name)} · ${this._date(x.round_date)} ${U.esc(x.tee_off)}</div>
        <div class="gp-item-c">참석 ${x.yes_count}/${x.total}</div>
      </div>`).join('');
    const back = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
    const cards = (this.list || []).map(x => `
      <div class="v2-card" style="cursor:pointer;" onclick="Group.openCode(${U.jsq(x.code)})">
        <div class="v2-rcard-top"><b>${U.esc(x.title)}</b><span class="v2-pill ${x.i_am_owner ? 'blue' : 'green'}">${x.i_am_owner ? '총무' : '참석'}</span></div>
        <div class="v2-hint" style="margin-top:6px;">${U.esc(x.course_name)} · ${this._date(x.round_date)} ${U.esc(x.tee_off)}</div>
        <div class="v2-rcard-foot"><span class="st">참석 ${x.yes_count}/${x.total}</span><span class="v2-link">열기</span></div>
      </div>`).join('');
    el.innerHTML = `
      <div class="v2-pagehead"><button class="v2-iconbtn" style="margin-left:-10px;" onclick="App.navigate('home')" aria-label="뒤로가기">${back}</button><h1 style="font-size:1.25rem;">단체 일정</h1></div>
      <div class="v2-scroll"><div class="v2-body">
        <button class="v2-btn-navy" onclick="Group.startCreate()">＋ 새 단체 일정 만들기 <b class="pro-tag inline">PRO</b></button>
        ${Billing.promoActive() && !State.isPro
          ? `<p class="v2-hint" style="margin:0 4px;">출시 기념으로 ${Billing.promoDated() ? Billing.promoLabel() + '까지' : '지금은'} 단체 일정을 무료로 만들 수 있어요. 링크를 받은 참석자도 무료예요.</p>`
          : `<p class="v2-hint pro-note" style="margin:0 4px;">👑 단체 일정 만들기는 PRO 기능이에요. 링크를 받은 참석자는 무료로 볼 수 있어요.</p>`}
        ${!signed ? `<p class="v2-hint" style="margin:0 4px;">단체 일정을 만들려면 로그인이 필요해요. 받은 링크로 참석하는 건 로그인 없이도 돼요.</p>` : ''}
        ${cards ? `<div class="v2-sec-title">내 단체 일정</div>${cards}` : `
        <div class="v2-card">
          <div class="v2-h2" style="margin-bottom:10px;">이렇게 써요</div>
          <div class="v2-hint" style="margin:0; line-height:1.8;">1. 총무가 골프장·날짜·참석자 이름을 넣어 만들어요<br>2. 카톡 단톡방에 링크를 보내요<br>3. 각자 링크를 열고 내 이름을 골라 참석을 눌러요 (로그인 없어도 돼요)<br>4. 단체 톡방에서 차 같이 탈 사람을 얘기하고, 총무가 조·차를 정해요</div>
        </div>`}
      </div></div>`;
  },

  /** 만들기는 PRO (받는 사람은 무료). 결제를 열기 전까지는 config의 GROUP_PRO_ONLY가 true일 때만 막음 */
  proOnly() { return !!(window.APP_CONFIG && window.APP_CONFIG.GROUP_PRO_ONLY); },
  TEAM_GAP: 7,          // 조 간격 (분) — 다음 조 티업을 비워 두면 자동으로 채움
  MAX_TEAMS: 10,
  _emptyTeam() { return { tee: '', course: '', members: [0, 1, 2, 3].map(() => ({ name: '', phone: '' })) }; },
  startCreate() {
    if (!this.signedIn()) { U.toast('단체 일정을 만들려면 로그인해 주세요.'); App.navigate('login'); return; }
    if (this.proOnly() && !Billing.hasPro()) {
      U.toast('단체 등록은 PRO 기능이에요. 링크를 받은 분들은 무료로 볼 수 있어요.', 3500);
      if (typeof App.openUpgrade === 'function') App.openUpgrade(); else App.navigate('upgrade');
      return;
    }
    const me = localStorage.getItem('bp_user_name') || '';
    const teams = [0, 1, 2, 3].map(() => this._emptyTeam());
    teams[0].tee = '07:00';
    if (me) teams[0].members[0].name = me;
    this.form = { mode: 'teams', title: '', course: null, date: '', me, memo: '', meal: null, mealTime: '', teams };
    this.view = 'create'; this.render();
  },

  /* ── 만들기 / 수정 ── */
  renderForm(el) {
    const f = this.form || {};
    const edit = this.view === 'edit';
    if (!edit && f.mode === 'teams') return this.renderTeamForm(el);
    el.innerHTML = `
      <div class="gp-wrap">
        <div class="gp-top"><button class="gp-back" onclick="Group.cancelForm()">‹ ${edit ? '단체 일정' : '목록'}</button>
          <div class="gp-top-t">${edit ? '단체 일정 수정' : '새 단체 일정'}</div></div>
        <div class="gp-sec gp-form">
          <label>모임 이름</label>
          <input id="gp-title" maxlength="40" placeholder="예) 토요 정기 모임" value="${U.esc(f.title)}">
          <label>골프장</label>
          ${edit ? `<div class="gp-fixed">⛳ ${U.esc(f.course && f.course.name)}</div>`
                 : `<button class="gp-pick ${f.course ? 'on' : ''}" onclick="Group.pickCourse()">${f.course ? '⛳ ' + U.esc(f.course.name) : '골프장 검색하기'}</button>`}
          ${edit && f.teams ? `
          <label>날짜</label><input id="gp-date" type="date" value="${U.esc(f.date)}">
          <label>조별 티업 · 코스 <span class="gp-hint">사람은 상세 화면에서 이름을 눌러 옮겨요</span></label>
          ${f.teams.map((t, i) => `<div class="gt-head edit"><b>${t.no}조</b>
            <input class="gt-tee" id="gp-et-${i}-tee" type="time" value="${U.esc(t.tee)}" aria-label="${t.no}조 티업">
            <input class="gt-course" id="gp-et-${i}-course" maxlength="20" placeholder="코스" value="${U.esc(t.course)}" aria-label="${t.no}조 코스"></div>`).join('')}
          <button class="gt-add" onclick="Group.addEditTeam()">＋ ${f.teams.length + 1}조 추가</button>` : `
          <div class="gp-row2">
            <div><label>날짜</label><input id="gp-date" type="date" value="${U.esc(f.date)}"></div>
            <div><label>티오프 (첫 조)</label><input id="gp-tee" type="time" value="${U.esc(f.tee)}"></div>
          </div>
          <label>다 같이 모이는 시간 <span class="gp-hint">비우면 티오프 30분 전</span></label>
          <input id="gp-meet" type="time" value="${U.esc(f.meet)}">`}
          ${edit ? `
          <label>아침 식당 <span class="gp-hint">같이 먹는다면</span></label>
          <button class="gp-pick ${f.mealBefore ? 'on' : ''}" onclick="Group.pickMeal('before')">${f.mealBefore ? '🍲 ' + U.esc(f.mealBefore.name) : '식당 검색하기'}</button>
          ${f.mealBefore ? `${f.teams ? `<label>아침 식사 시작</label><input id="gp-mealtime" type="time" value="${U.esc(f.mealTime || this._minus(f.teams[0].tee, 80))}">` : ''}<button class="gp-link" onclick="Group.clearMeal('before')">아침 식당 빼기</button>` : ''}
          <label>뒤풀이 식당</label>
          <button class="gp-pick ${f.mealAfter ? 'on' : ''}" onclick="Group.pickMeal('after')">${f.mealAfter ? '🍻 ' + U.esc(f.mealAfter.name) : '식당 검색하기'}</button>
          ${f.mealAfter ? `<button class="gp-link" onclick="Group.clearMeal('after')">뒤풀이 식당 빼기</button>` : ''}
          <label>참석자 더 넣기 <span class="gp-hint">줄바꿈이나 쉼표로 구분</span></label>
          <textarea id="gp-names" rows="3" placeholder="예) 김프로, 이버디"></textarea>
          ` : `
          <label>내 이름 (총무)</label>
          <input id="gp-me" maxlength="20" placeholder="참석자들이 알아볼 이름" value="${U.esc(f.me)}">
          <label>참석자 이름 <span class="gp-hint">줄바꿈이나 쉼표로 구분 · 나중에 더 넣을 수 있어요</span></label>
          <textarea id="gp-names" rows="4" placeholder="예) 김프로, 이버디, 박이글">${U.esc(f.names)}</textarea>`}
          <label>공지 메모 <span class="gp-hint">선택</span></label>
          <textarea id="gp-memo" rows="2" maxlength="300" placeholder="예) 회비 5만원, 아침은 같이 먹어요">${U.esc(f.memo)}</textarea>
          <button class="gp-btn navy" id="gp-save" onclick="Group.saveForm()">${edit ? '저장' : '만들기'}</button>
          ${edit ? `<button class="gp-btn del" onclick="Group.remove()">단체 일정 삭제</button>` : ''}
        </div>
      </div>`;
  },
  /* ── 조편성으로 만들기 ── */
  _addMin(t, min) { return this._minus(t, -min); },
  /** 비어 있는 조 티업은 앞 조 + 7분으로 채워 보여 줌 (저장할 때도 같은 값) */
  _teeOf(i) {
    const T = this.form.teams;
    if (T[i].tee) return T[i].tee;
    return i > 0 && this._teeOf(i - 1) ? this._addMin(this._teeOf(i - 1), this.TEAM_GAP) : '';
  },
  renderTeamForm(el) {
    const f = this.form;
    const teamHtml = f.teams.map((t, i) => {
      const tee = this._teeOf(i);
      return `
        <div class="gt-team">
          <div class="gt-head">
            <b>${i + 1}조</b>
            <input class="gt-tee ${t.tee ? '' : 'auto'}" id="gt-${i}-tee" type="time" value="${U.esc(tee)}" data-auto="${t.tee ? '' : U.esc(tee)}" aria-label="${i + 1}조 티업 시간" onchange="Group.teamTee()">
            <input class="gt-course" id="gt-${i}-course" maxlength="20" placeholder="코스 (OUT, IN…)" value="${U.esc(t.course)}" aria-label="${i + 1}조 코스">
            ${f.teams.length > 1 ? `<button class="gt-del" onclick="Group.delTeam(${i})" aria-label="${i + 1}조 빼기">✕</button>` : ''}
          </div>
          ${t.members.map((m, j) => `
          <div class="gt-row">
            <span class="gt-no">${j + 1}</span>
            <input id="gt-${i}-n${j}" maxlength="20" placeholder="이름" value="${U.esc(m.name)}" aria-label="${i + 1}조 ${j + 1}번 이름">
            <input id="gt-${i}-p${j}" type="tel" inputmode="tel" maxlength="13" placeholder="전화번호 (선택)" value="${U.esc(m.phone)}" aria-label="${i + 1}조 ${j + 1}번 전화번호">
          </div>`).join('')}
        </div>`;
    }).join('');
    el.innerHTML = `
      <div class="gp-wrap">
        <div class="gp-top"><button class="gp-back" onclick="Group.cancelForm()">‹ 목록</button>
          <div class="gp-top-t">새 단체 일정</div>
          <div class="gp-top-m">조마다 티업 시간과 이름만 넣으면 조편성표가 만들어져요</div></div>
        <div class="gp-sec gp-form">
          <label>모임 이름</label>
          <input id="gp-title" maxlength="40" placeholder="예) 토요 정기 모임" value="${U.esc(f.title)}">
          <label>골프장</label>
          <button class="gp-pick ${f.course ? 'on' : ''}" onclick="Group.pickCourse()">${f.course ? '⛳ ' + U.esc(f.course.name) : '골프장 검색하기'}</button>
          <label>날짜</label>
          <input id="gp-date" type="date" value="${U.esc(f.date)}">
          <label>내 이름 (총무) <span class="gp-hint">조에 같은 이름이 있으면 그 자리가 내 자리</span></label>
          <input id="gp-me" maxlength="20" placeholder="참석자들이 알아볼 이름" value="${U.esc(f.me)}">

          <label>조편성 <span class="gp-hint">비운 티업은 앞 조 +${this.TEAM_GAP}분 · 전화번호를 넣으면 개인 문자로도 보낼 수 있어요</span></label>
          <div class="gi-imp"><button type="button" class="hl" onclick="Group.importPhoto()">📷 사진으로 넣기</button><button type="button" onclick="Group.importPaste()">📋 붙여넣기</button></div>
          <div class="gi-hint">종이 조편성표·카톡 공지를 찍거나 붙이면 <b>이름·조·전화번호</b>를 알아서 채워요. 넣기 전에 확인 화면이 나와요.</div>
          <input type="file" id="gi-file" accept="image/*" hidden onchange="Group.onImportFile(this)">
          ${teamHtml}
          ${f.teams.length < this.MAX_TEAMS ? `<button class="gt-add" onclick="Group.addTeam()">＋ ${f.teams.length + 1}조 추가</button>` : ''}

          <label>아침 식사 <span class="gp-hint">같이 먹는다면 · 식사 시간에 맞춰 기상 시간을 계산해요</span></label>
          <button class="gp-pick ${f.meal ? 'on' : ''}" onclick="Group.pickTeamMeal()">${f.meal ? '🍲 ' + U.esc(f.meal.name) : '식당 검색하기'}</button>
          ${f.meal ? `<div class="gp-row2" style="margin-top:8px"><div><label style="margin-top:0">식사 시작</label><input id="gp-mealtime" type="time" value="${U.esc(f.mealTime || this._minus(this._teeOf(0), 80))}"></div><div style="display:flex;align-items:flex-end"><button class="gp-link" onclick="Group.clearTeamMeal()">아침 식사 빼기</button></div></div>` : ''}

          <label>공지 메모 <span class="gp-hint">선택</span></label>
          <textarea id="gp-memo" rows="2" maxlength="300" placeholder="예) 회비 5만원, 비 오면 단톡방 공지">${U.esc(f.memo)}</textarea>
          <button class="gp-btn navy" id="gp-save" onclick="Group.saveTeamForm()">조편성 만들기</button>
          <div class="gp-note" style="text-align:center">만든 뒤 카톡 단톡방에 링크 하나만 보내면, 각자 이름을 눌러 자기 조·티업·기상 시간을 봐요.</div>
        </div>
      </div>`;
  },
  /* ── 명단·조편성 가져오기: 📋 붙여넣기 · 📷 사진 → 확인 화면 → 조편성표에 넣기 ── */
  imp: null,
  importPaste() {
    this._readTeamForm();
    const old = U.$('#gi-sheet'); if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', `
      <div class="gi-sheet-dim" id="gi-sheet" onclick="if(event.target===this)this.remove()">
        <div class="gi-sheet">
          <h3>명단·조편성 붙여넣기</h3>
          <p>카톡 공지·메모·엑셀 칸을 그대로 붙여 주세요. 조와 사람을 나눠서 보여 드려요.</p>
          <textarea id="gi-text" placeholder="예)\n1조 07:00 김프로 010-1234-5678, 이버디, 박이글, 최파\n2조 07:07 정보기 / 강홀인원 / 조캐디 / 윤그린"></textarea>
          <div class="gi-chips"><span>1. 홍길동</span><span>홍길동 010-…</span><span>1조: 김·이·박·최</span><span>엑셀 복사</span></div>
          <div class="gp-two"><button class="gp-btn line" onclick="U.$('#gi-sheet').remove()">취소</button><button class="gp-btn navy" onclick="Group.applyPaste()">읽어서 확인하기</button></div>
        </div>
      </div>`);
    setTimeout(() => { const x = U.$('#gi-text'); if (x) x.focus(); }, 80);
  },
  applyPaste() {
    const x = U.$('#gi-text'); const text = x ? x.value : '';
    const teams = this.parseLineup(text);
    if (!teams.length) { U.toast('이름을 찾지 못했어요. 이름을 줄바꿈이나 쉼표로 나눠 붙여 주세요.'); return; }
    const s = U.$('#gi-sheet'); if (s) s.remove();
    this.imp = { source: 'paste', teams, photo: null, loading: false };
    this.view = 'import'; this.render();
  },

  /** 붙여넣은 글 → [{tee, course, members:[{name, phone, unsure}]}] (조 표시가 없으면 4명씩 나눔) */
  parseLineup(text) {
    const PHONE = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g;
    const STOP = /^(티업|티오프|티타임|집결|집합|시간|명단|참석|참석자|불참|조편성|조|팀|코스|번|님들|회비|공지|원|만원|일시|장소|오전|오후|AM|PM|회장|회장님|총무|총무님|고문|감사|클럽하우스|로비|당일|현장|납부|입금|계좌|정기모임|모임|라운딩|골프|골프장|카트|캐디|캐디피|그린피|식사|조식|중식|석식|뒤풀이|문의|연락|부탁|참고|필참|확정|예정|변경|안내|및|등)$/i;
    const teams = []; let cur = null; let loose = [];
    const newTeam = () => { cur = { tee: '', course: '', members: [] }; teams.push(cur); return cur; };
    const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(raw => {
      let line = raw.replace(/^[\s\-•·*▶▷►◆◇■□●○✔✓]+/, '');
      const head = /^(?:\[)?\s*(\d{1,2}|[A-Za-z])\s*(조|팀)\s*(?:\])?\s*[:：.)\-]?\s*/.exec(line);
      if (!head) {
        // 공지 속 안내 줄은 건너뜀: [제목] · ※★📌 메모 · '장소: …' 같은 항목 줄 · 금액 · '…해 주세요' 같은 문장
        if (/^[\[<(（【※★☆⭐📌📍✅❗❕💡🔔]/u.test(line)) return;
        if (/\d\s*(만\s*)?원\b|\d+만원/.test(line)) return;
        if (/(니다|세요|해요|주세요|바랍니다|드림|부탁)[.!~)]*\s*$/.test(line)) return;
      }
      if (head) { newTeam(); line = line.slice(head[0].length); }
      const tm = /(?:^|\s|\()([01]?\d|2[0-3])\s*[:시]\s*([0-5]\d)\s*(?:분)?/.exec(line);
      if (tm) { if (!cur) newTeam(); if (!cur.tee) cur.tee = `${String(tm[1]).padStart(2, '0')}:${tm[2]}`; line = line.replace(tm[0], ' '); }
      if (!head && /[:：]/.test(line)) return;                                  // '장소: 클럽하우스 로비' 같은 항목 줄
      const target = () => cur || { members: loose, course: '' };
      // 전화번호는 바로 앞 이름에 붙임
      const parts = line.split(PHONE); const phones = line.match(PHONE) || [];
      parts.forEach((seg, i) => {
        const toks = seg.split(/[,，、/|·\t;]+|\s+/).map(s => s.replace(/^\(?\d{1,2}[.)]\s*/, '').replace(/^[(（\[]+|[)）\]:：.]+$/g, '').trim()).filter(Boolean);
        toks.forEach(tok0 => {
          let tok = tok0;
          if (/^(OUT|IN|out|in)$/.test(tok) || /(코스|OUT|IN)$/.test(tok) && tok.length <= 8 && !/[0-9]/.test(tok)) { const T = target(); if (!T.course) T.course = tok; return; }
          if (STOP.test(tok) || /^\d+$/.test(tok) || (tok.length < 2 && !/^[가-힣]$/.test(tok)) || tok.length > 12) return;   // '김·이·박' 처럼 성만 적어도 받음
          if (!/^[가-힣A-Za-z][가-힣A-Za-z0-9.]*$/.test(tok)) return;
          if (/[가-힣]{2,}님$/.test(tok)) tok = tok.slice(0, -1);                  // '김프로님' → '김프로'
          if (STOP.test(tok)) return;
          target().members.push({ name: tok, phone: '', unsure: tok.length === 1 });
        });
        if (phones[i]) { const T = target(); const last = T.members[T.members.length - 1]; if (last && !last.phone) last.phone = phones[i].replace(/[^0-9]/g, ''); }
      });
    });
    // 조 표시 없이 이름만 → 4명씩 나눔
    if (loose.length) { for (let i = 0; i < loose.length; i += 4) teams.push({ tee: '', course: '', members: loose.slice(i, i + 4) }); }
    // 같은 이름 두 번은 한 번만
    const seen = new Set();
    teams.forEach(tm => { tm.members = tm.members.filter(m => { if (seen.has(m.name)) return false; seen.add(m.name); return true; }); });
    return teams.filter(tm => tm.members.length).slice(0, this.MAX_TEAMS);
  },

  importPhoto() {
    if (!this.signedIn()) { U.toast('사진으로 넣기는 로그인한 총무만 쓸 수 있어요.'); return; }
    this._readTeamForm();
    const f = U.$('#gi-file'); if (f) { f.value = ''; f.click(); }
  },
  async onImportFile(input) {
    const file = input && input.files && input.files[0]; if (!file) return;
    let dataUrl;
    try { dataUrl = await this._shrinkImage(file, 1600); } catch (e) { U.toast('사진을 열지 못했어요. 다른 사진으로 해 주세요.'); return; }
    this.imp = { source: 'photo', teams: [], photo: dataUrl, loading: true };
    this.view = 'import'; this.render();
    try {
      const { url, key } = Cloud.cfg();
      const token = await Cloud._freshToken();
      const r = await fetch(`${url}/functions/v1/group-import`, {
        method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl.split(',')[1], mime: 'image/jpeg' })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || (d.error === 'login_required' ? '로그인이 풀렸어요. 다시 로그인해 주세요.' : '사진을 읽지 못했어요. 잠시 후 다시 해 주세요.'));
      if (!this.imp || this.view !== 'import') return;
      this.imp.teams = Array.isArray(d.teams) ? d.teams : [];
      this.imp.loading = false;
      if (!this.imp.teams.length) this.imp.err = '사진에서 이름을 찾지 못했어요. 글씨가 잘 보이게 다시 찍거나 붙여넣기를 써 주세요.';
    } catch (e) {
      if (!this.imp) return;
      this.imp.loading = false; this.imp.err = String(e.message || '사진을 읽지 못했어요.');
    }
    if (this.view === 'import') this.render();
  },
  /** 큰 사진을 긴 변 max px JPEG 로 줄임 (전송 빠르게) */
  _shrinkImage(file, max) {
    return new Promise((res, rej) => {
      const img = new Image(); const u = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.85));
        } catch (e) { rej(e); }
      };
      img.onerror = (e) => { URL.revokeObjectURL(u); rej(e); };
      img.src = u;
    });
  },

  renderImport(el) {
    const im = this.imp || { teams: [] };
    const n = im.teams.reduce((a, t) => a + t.members.length, 0);
    const ph = im.teams.reduce((a, t) => a + t.members.filter(m => m.phone).length, 0);
    const unsure = im.teams.flatMap(t => t.members.filter(m => m.unsure).map(m => m.name));
    const again = im.source === 'photo' ? `<button class="gp-btn line" onclick="Group.importPhoto()">📷 다시 찍기</button>` : `<button class="gp-btn line" onclick="Group.view='create';Group.render();Group.importPaste()">📋 다시 붙여넣기</button>`;
    el.innerHTML = `
      <div class="gp-wrap">
        <div class="gp-top"><button class="gp-back" onclick="Group.cancelImport()">‹ 조편성으로</button>
          <div class="gp-top-t">읽은 결과 확인</div>
          <div class="gp-top-m">${im.loading ? 'AI가 사진을 읽고 있어요… (10초쯤)' : im.err ? '다시 해 볼까요?' : `${im.teams.length}개 조 · ${n}명${ph ? ` · 전화번호 ${ph}개` : ''}를 찾았어요`}</div></div>
        <div class="gp-sec">
          ${im.photo ? `<img class="gi-photo" src="${im.photo}" alt="찍은 사진">` : ''}
          ${im.loading ? `<div class="gp-empty"><span class="dots"><span></span><span></span><span></span></span><br>이름·조·전화번호를 찾는 중이에요</div>` : im.err ? `<div class="gi-warn">${U.esc(im.err)}</div>${again}` : `
          ${unsure.length ? `<div class="gi-warn">⚠️ ${im.source === 'photo' ? '손글씨라 ' : ''}<b>${unsure.map(U.esc).join(', ')}</b>${unsure.length > 1 ? '은(는)' : '은(는)'} 확실하지 않아요. 맞는지 확인해 주세요.</div>` : ''}
          <div class="gi-note">이름을 눌러 고칠 수 있어요. 지우면 빠져요. 한 조는 4명까지예요.</div>
          ${im.teams.map((tm, i) => `
            <div class="gi-team">
              <div class="gi-h"><b>${i + 1}조</b><span><input id="gi-${i}-tee" type="time" value="${U.esc(tm.tee || '')}" aria-label="${i + 1}조 티업">${tm.course ? ` · ${U.esc(tm.course)}` : ''}</span></div>
              ${tm.members.map((m, j) => `<div class="gi-r ${m.unsure ? 'warn' : ''}"><input id="gi-${i}-n${j}" maxlength="20" value="${U.esc(m.name)}" aria-label="${i + 1}조 ${j + 1}번 이름"><input id="gi-${i}-p${j}" type="tel" inputmode="tel" maxlength="13" placeholder="전화 (선택)" value="${U.esc(m.phone || '')}" aria-label="${i + 1}조 ${j + 1}번 전화"></div>`).join('')}
            </div>`).join('')}
          <button class="gp-btn navy" onclick="Group.applyImport()">조편성표에 넣기</button>
          ${again}`}
        </div>
      </div>`;
  },
  cancelImport() { this.imp = null; this.view = 'create'; this.render(); },
  applyImport() {
    const im = this.imp; const f = this.form; if (!im || !f) return;
    const v = id => { const x = U.$('#' + id); return x ? x.value.trim() : ''; };
    // 확인 화면에서 고친 값 읽기 · 한 조 4명이 넘으면 다음 조로 넘김
    const out = [];
    im.teams.forEach((tm, i) => {
      const ms = tm.members.map((m, j) => ({ name: v(`gi-${i}-n${j}`), phone: v(`gi-${i}-p${j}`).replace(/[^0-9]/g, '') })).filter(m => m.name);
      const tee = v(`gi-${i}-tee`);
      for (let k = 0; k < ms.length; k += 4) out.push({ tee: k === 0 && /^\d{2}:\d{2}$/.test(tee) ? tee : '', course: tm.course || '', members: ms.slice(k, k + 4) });
    });
    if (!out.length) { U.toast('넣을 이름이 없어요.'); return; }
    const filled = f.teams.some((t, i) => t.members.some((m, j) => m.name && !(i === 0 && j === 0 && m.name === f.me)));
    if (filled && !confirm('지금 적어 둔 조편성을 읽은 결과로 바꿀까요?')) return;
    const teams = out.slice(0, this.MAX_TEAMS).map(o => {
      const t = this._emptyTeam(); t.tee = o.tee; t.course = o.course;
      o.members.forEach((m, j) => { t.members[j] = { name: m.name, phone: m.phone }; });
      return t;
    });
    if (!teams[0].tee) teams[0].tee = (f.teams[0] && f.teams[0].tee) || '07:00';
    f.teams = teams;
    const lost = out.length > this.MAX_TEAMS;
    this.imp = null; this.view = 'create'; this.render();
    U.toast(lost ? `조가 ${this.MAX_TEAMS}개를 넘어서 앞의 ${this.MAX_TEAMS}개 조만 넣었어요.` : '조편성표에 넣었어요. 티업 시간과 이름을 한 번 더 확인해 주세요.', 3200);
  },

  _readTeamForm() {
    const v = id => { const x = U.$('#' + id); return x ? x.value : null; };
    const f = this.form; if (!f) return;
    if (v('gp-title') !== null) f.title = v('gp-title');
    if (v('gp-date') !== null) f.date = v('gp-date');
    const prevMe = f.me;
    if (v('gp-me') !== null) f.me = v('gp-me');
    if (v('gp-memo') !== null) f.memo = v('gp-memo');
    if (v('gp-mealtime') !== null) f.mealTime = v('gp-mealtime');
    // 1조 1번 칸에 미리 채워 둔 내 이름은 '내 이름(총무)'을 고치면 같이 바뀜 (명단에 두 번 들어가지 않게)
    const first = f.teams[0] && f.teams[0].members[0];
    const firstEl = U.$('#gt-0-n0');
    if (first && prevMe && f.me !== prevMe && firstEl && firstEl.value === prevMe) firstEl.value = f.me;
    f.teams.forEach((t, i) => {
      // 자동으로 채워 보인 값(앞 조 +7분)은 저장하지 않음 → 앞 조를 바꾸면 따라감
      const el = U.$(`#gt-${i}-tee`);
      if (el) { const auto = el.dataset.auto || ''; t.tee = (!t.tee && auto && el.value === auto) ? '' : el.value; }
      const c = v(`gt-${i}-course`); if (c !== null) t.course = c;
      t.members.forEach((m, j) => {
        const n = v(`gt-${i}-n${j}`); if (n !== null) m.name = n;
        const ph = v(`gt-${i}-p${j}`); if (ph !== null) m.phone = ph;
      });
    });
  },
  teamTee() { this._readTeamForm(); this.render(); },
  addTeam() {
    this._readTeamForm();
    if (this.form.teams.length >= this.MAX_TEAMS) return;
    this.form.teams.push(this._emptyTeam());
    this.render();
    setTimeout(() => { const x = U.$(`#gt-${this.form.teams.length - 1}-n0`); if (x) x.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 50);
  },
  async delTeam(i) {
    this._readTeamForm();
    const t = this.form.teams[i];
    if (t.members.some(m => m.name.trim()) && !(await App.ask(`${i + 1}조를 뺄까요?`, '이 조에 적은 이름도 같이 지워져요.', { ok: '빼기' }))) return;
    this.form.teams.splice(i, 1);
    this.render();
  },
  pickTeamMeal() {
    this._readTeamForm();
    App.openAddressSearch('🍲 아침 식당 검색', (p) => {
      this.form.meal = { name: p.name || p.place_name, lat: parseFloat(p.lat), lng: parseFloat(p.lng) };
      this.render();
    });
  },
  clearTeamMeal() { this._readTeamForm(); this.form.meal = null; this.form.mealTime = ''; this.render(); },
  async saveTeamForm() {
    this._readTeamForm();
    const f = this.form;
    const focus = (id, msg) => { U.toast(msg); const x = U.$('#' + id); if (x) { x.focus(); x.scrollIntoView({ block: 'center' }); } };
    if (!f.title.trim()) return focus('gp-title', '모임 이름을 적어 주세요.');
    if (!f.course) return U.toast('골프장을 골라 주세요.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return focus('gp-date', '날짜를 골라 주세요.');
    { const t = new Date(); const ymd = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      if (f.date < ymd) return focus('gp-date', '이미 지난 날짜예요. 날짜를 다시 골라 주세요.'); }
    if (!f.me.trim()) return focus('gp-me', '내 이름(총무)을 적어 주세요.');
    const teams = f.teams.map((t, i) => ({
      tee: this._teeOf(i), course: (t.course || '').trim(),
      members: t.members.map(m => ({ name: m.name.trim(), phone: m.phone.replace(/[^0-9]/g, '') })).filter(m => m.name)
    }));
    // 뒤쪽 빈 조는 빼고 보냄 (중간 빈 조는 조 번호 유지를 위해 둠)
    while (teams.length > 1 && !teams[teams.length - 1].members.length) teams.pop();
    if (!teams.some(t => t.members.length)) return focus('gt-0-n0', '조에 이름을 한 명 이상 적어 주세요.');
    const noTee = teams.findIndex(t => t.members.length && !/^\d{2}:\d{2}$/.test(t.tee));
    if (noTee >= 0) return focus(`gt-${noTee}-tee`, `${noTee + 1}조 티업 시간을 넣어 주세요.`);
    const names = teams.flatMap(t => t.members.map(m => m.name));
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) return U.toast(`'${dup}' 이름이 두 번 들어 있어요. 동명이인은 '김프로2'처럼 구분해 주세요.`, 3500);
    const badPhone = teams.flatMap(t => t.members).find(m => m.phone && !/^0\d{8,10}$/.test(m.phone));
    if (badPhone) return U.toast(`${badPhone.name}님 전화번호를 다시 확인해 주세요.`);
    const mealTime = f.meal ? (/^\d{2}:\d{2}$/.test(f.mealTime) ? f.mealTime : this._minus(teams[0].tee, 80)) : null;
    const btn = U.$('#gp-save'); if (btn) { btn.disabled = true; btn.textContent = '만드는 중…'; }
    try {
      const r = await this.rpc('ge_create_teams', { p_title: f.title, p_course: f.course, p_date: f.date, p_owner_name: f.me, p_teams: teams, p_memo: f.memo || null, p_meal_before: f.meal || null, p_meal_time: mealTime });
      if (!r || !r.ok) throw new Error(r && r.error);
      localStorage.setItem('bp_user_name', localStorage.getItem('bp_user_name') || f.me);
      U.toast('조편성을 만들었어요. 카톡 단톡방에 보내 보세요!');
      this.openCode(r.code);
    } catch (e) {
      const m = String(e && e.message || '');
      U.toast(m.includes('too_many') ? '오늘은 더 만들 수 없어요. 내일 다시 해 주세요.' : '만들지 못했어요. 잠시 후 다시 시도해 주세요.');
      if (btn) { btn.disabled = false; btn.textContent = '조편성 만들기'; }
    }
  },

  _readForm() {
    const v = id => (U.$('#' + id) || {}).value;
    const f = this.form;
    f.title = v('gp-title') || ''; f.date = v('gp-date') || ''; f.tee = v('gp-tee') || ''; f.meet = v('gp-meet') || '';
    f.memo = v('gp-memo') || ''; f.names = v('gp-names') || ''; if (U.$('#gp-me')) f.me = v('gp-me') || '';
    if (f.teams) {
      f.teams.forEach((t, i) => { if (U.$(`#gp-et-${i}-tee`)) { t.tee = v(`gp-et-${i}-tee`) || ''; t.course = v(`gp-et-${i}-course`) || ''; } });
      const firsts = f.teams.map(t => t.tee).filter(x => /^\d{2}:\d{2}$/.test(x)).sort();
      f.tee = firsts[0] || f.tee;
      if (U.$('#gp-mealtime')) f.mealTime = v('gp-mealtime') || '';
    }
  },
  cancelForm() { this.view = this.view === 'edit' ? 'detail' : 'list'; this.render(); if (this.view === 'list') this.loadList(); },
  pickCourse() {
    if (this.form && this.form.mode === 'teams') this._readTeamForm(); else this._readForm();
    App.openAddressSearch('⛳ 골프장 검색', (p) => {
      this.form.course = { name: p.name || p.place_name, lat: parseFloat(p.lat), lng: parseFloat(p.lng), addr: p.address || p.address_name || '' };
      this.render();
    });
  },
  pickMeal(t) {
    this._readForm();
    App.openAddressSearch(t === 'before' ? '🍲 아침 식당 검색' : '🍻 뒤풀이 식당 검색', (p) => {
      const r = { name: p.name || p.place_name, lat: parseFloat(p.lat), lng: parseFloat(p.lng) };
      if (t === 'before') this.form.mealBefore = r; else this.form.mealAfter = r;
      this.render();
    });
  },
  clearMeal(t) { this._readForm(); if (t === 'before') this.form.mealBefore = null; else this.form.mealAfter = null; this.render(); },
  _names(s) { return String(s || '').split(/[\n,，、]+/).map(x => x.trim()).filter(Boolean).slice(0, 39); },

  async saveForm() {
    this._readForm();
    const f = this.form;
    if (!f.title.trim()) return U.toast('모임 이름을 적어 주세요.');
    if (this.view === 'create' && !f.course) return U.toast('골프장을 골라 주세요.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return U.toast('날짜를 골라 주세요.');
    { const t = new Date(); const p = n => String(n).padStart(2, '0'); const ymd = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
      if (this.view === 'create' && f.date < ymd) return U.toast('이미 지난 날짜예요. 날짜를 다시 골라 주세요.'); }   // 지난 모임도 메모·조편성은 고칠 수 있게
    if (!/^\d{2}:\d{2}$/.test(f.tee)) return U.toast('티오프 시간을 골라 주세요.');
    if (this.view === 'create' && !f.me.trim()) return U.toast('내 이름(총무)을 적어 주세요.');
    const meet = /^\d{2}:\d{2}$/.test(f.meet) ? f.meet : this._minus(f.tee, 30);
    const btn = U.$('#gp-save'); if (btn) btn.disabled = true;
    try {
      if (this.view === 'create') {
        const r = await this.rpc('ge_create', { p_title: f.title, p_course: f.course, p_date: f.date, p_tee: f.tee, p_owner_name: f.me, p_names: this._names(f.names), p_meet: meet, p_memo: f.memo || null });
        if (!r || !r.ok) throw new Error(r && r.error);
        localStorage.setItem('bp_user_name', localStorage.getItem('bp_user_name') || f.me);
        U.toast('단체 일정을 만들었어요. 카톡으로 보내 보세요!');
        this.openCode(r.code);
      } else {
        const r = await this.rpc('ge_update', { p_id: this.ev.id, p_title: f.title, p_date: f.date, p_tee: f.tee, p_meet: meet, p_memo: f.memo || null, p_meal_before: f.mealBefore || null, p_meal_after: f.mealAfter || null });
        if (!r || !r.ok) throw new Error(r && r.error);
        if (f.teams) {
          await this.rpc('ge_set_teams', { p_id: this.ev.id, p_teams: f.teams.map(t => ({ tee: t.tee, course: t.course })) });
          await this.rpc('ge_set_meal_time', { p_id: this.ev.id, p_meal_time: f.mealBefore && /^\d{2}:\d{2}$/.test(f.mealTime) ? f.mealTime : null });
        }
        const add = this._names(f.names);
        if (add.length) await this.rpc('ge_add_members', { p_id: this.ev.id, p_names: add });
        U.toast('저장했어요. 바뀐 내용은 카톡으로 다시 알려 주세요.');
        this.view = 'detail'; this.load();
      }
    } catch (e) {
      U.toast('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      if (btn) btn.disabled = false;
    }
  },
  startEdit() {
    const e = this.ev; if (!e || !e.i_am_owner) return;
    this.form = { title: e.title, course: e.course, date: e.round_date, tee: e.tee_off, meet: e.meet_time || '', memo: e.memo || '', names: '', mealBefore: e.meal_before, mealAfter: e.meal_after,
      teams: this._hasTeamTimes() ? e.teams.map(t => ({ no: t.no, tee: t.tee || '', course: t.course || '' })) : null, mealTime: e.meal_time || '' };
    this.view = 'edit'; this.render();
  },
  addEditTeam() {
    this._readForm();
    const T = this.form.teams; if (!T || T.length >= this.MAX_TEAMS) return;
    const last = T[T.length - 1];
    T.push({ no: T.length + 1, tee: last && last.tee ? this._addMin(last.tee, this.TEAM_GAP) : '', course: '' });
    this.render();
  },
  async remove() {
    if (!confirm('단체 일정을 삭제할까요? 참석 응답과 톡방 내용도 모두 지워져요.')) return;
    try { await this.rpc('ge_delete', { p_id: this.ev.id }); U.toast('삭제했어요.'); this.code = null; this.ev = null; this.openList(); }
    catch (e) { U.toast('삭제하지 못했어요.'); }
  },

  /* ── 상세 (우리 조 시간표) ── */
  renderDetail(el) {
    const e = this.ev;
    if (!e) {
      el.innerHTML = `<div class="gp-wrap"><div class="gp-top"><button class="gp-back" onclick="Group.openList()">‹ 단체 일정</button><div class="gp-top-t">단체 일정</div></div>
        <div class="gp-empty">${this.loading || !this.err ? '불러오는 중…' : U.esc(this.err)}</div></div>`;
      return;
    }
    const owner = e.i_am_owner;
    // 웹(카톡 브라우저)으로 연 참석자: 앱 설치가 기본 → 안내 화면 먼저 ('설치 없이 보기'를 누르면 아래 화면)
    if (!owner && !U.isNativeApp() && !this._isLite()) return this._renderWebLanding(el, e);
    const me = this.pickId ? this._member(this.pickId) : null;
    const yes = e.members.filter(m => m.status === 'yes').length;
    const meet = e.meet_time || this._minus(e.tee_off, 30);
    const teamMode = this._hasTeamTimes();

    // 조별로 묶기
    const teams = {};
    e.members.forEach(m => { const k = m.team_no || 0; (teams[k] = teams[k] || []).push(m); });
    const teamKeys = Object.keys(teams).map(Number).sort((a, b) => (a || 99) - (b || 99));
    const hasTeams = teamKeys.some(k => k > 0);
    const rows = (list) => list.map(m => `
      <div class="gp-mem ${owner ? 'tap' : ''} ${me && me.id === m.id ? 'me' : ''}" ${owner ? `onclick="Group.openAssign(${m.id})"` : ''}>
        ${this._avatar(m.name)}
        <div class="gp-mem-info"><div class="gp-mem-n">${U.esc(m.name)}${m.is_owner ? ' <span class="gp-badge">총무</span>' : ''}${me && me.id === m.id ? ' <span class="gp-badge sub">나</span>' : ''}</div>
          <div class="gp-mem-r">${this._moveText(m)}</div></div>
        ${owner && m.phone && !m.is_owner ? `<button class="gp-sms" onclick="Group.smsMember(${m.id}, event)" aria-label="${U.esc(m.name)}님에게 문자">문자</button>` : ''}
        ${this._statusChip(m)}
      </div>`).join('');
    const membersHtml = teamKeys.map(k => `
      ${hasTeams ? `<div class="gp-team">${k ? this._teamLabel(k) : '조 미정'}${owner && k && teams[k].some(m => m.phone && !m.is_owner) ? `<button class="gp-sms team" onclick="Group.smsTeam(${k})">이 조에 문자</button>` : ''}</div>` : ''}
      <div class="gp-card">${rows(teams[k])}</div>`).join('');

    // 차량
    const drivers = e.members.filter(m => m.transport === 'self' && m.status !== 'no');
    const cars = drivers.map(d => {
      const riders = e.members.filter(x => x.car_driver_id === d.id);
      return `<div class="gp-car-row"><b>🚗 ${U.esc(d.name)} 차</b><span>${riders.length ? riders.map(r => U.esc(r.name) + (r.ride_note ? `(${U.esc(r.ride_note)})` : '')).join(', ') : '혼자'}</span></div>`;
    }).join('');
    const needRide = e.members.filter(m => m.transport === 'ride' && !m.car_driver_id && m.status !== 'no');

    // 총무가 바꾼 내용 / 내 일정과 다른 점 안내
    const notices = this._noticesHTML(e, me);

    // 내 응답 패널 (총무가 아닐 때)
    const pending = e.members.filter(m => !m.is_owner && m.status !== 'yes' && m.status !== 'no');
    const ownerMe = owner ? e.members.find(m => m.is_owner) : null;
    let myPanel = owner ? `${teamMode && ownerMe && ownerMe.team_no ? this._myCardHTML(ownerMe) : ''}${pending.length ? `<button class="gp-btn navy" style="margin:0 0 8px" onclick="Group.share('remind')">🔔 아직 답 안 한 ${pending.length}명에게 다시 알리기</button>` : ''}
      <button class="gp-btn line" style="margin:0 0 12px" onclick="Group.addToMine()">📅 내 일정에도 등록 (출발 시간·알람 계산)</button>` : '';
    if (!owner) {
      if (!me) {
        const choices = e.members.filter(m => !m.is_owner);
        myPanel = `
          <div class="gp-ask">
            <div class="gp-lab">나는 누구인가요?</div>
            <div class="gp-pickrow">${choices.map(m => `<button class="${m.claimed ? 'taken' : ''}" onclick="Group.pickMe(${m.id})">${U.esc(m.name)}${m.claimed ? ' ✓' : ''}</button>`).join('')}
              <button class="add" onclick="Group.joinSelf()">＋ 명단에 없어요</button></div>
            <div class="gp-note">✓ 표시는 이미 다른 기기에서 고른 이름이에요.</div>
          </div>`;
      } else {
        const t = me.transport;
        myPanel = `
          ${teamMode ? this._myCardHTML(me) : ''}
          ${this._quickAddHTML(me)}
          <div class="gp-ask">
            <div class="gp-lab">${U.esc(me.name)}님, 어떻게 가세요? <button class="gp-link" onclick="Group.unpick()">내가 아니에요</button></div>
            <div class="gp-opt ${t === 'self' ? 'on' : ''}" onclick="Group.setMove('self')"><div class="gp-rd"></div><div>내 차로 직접 가요<small>같이 탈 사람은 단체 톡방에서 얘기해요</small></div></div>
            <div class="gp-opt ${t === 'ride' ? 'on' : ''}" onclick="Group.setMove('ride')"><div class="gp-rd"></div><div>다른 사람 차 타고 싶어요<small>총무가 차를 정해 줘요</small></div></div>
            ${t === 'ride' ? `<input id="gp-ridenote" class="gp-input" maxlength="40" placeholder="어디서 타면 좋을지 (예: 수원역)" value="${U.esc(me.ride_note || '')}">` : ''}
            <div class="gp-two">
              <button class="gp-btn navy" onclick="Group.respond('yes')">${me.status === 'yes' ? '✅ 참석 (수정 저장)' : '✅ 참석'}</button>
              <button class="gp-btn line" onclick="Group.respond('no')">${me.status === 'no' ? '불참으로 응답함' : '이번엔 못 가요'}</button>
            </div>
            ${me.status === 'yes' ? `<button class="gp-btn line" onclick="Group.addToMine()">📅 내 일정에 등록 (출발 시간·알람 계산)</button>` : ''}
          </div>`;
      }
    }

    // ── 2026.11 개편 화면 ──
    const no = e.members.filter(m => m.status === 'no').length;
    const wait = e.members.length - yes - no;
    const rd = new Date(e.round_date + 'T00:00:00'); const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const dd = Math.round((rd - t0) / 864e5);
    const nTeams = [...new Set(e.members.map(m => m.team_no).filter(Boolean))].length;
    const back = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
    const chip = (m) => `<button class="v2-gp-chip ${m.status === 'yes' ? 'yes' : m.status === 'no' ? 'no' : 'wait'}${me && me.id === m.id ? ' me' : ''}" ${owner ? `onclick="Group.openAssign(${m.id})"` : ''}>${U.esc(m.name)}${m.is_owner ? ' · 총무' : ''}</button>`;
    const teamRows = teamKeys.filter(k => k > 0).map(k => {
      const t = this._teamMeta(k);
      const names = teams[k].map(m => U.esc(m.name) + (m.status === 'no' ? '(불참)' : '')).join(' · ');
      return `<div class="v2-gp-team"><b>${k}조</b><span>${names}${t && t.course ? ` <em>${U.esc(t.course)}</em>` : ''}</span><i>${U.esc((t && t.tee) || e.tee_off || '')}</i>
        ${owner && teams[k].some(m => m.phone && !m.is_owner) ? `<button class="v2-link" style="font-size:0.8125rem; padding:0 0 0 6px;" onclick="Group.smsTeam(${k})">문자</button>` : ''}</div>`;
    }).join('');
    const unassigned = (teams[0] || []).filter(m => m.status !== 'no');
    const carRows = drivers.map(d => {
      const riders = e.members.filter(x => x.car_driver_id === d.id);
      return `<div class="v2-gp-car"><span>${U.esc(d.name)} 차${riders.length ? ` · ${riders.map(r => U.esc(r.name)).join(', ')}` : ''}</span><b class="${riders.length ? '' : 'ok'}">${riders.length ? `${riders.length}명 탑승` : '혼자 가요'}</b></div>`;
    }).join('');

    el.innerHTML = `
      <div class="v2-pagehead">
        <button class="v2-iconbtn" style="margin-left:-10px;" onclick="Group.openList()" aria-label="뒤로가기">${back}</button>
        <h1 style="font-size:1.25rem; flex:1;">단체 일정</h1>
        ${owner ? `<button class="v2-link" style="padding:8px;" onclick="Group.startEdit()">수정</button>` : ''}
      </div>
      <div class="v2-scroll"><div class="v2-body">
        <div class="v2-gp-hero">
          <div class="tag">${owner ? '내가 총무' : '참석 일정'} · ${dd > 0 ? 'D-' + dd : dd === 0 ? 'D-Day' : '지난 일정'}</div>
          <h3>${U.esc(e.title)}</h3>
          <div class="sub">${this._date(e.round_date)} · ${U.esc(e.course.name)} · ${U.esc(e.tee_off)}${nTeams ? ` · ${nTeams}팀` : ''}</div>
          <div class="stats">
            <div class="yes"><span>참석</span><b>${yes}</b></div>
            <div class="no"><span>불참</span><b>${no}</b></div>
            <div class="wait"><span>미응답</span><b>${wait}</b></div>
          </div>
          <div class="btns">
            <button class="kakao" onclick="Group.share()">${owner ? '카톡으로 링크 보내기' : '카톡으로 공유하기'}</button>
            ${owner && pending.length ? `<button class="white" onclick="Group.share('remind')">미응답 ${pending.length}명 다시 알림</button>` : `<button class="white" onclick="Group.openChat()">단체 톡방${e.chat_count ? ` (${e.chat_count})` : ''}</button>`}
          </div>
        </div>
        ${notices}
        ${!owner ? myPanel : (teamMode && ownerMe && ownerMe.team_no ? this._myCardHTML(ownerMe) : '')}
        <div class="v2-card">
          <div class="v2-gp-h"><b>참석자</b><span>받은 링크로 로그인 없이 응답해요</span></div>
          <div class="v2-gp-chips">${e.members.map(chip).join('')}</div>
          ${owner ? `<p class="v2-hint" style="margin-top:10px;">이름을 누르면 조와 차를 정할 수 있어요.</p>` : ''}
        </div>
        ${hasTeams || owner ? `<div class="v2-card">
          <div class="v2-gp-h"><b>조 편성</b>${owner ? `<button class="v2-gp-mini" onclick="Group.startEdit()">조 편성 수정</button>` : ''}</div>
          ${teamRows || '<p class="v2-hint" style="margin:0;">아직 조를 정하지 않았어요.</p>'}
          ${unassigned.length && hasTeams ? `<div class="v2-gp-team"><b style="color:#64748b;">미정</b><span>${unassigned.map(m => U.esc(m.name)).join(' · ')}</span><i></i></div>` : ''}
        </div>` : ''}
        <div class="v2-card">
          <div class="v2-gp-h"><b>차량 · 카풀</b></div>
          ${carRows || '<p class="v2-hint" style="margin:0 0 4px;">아직 직접 운전하는 사람이 없어요.</p>'}
          ${needRide.length ? `<p class="v2-hint" style="margin-top:8px;">차 없는 참석자 ${needRide.length}명 · ${needRide.map(r => U.esc(r.name) + (r.ride_note ? `(${U.esc(r.ride_note)})` : '')).join(', ')} · 카풀을 정하면 각자 출발 시간도 바뀌어요</p>` : ''}
        </div>
        <div class="v2-card" style="padding:14px 18px;">
          ${teamMode ? `<div class="v2-gp-info"><span>조별 티업</span><b>${e.teams.filter(t => t.tee && e.members.some(m => m.team_no === t.no)).map(t => `${t.no}조 ${U.esc(t.tee)}`).join(' · ')}</b></div>`
            : `<div class="v2-gp-info"><span>모이는 시간</span><b>${U.esc(meet)} 클럽하우스</b></div>`}
          ${e.meal_before ? `<div class="v2-gp-info"><span>아침</span><b>${e.meal_time ? U.esc(e.meal_time) + ' ' : ''}${U.esc(e.meal_before.name)}</b></div>` : ''}
          ${e.meal_after ? `<div class="v2-gp-info"><span>뒤풀이</span><b>${U.esc(e.meal_after.name)}</b></div>` : ''}
          ${e.memo ? `<div class="v2-gp-info"><span>공지</span><b>${U.esc(e.memo)}</b></div>` : ''}
        </div>
        ${owner ? `<button class="v2-btn-line" onclick="Group.addToMine()">내 일정에도 등록 (출발 시간·알람 계산)</button>
          <button class="v2-btn-line" onclick="Group.openChat()">단체 톡방${e.chat_count ? ` (${e.chat_count})` : ''}</button>` : ''}
      </div></div>`;
  },

  /* ── 변경 안내 ── */
  /** 참석자가 마지막으로 본 내용 (기기에 저장): 날짜·티오프·집결·아침 식당·내 조·내 차 */
  _snapshot(e, me) {
    const driver = me && me.car_driver_id ? this._member(me.car_driver_id) : null;
    return {
      date: e.round_date, tee: me ? this._teeFor(me) : e.tee_off, meet: e.meet_time || this._minus(e.tee_off, 30),
      meal: e.meal_before ? e.meal_before.name : '', team: me ? (me.team_no || 0) : null,
      car: me ? (driver ? driver.name : (me.transport === 'self' ? '직접 운전' : '')) : null,
    };
  },
  _linkedSchedule() {
    return (State.schedules || []).find(s => s && s.groupCode === this.code) || null;
  },
  _noticesHTML(e, me) {
    let html = '';
    // 1) 총무가 바꾼 것 (참석자만, 처음 볼 때는 저장만)
    if (!e.i_am_owner) {
      const all = this._store('bp_ge_seen');
      const now = this._snapshot(e, me);
      const was = all[this.code];
      if (!was) { all[this.code] = now; this._save('bp_ge_seen', all); }
      else {
        const L = [];
        if (was.date !== now.date) L.push(`날짜 ${this._date(was.date)} → <b>${this._date(now.date)}</b>`);
        if (was.tee !== now.tee) L.push(`티오프 ${U.esc(was.tee)} → <b>${U.esc(now.tee)}</b>`);
        if (was.meet !== now.meet) L.push(`집결 ${U.esc(was.meet)} → <b>${U.esc(now.meet)}</b>`);
        if (was.meal !== now.meal) L.push(now.meal ? `아침 식당 <b>${U.esc(now.meal)}</b>` : '아침 식사 취소');
        if (me && was.team !== null && was.team !== now.team) L.push(now.team ? `내 조 <b>${now.team}조</b>` : '내 조 미정으로 바뀜');
        if (me && was.car !== null && was.car !== now.car && now.car) L.push(`내 차 <b>${U.esc(now.car)}${now.car === '직접 운전' ? '' : ' 차'}</b>`);
        if (L.length) html += `<div class="gp-notice"><b>📢 총무가 바꿨어요</b><div>${L.join('<br>')}</div><button onclick="Group.seenChanges()">확인했어요</button></div>`;
        else if (JSON.stringify(was) !== JSON.stringify(now)) { all[this.code] = now; this._save('bp_ge_seen', all); }
      }
    }
    // 2) 내 일정(출발 알람)이 단체 일정과 다를 때
    const mine = this._linkedSchedule();
    if (mine) {
      const d = new Date(mine.date); const p = n => String(n).padStart(2, '0');
      const ymd = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      const myTee = this._teeFor(me || (e.i_am_owner ? e.members.find(x => x.is_owner) : null));
      if (ymd !== e.round_date || mine.teeOff !== myTee) {
        html += `<div class="gp-notice warn"><b>⏰ 내 일정은 아직 예전 시간이에요</b><div>내 일정: ${this._date(ymd)} ${U.esc(mine.teeOff)} → 단체 일정: <b>${this._date(e.round_date)} ${U.esc(myTee)}</b></div><button onclick="Group.syncMine()">내 일정 맞추기</button></div>`;
      }
    }
    return html;
  },
  seenChanges() {
    const all = this._store('bp_ge_seen');
    all[this.code] = this._snapshot(this.ev, this.pickId ? this._member(this.pickId) : null);
    this._save('bp_ge_seen', all);
    this.render();
  },
  /** 내 일정의 날짜·티오프를 단체 일정에 맞추고 출발 시간·알람을 다시 계산 */
  syncMine() {
    const e = this.ev; const mine = this._linkedSchedule(); if (!e || !mine) return;
    const idx = State.schedules.indexOf(mine);
    if (idx < 0) return;
    // 예전 시각으로 걸린 알람을 먼저 지움 → 바뀐 시각으로 한 번만 울림 (일정 수정 화면·AI 변경과 같은 순서)
    if (typeof Timeline !== 'undefined' && Timeline.clearSchedAlarms) Timeline.clearSchedAlarms(mine, true);
    const next = Object.assign({}, mine);
    next.date = new Date(e.round_date + 'T00:00:00');
    next.teeOff = this._teeFor(this._member(this.pickId) || (e.i_am_owner ? e.members.find(x => x.is_owner) : null));
    State.updateSchedule(idx, next);
    if (State.saveFailed) { State.schedules[idx] = mine; try { Timeline.autoScheduleAllAlarms(); } catch (err) {} return; }
    try { if (typeof Timeline !== 'undefined') Timeline.autoScheduleAllAlarms(); } catch (err) {}
    U.toast('내 일정을 단체 일정에 맞췄어요. 출발 시간도 다시 계산했어요.');
    this.render();
  },

  pickMe(id) {
    const m = this._member(id); if (!m) return;
    if (m.claimed && !confirm(`'${m.name}'은(는) 이미 다른 기기에서 고른 이름이에요. 본인이 맞나요?\n(본인이 아니면 저장되지 않아요. 총무에게 풀어 달라고 하세요)`)) return;
    this.pickId = id; this.setMyPick(this.code, id); this.render();
  },
  unpick() { this.pickId = null; this.setMyPick(this.code, null); this.render(); },
  async joinSelf() {
    const name = prompt('명단에 넣을 내 이름', '');
    if (!name || !name.trim()) return;
    try {
      const r = await this.rpc('ge_join', { p_code: this.code, p_name: name.trim() }, true);
      if (!r || !r.ok) throw new Error(r && r.error);
      this.pickId = r.member_id; this.setMyPick(this.code, r.member_id);
      await this.load();
    } catch (e) {
      U.toast(String(e.message).includes('name_exists') ? '같은 이름이 이미 있어요. 명단에서 골라 주세요.' : '추가하지 못했어요.');
    }
  },
  setMove(t) {
    const me = this._member(this.pickId); if (!me) return;
    const note = U.$('#gp-ridenote'); if (note) me.ride_note = note.value;
    me.transport = t; this.render();
  },
  async respond(status) {
    const me = this._member(this.pickId); if (!me) return;
    const note = U.$('#gp-ridenote');
    try {
      const r = await this.rpc('ge_respond', {
        p_code: this.code, p_member: me.id, p_token: this.token(this.code), p_status: status,
        p_transport: status === 'yes' ? (me.transport || null) : null,
        p_ride_note: me.transport === 'ride' ? ((note && note.value) || me.ride_note || null) : null
      }, true);
      if (!r || !r.ok) {
        if (r && r.error === 'taken') { U.toast('다른 기기에서 이미 고른 이름이에요. 총무에게 풀어 달라고 하세요.'); this.unpick(); return; }
        throw new Error(r && r.error);
      }
      U.toast(status === 'yes' ? '참석으로 알렸어요! 총무 화면에 바로 보여요.' : '불참으로 알렸어요.');
      await this.load();
    } catch (e) { U.toast('보내지 못했어요. 잠시 후 다시 시도해 주세요.'); }
  },

  /* ── 참석자: 웹으로 열었을 때 앱 설치 안내 (기본) ── */
  _isLite() { try { return sessionStorage.getItem('gp_lite_' + this.code) === '1'; } catch (e) { return !!this._lite; } },
  gwLite() { try { sessionStorage.setItem('gp_lite_' + this.code, '1'); } catch (e) { this._lite = true; } this.render(); },
  _gwPrep() {
    if (typeof HomeAdd === 'undefined') return false;
    const keep = `g=${this.code}${this.pickId ? `&m=${this.pickId}` : ''}`;
    HomeAdd._getApp = { keep, webUrl: `${this.BASE_URL}/?${keep}`, sched: null };
    return true;
  },
  gwStore() { if (this._gwPrep()) HomeAdd.goStore(); },
  gwOpen() { if (this._gwPrep()) HomeAdd.openInApp(); },
  _renderWebLanding(el, e) {
    el.innerHTML = `
      <div class="gw-land">
        <div class="k">⛳ BuddyPlanner 단체 일정</div>
        <div class="t">${this._date(e.round_date)} ${U.esc(e.course.name)}<br>${U.esc(e.title)}에 초대됐어요</div>
        <div class="m">앱에서 열면 <b>내 조·티오프·출발 시간</b>이 내 일정에 자동으로 들어가요.</div>
        <div class="card">✔ 로그인 없이 바로<br>✔ 집·회사에서 몇 시에 나가야 하는지 계산<br>✔ 조편성·카풀 확인</div>
        <button class="store" onclick="Group.gwStore()">앱 설치하고 열기</button>
        <button class="open" onclick="Group.gwOpen()">이미 앱이 있어요 · 앱에서 열기</button>
        <div class="m" style="font-size:12.5px;color:#94a3b8;margin-top:12px;">설치한 뒤 단톡방의 링크를 한 번 더 누르면 앱에서 열려요.</div>
        <button class="lite" onclick="Group.gwLite()">설치 없이 조편성만 보기</button>
      </div>`;
  },

  /* ── 참석자(앱): 출발지·준비 시간·어디로 → 내 일정에 바로 넣기 ── */
  qa: null,
  _qa() {
    if (!this.qa || this.qa.code !== this.code) {
      let prep = 45; try { const v = parseInt(localStorage.getItem('bp_last_prep'), 10); if (v > 0 && v <= 180) prep = v; } catch (e) { }
      const e = this.ev || {};
      this.qa = { code: this.code, start: '집', prep, route: e.meal_before && e.meal_before.lat ? 'meal' : 'course' };
    }
    return this.qa;
  },
  setQa(k, v) { this._qa()[k] = v; this.render(); },
  _quickAddHTML(me) {
    if (!U.isNativeApp() || !me || me.status === 'no' || this._linkedSchedule()) return '';
    const q = this._qa(); const e = this.ev;
    const P = [30, 45, 60, 90]; if (!P.includes(q.prep)) { P.push(q.prep); P.sort((a, b) => a - b); }
    const meal = e.meal_before && e.meal_before.lat;
    const seg = (k, list) => `<div class="gq-seg">${list.map(([v, label]) => `<button type="button" class="${String(q[k]) === String(v) ? 'on' : ''}" onclick="Group.setQa('${k}', ${typeof v === 'number' ? v : `'${v}'`})">${label}</button>`).join('')}</div>`;
    return `
      <div class="gq-card">
        <div class="lab">어디서 출발해요?</div>
        ${seg('start', [['집', '🏠 집'], ['회사', '🏢 회사'], ['직접 입력', '✏️ 직접 입력']])}
        <div class="lab">준비 시간</div>
        ${seg('prep', P.map(v => [v, v + '분']))}
        ${meal ? `<div class="lab">어디로 먼저 가요?</div>
        ${seg('route', [['course', '⛳ 골프장'], ['meal', '🍲 아침 식당']])}` : ''}
        <button class="gp-btn navy" onclick="Group.quickAdd()">내 일정에 넣고 타임라인 보기</button>
        ${this.signedIn() ? '' : `<div class="gq-login">🔔 <b>카카오로 로그인하면 알람까지</b> 받아요. 기상·출발 알람이 울리고, 총무가 시간을 바꾸면 알려 드려요.<button onclick="App.navigate('login')">카카오로 로그인</button></div>`}
      </div>`;
  },
  async quickAdd() {
    const e = this.ev; const me = this._member(this.pickId); if (!e || !me) return;
    if (typeof Billing !== 'undefined' && !Billing.guardScheduleLimit()) return;
    const q = this._qa();
    // 일정에 넣으면 참석으로 알림 (이미 참석이면 그대로)
    if (me.status !== 'yes') {
      try { await this.rpc('ge_respond', { p_code: this.code, p_member: me.id, p_token: this.token(this.code), p_status: 'yes', p_transport: me.transport || null, p_ride_note: me.transport === 'ride' ? (me.ride_note || null) : null }, true); } catch (err) { /* 일정 넣기는 계속 */ }
    }
    try { localStorage.setItem('bp_last_prep', String(q.prep)); } catch (err) { }
    const c = e.course || {};
    const course = { id: c.id || '', name: c.name, addr: c.addr || '', region: (c.addr || '').split(' ').slice(0, 2).join(' '), lat: c.lat, lng: c.lng };
    const mb = e.meal_before && e.meal_before.lat ? { name: e.meal_before.name, lat: e.meal_before.lat, lng: e.meal_before.lng, addr: e.meal_before.addr || '' } : null;
    const route = q.route === 'meal' && mb ? 'meal' : 'course';
    const tee = this._teeFor(me);
    const [h, m] = String(tee).split(':').map(Number);
    const date = new Date(e.round_date + 'T00:00:00');
    Register.editIdx = null;
    Register._pendingShared = { course, date, teeOff: tee, meet: null, meal: mb, post: null, mealDuration: mb ? 50 : 0, route };
    App.navigate('register');
    setTimeout(() => {
      Register.prefill({ course: course.lat ? course : null, date, h, m });
      Register.groupCode = this.code;
      Register.groupLogin = true;   // 단체 링크로 받은 일정 → 로그인하면 알람
      const pill = (sel, txt) => [...document.querySelectorAll(sel)].find(b => b.textContent.trim() === txt || b.dataset.t === txt);
      const pp = pill('#r-pills .pill', String(q.prep));
      if (pp) Register.setPrepTime(q.prep, pp); else { Register.prep = q.prep; if (Register.sg) Register.sg.prep = true; }
      if (document.querySelector('#r-shared-routes')) Register.setSharedRoute(route); else if (Register.sg) Register.sg.route = true;
      const sp = pill('#r-startpoint-pills .pill', q.start);
      if (sp) Register.setStartPoint(q.start, sp);
      // 출발지 주소가 이미 있으면 바로 계산해서 저장 → 타임라인 / 없으면 주소 검색이 열림 (고르면 '스마트 플랜 만들기')
      if (Register.sg && Register.sg.start) setTimeout(() => Register.createPlan(), 150);
      else U.toast(`${q.start === '직접 입력' ? '출발지' : q.start} 주소를 한 번만 넣어 주세요. 그다음 아래 버튼을 누르면 끝나요.`, 3500);
    }, 320);
  },

  /** 참석자: 내 일정에 등록 → 등록 화면에 골프장·날짜·티오프·아침 식당을 채워서 엶 (출발 시간·알람은 기존 계산 그대로) */
  addToMine() {
    const e = this.ev; if (!e) return;
    const c = e.course || {};
    const course = { id: c.id || '', name: c.name, addr: c.addr || '', region: (c.addr || '').split(' ').slice(0, 2).join(' '), lat: c.lat, lng: c.lng };
    const meM = this._member(this.pickId) || (e.i_am_owner ? e.members.find(x => x.is_owner) : null);
    const [h, m] = String(this._teeFor(meM)).split(':').map(Number);
    const date = new Date(e.round_date + 'T00:00:00');
    Register.editIdx = null;
    App.navigate('register');
    setTimeout(() => {
      Register.prefill({ course, date, h, m });
      Register.groupCode = this.code;
      if (e.meal_before) Register.setMealFromAI('before', { name: e.meal_before.name, lat: e.meal_before.lat, lng: e.meal_before.lng });
      if (e.meal_after) Register.setMealFromAI('after', { name: e.meal_after.name, lat: e.meal_after.lat, lng: e.meal_after.lng });
      U.toast('출발지를 확인하고 저장하면 출발 시간과 알람이 계산돼요.', 3500);
    }, 300);
  },

  /* ── 총무: 조·차 배정 시트 ── */
  _assign: null,
  openAssign(id) {
    const m = this._member(id); if (!m || !this.ev.i_am_owner) return;
    this._assign = { id, team: m.team_no || null, transport: m.transport || null, driver: m.car_driver_id || null, phone: null };
    this._renderAssign();
  },
  _renderAssign() {
    const a = this._assign; const m = this._member(a.id); if (!m) return;
    const e = this.ev;
    const maxTeam = Math.max(4, Math.ceil(e.members.length / 4) + 1, ...e.members.map(x => x.team_no || 0), ((e.teams || []).length));
    const teams = [null].concat(Array.from({ length: Math.min(maxTeam, 20) }, (_, i) => i + 1));
    const others = e.members.filter(x => x.id !== m.id && x.status !== 'no');
    App.closeModal();
    const bg = U.el('div', 'modal-bg'); bg.id = 'app-modal';
    bg.innerHTML = `
      <div class="modal-panel">
        <div class="modal-handle"></div>
        <h3 class="modal-title">${U.esc(m.name)}</h3>
        <div class="gp-sheet">
          <div class="gp-meta">${this._statusChip(m)} ${m.ride_note ? `· 메모: ${U.esc(m.ride_note)}` : ''}</div>
          <div class="gp-lab">조</div>
          <div class="gp-chips">${teams.map(t => `<button class="${a.team === t ? 'on' : ''}" onclick="Group.setAssign('team', ${t === null ? 'null' : t})">${t ? t + '조' + (this._teamMeta(t) && this._teamMeta(t).tee ? ' ' + this._teamMeta(t).tee : '') : '미정'}</button>`).join('')}</div>
          <div class="gp-lab">전화번호 <span class="gp-note" style="font-weight:600">총무에게만 보여요 · 개인 문자 보낼 때 써요</span></div>
          <input id="gp-as-phone" class="gp-input" type="tel" inputmode="tel" maxlength="13" placeholder="010-0000-0000" value="${U.esc(a.phone != null ? a.phone : (m.phone || ''))}" oninput="Group._assign.phone=this.value">
          <div class="gp-lab">이동</div>
          <div class="gp-chips">
            <button class="${a.transport === 'self' ? 'on' : ''}" onclick="Group.setAssign('transport','self')">🚗 직접 운전</button>
            <button class="${a.transport === null ? 'on' : ''}" onclick="Group.setAssign('transport',null)">미정</button>
          </div>
          <div class="gp-lab" style="margin-top:10px">누구 차를 탈까요?</div>
          <div class="gp-chips">${others.map(o => `<button class="${a.transport === 'ride' && a.driver === o.id ? 'on' : ''}" onclick="Group.setAssign('driver', ${o.id})">${U.esc(o.name)} 차</button>`).join('') || '<span class="gp-note">다른 참석자가 없어요</span>'}</div>
          <button class="gp-btn navy" onclick="Group.saveAssign()">저장</button>
          ${!m.is_owner ? `<div class="gp-two">
            ${m.claimed ? `<button class="gp-btn line" onclick="Group.resetClaim(${m.id})">이름 풀어주기</button>` : ''}
            <button class="gp-btn del" onclick="Group.removeMember(${m.id})">명단에서 빼기</button></div>` : ''}
        </div>
      </div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click', ev => { if (ev.target === bg) App.closeModal(); });
    requestAnimationFrame(() => bg.classList.add('open'));
  },
  setAssign(k, v) {
    const a = this._assign; if (!a) return;
    if (k === 'team') a.team = v;
    else if (k === 'transport') { a.transport = v; a.driver = null; }
    else if (k === 'driver') { a.transport = 'ride'; a.driver = v; }
    this._renderAssign();
  },
  async saveAssign() {
    const a = this._assign; if (!a) return;
    try {
      const r = await this.rpc('ge_assign', { p_id: this.ev.id, p_member: a.id, p_team: a.team, p_transport: a.transport, p_driver: a.driver });
      if (!r || !r.ok) throw new Error(r && r.error);
      const m = this._member(a.id);
      const ph = a.phone == null ? null : String(a.phone).replace(/[^0-9]/g, '');
      if (ph !== null && ph !== (m && m.phone || '')) {
        if (ph && !/^0\d{8,10}$/.test(ph)) { U.toast('전화번호를 다시 확인해 주세요.'); return; }
        await this.rpc('ge_set_phone', { p_id: this.ev.id, p_member: a.id, p_phone: ph || null });
      }
      App.closeModal(); this._assign = null; await this.load();
    } catch (e) { U.toast('저장하지 못했어요.'); }
  },
  async removeMember(id) {
    const m = this._member(id); if (!m || !confirm(`${m.name}님을 명단에서 뺄까요?`)) return;
    try { await this.rpc('ge_remove_member', { p_id: this.ev.id, p_member: id }); App.closeModal(); await this.load(); }
    catch (e) { U.toast('빼지 못했어요.'); }
  },
  async resetClaim(id) {
    const m = this._member(id); if (!m || !confirm(`${m.name} 이름을 풀어줄까요? 응답이 초기화되고, 본인이 다시 고를 수 있어요.`)) return;
    try { await this.rpc('ge_reset_claim', { p_id: this.ev.id, p_member: id }); App.closeModal(); await this.load(); }
    catch (e) { U.toast('바꾸지 못했어요.'); }
  },

  /* ── 카톡 공유 ── */
  shareUrl() { return `${this.BASE_URL}/?g=${this.code}`; },
  shareText() {
    const e = this.ev; const meet = e.meet_time || this._minus(e.tee_off, 30);
    if (this._hasTeamTimes()) {
      return `⛳ ${e.title}\n${this._date(e.round_date)} ${e.course.name}\n\n[조편성]\n${this.lineupText()}${e.meal_before ? `\n\n🍲 아침 ${e.meal_time ? e.meal_time + ' ' : ''}${e.meal_before.name}` : ''}${e.memo ? `\n📢 ${e.memo}` : ''}\n\n링크에서 내 이름을 누르면 내 조·티업·일어날 시간이 나와요 👇\n${this.shareUrl()}`;
    }
    return `⛳ ${e.title}\n${this._date(e.round_date)} ${e.course.name} · 티오프 ${e.tee_off}\n${meet} 클럽하우스 집결${e.meal_before ? `\n아침 ${e.meal_before.name}` : ''}\n\n아래 링크에서 내 이름을 골라 참석을 눌러 주세요 👇\n${this.shareUrl()}`;
  },
  async share(kind) {
    const e = this.ev; if (!e) return;
    const url = this.shareUrl();
    const meet = e.meet_time || this._minus(e.tee_off, 30);
    if (kind === 'remind') return this.shareRemind();
    try {
      if (!U.isNativeApp() && typeof Kakao !== 'undefined' && typeof Login !== 'undefined' && Login.KAKAO_JS_KEY && Login.KAKAO_JS_KEY !== 'YOUR_KAKAO_JS_KEY') {
        if (!Kakao.isInitialized()) Kakao.init(Login.KAKAO_JS_KEY);
        const link = { mobileWebUrl: url, webUrl: url };
        if (!U.kakaoSend({
          objectType: 'feed',
          content: {
            title: `⛳ ${e.title} · ${this._date(e.round_date)} ${e.tee_off}`,
            description: this._hasTeamTimes()
              ? `${e.course.name} · ${[...new Set(e.members.map(m => m.team_no).filter(Boolean))].length}개 조\n${this.lineupText().split('\n').slice(0, 3).join('\n')}\n내 이름을 누르면 내 조·일어날 시간이 나와요`.slice(0, 200)
              : `${e.course.name}\n${meet} 클럽하우스 집결${e.meal_before ? ` · 아침 ${e.meal_before.name}` : ''}\n내 이름을 골라 참석을 눌러 주세요`,
            imageUrl: 'https://buddyplanner.kr/img/share.jpg',
            link
          },
          buttons: [{ title: '참석 확인하기', link }]
        })) throw new Error('no kakao share');
        return;
      }
    } catch (err) { console.warn('kakao share', err); }
    await U.shareOut({ title: e.title, text: this.shareText(), url });
  },

  /** 아직 답하지 않은 사람에게 다시 알리기 (카톡 공유 · 안 되면 복사) */
  async shareRemind() {
    const e = this.ev; if (!e) return;
    const url = this.shareUrl();
    const names = e.members.filter(m => !m.is_owner && m.status !== 'yes' && m.status !== 'no').map(m => m.name);
    if (!names.length) { U.toast('모두 답했어요 👍'); return; }
    const who = names.length > 6 ? `${names.slice(0, 6).join(', ')} 외 ${names.length - 6}명` : names.join(', ');
    const text = `🙋 ${e.title} 참석 확인 부탁드려요\n${this._date(e.round_date)} ${e.course.name} · 티오프 ${e.tee_off}\n\n아직 답하지 않으신 분: ${who}\n아래 링크에서 내 이름을 골라 참석/불참을 눌러 주세요 👇\n${url}`;
    try {
      if (!U.isNativeApp() && typeof Kakao !== 'undefined' && typeof Login !== 'undefined' && Login.KAKAO_JS_KEY && Login.KAKAO_JS_KEY !== 'YOUR_KAKAO_JS_KEY') {
        if (!Kakao.isInitialized()) Kakao.init(Login.KAKAO_JS_KEY);
        const link = { mobileWebUrl: url, webUrl: url };
        if (!U.kakaoSend({
          objectType: 'feed',
          content: {
            title: `🙋 참석 확인 부탁드려요 · ${e.title}`,
            description: `${this._date(e.round_date)} ${e.tee_off} ${e.course.name}\n아직 답하지 않으신 분: ${who}`,
            imageUrl: 'https://buddyplanner.kr/img/share.jpg',
            link
          },
          buttons: [{ title: '참석 확인하기', link }]
        })) throw new Error('no kakao share');
        return;
      }
    } catch (err) { console.warn('kakao share', err); }
    await U.shareOut({ title: e.title, text, url });
  },

  /* ── 단체 톡방 ── */
  openChat() {
    this.view = 'chat'; this.chat = []; this.chatMe = null; this.chatErr = '';
    this.render(); this.startChat();
  },
  closeChat() { this.stopChat(); this.view = 'detail'; this.render(); this.load(); },
  stopChat() { if (this.chatTimer) { clearInterval(this.chatTimer); this.chatTimer = null; } },
  startChat() {
    this.stopChat();
    if (!this.signedIn()) { this.chatErr = 'login'; this.render(); return; }
    this.pollChat(true);
    this.chatTimer = setInterval(() => {
      if (this.view !== 'chat' || !U.$('#screen-group.active')) { this.stopChat(); return; }
      this.pollChat(false);
    }, 4000);
  },
  async pollChat(first) {
    const after = this.chat.length ? this.chat[this.chat.length - 1].id : 0;
    try {
      const r = await this.rpc('ge_chat_list', { p_code: this.code, p_after: after });
      if (!r || !r.ok) { this.chatErr = (r && r.error) || 'error'; this.stopChat(); this.render(); return; }
      this.chatErr = ''; this.chatMe = r.me;
      if (r.messages.length || first) {
        const seen = new Set(this.chat.map(x => x.id));
        r.messages.forEach(x => { if (!seen.has(x.id)) this.chat.push(x); });
        this.renderChatList(true);
      }
    } catch (e) { if (first) { this.chatErr = 'error'; this.render(); } }
  },
  renderChat(el) {
    const e = this.ev;
    let body = '';
    if (this.chatErr === 'login') body = `<div class="gp-empty">단체 톡방은 로그인한 참석자만 쓸 수 있어요.<br><button class="gp-btn navy" style="margin-top:14px" onclick="App.navigate('login')">로그인하기</button></div>`;
    else if (this.chatErr === 'not_member') body = `<div class="gp-empty">로그인한 상태에서 단체 일정 화면에서<br>내 이름을 골라 참석 응답을 하면 들어올 수 있어요.<br><button class="gp-btn line" style="margin-top:14px" onclick="Group.closeChat()">단체 일정으로</button></div>`;
    else if (this.chatErr) body = `<div class="gp-empty">톡방을 불러오지 못했어요.</div>`;
    el.innerHTML = `
      <div class="gp-wrap gp-chatwrap">
        <div class="gp-top"><button class="gp-back" onclick="Group.closeChat()">‹ ${U.esc(e ? e.title : '단체 일정')}</button>
          <div class="gp-top-t">👥 단체 톡방</div><div class="gp-top-m">차 같이 탈 사람·조 편성을 얘기해요 · 총무가 보고 정해요</div></div>
        ${body || `<div class="gp-chat" id="gp-chat"></div>
        <div class="gp-chat-in"><input id="gp-msg" maxlength="500" placeholder="메시지 보내기" onkeydown="if(event.key==='Enter'&&!event.isComposing)Group.send()"><button onclick="Group.send()">보내기</button></div>`}
      </div>`;
    if (!body) this.renderChatList(true);
  },
  renderChatList(scroll) {
    const box = U.$('#gp-chat'); if (!box) return;
    if (!this.chat.length) { box.innerHTML = `<div class="gp-empty" style="padding:40px 10px">첫 메시지를 남겨 보세요.<br>예) "수원역에서 같이 타실 분?"</div>`; return; }
    let last = '';
    box.innerHTML = this.chat.map(x => {
      const d = new Date(x.created_at);
      const day = `${d.getMonth() + 1}월 ${d.getDate()}일`;
      const sep = day !== last ? `<div class="gp-day">${day}</div>` : ''; last = day;
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `${sep}<div class="gp-msg ${x.mine ? 'mine' : ''}">
        ${x.mine ? '' : `<div class="gp-msg-n">${U.esc(x.author)}${x.owner ? ' <span class="gp-badge">총무</span>' : ''}</div>`}
        <div class="gp-msg-row"><div class="gp-msg-b">${U.esc(x.body)}</div><span class="gp-msg-t">${time}</span></div></div>`;
    }).join('');
    if (scroll) box.scrollTop = box.scrollHeight;
  },
  async send() {
    const inp = U.$('#gp-msg'); if (!inp) return;
    const body = inp.value.trim(); if (!body) return;
    inp.value = '';
    try {
      const r = await this.rpc('ge_chat_send', { p_code: this.code, p_body: body });
      if (!r || !r.ok) { inp.value = body; U.toast(r && r.error === 'too_fast' ? '조금 천천히 보내 주세요.' : '보내지 못했어요.'); return; }
      this.pollChat(false);
    } catch (e) { inp.value = body; U.toast('보내지 못했어요.'); }
  }
};
