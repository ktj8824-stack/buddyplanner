/* =========================================
   BuddyPlanner — AI 비서 (Claude 연동, PRO 전용)

   앱 → Supabase Edge Function(ai-chat) → Claude API
   - Claude가 '제안'한 일정·스코어·식사 등록은 확인 카드로 보여주고, 사용자가 눌러야 저장합니다.
   - 맛집은 서버가 카카오 장소 검색으로 찾은 실제 식당만 카드로 보여줍니다.
   - 클라우드(Supabase)가 설정되지 않은 개발 환경에서는 기존 규칙 기반 비서로 동작합니다.
   ========================================= */

const AIAgent = {
  _sending: false,

  /** 클라우드가 설정돼 있으면 Claude 비서 사용 */
  enabled() {
    return typeof Cloud !== 'undefined' && Cloud.isConfigured();
  },

  /** 입력창 대신 보여줄 잠금 상태: null이면 사용 가능 */
  lockState() {
    if (!this.enabled()) return null;
    if (!Cloud.isSignedIn()) return 'login';
    if (!Billing.hasPro() && this.serverAllowed !== true) return 'pro';
    return null;
  },

  /**
   * 서버가 이 사용자에게 AI를 허용하는지 확인 (PRO가 아니어도).
   * 출시 전 테스트 설정(AI_ALLOW_ALL_USERS=true)이 켜져 있으면 허용, 꺼지면 지금처럼 PRO 안내.
   * 사용 횟수는 차감하지 않으며, 로그인 사용자당 한 번만 물어봅니다.
   */
  serverAllowed: null,
  _checkedFor: null,
  async checkServerAccess() {
    if (!this.enabled() || !Cloud.isSignedIn() || Billing.hasPro()) return;
    const uid = Cloud.userId && Cloud.userId();
    if (this._checkedFor === uid) return;
    this._checkedFor = uid;
    try {
      const { url, key } = Cloud.cfg();
      const token = await Cloud._freshToken();
      const res = await fetch(`${url}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ probe: true })
      });
      const data = await res.json().catch(() => ({}));
      this.serverAllowed = res.ok && data.allowed === true;
    } catch (e) {
      this._checkedFor = null;   // 네트워크 오류면 다음에 다시 확인
      return;
    }
    if (this.serverAllowed && typeof AI !== 'undefined') AI.renderInputArea();
  },

  lockPanelHTML(kind) {
    if (kind === 'login') {
      return `
        <div class="ai-lock-panel">
          <b>로그인하면 AI 비서를 쓸 수 있어요</b>
          <span>일정·스코어 등록과 맛집 추천을 대화로 해보세요.</span>
          <button class="btn-primary" onclick="App.navigate('login')">로그인하기</button>
        </div>`;
    }
    return `
      <div class="ai-lock-panel">
        <b>👑 AI 비서는 PRO 전용이에요</b>
        <span>말로 일정 등록, 스코어카드 사진으로 기록, 골프장 주변 맛집 추천까지.</span>
        <button class="btn-primary" onclick="App.navigate('upgrade')">PRO 시작하기</button>
      </div>`;
  },

  /* ── 사용자 정보 (Claude가 개인화된 답을 하도록 요약해서 전달) ── */
  buildContext() {
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const upcoming = (State.schedules || [])
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => s && s.date && new Date(s.date) >= today0)
      .sort((a, b) => new Date(a.s.date) - new Date(b.s.date))
      .slice(0, 10)
      .map(({ s, idx }) => {
        const d = new Date(s.date);
        return {
          idx,
          aid: State.aidOf ? State.aidOf(s) : undefined,
          course: s.course && s.course.name,
          course_lat: s.course && s.course.lat,
          course_lng: s.course && s.course.lng,
          date: `${ymd(d)} (${days[d.getDay()]})`,
          tee_off: s.teeOff,
          companions: (s.companions || []).length,
          meal_before: s.hasMeal && s.mealRestaurant ? s.mealRestaurant.name : null,
          meal_after: s.hasPostMeal && s.postMealRestaurant ? s.postMealRestaurant.name : null
        };
      });

    let records = {};
    try {
      const all = JSON.parse(localStorage.getItem('bp_records_v1') || '{}');
      const list = Object.keys(all)
        .filter(k => all[k] && typeof all[k].score === 'number' && !Record.isNine(all[k]))   // 평균·베스트는 18홀만
        .sort((a, b) => b.localeCompare(a))
        .map(k => ({ date: Record.dateOf(k), course: all[k].course, score: all[k].score }));
      if (list.length) {
        const scores = list.map(r => r.score);
        records = {
          count: list.length,
          average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
          best: Math.min.apply(null, scores),
          recent: list.slice(0, 8)
        };
      }
    } catch (e) { /* 기록 없음 */ }

    return {
      today: `${ymd(now)} (${days[now.getDay()]})`,
      now: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      userName: localStorage.getItem('bp_user_name') || '',
      upcoming,
      records
    };
  },

  history() {
    return (AI.messages || [])
      .filter(m => m.id !== 'welcome' && (m.plain || m.text || m.hadImage))
      .slice(-12)
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.sender === 'user'
          ? [m.hadImage ? '[스코어카드 사진 첨부]' : '', m.text || ''].filter(Boolean).join(' ')
          : (m.plain || this.stripHtml(m.text))
      }));
  },

  stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, '\n');
    return d.textContent || '';
  },

  /** Claude 답변(일반 텍스트 + **굵게**)을 안전한 HTML로 */
  formatReply(text) {
    return U.esc(text || '')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');
  },

  /* ── 전송 ── */
  async respond(text, image) {
    if (this._sending) return;
    const lock = this.lockState();
    if (lock) { AI.addSimpleBotReply('lock_' + Date.now(), lock === 'pro' ? 'AI 비서는 PRO 회원 전용이에요. 아래 버튼으로 PRO를 시작해 보세요.' : '로그인이 필요해요.'); AI.renderInputArea(); return; }

    this._sending = true;
    AI.showTypingIndicator();
    try {
      const { url, key } = Cloud.cfg();
      const token = await Cloud._freshToken();
      const body = { message: text || '', history: this.history().slice(0, -1), context: this.buildContext() };
      if (image) body.image = { media_type: 'image/jpeg', data: image.split(',')[1] };

      // 서버가 멈춰도 '입력 중…'이 계속되지 않게 40초에서 끊음 (사진 인식은 오래 걸릴 수 있어 넉넉히)
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), image ? 60000 : 40000) : null;
      let res;
      try {
        res = await fetch(`${url}/functions/v1/ai-chat`, {
          method: 'POST',
          headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ctl ? ctl.signal : undefined
        });
      } finally { if (timer) clearTimeout(timer); }
      const data = await res.json().catch(() => ({}));
      AI.hideTypingIndicator();

      if (!res.ok) {
        if (data.error === 'pro_required') { State.isPro = false; this.serverAllowed = false; AI.renderInputArea(); }
        AI.addSimpleBotReply('err_' + Date.now(), U.esc(data.message || 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.'));
        return;
      }

      const msg = {
        id: 'b_' + Date.now(),
        sender: 'bot',
        time: AI.formatCurrentTime(),
        agent: true,
        plain: data.reply || '',
        text: this.formatReply(data.reply),
        actions: (data.actions || []).map(a => Object.assign({ status: 'pending' }, a)),
        restaurants: data.restaurants || [],
        image: null
      };
      // 스코어 제안에는 방금 보낸 사진을 함께 저장
      if (image) msg.actions.forEach(a => { if (a.type === 'score_record') a.photo = image; });
      AI.messages.push(msg);
      AI.appendMessageToDOM(msg);
      AI.saveMessages();
      this.fillRatings(msg);
    } catch (e) {
      console.error('[AIAgent]', e);
      AI.hideTypingIndicator();
      AI.addSimpleBotReply('err_' + Date.now(), navigator.onLine === false ? '인터넷 연결을 확인해 주세요.' : e && e.name === 'AbortError' ? 'AI 답이 너무 늦어요. 잠시 후 다시 보내 주세요.' : 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      this._sending = false;
    }
  },

  /* ── 카드 렌더링 ── */
  renderBotExtras(msg) {
    let html = '';
    (msg.restaurants || []).forEach(r => { html += this.restaurantCardHTML(r, msg.id); });
    (msg.actions || []).forEach((a, i) => { html += this.actionCardHTML(a, msg.id, i); });
    return html;
  },

  restaurantCardHTML(r, msgId) {
    const rating = r.buddy_rating ? `★ ${r.buddy_rating} <small>(버디 평가 ${r.buddy_count})</small>` : '<small>아직 버디 평가가 없어요</small>';
    const meta = [r.category, r.distance_km != null ? `골프장에서 ${r.distance_km}km` : ''].filter(Boolean).map(U.esc).join(' · ');
    return `
      <div class="ai-rest-card">
        <div class="ai-rest-head">
          <b>${U.esc(r.name)}</b>
          <span class="ai-rest-rating" data-rkey="${U.esc(Ratings.key(r.name))}">${rating}</span>
        </div>
        <div class="ai-rest-meta">${meta}</div>
        <div class="ai-rest-addr">${U.esc(r.address || '')}</div>
        <div class="ai-rest-btns">
          ${r.url ? `<button onclick="AIAgent.openUrl(${U.jsq(r.url)})">카카오맵</button>` : ''}
          ${r.phone ? `<button onclick="AIAgent.openUrl(${U.jsq('tel:' + r.phone)})">전화</button>` : ''}
          <button onclick="ReviewStore.openRatingModal(this.dataset.name)" data-name="${U.esc(r.name)}">평가하기</button>
        </div>
      </div>`;
  },

  actionCardHTML(a, msgId, i) {
    const done = a.status !== 'pending';
    const btn = (label, fn) => done
      ? `<button class="ai-act-btn is-done" disabled>${a.status === 'done' ? '✓ 완료' : '취소됨'}</button>`
      : `<div class="ai-act-row"><button class="ai-act-btn" onclick="AIAgent.${fn}('${msgId}',${i})">${label}</button><button class="ai-act-btn ghost" onclick="AIAgent.dismiss('${msgId}',${i})">취소</button></div>`;

    if (a.type === 'schedule') {
      return `
        <div class="ai-act-card">
          <div class="ai-act-title">⛳ 라운딩 일정 등록</div>
          <div class="ai-act-body">
            <div><span>골프장</span><b>${U.esc(a.course_name)}</b></div>
            <div><span>날짜</span><b>${U.esc(this._koDate(a.date))}</b></div>
            <div><span>티오프</span><b>${U.esc(/^\d{1,2}:\d{2}$/.test(a.tee_off || '') ? U.fmtTimeKo(a.tee_off) : a.tee_off)}</b></div>
            ${a.companions_count != null ? `<div><span>동반자</span><b>${Number(a.companions_count)}명</b></div>` : ''}
          </div>
          <p class="ai-act-note">등록 화면에서 출발지를 확인하면 이동 시간까지 계산돼요.</p>
          ${btn('등록 화면 열기', 'confirmSchedule')}
        </div>`;
    }
    if (a.type === 'score_record') {
      const holes = Array.isArray(a.holes) && a.holes.length ? `
        <div class="ai-holes">${a.holes.slice(0, 18).map((h, n) => `<span><small>${n + 1}</small>${Number(h)}</span>`).join('')}</div>` : '';
      return `
        <div class="ai-act-card">
          <div class="ai-act-title">📝 스코어 기록</div>
          <div class="ai-act-body">
            <div><span>날짜</span><b>${U.esc(this._koDate(a.date))}</b></div>
            <div><span>골프장</span><b>${U.esc(a.course_name)}</b></div>
            <div><span>총 타수</span><b>${Number(a.total_score)}타</b></div>
            ${a.putts_total ? `<div><span>퍼팅</span><b>${Number(a.putts_total)}개</b></div>` : ''}
          </div>
          ${holes}
          ${a.photo ? '<p class="ai-act-note">스코어카드 사진도 기록에 함께 저장돼요.</p>' : ''}
          ${btn('기록 저장', 'confirmScore')}
        </div>`;
    }
    if (a.type === 'update') {
      const idx = this._schedIdx(a);
      // 처리한 카드는 그때 저장해 둔 내용으로 (바뀐 뒤 일정·지운 일정을 다시 읽지 않게)
      const snap = done ? (a._snap || { name: a.course_name, oldDate: a.old_date, oldTee: a.old_tee_off }) : null;
      const s = snap ? {} : (idx >= 0 ? State.schedules[idx] : null);
      const name = snap ? snap.name : s ? s.course.name : a.course_name;
      const oldDate = snap ? snap.oldDate : s ? U.fmtDateShort(s.date) : a.old_date;
      const oldTee = snap ? snap.oldTee : s ? s.teeOff : a.old_tee_off;
      const newDate = a.new_date ? (() => { const [y, mo, d] = String(a.new_date).split('-').map(Number); return (y && mo && d) ? U.fmtDateShort(new Date(y, mo - 1, d)) : a.new_date; })() : '';
      const newTee = a.new_tee_off ? (U.fmtTimeKo ? U.fmtTimeKo(a.new_tee_off) : a.new_tee_off) : '';
      const rows = a.cancel
        ? `<div><span>날짜</span><b>${U.esc(oldDate)}</b></div><div><span>티오프</span><b>${U.esc(oldTee)}</b></div>`
        : `${a.new_date ? `<div><span>날짜</span><b>${U.esc(oldDate)} → ${U.esc(newDate)}</b></div>` : `<div><span>날짜</span><b>${U.esc(oldDate)}</b></div>`}
           ${a.new_tee_off ? `<div><span>티오프</span><b>${U.esc(U.fmtTimeKo && oldTee ? U.fmtTimeKo(oldTee) : oldTee)} → ${U.esc(newTee)}</b></div>` : ''}`;
      return `
        <div class="ai-act-card">
          <div class="ai-act-title">${a.cancel ? '🗑️ 라운딩 일정 취소' : '⛳ 라운딩 일정 변경'}</div>
          <div class="ai-act-body">
            <div><span>골프장</span><b>${U.esc(name || '')}</b></div>
            ${s ? rows : '<div><span>일정</span><b>일정을 찾을 수 없어요</b></div>'}
          </div>
          <p class="ai-act-note">${a.cancel ? '일정과 알람이 함께 지워져요.' : '출발 시간과 알람도 바뀐 시각으로 다시 맞춰요.'}</p>
          ${s ? btn(a.cancel ? '일정 삭제' : '변경하기', 'confirmUpdate') : (done ? btn('', '') : '')}
        </div>`;
    }
    if (a.type === 'meal') {
      const s = State.schedules[this._schedIdx(a)];
      const when = a.timing === 'after' ? '라운딩 후 식사' : '라운딩 전 식사';
      return `
        <div class="ai-act-card">
          <div class="ai-act-title">🍽️ ${when} 추가</div>
          <div class="ai-act-body">
            <div><span>일정</span><b>${U.esc(s ? `${s.course.name} · ${U.fmtDateShort(s.date)}` : '일정을 찾을 수 없어요')}</b></div>
            <div><span>식당</span><b>${U.esc(a.restaurant && a.restaurant.name)}</b></div>
          </div>
          <p class="ai-act-note">일정 수정 화면이 열리면 '라운딩 일정 수정 완료'를 눌러 저장하세요.</p>
          ${s ? btn('일정에 넣기', 'confirmMeal') : ''}
        </div>`;
    }
    return '';
  },

  _action(msgId, i) {
    const msg = (AI.messages || []).find(m => m.id === msgId);
    return { msg, a: msg && msg.actions && msg.actions[i] };
  },

  _finish(msg, a, status) {
    a.status = status;
    if (a.photo && status !== 'pending') a.photo = null; // 저장 후 대화 기록에서 사진 제거(용량 절약)
    AI.saveMessages();
    const row = document.getElementById(`ai-msg-${msg.id}`);
    if (row) { row.remove(); AI.appendMessageToDOM(msg, false); AI.renderAllMessages(); }
  },

  dismiss(msgId, i) {
    const { msg, a } = this._action(msgId, i);
    if (a) this._finish(msg, a, 'dismissed');
  },

  /** 일정: 등록 화면을 내용이 채워진 상태로 열기 (출발지·이동시간 계산은 기존 흐름 사용) */
  /** '2026-11-14' → '11월 14일 (토)' (형식이 다르면 그대로) */
  _koDate(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
    return m ? U.fmtDateShort(new Date(+m[1], +m[2] - 1, +m[3])) : String(v || '');
  },

  async confirmSchedule(msgId, i) {
    const { msg, a } = this._action(msgId, i);
    if (!a) return;
    // 며칠 전에 받은 카드를 지금 누르면 지난 날짜로 만들어지지 않게
    { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(a.date || '')), t = /^(\d{1,2}):(\d{2})$/.exec(String(a.tee_off || ''));
      if (m && new Date(+m[1], +m[2] - 1, +m[3], t ? +t[1] : 23, t ? +t[2] : 59) < new Date()) { U.toast('이미 지난 시각이에요. 새 날짜·시간으로 다시 말해 주세요.'); return; } }
    if (typeof Billing !== 'undefined' && !Billing.guardScheduleLimit()) return;

    // 골프장 위치는 서버(AI)가 카드에 붙여서 보내줌 → 앱에는 카카오 키가 필요 없음
    let course = null;
    const sc = a.course;
    if (sc && sc.name && isFinite(sc.lat) && isFinite(sc.lng)) {
      course = { id: sc.id, name: sc.name, region: (typeof Register !== 'undefined' && Register.regionOf) ? Register.regionOf(sc.addr || '') : String(sc.addr || '').split(' ').slice(0, 2).join(' '), addr: sc.addr, lat: Number(sc.lat), lng: Number(sc.lng) };
    } else {
      try {
        const found = await TmapAPI.searchPlace(a.course_name);
        if (found && found.length) {
          const c = found[0];
          course = { id: c.id, name: c.place_name, region: (typeof Register !== 'undefined' && Register.regionOf) ? Register.regionOf(c.address_name || '') : String(c.address_name || '').split(' ').slice(0, 2).join(' '), addr: c.address_name, lat: parseFloat(c.y), lng: parseFloat(c.x) };
        }
      } catch (e) { /* 검색 실패 시 사용자가 직접 선택 */ }
    }

    const [h, m] = String(a.tee_off || '07:00').split(':').map(Number);
    const [y, mo, d] = String(a.date).split('-').map(Number);
    this._finish(msg, a, 'done');
    App.navigate('register');
    setTimeout(() => {
      Register.prefill({ course, date: new Date(y, mo - 1, d), h, m });
      U.toast(course ? '내용을 채웠어요. 확인 후 등록해 주세요.' : '골프장을 찾지 못했어요. 골프장을 선택해 주세요.');
    }, 250);
  },

  /** 스코어: 기록에 저장 (같은 날짜 기록이 있으면 확인) */
  async confirmScore(msgId, i) {
    const { msg, a } = this._action(msgId, i);
    if (!a) return;
    const date = String(a.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { U.toast('날짜를 확인할 수 없어요.'); return; }

    let records = {};
    try { records = JSON.parse(localStorage.getItem('bp_records_v1') || '{}') || {}; } catch (e) { records = {}; }
    // 같은 날 기록이 있으면 덮어쓰지 않고 그날의 다른 라운드로 추가
    Record.records = records;
    const exists = Record.roundsOn(date).length > 0;
    if (exists && !(await App.ask('같은 날 기록이 있어요', `${U.esc(date)}에 이미 기록이 있어요. 같은 날 다른 라운드로 추가할까요?`, { ok: '추가' }))) return;
    const key = Record.nextKey(date);
    const prev = {};
    records[key] = Object.assign({}, prev, {
      course: a.course_name,
      score: Number(a.total_score),
      putts: a.putts_total ? Number(a.putts_total) : (prev.putts || 0),
      holes: Array.isArray(a.holes) ? a.holes.slice(0, 18).map(Number) : prev.holes,
      diary: a.memo || prev.diary || '',
      scoreImg1: a.photo || prev.scoreImg1 || null
    });
    try {
      localStorage.setItem('bp_records_v1', JSON.stringify(records));
    } catch (e) {
      U.toast('저장 공간이 부족해 사진 없이 저장할게요.');
      records[key].scoreImg1 = null;
      localStorage.setItem('bp_records_v1', JSON.stringify(records));
    }
    this._finish(msg, a, 'done');
    U.toast(`📝 ${date} ${a.total_score}타 기록을 저장했어요.`);
  },

  /** 제안이 가리키는 일정 번호: 일정 고유 번호(aid)를 먼저 찾고, 없으면 idx (그사이 일정이 지워져도 엉뚱한 일정을 바꾸지 않게) */
  _schedIdx(a) {
    const list = State.schedules || [];
    if (a.aid) return list.findIndex(s => s && s.aid === a.aid);
    return list[a.schedule_index] ? a.schedule_index : -1;
  },

  /** 일정 변경·취소: 기존 일정을 바로 고치고 이전 알람을 지운 뒤 새 시각으로 다시 예약 (새 일정을 만들지 않음) */
  async confirmUpdate(msgId, i) {
    const { msg, a } = this._action(msgId, i);
    if (!a) return;
    const idx = this._schedIdx(a);
    const s = State.schedules[idx];
    if (!s) { U.toast('일정을 찾을 수 없어요.'); return; }
    a._snap = { name: s.course.name, oldDate: U.fmtDateShort(s.date), oldTee: s.teeOff };
    if (a.cancel) {
      if (!(await App.ask('일정을 삭제할까요?', `${U.esc(s.course.name)} ${U.fmtDateShort(s.date)} 일정과 알람이 함께 지워져요.`, { ok: '삭제' }))) return;
      if (typeof Timeline !== 'undefined' && Timeline.clearSchedAlarms) Timeline.clearSchedAlarms(s, true);
      State.schedules.splice(idx, 1);
      State.saveSchedules();
      try { if (typeof Timeline !== 'undefined') Timeline.autoScheduleAllAlarms(); } catch (e) {}
      this._finish(msg, a, 'done');
      U.toast('🗑️ 일정을 삭제했어요.');
      return;
    }
    const next = Object.assign({}, s);
    if (a.new_date) {
      const [y, mo, d] = String(a.new_date).split('-').map(Number);
      next.date = new Date(y, mo - 1, d);
    }
    if (a.new_tee_off) next.teeOff = a.new_tee_off;
    // 예전에 받은 카드를 나중에 누르면 이미 지난 시각일 수 있음 → 막기
    { const [th, tm] = String(next.teeOff || '').split(':').map(Number); const d = new Date(next.date);
      if (isFinite(th) && isFinite(tm) && !isNaN(d.getTime()) && new Date(d.getFullYear(), d.getMonth(), d.getDate(), th, tm).getTime() < Date.now()) { U.toast('이미 지난 시각이에요. 새 날짜·시간으로 다시 말해 주세요.'); return; } }
    // 날짜·시각이 바뀌면 그 시각의 길 상황으로 이동 시간을 다시 계산 (못 받으면 예전 값 유지)
    const oldTravel = Number(s.travelTime) || 0;
    if (a.new_date || a.new_tee_off) {
      if (a._busy) return;   // 계산 중 두 번 누름 방지
      a._busy = true;
      U.toast('바뀐 시각의 길 상황으로 이동 시간을 다시 계산하고 있어요…');
      let t = null;
      try { t = await this._retime(next); } finally { a._busy = false; }
      if (t) Object.assign(next, t);
      if (State.schedules[idx] !== s) { U.toast('그사이 일정이 바뀌었어요. 다시 말해 주세요.'); return; }
    }
    // 이전 시각으로 걸린 알람을 먼저 지움 → 바뀐 시각으로 한 번만 울림 (일정 수정 화면과 같은 순서)
    if (typeof Timeline !== 'undefined' && Timeline.clearSchedAlarms) Timeline.clearSchedAlarms(s, true);
    State.updateSchedule(idx, next);
    if (State.saveFailed) { State.schedules[idx] = s; try { Timeline.autoScheduleAllAlarms(); } catch (e) {} return; }
    try { if (typeof Timeline !== 'undefined') Timeline.autoScheduleAllAlarms(); } catch (e) {}
    this._finish(msg, a, 'done');
    const nt = Number(next.travelTime) || 0;
    const moved = oldTravel && nt && Math.abs(nt - oldTravel) >= 5 ? ` 이동 시간 ${oldTravel}분 → ${nt}분` : '';
    U.toast(`⛳ ${next.course.name} ${U.fmtDateShort(next.date)} ${U.fmtTimeKo(next.teeOff)}으로 바꿨어요.${moved}`, moved ? 3500 : undefined);
  },

  /** 새 날짜·티오프 기준으로 이동 시간을 다시 계산 (일정 등록 화면과 같은 방식, 식당→골프장 시간은 그대로)
   *  돌려주는 값: { travelTime, travelToRestaurant, travelToMeeting, routeEstimated } 또는 null(계산 못 함) */
  async _retime(s) {
    try {
      if (typeof TmapAPI === 'undefined' || !s || !s.course || !s.startLat || !s.startLng) return null;
      const [th, tm] = String(s.teeOff || '').split(':').map(Number);
      const d = new Date(s.date); d.setHours(th, tm, 0, 0);
      if (isNaN(d.getTime())) return null;
      const meal = !!(s.hasMeal && s.mealRestaurant && s.mealRestaurant.lat);
      const meet = !!(s.hasMeetingPoint && s.meetingPointObj && s.meetingPointObj.lat);
      const arrival = new Date(d.getTime() - (meal ? 30 : 40) * 60000);
      const leg = async (x1, y1, x2, y2, at) => {
        let v = null;
        try { v = await TmapAPI.getPredictiveRouteTime(x1, y1, x2, y2, at.toISOString(), 'W02'); } catch (e) { v = null; }
        if (!v) { try { v = await TmapAPI.getRouteTime(x1, y1, x2, y2); } catch (e) { v = null; } }
        return v ? Math.round(v) : null;
      };
      const sx = s.startLng, sy = s.startLat, M = s.meetingPointObj, R = s.mealRestaurant, C = s.course;
      const WAIT = 10;
      if (meal) {
        const restDur = Number(R.distMin) || 15;
        const restArrival = new Date(arrival.getTime() - restDur * 60000 - (Number(s.mealDuration) || 0) * 60000);
        if (meet) {
          const toRest = await leg(M.lng, M.lat, R.lng, R.lat, restArrival); if (!toRest) return null;
          const toMeet = await leg(sx, sy, M.lng, M.lat, new Date(restArrival.getTime() - (toRest + WAIT) * 60000)); if (!toMeet) return null;
          return { travelTime: toMeet + WAIT + toRest + restDur, travelToRestaurant: toRest, travelToMeeting: toMeet, routeEstimated: false };
        }
        const toRest = await leg(sx, sy, R.lng, R.lat, restArrival); if (!toRest) return null;
        return { travelTime: toRest + restDur, travelToRestaurant: toRest, routeEstimated: false };
      }
      if (meet) {
        const toGolf = await leg(M.lng, M.lat, C.lng, C.lat, arrival); if (!toGolf) return null;
        const toMeet = await leg(sx, sy, M.lng, M.lat, new Date(arrival.getTime() - (toGolf + WAIT) * 60000)); if (!toMeet) return null;
        return { travelTime: toMeet + WAIT + toGolf, travelToMeeting: toMeet, routeEstimated: false };
      }
      const t = await leg(sx, sy, C.lng, C.lat, arrival); if (!t) return null;
      return { travelTime: t, routeEstimated: false };
    } catch (e) { console.warn('[AI 변경] 이동 시간 재계산 실패', e); return null; }
  },

  /** 식사: 일정 수정 화면을 열고 식당을 넣어둠 (저장은 사용자가) */
  confirmMeal(msgId, i) {
    const { msg, a } = this._action(msgId, i);
    if (!a || !a.restaurant) return;
    const idx = this._schedIdx(a);
    if (!State.schedules[idx]) { U.toast('일정을 찾을 수 없어요.'); return; }
    const r = a.restaurant;
    this._finish(msg, a, 'done');
    Register.edit(idx);
    setTimeout(() => {
      Register.setMealFromAI(a.timing, { name: r.name, tel: r.phone, lat: r.lat, lng: r.lng });
      U.toast(`🍽️ ${U.josa(r.name, '을/를')} 넣었어요. '라운딩 일정 수정 완료'를 눌러 저장하세요.`, 3500);
    }, 300);
  },

  openUrl(url) {
    if (!/^(https?:|tel:)/.test(url)) return;
    window.location.href = url;
  },

  /* ── 버디 평가 표시 갱신 ── */
  fillRatings(msg) {
    if (!msg.restaurants || !msg.restaurants.length) return;
    const row = document.getElementById(`ai-msg-${msg.id}`);
    if (row) Ratings.fillDom(row);
  },

  /* ── 부적절한 답변 신고 ── */
  async report(msgId) {
    const msg = (AI.messages || []).find(m => m.id === msgId);
    if (!msg) return;
    const reason = prompt('어떤 점이 문제였나요? (선택)', '') ;
    if (reason === null) return;
    try {
      await Cloud._api('rest/v1/ai_reports', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: { user_id: Cloud.userId(), message: String(msg.plain || this.stripHtml(msg.text)).slice(0, 4000), reason: reason.slice(0, 300) || null }
      });
      U.toast('신고해 주셔서 감사해요. 검토 후 개선할게요.');
    } catch (e) {
      U.toast('신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }
};

/* =========================================
   버디 평가 — 서버에 모은 회원 평균 별점
   (개별 평가는 본인만, 다른 사람에게는 평균과 개수만 공개)
   ========================================= */
const Ratings = {
  _cache: {},

  key(name) {
    return 'n:' + String(name || '').replace(/\s+/g, '').toLowerCase().slice(0, 100);
  },

  available() {
    return typeof Cloud !== 'undefined' && Cloud.isConfigured() && Cloud.isSignedIn();
  },

  /** 평가 저장 (서버). 같은 식당은 다시 평가하면 갱신 */
  async submit(name, stars, comment, courseName) {
    if (!this.available()) return false;
    await Cloud._api('rest/v1/restaurant_reviews?on_conflict=user_id,place_key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: [{
        user_id: Cloud.userId(),
        place_key: this.key(name),
        place_name: String(name).slice(0, 100),
        rating: Math.max(1, Math.min(5, Math.round(stars))),
        comment: comment ? String(comment).slice(0, 300) : null,
        course_name: courseName ? String(courseName).slice(0, 100) : null,
        updated_at: new Date().toISOString()
      }]
    });
    delete this._cache[this.key(name)];
    if (typeof Points !== 'undefined') setTimeout(() => Points.noticeEarned('맛집 별점'), 800);
    return true;
  },

  /** 여러 식당의 평균 별점 조회 → { key: {avg, count} } */
  async fetch(keys) {
    const need = keys.filter(k => !this._cache[k]);
    if (need.length && this.available()) {
      try {
        const rows = await Cloud._api('rest/v1/rpc/get_place_ratings', { method: 'POST', body: { keys: need } }) || [];
        need.forEach(k => { this._cache[k] = { avg: 0, count: 0 }; });
        rows.forEach(r => { this._cache[r.place_key] = { avg: Number(r.avg_rating), count: r.review_count }; });
      } catch (e) { console.warn('[Ratings] 조회 실패', e); }
    }
    const out = {};
    keys.forEach(k => { if (this._cache[k]) out[k] = this._cache[k]; });
    return out;
  },

  /** 화면 안의 [data-rkey] 요소를 회원 평균 별점으로 채움 */
  async fillDom(root) {
    const els = Array.from((root || document).querySelectorAll('[data-rkey]'));
    if (!els.length) return;
    const map = await this.fetch(Array.from(new Set(els.map(e => e.dataset.rkey))));
    els.forEach(el => {
      const r = map[el.dataset.rkey];
      if (r && r.count > 0) {
        el.innerHTML = `★ ${r.avg} <small>(버디 평가 ${r.count})</small>`;
      }
    });
  }
};

window.AIAgent = AIAgent;
window.Ratings = Ratings;
