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
    if (!State.isPro) return 'pro';
    return null;
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
      .slice(0, 5)
      .map(({ s, idx }) => {
        const d = new Date(s.date);
        return {
          idx,
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

      const res = await fetch(`${url}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      AI.hideTypingIndicator();

      if (!res.ok) {
        if (data.error === 'pro_required') { State.isPro = false; AI.renderInputArea(); }
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
      AI.addSimpleBotReply('err_' + Date.now(), navigator.onLine === false ? '인터넷 연결을 확인해 주세요.' : 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.');
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
          ${r.url ? `<button onclick="AIAgent.openUrl('${U.esc(r.url)}')">카카오맵</button>` : ''}
          ${r.phone ? `<button onclick="AIAgent.openUrl('tel:${U.esc(r.phone)}')">전화</button>` : ''}
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
            <div><span>날짜</span><b>${U.esc(a.date)}</b></div>
            <div><span>티오프</span><b>${U.esc(a.tee_off)}</b></div>
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
            <div><span>날짜</span><b>${U.esc(a.date)}</b></div>
            <div><span>골프장</span><b>${U.esc(a.course_name)}</b></div>
            <div><span>총 타수</span><b>${Number(a.total_score)}타</b></div>
            ${a.putts_total ? `<div><span>퍼팅</span><b>${Number(a.putts_total)}개</b></div>` : ''}
          </div>
          ${holes}
          ${a.photo ? '<p class="ai-act-note">스코어카드 사진도 기록에 함께 저장돼요.</p>' : ''}
          ${btn('기록 저장', 'confirmScore')}
        </div>`;
    }
    if (a.type === 'meal') {
      const s = State.schedules[a.schedule_index];
      const when = a.timing === 'after' ? '라운딩 후 식사' : '라운딩 전 식사';
      return `
        <div class="ai-act-card">
          <div class="ai-act-title">🍽️ ${when} 추가</div>
          <div class="ai-act-body">
            <div><span>일정</span><b>${U.esc(s ? `${s.course.name} · ${U.fmtDateShort(s.date)}` : '일정을 찾을 수 없어요')}</b></div>
            <div><span>식당</span><b>${U.esc(a.restaurant && a.restaurant.name)}</b></div>
          </div>
          <p class="ai-act-note">일정 수정 화면이 열리면 '스마트 플랜 수정'을 눌러 저장하세요.</p>
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
  async confirmSchedule(msgId, i) {
    const { msg, a } = this._action(msgId, i);
    if (!a) return;
    if (typeof Billing !== 'undefined' && !Billing.guardScheduleLimit()) return;

    // 골프장 위치는 서버(AI)가 카드에 붙여서 보내줌 → 앱에는 카카오 키가 필요 없음
    let course = null;
    const sc = a.course;
    if (sc && sc.name && isFinite(sc.lat) && isFinite(sc.lng)) {
      course = { id: sc.id, name: sc.name, region: String(sc.addr || '').split(' ').slice(0, 2).join(' '), addr: sc.addr, lat: Number(sc.lat), lng: Number(sc.lng) };
    } else {
      try {
        const found = await TmapAPI.searchPlace(a.course_name);
        if (found && found.length) {
          const c = found[0];
          course = { id: c.id, name: c.place_name, region: String(c.address_name || '').split(' ').slice(0, 2).join(' '), addr: c.address_name, lat: parseFloat(c.y), lng: parseFloat(c.x) };
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
  confirmScore(msgId, i) {
    const { msg, a } = this._action(msgId, i);
    if (!a) return;
    const date = String(a.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { U.toast('날짜를 확인할 수 없어요.'); return; }

    let records = {};
    try { records = JSON.parse(localStorage.getItem('bp_records_v1') || '{}') || {}; } catch (e) { records = {}; }
    // 같은 날 기록이 있으면 덮어쓰지 않고 그날의 다른 라운드로 추가
    Record.records = records;
    const exists = Record.roundsOn(date).length > 0;
    if (exists && !confirm(`${date}에 이미 기록이 있어요. 같은 날 다른 라운드로 추가할까요?`)) return;
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

  /** 식사: 일정 수정 화면을 열고 식당을 넣어둠 (저장은 사용자가) */
  confirmMeal(msgId, i) {
    const { msg, a } = this._action(msgId, i);
    if (!a || !a.restaurant) return;
    const idx = a.schedule_index;
    if (!State.schedules[idx]) { U.toast('일정을 찾을 수 없어요.'); return; }
    const r = a.restaurant;
    this._finish(msg, a, 'done');
    Register.edit(idx);
    setTimeout(() => {
      Register.setMealFromAI(a.timing, { name: r.name, tel: r.phone, lat: r.lat, lng: r.lng });
      U.toast(`🍽️ ${r.name}을(를) 넣었어요. '스마트 플랜 수정'을 눌러 저장하세요.`, 3500);
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
