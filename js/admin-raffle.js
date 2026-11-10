/* =========================================
   BuddyPlanner — 관리자: 럭키드로우 회차 관리
   - 회차 만들기 (손해 없는 '회차 성립 기준'을 서버 설정값으로 자동 계산)
   - 응모 현황, 지금 추첨, 취소(포인트 반환)
   - 당첨자 배송 정보 확인, 발송 완료, 기한 지난 당첨자 → 예비 당첨자에게 넘기기
   서버 함수: admin_raffle_list / admin_raffle_save / admin_raffle_action / admin_point_settings
   ========================================= */

const AdminRaffle = {
  list: [],
  settings: {},
  loading: false,
  error: '',
  draft: null,

  rpc(fn, body = {}) { return Cloud._api(`rest/v1/rpc/${fn}`, { method: 'POST', body }); },
  num(k, d) { const v = Number(this.settings[k]); return isFinite(v) && v > 0 ? v : d; },

  async load() {
    this.loading = true; this.error = ''; Admin.render();
    try {
      const [rows, st] = await Promise.all([this.rpc('admin_raffle_list'), this.rpc('admin_point_settings')]);
      this.list = Array.isArray(rows) ? rows : [];
      this.settings = st || {};
    } catch (e) {
      this.error = /admin_only/.test(String(e.message)) ? '관리자 계정이 아니에요.' : '럭키드로우 목록을 불러오지 못했어요.';
    }
    this.loading = false; Admin.render();
  },

  /** 손해 없는 회차 성립 기준(응모 횟수): 경품비 ÷ 돌려주는 비율 ÷ 광고 1회 수익 × 광고 포인트 ÷ 광고 포인트 비율 ÷ 응모 1회 포인트 */
  breakEven(prizeCost, entryCost) {
    const rev = this.num('rf_rev_per_view', 11), payout = this.num('rf_payout', 0.75), share = this.num('rf_ad_share', 0.55);
    const adPts = this.num('ad_reward_points', 10);
    const views = Math.ceil(prizeCost / payout / rev);
    const pool = views * adPts / share;
    return { views, revenue: Math.round(prizeCost / payout), entries: Math.ceil(pool / Math.max(1, entryCost)) };
  },

  fmt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
  statusName(r) {
    if (r.status === 'open') return r.extended ? '진행 중 (연장됨)' : '진행 중';
    return r.status === 'drawn' ? '추첨 완료' : '취소됨';
  },

  render() {
    let body;
    if (this.loading && !this.list.length) body = `<div class="adm-empty"><div class="spinner" style="margin:0 auto;"></div></div>`;
    else if (this.error) body = `<div class="adm-empty">${U.esc(this.error)}</div>`;
    else if (!this.list.length) body = `<div class="adm-empty">아직 만든 회차가 없어요.<br>첫 회차는 '홍보 회차'로 작게 시작해 보세요.</div>`;
    else body = this.list.map(r => this.cardHtml(r)).join('');
    return `
      <button class="adm-add" onclick="AdminRaffle.openEditor()" ${this.error ? 'disabled' : ''}>＋ 새 회차 만들기</button>
      <div class="adm-count">광고 ${this.num('ad_reward_points', 10)}P · 하루 ${this.num('ad_daily_limit', 10)}회 · 광고 1회 수익 ${this.num('rf_rev_per_view', 11)}원 가정 · 경품 환원 ${Math.round(this.num('rf_payout', 0.75) * 100)}%</div>
      ${body}`;
  },

  cardHtml(r) {
    const min = r.min_entries || 0;
    const pct = min ? Math.min(100, Math.round(r.entries / min * 100)) : 100;
    const winners = (r.winners || []).map(w => this.winnerHtml(r, w)).join('');
    const open = r.status === 'open';
    return `
      <div class="arf-card">
        <div class="arf-top">
          <b>${U.esc(r.title)}</b>
          <span class="arf-st ${r.status}">${this.statusName(r)}</span>
        </div>
        <div class="arf-sub">🎁 ${U.esc(r.prize_name)} · ${Number(r.prize_value || 0).toLocaleString()}원${r.sponsored ? ' · <span class="arf-tag">홍보 회차</span>' : ''}</div>
        <div class="arf-sub">${this.fmt(r.starts_at)} ~ ${this.fmt(r.ends_at)} · 응모 ${r.entry_cost}P · 1인 ${r.per_user_limit}회 · 당첨 ${r.winners_count}명 + 예비 ${r.reserve_count}명</div>
        <div class="arf-prog"><i style="width:${pct}%"></i></div>
        <div class="arf-sub">응모 ${r.entries}회 (${r.people}명)${min ? ` / 성립 기준 ${min}회` : ' · 성립 기준 없음'}</div>
        ${open ? `<div class="arf-acts">
          ${r.entries ? '' : `<button onclick="AdminRaffle.openEditor(${r.id})">수정</button>`}
          <button onclick="AdminRaffle.act(${r.id}, 'draw')">지금 추첨</button>
          <button class="danger" onclick="AdminRaffle.act(${r.id}, 'cancel')">취소·포인트 반환</button>
        </div>` : ''}
        ${winners ? `<div class="arf-win">${winners}</div>` : ''}
      </div>`;
  },

  winnerHtml(r, w) {
    const expired = !w.claimed_at && !w.reserve && !w.forfeited && w.claim_until && new Date(w.claim_until) < new Date();
    let state;
    if (w.forfeited) state = '당첨 취소';
    else if (w.reserve) state = '예비';
    else if (w.shipped_at) state = `발송 완료 ${this.fmt(w.shipped_at)}`;
    else if (w.claimed_at) state = '배송지 받음';
    else state = expired ? '기한 지남' : `배송지 기다림 (~${this.fmt(w.claim_until)})`;
    const ship = w.claimed_at && !w.forfeited ? `<div class="arf-ship">${U.esc(w.ship_name || '')} · ${U.esc(w.ship_phone || '')}<br>${U.esc(w.ship_addr || '(발송 30일 뒤 자동 삭제됨)')}</div>` : '';
    return `
      <div class="arf-w">
        <div><b>${w.rank}. ${U.esc(w.name)}</b> <span class="arf-wst">${state}</span></div>
        ${ship}
        ${w.claimed_at && !w.shipped_at && !w.forfeited ? `<button onclick="AdminRaffle.act(${r.id}, 'ship', '${w.user_id}')">발송 완료로 표시</button>` : ''}
        ${expired ? `<button onclick="AdminRaffle.act(${r.id}, 'promote')">예비 당첨자에게 넘기기</button>` : ''}
      </div>`;
  },

  async act(id, action, user = null) {
    const msg = { draw: '지금 추첨할까요? 성립 기준에 못 미치면 취소되고 포인트가 반환돼요.', cancel: '이 회차를 취소하고 응모 포인트를 모두 돌려줄까요?', ship: '발송 완료로 표시할까요? 배송 정보는 30일 뒤 자동으로 지워져요.', promote: '기한 안에 배송지를 넣지 않은 당첨자를 취소하고 예비 당첨자에게 넘길까요?' }[action];
    if (!(await App.ask('럭키드로우', msg, { ok: '확인' }))) return;
    try {
      const r = await this.rpc('admin_raffle_action', { p_id: id, p_action: action, p_user: user });
      if (r && r.ok === false) {
        U.toast({ not_open: '이미 끝난 회차예요.', no_expired_winner: '기한이 지난 당첨자가 없어요.', no_reserve: '남은 예비 당첨자가 없어요.' }[r.error] || '처리하지 못했어요.');
      } else U.toast(action === 'promote' && r.promoted ? `${r.promoted}님에게 넘겼어요.` : '처리했어요.');
    } catch (e) { U.toast('처리하지 못했어요.'); }
    this.load();
  },

  /* ── 회차 만들기·수정 ── */
  _local(iso) {
    const d = iso ? new Date(iso) : new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  },

  openEditor(id = null) {
    const r = id ? this.list.find(x => x.id === id) : null;
    const inWeek = new Date(Date.now() + 14 * 86400000); inWeek.setHours(21, 0, 0, 0);
    this.draft = r ? { id: r.id, sponsored: !!r.sponsored, minTouched: true } : { id: null, sponsored: true, minTouched: false };
    const v = (k, d = '') => r && r[k] != null ? U.esc(String(r[k])) : d;
    App.showModal(id ? '회차 수정' : '새 럭키드로우 회차', `
      <div class="adm-sheet">
        <div class="adm-lab">회차 이름</div>
        <input id="arf-title" class="adm-input" maxlength="80" placeholder="예: 11월 첫 럭키드로우" value="${v('title')}">
        <div class="adm-lab">경품</div>
        <input id="arf-prize" class="adm-input" maxlength="80" placeholder="예: 풋조이 웨더소프 골프장갑" value="${v('prize_name')}">
        <div class="arf-row">
          <div><div class="adm-lab">경품 가격(원)</div><input id="arf-value" class="adm-input" inputmode="numeric" value="${v('prize_value', '10000')}" oninput="AdminRaffle.recalc()"></div>
          <div><div class="adm-lab">배송비(원, 계산용)</div><input id="arf-ship" class="adm-input" inputmode="numeric" value="0" oninput="AdminRaffle.recalc()"></div>
        </div>
        <div class="adm-lab">경품 사진 주소 (https, 선택)</div>
        <input id="arf-img" class="adm-input" placeholder="https://..." value="${v('image_url')}">
        <div class="arf-row">
          <div><div class="adm-lab">응모 1회 포인트</div><input id="arf-cost" class="adm-input" inputmode="numeric" value="${v('entry_cost', String(this.num('rf_entry_cost', 100)))}" oninput="AdminRaffle.recalc()"></div>
          <div><div class="adm-lab">1인 최대 응모</div><input id="arf-per" class="adm-input" inputmode="numeric" value="${v('per_user_limit', String(this.num('rf_per_user_limit', 20)))}"></div>
        </div>
        <div class="arf-row">
          <div><div class="adm-lab">당첨자 수</div><input id="arf-win" class="adm-input" inputmode="numeric" value="${v('winners_count', '1')}" oninput="AdminRaffle.recalc()"></div>
          <div><div class="adm-lab">예비 당첨자 수</div><input id="arf-res" class="adm-input" inputmode="numeric" value="${v('reserve_count', '1')}"></div>
        </div>
        <div class="adm-lab">시작</div><input id="arf-start" class="adm-input" type="datetime-local" value="${this._local(r && r.starts_at)}">
        <div class="adm-lab">마감</div><input id="arf-end" class="adm-input" type="datetime-local" value="${this._local(r ? r.ends_at : inWeek)}">
        <label class="arf-check"><input type="checkbox" id="arf-sponsored" ${this.draft.sponsored ? 'checked' : ''} onchange="AdminRaffle.recalc()"> 홍보 회차 (성립 기준 없이 무조건 추첨 · 경품비는 홍보비)</label>
        <div class="adm-lab">회차 성립 기준 (응모 횟수)</div>
        <input id="arf-min" class="adm-input" inputmode="numeric" value="${v('min_entries', '0')}" oninput="AdminRaffle.draft.minTouched = true">
        <div id="arf-calc" class="adm-guide"></div>
        <div class="adm-lab">추가 안내 (선택)</div>
        <textarea id="arf-rules" class="adm-paste" rows="2" placeholder="예: 모바일 쿠폰으로 보내 드려요.">${v('rules')}</textarea>
        <button class="adm-save" onclick="AdminRaffle.save()">${id ? '수정 완료' : '회차 열기'}</button>
      </div>`);
    this.recalc();
  },

  recalc() {
    const val = id => Math.max(0, parseInt((U.$('#' + id) || {}).value, 10) || 0);
    const cost = (val('arf-value') + val('arf-ship')) * Math.max(1, val('arf-win'));
    const be = this.breakEven(cost, val('arf-cost') || 100);
    const sponsored = U.$('#arf-sponsored') && U.$('#arf-sponsored').checked;
    const minEl = U.$('#arf-min');
    if (minEl) {
      if (sponsored) { minEl.value = '0'; minEl.disabled = true; }
      else { minEl.disabled = false; if (!this.draft.minTouched || minEl.value === '0') minEl.value = String(be.entries); }
    }
    const box = U.$('#arf-calc');
    if (box) box.innerHTML = sponsored
      ? `홍보 회차예요. 응모가 1회라도 있으면 마감 때 추첨해요. 경품비 ${cost.toLocaleString()}원은 광고 수익과 상관없이 나가요.`
      : `손해 없는 기준: 경품비 ${cost.toLocaleString()}원 → 광고 수익 약 ${be.revenue.toLocaleString()}원 필요 → 광고 약 ${be.views.toLocaleString()}회 → <b>응모 ${be.entries.toLocaleString()}회</b>.<br>기준에 못 미치면 ${7}일 한 번 연장, 그래도 못 미치면 취소·포인트 반환돼요.`;
  },

  async save() {
    const g = id => (U.$('#' + id) || {}).value || '';
    const n = id => parseInt(g(id), 10);
    const title = g('arf-title').trim(), prize = g('arf-prize').trim();
    const start = new Date(g('arf-start')), end = new Date(g('arf-end'));
    if (!title || !prize) return U.toast('회차 이름과 경품을 넣어 주세요.');
    if (isNaN(end) || isNaN(start) || end <= start) return U.toast('마감은 시작보다 뒤여야 해요.');
    if (end < new Date()) return U.toast('마감이 이미 지났어요.');
    const img = g('arf-img').trim();
    if (img && !/^https:\/\//.test(img)) return U.toast('사진 주소는 https로 시작해야 해요.');
    const sponsored = U.$('#arf-sponsored').checked;
    const p = {
      id: this.draft.id, title, prize_name: prize, prize_value: n('arf-value') || 0, image_url: img,
      entry_cost: Math.max(1, n('arf-cost') || 100), per_user_limit: Math.max(1, n('arf-per') || 20),
      winners_count: Math.max(1, n('arf-win') || 1), reserve_count: Math.min(5, Math.max(0, n('arf-res') || 0)),
      min_entries: sponsored ? 0 : Math.max(0, n('arf-min') || 0), sponsored,
      starts_at: start.toISOString(), ends_at: end.toISOString(), rules: g('arf-rules').trim(), claim_days: 7, extend_days: 7,
    };
    try {
      const r = await this.rpc('admin_raffle_save', { p });
      App.closeModal();
      U.toast(r && r.limited ? '응모가 시작된 회차라 사진·안내·마감 연장만 바뀌었어요.' : (this.draft.id ? '수정했어요.' : '회차를 열었어요.'));
    } catch (e) { U.toast('저장하지 못했어요.'); }
    this.load();
  },
};
