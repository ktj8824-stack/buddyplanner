/* =========================================
   BuddyPlanner — 버디 커뮤니티

   - 글·굿샷·조인 신청·신고·차단은 모두 서버 함수(supabase/004_community.sql)로 처리합니다.
   - 조인·카풀 글: 신청 → 작성자가 수락하면 작성자가 남긴 오픈채팅 링크가 신청자에게 보입니다.
   - 구글 플레이 사용자 생성 콘텐츠 정책: 커뮤니티 규칙 동의, 신고, 사용자 차단, 신고 누적 자동 숨김.
   ========================================= */

const Community = {
  CATS: [
    ['', '전체'], ['join', '⛳ 조인 모집'], ['carpool', '🚗 카풀'], ['review', '🏆 라운딩 후기'], ['free', '💬 자유']
  ],
  LABEL: { join: '⛳ 조인 모집', carpool: '🚗 카풀', review: '🏆 라운딩 후기', free: '💬 자유' },
  RULES_KEY: 'bp_cm_rules_v1',

  cat: '',
  posts: [],
  loading: false,
  error: null,
  hasMore: false,

  init() {
    this.render();
    this.load(true);
    // 관리자면 글쓰기에 '운영팀 공지' 스위치를 보여 주려고 미리 확인
    if (typeof Admin !== 'undefined' && Admin.isAdmin === null) Admin.checkAdmin();
  },
  isAdmin() { return typeof Admin !== 'undefined' && Admin.isAdmin === true; },

  available() { return typeof Cloud !== 'undefined' && Cloud.isConfigured() && Cloud.isSignedIn(); },
  rpc(fn, body = {}) { return Cloud._api(`rest/v1/rpc/${fn}`, { method: 'POST', body }); },
  myName() { return String(localStorage.getItem('bp_user_name') || '').trim().slice(0, 20); },

  async load(reset) {
    if (!this.available()) { this.render(); return; }
    if (this.loading) return;
    this.loading = true; this.error = null;
    if (reset) { this.posts = []; this.render(); }
    try {
      const normal = this.posts.filter(x => !x.pinned);
      const before = !reset && normal.length ? normal[normal.length - 1].id : null;
      const rows = await this.rpc('community_feed', { p_category: this.cat || null, p_before: before, p_limit: 20 });
      const list = Array.isArray(rows) ? rows : [];
      this.posts = reset ? list : this.posts.concat(list);
      this.hasMore = list.filter(x => !x.pinned).length === 20;   // 고정 공지는 개수에서 뺌
    } catch (e) {
      console.warn('[Community] 피드 실패', e);
      this.error = navigator.onLine === false ? 'offline' : 'error';
    }
    this.loading = false;
    if (State.screen === 'community') this.render();
  },

  setCat(c) { if (this.cat === c) return; this.cat = c; this.load(true); },
  find(id) { return this.posts.find(p => String(p.id) === String(id)); },

  /* ── 표시 도우미 ── */
  ago(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return '방금';
    if (s < 3600) return `${Math.floor(s / 60)}분 전`;
    if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
    const d = new Date(iso); return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  },
  when(iso) {
    const d = new Date(iso); const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
  avatarColor(name) {
    const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#6366f1'];
    let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return colors[h % colors.length];
  },

  render() {
    const el = U.$('#screen-community');
    if (!el) return;
    let body;
    if (typeof Cloud === 'undefined' || !Cloud.isConfigured()) {
      body = this.empty('💬', '커뮤니티를 준비하고 있어요', '곧 조인 모집과 라운딩 후기를 나눌 수 있어요.');
    } else if (!Cloud.isSignedIn()) {
      body = this.empty('🔒', '로그인하고 함께해요', '커뮤니티는 로그인한 회원만 이용할 수 있어요.', `<button class="btn-join" onclick="App.navigate('login')">로그인하기</button>`);
    } else if (this.loading && !this.posts.length) {
      body = `<div class="cm-empty"><div class="spinner" style="margin:0 auto 10px;"></div>불러오는 중...</div>`;
    } else if (this.error && !this.posts.length) {
      body = this.empty('📡', '글을 불러오지 못했어요', this.error === 'offline' ? '인터넷 연결을 확인해 주세요.' : '잠시 후 다시 시도해 주세요.', `<button class="btn-goodshot" onclick="Community.load(true)">다시 시도</button>`);
    } else if (!this.posts.length) {
      body = this.empty('🏌️', this.cat ? '아직 이 분류의 글이 없어요' : '첫 글을 남겨 보세요', '조인 멤버를 모으거나 라운딩 후기를 나눠 보세요.', `<button class="btn-join" onclick="Community.openWrite()">글쓰기</button>`);
    } else {
      body = this.posts.map(p => this.card(p)).join('')
        + (this.hasMore ? `<button class="cm-more" onclick="Community.load(false)">${this.loading ? '불러오는 중...' : '더 보기'}</button>` : '');
    }
    const signed = this.available();
    el.innerHTML = `
      <div class="screen-scroll" style="background:#f8fafc; padding-top:var(--header-h); padding-bottom:calc(var(--safe-bottom) + 120px);">
        <div class="community-header">
          <h2>버디 커뮤니티</h2>
          ${signed ? `<div class="cm-head-actions">
            <button class="cm-icon-btn" onclick="Community.openMyRequests()">내 신청</button>
            <button class="cm-icon-btn" onclick="Community.openSettings()" aria-label="커뮤니티 설정">⋯</button>
          </div>` : ''}
        </div>
        ${signed ? `<div class="community-cats">
          ${this.CATS.map(([k, label]) => `<button class="comm-cat-pill ${this.cat === k ? 'active' : ''}" onclick="Community.setCat('${k}')">${label}</button>`).join('')}
        </div>` : ''}
        <div class="feed-list">${body}</div>
      </div>
      ${signed ? `<button class="cm-fab" onclick="Community.openWrite()" aria-label="글쓰기">＋ 글쓰기</button>` : ''}
    `;
  },

  empty(icon, title, desc, action = '') {
    return `<div class="cm-empty"><div style="font-size:38px;">${icon}</div><b>${title}</b><span>${desc}</span>${action}</div>`;
  },

  card(p) {
    const joinable = p.category === 'join' || p.category === 'carpool';
    const full = joinable && p.accepted_count >= (p.slots || 0);
    let tags = p.pinned ? `<span class="tag-pin">📌 공지</span>` : '';
    if (!p.pinned || joinable) tags += `<span class="tag-join">${this.LABEL[p.category] || ''}${joinable ? ` (${p.accepted_count}/${p.slots}명)` : ''}</span>`;
    if (p.course_name) tags += `<span class="tag-course">${U.esc(p.course_name)}</span>`;
    if (joinable && p.round_at) tags += `<span class="tag-when">${this.when(p.round_at)}</span>`;
    if (joinable && p.status === 'closed') tags += `<span class="tag-closed">모집 마감</span>`;

    let action = '';
    if (joinable) {
      if (p.is_mine) {
        action = `<button class="btn-join" onclick="Community.openRequests(${p.id})">신청자 보기${p.pending_count ? ` <b class="cm-dot">${p.pending_count}</b>` : ''}</button>`;
      } else if (p.my_request === 'accepted') {
        action = `<button class="btn-join cm-accepted" onclick="Community.openContact(${p.id})">✓ 참여 확정${p.has_contact ? ' · 연락하기' : ''}</button>`;
      } else if (p.my_request === 'pending') {
        action = `<button class="btn-join cm-pending" onclick="Community.cancelJoin(${p.id})">신청 대기중 · 취소</button>`;
      } else if (p.my_request === 'declined') {
        action = `<button class="btn-join cm-disabled" disabled>참여가 어려워요</button>`;
      } else if (p.status === 'closed' || full || (p.round_at && new Date(p.round_at) < new Date())) {
        action = `<button class="btn-join cm-disabled" disabled>모집 마감</button>`;
      } else {
        action = `<button class="btn-join" onclick="Community.openJoin(${p.id})">참여 신청하기</button>`;
      }
    }
    return `
      <div class="feed-card${p.hidden ? ' cm-hidden' : ''}${p.is_official ? ' cm-official' : ''}">
        ${p.hidden ? `<div class="cm-hidden-note">신고가 누적되어 다른 회원에게는 보이지 않는 글이에요.</div>` : ''}
        <div class="feed-author">
          ${p.is_official
            ? `<div class="author-avatar cm-avatar cm-official-avatar" aria-label="BuddyPlanner 운영팀"></div>`
            : `<div class="author-avatar cm-avatar" style="background:${this.avatarColor(p.author_name)};">${U.esc(String(p.author_name).charAt(0))}</div>`}
          <div class="author-info" style="flex:1; min-width:0;">
            <div class="author-name-row"><span class="author-name">${U.esc(p.author_name)}</span>${p.is_official ? '<span class="author-badge cm-staff">운영팀</span>' : (p.is_mine ? '<span class="author-badge">내 글</span>' : '')}</div>
            <span class="feed-time">${this.ago(p.created_at)}</span>
          </div>
          <button class="cm-more-btn" onclick="Community.openPostMenu(${p.id})" aria-label="더보기">⋯</button>
        </div>
        <div class="feed-tags">${tags}</div>
        <div class="feed-content">${U.esc(p.content)}</div>
        <div class="feed-actions">
          <button class="btn-goodshot ${p.liked ? 'active' : ''}" onclick="Community.toggleLike(${p.id}, this)"><span>👍</span><span>굿샷 ${p.like_count}</span></button>
          ${action}
        </div>
      </div>`;
  },

  /* ── 굿샷 ── */
  async toggleLike(id, btn) {
    const p = this.find(id); if (!p || btn.disabled) return;
    btn.disabled = true;
    try {
      const r = await this.rpc('community_toggle_like', { p_post: id });
      if (r && r.ok) { p.liked = r.liked; p.like_count = r.count; btn.classList.toggle('active', r.liked); btn.querySelectorAll('span')[1].textContent = `굿샷 ${r.count}`; }
    } catch (e) { U.toast('잠시 후 다시 시도해 주세요.'); }
    btn.disabled = false;
  },

  /* ── 글쓰기 ── */
  openWrite() {
    if (!this.available()) { App.navigate('login'); return; }
    if (localStorage.getItem(this.RULES_KEY) !== '1') { this.showRules(true); return; }
    if (!this.myName()) { U.toast('마이 화면에서 닉네임을 먼저 정해 주세요.'); return; }
    const d = new Date(); d.setDate(d.getDate() + 7);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cat = this.cat || 'join';
    App.showModal('글쓰기', `
      <div class="cm-form">
        ${this.isAdmin() ? `<label class="cm-official-toggle">
          <div style="flex:1"><b>운영팀 공지로 올리기</b><span>운영팀 이름·배지로 표시되고 피드 맨 위에 고정돼요 (관리자만 보임)</span></div>
          <input type="checkbox" id="cm-official" class="cm-sw-input"><span class="cm-sw"></span>
        </label>` : ''}
        <div class="cm-seg" id="cm-cat">
          ${['join', 'carpool', 'review', 'free'].map(k => `<button type="button" data-k="${k}" class="${k === cat ? 'on' : ''}" onclick="Community.pickCat('${k}')">${this.LABEL[k]}</button>`).join('')}
        </div>
        <textarea id="cm-content" maxlength="1000" rows="5" placeholder="내용을 입력하세요 (2~1000자)"></textarea>
        <input id="cm-course" maxlength="60" placeholder="골프장 (선택, 예: 남서울CC)">
        <div id="cm-join-fields">
          <div class="cm-row">
            <label>라운딩 날짜<input id="cm-date" type="date" value="${ds}"></label>
            <label>티오프<input id="cm-time" type="time" value="07:00"></label>
          </div>
          <label>모집 인원
            <select id="cm-slots"><option value="1">1명</option><option value="2">2명</option><option value="3" selected>3명</option></select>
          </label>
          <input id="cm-contact" maxlength="200" placeholder="카카오 오픈채팅 링크 (선택, 수락한 분에게만 보여요)">
        </div>
        <button class="btn-primary" id="cm-submit" onclick="Community.submitPost()">올리기</button>
        <div class="cm-hint">욕설·광고·개인정보 노출 글은 신고로 숨겨질 수 있어요.</div>
      </div>`);
    this.pickCat(cat);
  },

  pickCat(k) {
    document.querySelectorAll('#cm-cat button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    const f = U.$('#cm-join-fields'); if (f) f.style.display = (k === 'join' || k === 'carpool') ? '' : 'none';
    this._writeCat = k;
  },

  async submitPost() {
    const v = id => ((U.$(id) || {}).value || '').trim();
    const k = this._writeCat || 'join';
    const content = v('#cm-content');
    if (content.length < 2) { U.toast('내용을 2자 이상 입력해 주세요.'); return; }
    let roundAt = null, slots = null, contact = null;
    if (k === 'join' || k === 'carpool') {
      const dt = new Date(`${v('#cm-date')}T${v('#cm-time') || '07:00'}`);
      if (isNaN(dt) || dt < new Date()) { U.toast('라운딩 날짜와 시간을 확인해 주세요.'); return; }
      roundAt = dt.toISOString(); slots = parseInt(v('#cm-slots'), 10) || 1;
      contact = v('#cm-contact') || null;
      if (contact && !/^https:\/\/open\.kakao\.com\//.test(contact)) { U.toast('연락 링크는 카카오 오픈채팅 주소만 넣을 수 있어요.'); return; }
    }
    const btn = U.$('#cm-submit'); btn.disabled = true; btn.textContent = '올리는 중...';
    const msg = { daily_limit: '오늘은 글을 더 올릴 수 없어요 (하루 10개).', invalid_date: '라운딩 날짜를 확인해 주세요.', invalid_contact: '오픈채팅 링크를 확인해 주세요.', name_required: '닉네임을 확인해 주세요. (운영팀·관리자 같은 이름은 쓸 수 없어요)' };
    const official = !!(U.$('#cm-official') || {}).checked;
    try {
      const body = { p_category: k, p_content: content, p_course: v('#cm-course') || null, p_round_at: roundAt, p_slots: slots, p_contact: contact };
      const r = official
        ? await this.rpc('community_create_official_post', { ...body, p_pin: true })
        : await this.rpc('community_create_post', { p_author: this.myName(), ...body });
      if (r && r.ok) { App.closeModal(); U.toast('글을 올렸어요.'); this.cat = ''; this.load(true); return; }
      U.toast(msg[r && r.error] || '글을 올리지 못했어요.');
    } catch (e) { U.toast('글을 올리지 못했어요. 인터넷 연결을 확인해 주세요.'); }
    btn.disabled = false; btn.textContent = '올리기';
  },

  /* ── 조인 신청 ── */
  openJoin(id) {
    const p = this.find(id); if (!p) return;
    if (!this.myName()) { U.toast('마이 화면에서 닉네임을 먼저 정해 주세요.'); return; }
    App.showModal('참여 신청', `
      <div class="cm-form">
        <div class="cm-sum"><b>${U.esc(p.author_name)}</b>님의 ${this.LABEL[p.category]}${p.course_name ? ` · ${U.esc(p.course_name)}` : ''}${p.round_at ? ` · ${this.when(p.round_at)}` : ''}</div>
        <textarea id="cm-msg" maxlength="200" rows="3" placeholder="간단한 소개를 남겨 주세요 (예: 평균 90타, 매너 좋아요!)"></textarea>
        <button class="btn-primary" id="cm-join-btn" onclick="Community.requestJoin(${id})">신청하기</button>
        <div class="cm-hint">작성자가 수락하면 '내 신청'에서 연락 방법을 확인할 수 있어요.</div>
      </div>`);
  },

  async requestJoin(id) {
    const btn = U.$('#cm-join-btn'); btn.disabled = true;
    const msg = { full: '모집이 마감됐어요.', closed: '모집이 마감됐어요.', already: '이미 신청했어요.', declined: '이 모집에는 다시 신청할 수 없어요.', blocked: '신청할 수 없는 글이에요.', daily_limit: '오늘은 더 신청할 수 없어요.' };
    try {
      const r = await this.rpc('community_request_join', { p_post: id, p_name: this.myName(), p_message: ((U.$('#cm-msg') || {}).value || '').trim() || null });
      if (r && r.ok) { App.closeModal(); U.toast('신청했어요! 수락되면 알려 드릴게요.'); this.load(true); return; }
      U.toast(msg[r && r.error] || '신청하지 못했어요.');
    } catch (e) { U.toast('신청하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
    btn.disabled = false;
  },

  async cancelJoin(id) {
    if (!confirm('참여 신청을 취소할까요?')) return;
    try { await this.rpc('community_cancel_join', { p_post: id }); U.toast('신청을 취소했어요.'); } catch (e) { U.toast('취소하지 못했어요.'); }
    this.load(true);
  },

  /* ── 작성자: 신청자 관리 ── */
  async openRequests(id) {
    const p = this.find(id); if (!p) return;
    App.showModal('신청자', `<div class="cm-empty small"><div class="spinner" style="margin:0 auto;"></div></div>`);
    let r;
    try { r = await this.rpc('community_post_requests', { p_post: id }); } catch (e) { r = null; }
    if (!r || !r.ok) { App.showModal('신청자', '<div class="cm-empty small">신청자 목록을 불러오지 못했어요.</div>'); return; }
    const st = { pending: '대기', accepted: '수락', declined: '거절' };
    const rows = r.requests.map(q => `
      <div class="cm-req">
        <div class="cm-req-top"><b>${U.esc(q.name)}</b><span class="cm-st ${q.status}">${st[q.status] || q.status}</span></div>
        ${q.message ? `<div class="cm-req-msg">${U.esc(q.message)}</div>` : ''}
        ${q.status === 'pending' ? `<div class="cm-req-btns">
          <button class="btn-join" onclick="Community.respond(${q.id}, true, ${id})">수락</button>
          <button class="btn-goodshot" onclick="Community.respond(${q.id}, false, ${id})">거절</button>
          <button class="cm-link-btn" onclick="Community.blockApplicant(${q.id}, ${id})">차단</button>
        </div>` : ''}
      </div>`).join('') || '<div class="cm-empty small">아직 신청자가 없어요.</div>';
    App.showModal(`신청자 (${p.accepted_count}/${p.slots}명 확정)`, `
      <div class="cm-form">
        ${rows}
        <div class="cm-hint">${p.has_contact ? '수락한 분에게 오픈채팅 링크가 보여요.' : '오픈채팅 링크를 넣지 않아서, 수락한 분과 연락할 방법을 따로 정해야 해요.'}</div>
        <div class="cm-req-btns">
          <button class="btn-goodshot" onclick="Community.setStatus(${id}, '${p.status === 'open' ? 'closed' : 'open'}')">${p.status === 'open' ? '모집 마감하기' : '다시 모집하기'}</button>
        </div>
      </div>`);
  },

  async respond(reqId, accept, postId) {
    const msg = { full: '모집 인원이 이미 찼어요.' };
    try {
      const r = await this.rpc('community_respond_join', { p_request: reqId, p_accept: accept });
      if (!r || !r.ok) { U.toast(msg[r && r.error] || '처리하지 못했어요.'); return; }
      U.toast(accept ? '수락했어요.' : '거절했어요.');
    } catch (e) { U.toast('처리하지 못했어요.'); return; }
    await this.load(true);
    this.openRequests(postId);
  },

  async blockApplicant(reqId, postId) {
    if (!confirm('이 신청자를 차단할까요? 차단하면 내 글에 다시 신청할 수 없어요.')) return;
    try { await this.rpc('community_block_applicant', { p_request: reqId }); U.toast('차단했어요.'); } catch (e) { U.toast('차단하지 못했어요.'); }
    this.openRequests(postId);
  },

  async setStatus(id, status) {
    try { await this.rpc('community_set_status', { p_post: id, p_status: status }); } catch (e) { U.toast('처리하지 못했어요.'); return; }
    App.closeModal(); U.toast(status === 'closed' ? '모집을 마감했어요.' : '다시 모집해요.'); this.load(true);
  },

  /* ── 연락하기 / 내 신청 ── */
  async openContact(id) {
    try {
      const r = await this.rpc('community_post_contact', { p_post: id });
      if (r && r.ok && r.url) { Market.openLink(r.url); return; }
      U.toast('작성자가 연락 링크를 남기지 않았어요. 글 내용을 확인해 주세요.');
    } catch (e) { U.toast('잠시 후 다시 시도해 주세요.'); }
  },

  async openMyRequests() {
    App.showModal('내 신청', `<div class="cm-empty small"><div class="spinner" style="margin:0 auto;"></div></div>`);
    let list = [];
    try { list = await this.rpc('community_my_requests') || []; } catch (e) { App.showModal('내 신청', '<div class="cm-empty small">불러오지 못했어요.</div>'); return; }
    const st = { pending: '수락 대기', accepted: '참여 확정', declined: '참여 어려움' };
    const rows = list.map(r => `
      <div class="cm-req">
        <div class="cm-req-top"><b>${U.esc(r.author_name)} · ${this.LABEL[r.category] || ''}</b><span class="cm-st ${r.status}">${st[r.status] || r.status}</span></div>
        <div class="cm-req-msg">${r.course_name ? U.esc(r.course_name) + ' · ' : ''}${r.round_at ? this.when(r.round_at) : ''}<br>${U.esc(r.content)}</div>
        ${r.status === 'accepted' ? (r.contact
          ? `<div class="cm-req-btns"><button class="btn-join" onclick="Market.openLink('${U.esc(r.contact)}')">오픈채팅 열기</button></div>`
          : `<div class="cm-hint">작성자가 연락 링크를 남기지 않았어요.</div>`) : ''}
        ${r.status === 'pending' ? `<div class="cm-req-btns"><button class="cm-link-btn" onclick="App.closeModal(); Community.cancelJoin(${r.post_id})">신청 취소</button></div>` : ''}
      </div>`).join('') || '<div class="cm-empty small">아직 신청한 모집이 없어요.</div>';
    App.showModal('내 신청', `<div class="cm-form">${rows}</div>`);
  },

  /* ── 글 메뉴: 신고·차단·삭제 ── */
  openPostMenu(id) {
    const p = this.find(id); if (!p) return;
    const pin = this.isAdmin() && p.is_official
      ? `<button class="cm-menu-item" onclick="Community.setPin(${id}, ${!p.pinned})">${p.pinned ? '📌 고정 해제' : '📌 맨 위에 고정'}</button>` : '';
    const items = p.is_mine
      ? `${pin}<button class="cm-menu-item danger" onclick="Community.deletePost(${id})">글 삭제</button>`
      : `${p.reported ? '<div class="cm-menu-item muted">이미 신고한 글이에요</div>' : `<button class="cm-menu-item" onclick="Community.openReport(${id})">🚩 신고하기</button>`}
         <button class="cm-menu-item danger" onclick="Community.blockAuthor(${id})">🚫 이 사용자 차단</button>`;
    App.showModal('', `<div class="cm-menu">${items}<button class="cm-menu-item muted" onclick="App.closeModal()">닫기</button></div>`);
  },

  async setPin(id, on) {
    App.closeModal();
    try {
      const r = await this.rpc('community_set_pin', { p_post: id, p_pinned: on });
      if (r && r.ok) { U.toast(on ? '맨 위에 고정했어요.' : '고정을 해제했어요.'); this.load(true); return; }
    } catch (e) { /* 아래 안내 */ }
    U.toast('바꾸지 못했어요.');
  },

  openReport(id) {
    const reasons = ['욕설·비하', '광고·도배', '음란·불쾌한 내용', '개인정보 노출', '사기·거짓 모집', '기타'];
    App.showModal('신고하기', `
      <div class="cm-menu">
        ${reasons.map(r => `<button class="cm-menu-item" onclick="Community.report(${id}, '${r}')">${r}</button>`).join('')}
        <div class="cm-hint" style="text-align:center;">신고가 쌓인 글은 자동으로 숨겨지고 운영자가 확인해요.</div>
      </div>`);
  },

  async report(id, reason) {
    try {
      const r = await this.rpc('community_report', { p_post: id, p_reason: reason });
      App.closeModal();
      if (r && r.ok) { U.toast('신고했어요. 확인 후 조치할게요.'); const p = this.find(id); if (p) p.reported = true; }
      else U.toast(r && r.error === 'daily_limit' ? '오늘은 더 신고할 수 없어요.' : '신고하지 못했어요.');
    } catch (e) { App.closeModal(); U.toast('신고하지 못했어요.'); }
  },

  async blockAuthor(id) {
    if (!confirm('이 사용자를 차단할까요? 차단하면 이 사용자의 글이 보이지 않아요.')) return;
    try { await this.rpc('community_block_author', { p_post: id }); App.closeModal(); U.toast('차단했어요.'); }
    catch (e) { U.toast('차단하지 못했어요.'); return; }
    this.load(true);
  },

  async deletePost(id) {
    if (!confirm('이 글을 삭제할까요? 신청 내역도 함께 지워져요.')) return;
    try { await this.rpc('community_delete_post', { p_post: id }); App.closeModal(); U.toast('삭제했어요.'); }
    catch (e) { U.toast('삭제하지 못했어요.'); return; }
    this.load(true);
  },

  /* ── 설정·규칙 ── */
  async openSettings() {
    let n = 0;
    try { n = await this.rpc('community_block_count') || 0; } catch (e) { /* 무시 */ }
    App.showModal('커뮤니티', `
      <div class="cm-menu">
        <button class="cm-menu-item" onclick="Community.showRules(false)">📋 커뮤니티 규칙</button>
        <button class="cm-menu-item" ${n ? '' : 'disabled'} onclick="Community.unblockAll()">🚫 차단한 사용자 ${n}명 모두 해제</button>
        <button class="cm-menu-item muted" onclick="App.closeModal()">닫기</button>
      </div>`);
  },

  async unblockAll() {
    if (!confirm('차단한 사용자를 모두 해제할까요?')) return;
    try { await this.rpc('community_unblock_all'); App.closeModal(); U.toast('차단을 모두 해제했어요.'); } catch (e) { U.toast('해제하지 못했어요.'); return; }
    this.load(true);
  },

  showRules(forWrite) {
    const rules = [
      '서로 존중해요. 욕설, 비하, 차별, 괴롭힘은 금지예요.',
      '광고, 홍보, 도배, 불법·음란한 내용은 올릴 수 없어요.',
      '전화번호·주소 등 개인정보를 글에 쓰지 마세요. 연락은 수락 후 오픈채팅으로 해요.',
      '조인·카풀은 약속을 지켜 주세요. 금전 거래·사기 모집은 금지예요.',
      '규칙을 어긴 글은 신고로 숨겨지고, 반복하면 이용이 제한될 수 있어요.',
      '불쾌한 글은 ⋯ 메뉴에서 신고하거나 작성자를 차단할 수 있어요.'
    ];
    App.showModal('커뮤니티 규칙', `
      <div class="cm-form">
        <ol class="cm-rules">${rules.map(r => `<li>${r}</li>`).join('')}</ol>
        ${forWrite
          ? `<button class="btn-primary" onclick="localStorage.setItem('${this.RULES_KEY}','1'); App.closeModal(); setTimeout(()=>Community.openWrite(), 320);">규칙에 동의하고 글쓰기</button>`
          : `<button class="btn-primary" onclick="App.closeModal()">확인</button>`}
      </div>`);
  }
};
