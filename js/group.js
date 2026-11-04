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
  openCode(code) {
    code = String(code || '').toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 16);
    if (code.length !== 16) return false;
    this.stopChat();
    this.code = code; this.ev = null; this.view = 'detail'; this.pickId = this.myPick(code);
    App.navigate('group');
    return true;
  },

  async loadList() {
    if (!this.signedIn()) { this.list = []; this.render(); return; }
    try { this.list = (await this.rpc('ge_my_list', {})) || []; } catch (e) { this.list = []; }
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

  render() {
    const el = this._el(); if (!el) return;
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
    el.innerHTML = `
      <div class="gp-wrap">
        <div class="gp-top"><button class="gp-back" onclick="App.navigate('home')">‹ 홈</button>
          <div class="gp-top-t">단체 일정</div><div class="gp-top-m">모임 라운딩의 참석·조 편성·차량을 한 곳에서</div></div>
        <div class="gp-sec">
          <button class="gp-btn navy" onclick="Group.startCreate()">＋ 새 단체 일정 만들기</button>
          ${!signed ? `<div class="gp-note">단체 일정을 만들려면 로그인이 필요해요. 받은 링크로 참석하는 건 로그인 없이도 돼요.</div>` : ''}
          ${items ? `<div class="gp-lab">내 단체 일정</div>${items}` : `
          <div class="gp-how">
            <div class="gp-how-t">이렇게 써요</div>
            <div>1. 총무가 골프장·날짜·참석자 이름을 넣어 만들어요</div>
            <div>2. 카톡 단톡방에 링크를 보내요</div>
            <div>3. 각자 링크를 열고 내 이름을 골라 참석을 눌러요 (로그인 없어도 돼요)</div>
            <div>4. 단체 톡방에서 차 같이 탈 사람을 얘기하고, 총무가 조·차를 정해요</div>
          </div>`}
        </div>
      </div>`;
  },

  startCreate() {
    if (!this.signedIn()) { U.toast('단체 일정을 만들려면 로그인해 주세요.'); App.navigate('login'); return; }
    this.form = { title: '', course: null, date: '', tee: '07:00', meet: '', me: localStorage.getItem('bp_user_name') || '', names: '', memo: '' };
    this.view = 'create'; this.render();
  },

  /* ── 만들기 / 수정 ── */
  renderForm(el) {
    const f = this.form || {};
    const edit = this.view === 'edit';
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
          <div class="gp-row2">
            <div><label>날짜</label><input id="gp-date" type="date" value="${U.esc(f.date)}"></div>
            <div><label>티오프 (첫 조)</label><input id="gp-tee" type="time" value="${U.esc(f.tee)}"></div>
          </div>
          <label>다 같이 모이는 시간 <span class="gp-hint">비우면 티오프 30분 전</span></label>
          <input id="gp-meet" type="time" value="${U.esc(f.meet)}">
          ${edit ? `
          <label>아침 식당 <span class="gp-hint">같이 먹는다면</span></label>
          <button class="gp-pick ${f.mealBefore ? 'on' : ''}" onclick="Group.pickMeal('before')">${f.mealBefore ? '🍲 ' + U.esc(f.mealBefore.name) : '식당 검색하기'}</button>
          ${f.mealBefore ? `<button class="gp-link" onclick="Group.clearMeal('before')">아침 식당 빼기</button>` : ''}
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
  _readForm() {
    const v = id => (U.$('#' + id) || {}).value;
    const f = this.form;
    f.title = v('gp-title') || ''; f.date = v('gp-date') || ''; f.tee = v('gp-tee') || ''; f.meet = v('gp-meet') || '';
    f.memo = v('gp-memo') || ''; f.names = v('gp-names') || ''; if (U.$('#gp-me')) f.me = v('gp-me') || '';
  },
  cancelForm() { this.view = this.view === 'edit' ? 'detail' : 'list'; this.render(); if (this.view === 'list') this.loadList(); },
  pickCourse() {
    this._readForm();
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
    this.form = { title: e.title, course: e.course, date: e.round_date, tee: e.tee_off, meet: e.meet_time || '', memo: e.memo || '', names: '', mealBefore: e.meal_before, mealAfter: e.meal_after };
    this.view = 'edit'; this.render();
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
    const me = this.pickId ? this._member(this.pickId) : null;
    const yes = e.members.filter(m => m.status === 'yes').length;
    const meet = e.meet_time || this._minus(e.tee_off, 30);

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
        ${this._statusChip(m)}
      </div>`).join('');
    const membersHtml = teamKeys.map(k => `
      ${hasTeams ? `<div class="gp-team">${k ? `${k}조` : '조 미정'}</div>` : ''}
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
    let myPanel = owner ? `${pending.length ? `<button class="gp-btn navy" style="margin:0 0 8px" onclick="Group.share('remind')">🔔 아직 답 안 한 ${pending.length}명에게 다시 알리기</button>` : ''}
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

    el.innerHTML = `
      <div class="gp-wrap">
        <div class="gp-top">
          <button class="gp-back" onclick="Group.openList()">‹ 단체 일정</button>
          ${owner ? `<button class="gp-edit" onclick="Group.startEdit()">수정</button>` : ''}
          <div class="gp-top-t">${U.esc(e.title)}</div>
          <div class="gp-top-m">⛳ ${U.esc(e.course.name)} · ${this._date(e.round_date)} · 티오프 <span class="gold">${U.esc(e.tee_off)}</span></div>
        </div>
        <div class="gp-sec">
          <div class="gp-card gp-meet">
            <div class="gp-meet-s">다 같이 모이는 시간</div>
            <div class="gp-meet-b">${U.esc(meet)} 클럽하우스</div>
            ${e.meal_before ? `<div class="gp-meet-s">🍲 아침 ${U.esc(e.meal_before.name)}</div>` : ''}
            ${e.meal_after ? `<div class="gp-meet-s">🍻 뒤풀이 ${U.esc(e.meal_after.name)}</div>` : ''}
            ${e.memo ? `<div class="gp-memo">📢 ${U.esc(e.memo)}</div>` : ''}
          </div>
          ${notices}
          ${myPanel}
          <div class="gp-lab">우리 조 <span>참석 ${yes}/${e.members.length}</span></div>
          ${membersHtml}
          ${owner ? `<div class="gp-note">이름을 누르면 조와 차를 정할 수 있어요.</div>` : ''}
          ${cars || needRide.length ? `<div class="gp-lab">차량</div><div class="gp-card">${cars}
            ${needRide.length ? `<div class="gp-car-row warn"><b>🙋 차 필요</b><span>${needRide.map(r => U.esc(r.name) + (r.ride_note ? `(${U.esc(r.ride_note)})` : '')).join(', ')}</span></div>` : ''}</div>` : ''}
          <button class="gp-btn kakao" onclick="Group.share()">💬 카톡으로 ${owner ? '조 시간표 보내기' : '공유하기'}</button>
          <button class="gp-btn line" onclick="Group.openChat()">👥 단체 톡방${e.chat_count ? ` (${e.chat_count})` : ''}</button>
        </div>
      </div>`;
  },

  /* ── 변경 안내 ── */
  /** 참석자가 마지막으로 본 내용 (기기에 저장): 날짜·티오프·집결·아침 식당·내 조·내 차 */
  _snapshot(e, me) {
    const driver = me && me.car_driver_id ? this._member(me.car_driver_id) : null;
    return {
      date: e.round_date, tee: e.tee_off, meet: e.meet_time || this._minus(e.tee_off, 30),
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
      if (ymd !== e.round_date || mine.teeOff !== e.tee_off) {
        html += `<div class="gp-notice warn"><b>⏰ 내 일정은 아직 예전 시간이에요</b><div>내 일정: ${this._date(ymd)} ${U.esc(mine.teeOff)} → 단체 일정: <b>${this._date(e.round_date)} ${U.esc(e.tee_off)}</b></div><button onclick="Group.syncMine()">내 일정 맞추기</button></div>`;
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
    mine.date = new Date(e.round_date + 'T00:00:00');
    mine.teeOff = e.tee_off;
    State.updateSchedule(idx, mine);
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

  /** 참석자: 내 일정에 등록 → 등록 화면에 골프장·날짜·티오프·아침 식당을 채워서 엶 (출발 시간·알람은 기존 계산 그대로) */
  addToMine() {
    const e = this.ev; if (!e) return;
    const c = e.course || {};
    const course = { id: c.id || '', name: c.name, addr: c.addr || '', region: (c.addr || '').split(' ').slice(0, 2).join(' '), lat: c.lat, lng: c.lng };
    const [h, m] = String(e.tee_off).split(':').map(Number);
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
    this._assign = { id, team: m.team_no || null, transport: m.transport || null, driver: m.car_driver_id || null };
    this._renderAssign();
  },
  _renderAssign() {
    const a = this._assign; const m = this._member(a.id); if (!m) return;
    const e = this.ev;
    const maxTeam = Math.max(4, Math.ceil(e.members.length / 4) + 1, ...e.members.map(x => x.team_no || 0));
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
          <div class="gp-chips">${teams.map(t => `<button class="${a.team === t ? 'on' : ''}" onclick="Group.setAssign('team', ${t === null ? 'null' : t})">${t ? t + '조' : '미정'}</button>`).join('')}</div>
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
    return `⛳ ${e.title}\n${this._date(e.round_date)} ${e.course.name} · 티오프 ${e.tee_off}\n${meet} 클럽하우스 집결${e.meal_before ? `\n아침 ${e.meal_before.name}` : ''}\n\n아래 링크에서 내 이름을 골라 참석을 눌러 주세요 👇\n${this.shareUrl()}`;
  },
  async share(kind) {
    const e = this.ev; if (!e) return;
    const url = this.shareUrl();
    const meet = e.meet_time || this._minus(e.tee_off, 30);
    if (kind === 'remind') return this.shareRemind();
    try {
      if (typeof Kakao !== 'undefined' && typeof Login !== 'undefined' && Login.KAKAO_JS_KEY && Login.KAKAO_JS_KEY !== 'YOUR_KAKAO_JS_KEY') {
        if (!Kakao.isInitialized()) Kakao.init(Login.KAKAO_JS_KEY);
        const link = { mobileWebUrl: url, webUrl: url };
        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: `⛳ ${e.title} · ${this._date(e.round_date)} ${e.tee_off}`,
            description: `${e.course.name}\n${meet} 클럽하우스 집결${e.meal_before ? ` · 아침 ${e.meal_before.name}` : ''}\n내 이름을 골라 참석을 눌러 주세요`,
            imageUrl: 'https://files.catbox.moe/672ojg.png',
            link
          },
          buttons: [{ title: '참석 확인하기', link }]
        });
        return;
      }
    } catch (err) { console.warn('kakao share', err); }
    try {
      if (navigator.share) { await navigator.share({ title: e.title, text: this.shareText() }); return; }
    } catch (err) { if (err && err.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(this.shareText()); U.toast('공지 내용과 링크를 복사했어요. 단톡방에 붙여 넣어 주세요.'); }
    catch (err) { prompt('아래 링크를 복사해 단톡방에 보내 주세요', url); }
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
      if (typeof Kakao !== 'undefined' && typeof Login !== 'undefined' && Login.KAKAO_JS_KEY && Login.KAKAO_JS_KEY !== 'YOUR_KAKAO_JS_KEY') {
        if (!Kakao.isInitialized()) Kakao.init(Login.KAKAO_JS_KEY);
        const link = { mobileWebUrl: url, webUrl: url };
        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: `🙋 참석 확인 부탁드려요 · ${e.title}`,
            description: `${this._date(e.round_date)} ${e.tee_off} ${e.course.name}\n아직 답하지 않으신 분: ${who}`,
            imageUrl: 'https://files.catbox.moe/672ojg.png',
            link
          },
          buttons: [{ title: '참석 확인하기', link }]
        });
        return;
      }
    } catch (err) { console.warn('kakao share', err); }
    try { if (navigator.share) { await navigator.share({ title: e.title, text }); return; } }
    catch (err) { if (err && err.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); U.toast('알림 문구를 복사했어요. 단톡방에 붙여 넣어 주세요.'); }
    catch (err) { prompt('아래 내용을 복사해 단톡방에 보내 주세요', text); }
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
