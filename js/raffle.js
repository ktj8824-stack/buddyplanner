/* =========================================
   BuddyPlanner — 포인트 럭키드로우

   - 응모·추첨·환불은 모두 서버 함수(enter_raffle, get_raffles …)가 처리합니다.
     앱은 결과를 보여 주기만 하므로 조작할 수 없습니다.
   - 무료로 모은 포인트로만 응모합니다. (포인트는 판매하지 않음 → 사행성 아님)
   - 구글 플레이 정책에 맞춰 공식 규칙(당첨자 수·마감·발표·추첨 방식·확률)을 앱 안에 공개합니다.
   ========================================= */

const Raffle = {
  list: [],
  loading: false,
  error: null,

  init() {
    this.render();
    this.load();
  },

  async load() {
    if (typeof Cloud === 'undefined' || !Cloud.isConfigured()) { this.list = []; this.error = 'off'; this.render(); return; }
    this.loading = true; this.error = null; this.render();
    try {
      const r = await Cloud.publicApi('rest/v1/rpc/get_raffles', { method: 'POST', body: {} });
      this.list = Array.isArray(r) ? r : [];
    } catch (e) {
      console.warn('[Raffle] 목록 실패', e);
      this.error = navigator.onLine === false ? 'offline' : 'error';
    }
    this.loading = false;
    if (Points.available()) await Points.refresh();
    if (State.screen === 'raffle') this.render();
  },

  find(id) { return this.list.find(r => String(r.id) === String(id)); },

  /* ── 표시 도우미 ── */
  fmtDate(iso) {
    const d = new Date(iso);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
  dday(iso) {
    const ms = new Date(iso) - Date.now();
    if (ms <= 0) return '마감';
    const h = Math.floor(ms / 3600000);
    if (h < 24) return `${h}시간 남음`;
    return `D-${Math.ceil(ms / 86400000)}`;
  },
  safeImg(url) { return /^https:\/\//.test(String(url || '')) ? url : ''; },
  /** 지금 응모 수 기준 대략적인 당첨 확률 (%) */
  odds(r) {
    if (!r.my_entries || !r.entries) return null;
    const p = Math.min(1, (r.my_entries / r.entries) * r.winners_count);
    return p >= 0.995 ? 100 : Math.max(0.1, Math.round(p * 1000) / 10);
  },

  render() {
    const el = U.$('#screen-raffle');
    if (!el) return;
    const open = this.list.filter(r => r.status === 'open');
    const past = this.list.filter(r => r.status !== 'open');
    const pm = Points.meta();
    const signedIn = Points.available();

    let body;
    if (this.loading && !this.list.length) {
      body = `<div class="rf-empty"><div class="spinner" style="margin:0 auto 12px;"></div>불러오는 중...</div>`;
    } else if (this.error === 'off') {
      body = `<div class="rf-empty"><div style="font-size:40px;">🎁</div><b>럭키드로우를 준비하고 있어요</b><span>곧 무료 포인트로 골프 용품에 응모할 수 있어요.</span></div>`;
    } else if (this.error) {
      body = `<div class="rf-empty"><div style="font-size:36px;">📡</div><b>목록을 불러오지 못했어요</b><span>${this.error === 'offline' ? '인터넷 연결을 확인해 주세요.' : '잠시 후 다시 시도해 주세요.'}</span><button class="btn-ghost" style="margin-top:12px;" onclick="Raffle.load()">다시 시도</button></div>`;
    } else if (!this.list.length) {
      body = `<div class="rf-empty"><div style="font-size:40px;">🎁</div><b>진행 중인 럭키드로우가 없어요</b><span>새 럭키드로우가 열리면 여기에 보여 드릴게요.<br>그동안 포인트를 모아 두세요!</span></div>`;
    } else {
      body = (open.length ? open.map(r => this.cardOpen(r)).join('') : `<div class="rf-empty small">지금 진행 중인 럭키드로우가 없어요.</div>`)
        + (past.length ? `<div class="rf-section">지난 추첨 결과</div>` + past.map(r => this.cardPast(r)).join('') : '');
    }

    el.innerHTML = `
      <div class="header">
        <button class="back-btn" onclick="App.navigate('home')" aria-label="뒤로">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="header-title">포인트 럭키드로우</div>
        <div style="width:24px;"></div>
      </div>
      <div class="screen-scroll bg-light rf-wrap">
        <div class="rf-points">
          <div>
            <div class="rf-points-label">내 포인트</div>
            <div class="rf-points-val"><span data-points>${signedIn ? Points.balance().toLocaleString() : '-'}</span> P</div>
          </div>
          <button class="rf-ad-btn" onclick="Profile.watchAd()">광고 보고 ${pm.ad_points}P <span data-ad-count>${pm.ad_today}/${pm.ad_limit}</span></button>
        </div>
        <div class="rf-notice">무료로 모은 포인트로만 응모해요. 포인트는 돈으로 판매하지 않아요.</div>
        ${body}
        <div style="height:calc(var(--safe-bottom, 0px) + 40px);"></div>
      </div>
      ${this.styles()}
    `;
  },

  cardOpen(r) {
    const pct = Math.min(100, Math.round((r.entries / r.max_entries) * 100));
    const img = this.safeImg(r.image_url);
    const odds = this.odds(r);
    const left = r.per_user_limit - r.my_entries;
    return `
      <div class="rf-card">
        <div class="rf-img">${img ? `<img src="${U.esc(img)}" alt="" onerror="this.remove()">` : ''}<span class="rf-img-ico">🎁</span>
          <span class="rf-dday">${this.dday(r.ends_at)}</span></div>
        <div class="rf-body">
          <div class="rf-title">${U.esc(r.title)}</div>
          <div class="rf-prize">${U.esc(r.prize_name)}${r.prize_value ? ` <span>· 시가 ${Number(r.prize_value).toLocaleString()}원</span>` : ''}</div>
          ${r.description ? `<div class="rf-desc">${U.esc(r.description)}</div>` : ''}
          <div class="rf-bar"><div style="width:${pct}%"></div></div>
          <div class="rf-row"><span>응모 ${r.entries.toLocaleString()} / ${r.max_entries.toLocaleString()}건</span><span>마감 ${this.fmtDate(r.ends_at)}</span></div>
          <div class="rf-chips">
            <span>1회 ${r.entry_cost.toLocaleString()}P</span><span>1인 최대 ${r.per_user_limit}회</span><span>당첨 ${r.winners_count}명</span>
          </div>
          ${r.my_entries ? `<div class="rf-mine">내 응모 ${r.my_entries}회${odds != null ? ` · 지금 기준 당첨 확률 약 ${odds}%` : ''}</div>` : ''}
          <div class="rf-actions">
            <button class="btn-ghost" onclick="Raffle.showRules(${r.id})">공식 규칙</button>
            <button class="btn-primary" ${left <= 0 ? 'disabled' : ''} onclick="Raffle.askEnter(${r.id})">${left <= 0 ? '응모 한도 도달' : '응모하기'}</button>
          </div>
        </div>
      </div>`;
  },

  cardPast(r) {
    const me = r.me_winner;
    let mine = '';
    if (me) {
      const expired = !me.claimed && new Date(me.claim_until) < new Date();
      mine = me.shipped ? `<div class="rf-win">🎉 당첨! 경품을 보내 드렸어요.</div>`
        : me.claimed ? `<div class="rf-win">🎉 당첨! 배송지를 받았어요. 곧 보내 드릴게요.</div>`
        : expired ? `<div class="rf-win muted">당첨됐지만 배송지 입력 기한이 지났어요.</div>`
        : `<div class="rf-win">🎉 축하해요, 당첨됐어요!<button class="btn-primary" onclick="Raffle.showClaim(${r.id})">배송지 입력</button><small>${this.fmtDate(me.claim_until)}까지</small></div>`;
    } else if (r.my_entries && r.status === 'drawn') {
      mine = `<div class="rf-mine">아쉽게도 당첨되지 않았어요. 다음 기회에 도전해 주세요!</div>`;
    }
    const result = r.status === 'cancelled'
      ? `<div class="rf-row"><span>응모 인원이 부족해 취소됐어요. 사용한 포인트는 모두 돌려드렸어요.</span></div>`
      : `<div class="rf-row"><span>응모 ${r.entries.toLocaleString()}건 · ${this.fmtDate(r.drawn_at)} 추첨</span></div>
         <div class="rf-winners">당첨자 ${(r.winners || []).map(w => `<b>${U.esc(w.name)}</b>`).join(', ') || '-'}</div>`;
    return `
      <div class="rf-card past">
        <div class="rf-body">
          <div class="rf-title">${U.esc(r.title)} <span class="rf-badge">${r.status === 'cancelled' ? '취소' : '추첨 완료'}</span></div>
          <div class="rf-prize">${U.esc(r.prize_name)}</div>
          ${result}${mine}
          <button class="rf-link" onclick="Raffle.showRules(${r.id})">공식 규칙 보기</button>
        </div>
      </div>`;
  },

  /* ── 응모 ── */
  askEnter(id) {
    const r = this.find(id); if (!r) return;
    if (!Points.requireLogin('럭키드로우 응모')) return;
    const bal = Points.balance();
    const max = Math.max(0, Math.min(r.per_user_limit - r.my_entries, r.max_entries - r.entries, Math.floor(bal / r.entry_cost)));
    if (max <= 0) {
      if (bal < r.entry_cost) {
        App.showModal('포인트가 부족해요', `<div class="pay-success" style="padding-top:var(--sp-2);"><p>응모하려면 ${r.entry_cost.toLocaleString()}P가 필요해요.<br>지금 ${bal.toLocaleString()}P가 있어요.</p>
          <button class="btn-primary" style="width:100%; margin-bottom:var(--sp-2);" onclick="App.closeModal(); Profile.watchAd();">광고 보고 포인트 받기</button>
          <button class="btn-ghost" style="width:100%;" onclick="App.closeModal();">닫기</button></div>`);
      } else U.toast('더 이상 응모할 수 없어요.');
      return;
    }
    this._count = 1;
    App.showModal('럭키드로우 응모', `
      <div style="padding:4px 4px 0;">
        <div style="font-weight:800; margin-bottom:4px;">${U.esc(r.prize_name)}</div>
        <div style="font-size:13px; color:var(--text-400); margin-bottom:16px;">1회 ${r.entry_cost.toLocaleString()}P · 많이 응모할수록 당첨 확률이 올라가요</div>
        <div class="rf-stepper">
          <button onclick="Raffle.step(-1, ${max})" aria-label="줄이기">−</button>
          <span id="rf-count">1</span>회
          <button onclick="Raffle.step(1, ${max})" aria-label="늘리기">＋</button>
        </div>
        <div id="rf-cost" style="text-align:center; font-size:13px; color:var(--text-400); margin:10px 0 16px;">${r.entry_cost.toLocaleString()}P 사용 · 남는 포인트 ${(bal - r.entry_cost).toLocaleString()}P</div>
        <button class="btn-primary" style="width:100%; margin-bottom:8px;" id="rf-go" onclick="Raffle.enter(${r.id})">응모하기</button>
        <button class="btn-ghost" style="width:100%;" onclick="App.closeModal()">취소</button>
        <div style="font-size:11.5px; color:var(--text-400); margin-top:12px; line-height:1.5;">응모하면 <a href="#" onclick="event.preventDefault(); Raffle.showRules(${r.id});">공식 규칙</a>에 동의한 것으로 봐요. 응모한 포인트는 돌려받을 수 없어요(추첨 취소 시 제외).</div>
      </div>`);
    this._entering = { id: r.id, cost: r.entry_cost, bal };
  },

  step(d, max) {
    this._count = Math.min(max, Math.max(1, (this._count || 1) + d));
    const e = this._entering;
    U.$('#rf-count').textContent = this._count;
    U.$('#rf-cost').textContent = `${(e.cost * this._count).toLocaleString()}P 사용 · 남는 포인트 ${(e.bal - e.cost * this._count).toLocaleString()}P`;
  },

  async enter(id) {
    const btn = U.$('#rf-go');
    if (btn) { btn.disabled = true; btn.textContent = '응모 중...'; }
    const msg = {
      closed: '응모가 마감됐어요.', full: '응모 정원이 다 찼어요.', user_limit: '1인 응모 한도를 넘었어요.',
      not_enough_points: '포인트가 부족해요.', not_found: '럭키드로우를 찾을 수 없어요.', bad_count: '응모 횟수를 확인해 주세요.'
    };
    try {
      const r = await Points.rpc('enter_raffle', { p_id: id, p_count: this._count || 1 });
      App.closeModal();
      if (!r || !r.ok) { U.toast(msg[r && r.error] || '응모하지 못했어요.'); }
      else {
        Points._apply({ balance: r.balance });
        if (r.drawn) {
          App.showModal(r.won ? '🎉 당첨됐어요!' : '추첨이 끝났어요', `<div class="pay-success" style="padding-top:var(--sp-2);"><p>${r.won
            ? '마지막 응모로 정원이 차서 바로 추첨했어요.<br>축하해요! 배송지를 입력해 주세요.'
            : '마지막 응모로 정원이 차서 바로 추첨했어요.<br>아쉽게도 이번에는 당첨되지 않았어요.'}</p>
            <button class="btn-primary" style="width:100%;" onclick="App.closeModal(); ${r.won ? `Raffle.showClaim(${id});` : ''}">${r.won ? '배송지 입력' : '확인'}</button></div>`);
        } else {
          U.toast(`응모 완료! 내 응모 ${r.my_entries}회`);
          U.haptic && U.haptic();
        }
      }
    } catch (e) {
      App.closeModal();
      U.toast('응모하지 못했어요. 인터넷 연결을 확인해 주세요.');
    }
    await this.load();
  },

  /* ── 당첨 경품 배송지 ── */
  showClaim(id) {
    const r = this.find(id);
    App.showModal('경품 배송지 입력', `
      <div style="padding:4px 4px 0; display:flex; flex-direction:column; gap:10px;">
        <div style="font-size:13px; color:var(--text-400);">${r ? U.esc(r.prize_name) : ''}</div>
        <input id="rf-name" class="rf-input" maxlength="30" placeholder="받는 분 이름">
        <input id="rf-phone" class="rf-input" inputmode="tel" maxlength="13" placeholder="휴대폰 번호 (예: 010-1234-5678)">
        <textarea id="rf-addr" class="rf-input" rows="2" maxlength="200" placeholder="주소 (동·호수까지)"></textarea>
        <label style="display:flex; gap:8px; font-size:12px; color:var(--text-300); line-height:1.5; align-items:flex-start;">
          <input type="checkbox" id="rf-agree" class="rf-check">
          <span>[필수] 경품 배송을 위해 이름·휴대폰 번호·주소를 수집하고, 발송 30일 뒤 파기하는 데 동의해요.</span>
        </label>
        ${r && r.prize_value > 50000 ? `<div style="font-size:12px; color:#b45309;">이 경품은 5만 원을 넘어 제세공과금(22%) 안내를 위해 따로 연락드릴 수 있어요.</div>` : ''}
        <button class="btn-primary" id="rf-claim-btn" onclick="Raffle.claim(${id})">제출하기</button>
      </div>`);
  },

  async claim(id) {
    const v = (s) => (U.$(s) || {}).value || '';
    if (!U.$('#rf-agree').checked) { U.toast('개인정보 수집에 동의해 주세요.'); return; }
    const phone = v('#rf-phone').replace(/[^0-9]/g, '');
    if (!v('#rf-name').trim() || !/^01[0-9]{8,9}$/.test(phone) || v('#rf-addr').trim().length < 5) {
      U.toast('이름, 휴대폰 번호, 주소를 정확히 입력해 주세요.'); return;
    }
    const btn = U.$('#rf-claim-btn'); btn.disabled = true;
    try {
      const r = await Points.rpc('claim_prize', { p_id: id, p_name: v('#rf-name'), p_phone: phone, p_addr: v('#rf-addr') });
      if (r && r.ok) { App.closeModal(); U.toast('배송지를 받았어요. 곧 보내 드릴게요!'); this.load(); return; }
      const m = { claim_expired: '입력 기한이 지났어요.', not_winner: '당첨 정보가 없어요.', already_shipped: '이미 발송됐어요.', invalid: '입력 내용을 확인해 주세요.' };
      U.toast(m[r && r.error] || '제출하지 못했어요.');
    } catch (e) { U.toast('제출하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
    btn.disabled = false;
  },

  /* ── 공식 규칙 (구글 플레이 정책: 앱 안에 공개) ── */
  rulesText(r) {
    const tax = r.prize_value > 50000
      ? `경품 시가가 5만 원을 넘어 제세공과금(22%)이 발생하며, 당첨자에게 개별 안내합니다.`
      : `경품 시가가 5만 원 이하라 제세공과금이 없습니다.`;
    const items = [
      ['주최', 'BuddyPlanner (문의: privacy@buddyplanner.kr)'],
      ['응모 자격', 'BuddyPlanner에 로그인한 만 14세 이상 회원'],
      ['응모 방법', `광고 시청 등으로 무료로 받은 포인트로 응모합니다. 1회 ${r.entry_cost.toLocaleString()}P, 1인 최대 ${r.per_user_limit}회. 포인트는 돈으로 판매하지 않으며, 구매나 결제 없이 참여할 수 있습니다.`],
      ['기간', `${this.fmtDate(r.starts_at)} ~ ${this.fmtDate(r.ends_at)}. 응모가 ${r.max_entries.toLocaleString()}건에 도달하면 즉시 마감합니다.`],
      ['경품·당첨자 수', `${r.prize_name}${r.prize_value ? ` (시가 ${Number(r.prize_value).toLocaleString()}원)` : ''}, ${r.winners_count}명`],
      ['추첨·발표', `마감 즉시 서버에서 무작위로 추첨하고 앱의 이 화면에 발표합니다(당첨자 닉네임 일부 가림). 응모 건수가 많을수록 당첨 확률이 높아지며, 한 사람은 한 번만 당첨됩니다. 당첨 확률 = 내 응모 건수 ÷ 전체 응모 건수 × 당첨자 수(최대 100%).`],
      ...(r.min_entries ? [['취소', `마감 때 응모가 ${r.min_entries.toLocaleString()}건 미만이면 추첨을 취소하고 사용한 포인트를 모두 돌려드립니다.`]] : []),
      ['경품 수령', `당첨자는 발표 후 ${r.claim_days}일 안에 앱에서 배송지를 입력해야 하며, 기한이 지나면 당첨이 취소됩니다. 경품은 현금으로 바꿔 드리지 않습니다.`],
      ['제세공과금', tax],
      ['개인정보', '경품 배송을 위해 당첨자의 이름·휴대폰 번호·주소를 받으며, 발송 30일 뒤 파기합니다.'],
      ['부정 참여', '여러 계정 사용, 앱 변조 등 부정한 방법으로 참여한 경우 당첨을 취소하고 포인트를 회수할 수 있습니다.'],
      ['기타', '이 이벤트는 Google 또는 Apple이 후원하거나 관련된 것이 아닙니다.'],
    ];
    return items;
  },

  showRules(id) {
    const r = this.find(id); if (!r) return;
    const rows = this.rulesText(r).map(([k, v]) => `<div style="margin-bottom:10px;"><div style="font-weight:800; font-size:13px; margin-bottom:2px;">${U.esc(k)}</div><div style="font-size:13px; color:var(--text-300); line-height:1.55;">${U.esc(v)}</div></div>`).join('');
    App.showModal('공식 규칙', `<div style="max-height:60vh; overflow-y:auto; padding:2px 4px; text-align:left;">
      <div style="font-weight:800; margin-bottom:12px;">${U.esc(r.title)}</div>${rows}
      ${r.rules ? `<div style="margin-top:6px; font-weight:800; font-size:13px;">추가 안내</div><div style="font-size:13px; color:var(--text-300); line-height:1.55; white-space:pre-wrap;">${U.esc(r.rules)}</div>` : ''}
      </div><button class="btn-primary" style="width:100%; margin-top:12px;" onclick="App.closeModal()">확인</button>`);
  },

  styles() {
    return `<style>
      .rf-wrap{padding:16px;}
      .rf-points{display:flex;justify-content:space-between;align-items:center;background:#0f172a;color:#fff;padding:14px 16px;border-radius:14px;margin-bottom:10px;}
      .rf-points-label{font-size:12px;opacity:.75;font-weight:700;}
      .rf-points-val{font-size:20px;font-weight:800;color:#fbbf24;}
      .rf-ad-btn{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer;}
      .rf-ad-btn span{opacity:.75;font-weight:600;margin-left:2px;}
      .rf-notice{font-size:12px;color:var(--text-400);margin:0 2px 14px;}
      .rf-empty{background:#fff;border-radius:16px;padding:40px 20px;text-align:center;display:flex;flex-direction:column;gap:6px;align-items:center;color:var(--text-400);font-size:13px;}
      .rf-empty b{color:var(--text-100);font-size:15px;}
      .rf-empty.small{padding:20px;}
      .rf-section{font-size:14px;font-weight:800;color:var(--text-100);margin:20px 2px 10px;}
      .rf-card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.05);margin-bottom:14px;}
      .rf-card.past{box-shadow:none;border:1px solid #e2e8f0;}
      .rf-img{position:relative;height:150px;background:linear-gradient(135deg,#047857,#065f46);display:flex;align-items:center;justify-content:center;}
      .rf-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
      .rf-img-ico{font-size:44px;}
      .rf-img img + .rf-img-ico{display:none;}
      .rf-dday{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;}
      .rf-body{padding:14px 16px 16px;}
      .rf-title{font-size:16px;font-weight:800;color:var(--text-100);margin-bottom:2px;}
      .rf-prize{font-size:14px;font-weight:700;color:var(--text-200,#334155);margin-bottom:8px;}
      .rf-prize span{color:var(--text-400);font-weight:600;font-size:12px;}
      .rf-desc{font-size:13px;color:var(--text-400);margin-bottom:10px;line-height:1.5;}
      .rf-bar{height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin:8px 0 6px;}
      .rf-bar div{height:100%;background:var(--accent);border-radius:4px;}
      .rf-row{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--text-400);font-weight:600;flex-wrap:wrap;}
      .rf-chips{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 4px;}
      .rf-chips span{font-size:11.5px;font-weight:700;background:#f1f5f9;color:#475569;padding:4px 8px;border-radius:6px;}
      .rf-mine{font-size:12.5px;font-weight:700;color:var(--accent);margin-top:8px;}
      .rf-actions{display:flex;gap:8px;margin-top:14px;}
      .rf-actions .btn-ghost{flex:0 0 auto;padding:0 14px;}
      .rf-actions .btn-primary{flex:1;}
      .rf-actions .btn-primary[disabled]{opacity:.5;}
      .rf-badge{font-size:11px;font-weight:800;background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:999px;vertical-align:middle;margin-left:4px;}
      .rf-winners{font-size:13px;color:var(--text-300);margin-top:6px;}
      .rf-win{margin-top:10px;background:#fef3c7;color:#92400e;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:800;display:flex;flex-direction:column;gap:8px;}
      .rf-win.muted{background:#f1f5f9;color:#64748b;}
      .rf-win small{font-weight:600;opacity:.8;}
      .rf-link{background:none;border:none;color:var(--text-400);font-size:12px;text-decoration:underline;padding:0;margin-top:10px;cursor:pointer;}
      .rf-stepper{display:flex;align-items:center;justify-content:center;gap:14px;font-size:16px;font-weight:800;}
      .rf-stepper button{width:40px;height:40px;border-radius:50%;border:1px solid #e2e8f0;background:#fff;font-size:20px;cursor:pointer;}
      .rf-stepper span{font-size:24px;min-width:28px;text-align:center;}
      .rf-check{-webkit-appearance:checkbox;appearance:auto;width:18px;height:18px;min-width:18px;margin:2px 0 0;accent-color:var(--accent);flex:0 0 18px;}
      .rf-input{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;background:#f8fafc;}
    </style>`;
  }
};
