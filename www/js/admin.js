/* =========================================
   BuddyPlanner — 마켓 상품 관리 (관리자 전용)
   - 상품은 서버(market_products)에 저장되어 모든 사용자 마켓에 바로 반영됩니다.
   - 서버가 관리자 계정(app_admins)인지 확인하므로, 메뉴가 보여도 일반 사용자는 바꿀 수 없습니다.
   ========================================= */

const Admin = {
  items: [],
  loading: false,
  error: '',
  draft: null,      // 추가·수정 중인 상품
  isAdmin: null,    // 서버 확인 결과 캐시 (null = 아직 모름)

  CATS: [['ball', '골프공'], ['wear', '골프웨어'], ['glove_cap', '장갑/모자'], ['shoes', '골프화'], ['club_bag', '클럽/백'], ['etc', '기타']],
  // 상품명으로 카테고리 추측 (앞쪽 규칙이 우선)
  CAT_WORDS: [
    ['shoes', ['골프화', '스파이크', '슈즈', '신발']],
    ['glove_cap', ['장갑', '글러브', '모자', '캡', '썬캡', '선캡', '바이저', '버킷햇']],
    ['ball', ['골프공', '볼', '공 ', '프로v1', 'pro v1', 'prov1']],
    ['club_bag', ['드라이버', '아이언', '퍼터', '웨지', '우드', '유틸', '캐디백', '보스턴백', '골프백', '파우치', '헤드커버', '클럽']],
    ['wear', ['티셔츠', '셔츠', '바지', '팬츠', '치마', '스커트', '자켓', '재킷', '조끼', '베스트', '니트', '맨투맨', '후드', '바람막이', '골프웨어', '반팔', '긴팔', '양말', '벨트', '토시']]
  ],

  rpc(fn, body = {}) { return Cloud._api(`rest/v1/rpc/${fn}`, { method: 'POST', body }); },

  /** 서버에 관리자인지 물어봄 (프로필 메뉴 표시용) */
  async checkAdmin() {
    if (typeof Cloud === 'undefined' || !Cloud.isConfigured() || !Cloud.isSignedIn()) return false;
    try { this.isAdmin = (await this.rpc('is_app_admin')) === true; } catch (e) { this.isAdmin = false; }
    return this.isAdmin;
  },

  init() {
    this.render();
    this.load();
  },

  async load() {
    if (typeof Cloud === 'undefined' || !Cloud.isConfigured() || !Cloud.isSignedIn()) {
      this.error = '로그인이 필요해요.'; this.render(); return;
    }
    this.loading = true; this.error = ''; this.render();
    try {
      const rows = await this.rpc('market_admin_list');
      this.items = Array.isArray(rows) ? rows : [];
    } catch (e) {
      this.error = /admin_only/.test(String(e.message)) ? '관리자 계정이 아니에요.' : '상품 목록을 불러오지 못했어요.';
    }
    this.loading = false;
    this.render();
  },

  catName(k) { const c = this.CATS.find(x => x[0] === k); return c ? c[1] : '기타'; },

  render() {
    const screen = document.getElementById('screen-admin');
    if (!screen) return;
    const n = this.items.length;
    let body;
    if (this.loading && !n) body = `<div class="adm-empty"><div class="spinner" style="margin:0 auto;"></div></div>`;
    else if (this.error) body = `<div class="adm-empty">${U.esc(this.error)}</div>`;
    else if (!n) body = `<div class="adm-empty">아직 등록된 상품이 없어요.<br>위 버튼으로 첫 상품을 추가해 보세요.</div>`;
    else body = `
      <div class="adm-count">등록된 상품 ${n}개 · 끌어서 순서 변경</div>
      <div class="adm-list" id="adm-list">${this.items.map(p => this.itemHtml(p)).join('')}</div>`;

    screen.innerHTML = `
      <div class="adm-wrap">
        <div class="adm-head">
          <div class="adm-head-title">마켓 상품 관리</div>
          <button class="adm-close" onclick="App.navigate('profile')" aria-label="닫기">✕</button>
        </div>
        <div class="adm-body">
          <button class="adm-add" onclick="Admin.openEditor()" ${this.error ? 'disabled' : ''}>＋ 쿠팡 상품 추가</button>
          ${body}
        </div>
      </div>`;
    this.bindDrag();
  },

  imgHtml(src) {
    const ok = /^https:\/\//.test(String(src || ''));
    return ok ? `<img class="adm-img" draggable="false" src="${U.esc(src)}" alt="" onerror="this.onerror=null;this.src='img/buddybirdie_app_icon.png'">`
      : `<img class="adm-img" draggable="false" src="img/buddybirdie_app_icon.png" alt="">`;
  },

  itemHtml(p) {
    return `
      <div class="adm-item" data-id="${p.id}">
        ${this.imgHtml(p.image_url)}
        <div class="adm-info">
          <div class="adm-cat">${this.catName(p.category)} <span class="adm-state ${p.active ? '' : 'off'}">${p.active ? '노출 중' : '숨김'}</span></div>
          <div class="adm-title">${U.esc(p.title)}</div>
          <div class="adm-acts">
            <button class="adm-btn" onclick="Admin.openEditor(${p.id})">수정</button>
            <button class="adm-btn mute" onclick="Admin.toggle(${p.id})">${p.active ? '숨기기' : '보이기'}</button>
            <button class="adm-btn del" onclick="Admin.remove(${p.id})">삭제</button>
          </div>
        </div>
      </div>`;
  },

  // ---------- 붙여넣기 해석 ----------
  /** 쿠팡 파트너스 HTML 또는 단축 URL에서 링크·사진·상품명 찾기 */
  parse(text) {
    const s = String(text || '');
    const out = { link: '', image: '', title: '' };
    const href = s.match(/href\s*=\s*["']([^"']+)["']/i);
    const any = s.match(/https:\/\/(?:link\.coupang\.com|coupa\.ng|www\.coupang\.com|m\.coupang\.com)\/[^\s"'<>]+/i);
    const link = (href && /^https:\/\/(link\.coupang\.com|coupa\.ng|www\.coupang\.com|m\.coupang\.com)\//i.test(href[1])) ? href[1] : (any ? any[0] : '');
    out.link = link.replace(/&amp;/g, '&');
    const src = s.match(/<img[^>]*\ssrc\s*=\s*["'](https:\/\/[^"']+)["']/i);
    if (src) out.image = src[1].replace(/&amp;/g, '&');
    const alt = s.match(/<img[^>]*\salt\s*=\s*["']([^"']*)["']/i);
    if (alt && alt[1].trim()) out.title = this.decode(alt[1]).trim().slice(0, 100);
    return out;
  },

  decode(t) { const d = document.createElement('textarea'); d.innerHTML = t; return d.value; },

  guessCat(title) {
    const t = ' ' + String(title || '').toLowerCase() + ' ';
    for (const [k, words] of this.CAT_WORDS) if (words.some(w => t.includes(w))) return k;
    return 'etc';
  },

  // ---------- 추가·수정 시트 ----------
  openEditor(id = null) {
    const p = id ? this.items.find(x => x.id === id) : null;
    this.draft = p
      ? { id: p.id, link: p.link || '', image: p.image_url || '', title: p.title || '', category: p.category, brand: p.brand || '', autoCat: false }
      : { id: null, link: '', image: '', title: '', category: 'etc', brand: '', autoCat: true };
    App.showModal(id ? '상품 수정' : '쿠팡 상품 추가', `
      <div class="adm-sheet">
        <div class="adm-guide">쿠팡 파트너스 → 상품 링크 → <b>HTML 복사</b> 후 아래에 붙여넣으세요. 단축 URL만 붙여넣어도 돼요.</div>
        <div class="adm-lab">① 붙여넣기</div>
        <textarea id="adm-paste" class="adm-paste" rows="3" placeholder="여기에 붙여넣기" oninput="Admin.onPaste()">${p ? U.esc(p.link || '') : ''}</textarea>
        <div id="adm-found" class="adm-found"></div>
        <div id="adm-preview"></div>
        <div class="adm-lab">② 상품명</div>
        <input id="adm-name" class="adm-input" maxlength="100" placeholder="예: 풋조이 남성 골프장갑" value="${p ? U.esc(p.title) : ''}" oninput="Admin.onName()">
        <div class="adm-lab">③ 카테고리 <span id="adm-auto" class="adm-auto"></span></div>
        <div class="adm-chips" id="adm-chips"></div>
        <button id="adm-save" class="adm-save" onclick="Admin.save()">${id ? '수정 완료' : '마켓에 등록'}</button>
      </div>`);
    this.refreshSheet();
  },

  onPaste() {
    const d = this.draft; if (!d) return;
    const r = this.parse(U.$('#adm-paste').value);
    d.link = r.link;
    if (r.image) d.image = r.image;
    const nameEl = U.$('#adm-name');
    if (r.title && !nameEl.value.trim()) { nameEl.value = r.title; d.title = r.title; }
    if (d.autoCat && d.title) d.category = this.guessCat(d.title);
    this.refreshSheet();
  },

  onName() {
    const d = this.draft; if (!d) return;
    d.title = U.$('#adm-name').value;
    if (d.autoCat) d.category = this.guessCat(d.title);
    this.refreshSheet();
  },

  pickCat(k) {
    if (!this.draft) return;
    this.draft.category = k; this.draft.autoCat = false;
    this.refreshSheet();
  },

  refreshSheet() {
    const d = this.draft; if (!d) return;
    const pasted = (U.$('#adm-paste') || {}).value || '';
    const found = U.$('#adm-found');
    if (found) {
      if (!pasted.trim()) found.innerHTML = '';
      else if (!d.link) found.innerHTML = `<span class="bad">쿠팡 링크를 찾지 못했어요. HTML 또는 단축 URL을 붙여넣어 주세요.</span>`;
      else found.innerHTML = d.image ? '✓ 링크와 사진을 찾았어요' : '✓ 링크를 찾았어요 (사진은 앱 기본 이미지로 보여요)';
    }
    const pv = U.$('#adm-preview');
    if (pv) pv.innerHTML = d.link ? `
      <div class="adm-prev">${this.imgHtml(d.image)}<div class="adm-info"><div class="adm-cat">미리보기</div><div class="adm-title">${U.esc(d.title || '상품명을 입력하세요')}</div></div></div>` : '';
    const auto = U.$('#adm-auto');
    if (auto) auto.textContent = d.autoCat && d.title ? '자동 선택됨' : '';
    const chips = U.$('#adm-chips');
    if (chips) chips.innerHTML = this.CATS.map(([k, label]) =>
      `<button class="adm-chip ${d.category === k ? 'on' : ''}" onclick="Admin.pickCat('${k}')">${label}</button>`).join('');
  },

  async save() {
    const d = this.draft; if (!d) return;
    d.title = (U.$('#adm-name').value || '').trim();
    if (!d.link) return U.toast('쿠팡 링크를 붙여넣어 주세요.');
    if (!d.title) return U.toast('상품명을 입력해 주세요.');
    const btn = U.$('#adm-save'); if (btn) btn.disabled = true;
    try {
      const r = await this.rpc('market_admin_save', {
        p_id: d.id, p_category: d.category, p_title: d.title, p_link: d.link, p_image: d.image || null, p_brand: d.brand || null
      });
      if (!r || !r.ok) {
        const msg = { invalid_link: '쿠팡 링크만 등록할 수 있어요.', invalid_image: '사진 주소가 올바르지 않아요.', invalid_title: '상품명을 확인해 주세요.' }[r && r.error];
        U.toast(msg || '저장하지 못했어요.');
        if (btn) btn.disabled = false;
        return;
      }
      this.draft = null;
      App.closeModal();
      U.toast(d.id ? '수정했어요.' : '마켓에 등록했어요.');
      this.afterChange();
    } catch (e) {
      U.toast(/admin_only/.test(String(e.message)) ? '관리자 계정이 아니에요.' : '저장하지 못했어요. 인터넷 연결을 확인해 주세요.');
      if (btn) btn.disabled = false;
    }
  },

  async toggle(id) {
    const p = this.items.find(x => x.id === id); if (!p) return;
    try {
      const r = await this.rpc('market_admin_set_active', { p_id: id, p_active: !p.active });
      if (r && r.ok) { U.toast(p.active ? '마켓에서 숨겼어요.' : '마켓에 다시 보여요.'); this.afterChange(); }
    } catch (e) { U.toast('바꾸지 못했어요.'); }
  },

  async remove(id) {
    if (!confirm('이 상품을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
    try {
      const r = await this.rpc('market_admin_delete', { p_id: id });
      if (r && r.ok) { U.toast('삭제했어요.'); this.afterChange(); }
    } catch (e) { U.toast('삭제하지 못했어요.'); }
  },

  /** 변경 후: 관리 목록 다시 읽고, 사용자 마켓 목록도 새로 받기 */
  afterChange() {
    this.load();
    if (typeof Market !== 'undefined') { Market.items = null; }
  },

  // ---------- 끌어서 순서 변경 ----------
  bindDrag() {
    const list = U.$('#adm-list'); if (!list) return;
    let drag = null;
    const move = e => {
      if (!drag) return;
      if (!drag.moved) { if (Math.abs(e.clientY - drag.startY) > 8) stop(false); return; }
      const sibs = [...list.querySelectorAll('.adm-item:not(.dragging)')];
      const after = sibs.find(s => { const r = s.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
      if (after) { if (after !== drag.el.nextSibling) list.insertBefore(drag.el, after); }
      else if (list.lastElementChild !== drag.el) list.appendChild(drag.el);
    };
    const up = () => stop(true);
    const stop = save => {
      if (!drag) return;
      clearTimeout(drag.timer);
      const moved = drag.moved; drag.el.classList.remove('dragging'); drag = null;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (save && moved) this.saveOrder([...list.querySelectorAll('.adm-item')].map(x => Number(x.dataset.id)));
    };
    // 끄는 동안 화면이 같이 스크롤되지 않게
    list.addEventListener('touchmove', e => { if (drag && drag.moved) e.preventDefault(); }, { passive: false });
    list.addEventListener('pointerdown', e => {
      const el = e.target.closest('.adm-item');
      if (!el || e.target.closest('button')) return;
      drag = { el, startY: e.clientY, moved: false, timer: null };
      // 손가락은 살짝 길게 눌러야 끌기 시작 (스크롤과 구분)
      const begin = () => { if (drag) { drag.moved = true; el.classList.add('dragging'); if (navigator.vibrate) try { navigator.vibrate(15); } catch (x) {} } };
      if (e.pointerType === 'mouse') begin(); else drag.timer = setTimeout(begin, 300);
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });
  },

  async saveOrder(ids) {
    const before = this.items.map(x => x.id).join(',');
    if (ids.join(',') === before) return;
    this.items = ids.map(id => this.items.find(x => x.id === id)).filter(Boolean);
    try {
      await this.rpc('market_admin_reorder', { p_ids: ids });
      U.toast('순서를 바꿨어요.');
      if (typeof Market !== 'undefined') Market.items = null;
    } catch (e) { U.toast('순서를 저장하지 못했어요.'); this.load(); }
  }
};
