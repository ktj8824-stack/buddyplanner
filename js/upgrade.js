/* =========================================
   BuddyPlanner v2 — Upgrade Screen
   ========================================= */

const Upgrade = {
  selected: 'annual',
  busy: false,

  init() {
    this.render();
  },

  render() {
    const el = U.$('#screen-upgrade');
    if (!el) return;

    el.innerHTML = `
      <div class="header" style="background:transparent; border-bottom:none; position:absolute; width:100%; z-index:10;">
        <button class="v2-iconbtn" style="margin:calc(env(safe-area-inset-top, 0px) + 10px) 0 0 10px;" onclick="App.navigate(App.prevScreen && App.prevScreen !== 'upgrade' ? App.prevScreen : 'home')" aria-label="뒤로가기">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      </div>

      <div class="screen-scroll" style="padding-top:0;">
        <div class="upgrade-hero">
          <div class="upg-crown">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M2 19h20v2H2v-2zm19-11c-.55 0-1 .45-1 1v4l-3-2-2 3-3-4-3 4-2-3-3 2v-4c0-.55-.45-1-1-1s-1 .45-1 1v7h20V9c0-.55-.45-1-1-1zM7 6c.83 0 1.5-.67 1.5-1.5S7.83 3 7 3s-1.5.67-1.5 1.5S6.17 6 7 6zm10 0c.83 0 1.5-.67 1.5-1.5S17.83 3 17 3s-1.5.67-1.5 1.5S16.17 6 17 6zm-5-2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>
          </div>
          <h2 class="upg-title">BuddyPlanner PRO</h2>
          <p class="upg-subtitle">프리미엄 혜택으로 골프 라이프를 완벽하게</p>
        </div>

        <div class="upg-content">
          <h3 class="upg-feature-title">PRO 멤버십 혜택</h3>
          <div class="feat-list">
            <div class="feat-item stag">
              <div class="feat-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
              <div class="feat-text">
                <h4>무제한 라운딩 등록</h4>
                <p>무료 회원은 예정된 라운딩을 ${Billing.FREE_SCHEDULE_LIMIT}개까지 등록할 수 있어요. PRO는 제한 없이 계획하세요.</p>
              </div>
            </div>
            <div class="feat-item stag">
              <div class="feat-icon blue"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"></path></svg></div>
              <div class="feat-text">
                <h4>라운딩 당일 날씨 예보</h4>
                <p>티오프 시간대의 기온·강수 확률·바람을 최대 ${WeatherAPI.FORECAST_DAYS}일 전부터 미리 확인하세요.</p>
              </div>
            </div>
            <div class="feat-item stag">
              <div class="feat-icon purple"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
              <div class="feat-text">
                <h4>버디 AI 비서</h4>
                <p>말로 일정 등록, 스코어카드 사진으로 자동 기록, 골프장 주변 맛집 추천까지 대화로 해결하세요.</p>
              </div>
            </div>
            <div class="feat-item stag">
              <div class="feat-icon blue"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
              <div class="feat-text">
                <h4>단체 등록</h4>
                <p>모임 라운딩을 만들고 카톡으로 링크만 보내면 참석·조 편성·카풀까지 한 번에 정리돼요. 받은 분들은 무료예요.</p>
              </div>
            </div>
            <div class="feat-item stag">
              <div class="feat-icon green"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div>
              <div class="feat-text">
                <h4>광고 완벽 제거</h4>
                <p>모든 화면에서 광고가 제거되어 더욱 쾌적한 앱 사용이 가능합니다.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="upg-action" id="upg-action"></div>
      </div>
    `;
    
    // Trigger animations
    setTimeout(() => U.stagger(el, '.feat-item', 100), 50);
    this.renderAction();
  },

  /* ── 하단 결제 영역: 상태에 따라 다르게 표시 ── */
  async renderAction() {
    const box = U.$('#upg-action');
    if (!box) return;

    // 1) 이미 PRO 회원
    if (State.isPro) {
      box.innerHTML = this.proStatusHTML();
      return;
    }

    // 2) 웹(buddyplanner.kr): 토스페이먼츠로 1개월 이용권 결제
    if (!Billing.isNative()) {
      this.renderWebPay(box);
      return;
    }

    // 3) 결제 키 미설정
    if (!Billing.isAvailable()) {
      box.innerHTML = `
        <div class="upg-notice">
          <b>결제 준비 중이에요</b>
          <p>곧 PRO 구독을 시작할 수 있어요. 조금만 기다려 주세요.</p>
        </div>`;
      return;
    }

    // 4) 상품 불러오기
    box.innerHTML = `<div class="upg-loading"><div class="pay-spinner"></div><span>구독 상품을 불러오는 중...</span></div>`;
    try {
      // 초기화가 아직 끝나지 않았으면 잠시 대기 (최대 5초)
      for (let i = 0; i < 25 && !Billing.configured; i++) await new Promise(r => setTimeout(r, 200));
      await Billing.loadPackages();
    } catch (e) {
      console.error('[Upgrade] 상품 조회 실패:', e);
    }

    // 상품 로딩 중 PRO로 바뀌었거나 화면을 벗어난 경우
    if (State.isPro) { box.innerHTML = this.proStatusHTML(); return; }
    if (!U.$('#upg-action')) return;

    const { monthly, annual } = Billing.packages;
    if (!monthly && !annual) {
      box.innerHTML = `
        <div class="upg-notice">
          <b>구독 상품을 불러오지 못했어요</b>
          <p>인터넷 연결을 확인한 뒤 다시 시도해 주세요.</p>
        </div>
        <button class="btn-upg" onclick="Upgrade.renderAction()">다시 시도</button>
        ${this.footerHTML()}`;
      return;
    }

    if (!Billing.packages[this.selected]) this.selected = annual ? 'annual' : 'monthly';
    box.innerHTML = `
      <div class="plan-list">
        ${annual ? this.planCardHTML('annual', annual, monthly) : ''}
        ${monthly ? this.planCardHTML('monthly', monthly, null) : ''}
      </div>
      <button class="btn-upg" id="upg-buy-btn" onclick="Upgrade.buy()">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
        <span>PRO 구독 시작하기</span>
      </button>
      ${this.footerHTML()}`;
  },

  planCardHTML(kind, pkg, monthlyPkg) {
    const p = pkg.product || {};
    const isAnnual = kind === 'annual';
    let sub = isAnnual ? '1년마다 결제' : '매월 결제';
    let badge = '';

    if (isAnnual && typeof p.price === 'number') {
      sub = `월 ${this.formatPrice(p.price / 12, p.currencyCode)} 꼴 · 1년마다 결제`;
      const m = monthlyPkg && monthlyPkg.product;
      if (m && typeof m.price === 'number' && m.price > 0) {
        const off = Math.round((1 - p.price / (m.price * 12)) * 100);
        if (off > 0) badge = `<span class="plan-badge">${off}% 할인</span>`;
      }
    }

    return `
      <button class="plan-card ${this.selected === kind ? 'is-selected' : ''}" onclick="Upgrade.select('${kind}')" aria-pressed="${this.selected === kind}">
        <span class="plan-radio"></span>
        <span class="plan-info">
          <span class="plan-name">${isAnnual ? '연간 구독' : '월간 구독'} ${badge}</span>
          <span class="plan-sub">${sub}</span>
        </span>
        <span class="plan-price">${p.priceString || ''}</span>
      </button>`;
  },

  footerHTML() {
    return `
      <p class="upg-terms">
        결제는 ${Billing.storeName()} 계정으로 진행되며, 해지하지 않으면 구독 기간이 끝날 때 자동으로 갱신돼요.
        해지는 언제든 ${Billing.manageHint()}에서 할 수 있어요.
      </p>
      <div class="upg-links">
        <button onclick="Upgrade.restore()">구매 복원</button>
        <span>·</span>
        <a href="./privacy.html">개인정보처리방침</a>
      </div>`;
  },

  proStatusHTML() {
    const ent = Billing.activeEntitlement;
    let line = '모든 PRO 혜택을 이용하고 있어요.';
    // 웹 결제로 산 PRO (앱 결제가 아닐 때)
    if (!Billing.rcPro && Billing.webPro && Billing.webProUntil) {
      const d = new Date(Billing.webProUntil);
      return `
      <div class="upg-notice is-pro">
        <b>👑 PRO 이용 중</b>
        <p>다음 결제일 ${d.getMonth() + 1}월 ${d.getDate()}일 · 매달 ${Billing.WEB_PRICE.toLocaleString()}원 자동결제<br>해지해도 ${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일까지 계속 쓸 수 있어요.</p>
      </div>`;
    }
    if (ent && ent.expirationDate) {
      const d = new Date(ent.expirationDate);
      const ds = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
      line = ent.willRenew === false ? `${ds}까지 이용할 수 있어요. (자동 갱신 해지됨)` : `다음 결제일은 ${ds}이에요.`;
    }
    return `
      <div class="upg-notice is-pro">
        <b>👑 PRO 이용 중</b>
        <p>${line}</p>
      </div>
      ${Billing.isNative() ? `<button class="btn-upg btn-upg-outline" onclick="Billing.openManage()">구독 관리 (${Billing.storeName()})</button>` : ''}`;
  },

  select(kind) {
    if (this.busy) return;
    this.selected = kind;
    document.querySelectorAll('.plan-card').forEach(el => {
      const on = el.getAttribute('onclick').includes(`'${kind}'`);
      el.classList.toggle('is-selected', on);
      el.setAttribute('aria-pressed', on);
    });
    U.haptic && U.haptic();
  },

  formatPrice(value, currency) {
    try {
      return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: currency || 'KRW', maximumFractionDigits: 0 }).format(value);
    } catch (e) {
      return Math.round(value).toLocaleString() + '원';
    }
  },

  setBusy(busy, label) {
    this.busy = busy;
    const btn = U.$('#upg-buy-btn');
    if (!btn) return;
    btn.disabled = busy;
    const span = btn.querySelector('span');
    if (span) span.textContent = busy ? (label || '처리 중...') : 'PRO 구독 시작하기';
  },

  /* ── 구매 ── */
  async buy() {
    if (this.busy) return;
    this.setBusy(true, `${Billing.storeName()} 결제창을 여는 중...`);
    try {
      const result = await Billing.purchase(this.selected);
      if (result === 'success') {
        this.showSuccess();
      } else if (result === 'pending') {
        App.showModal('결제 승인 대기', `
          <div class="pay-success">
            <h3>결제 승인을 기다리고 있어요</h3>
            <p>결제가 완료되면 PRO 혜택이 자동으로 적용돼요.<br>잠시 후 앱을 다시 열어 확인해 주세요.</p>
            <button class="btn-primary" style="width:100%;" onclick="App.closeModal()">확인</button>
          </div>`);
      } else {
        U.toast('결제를 취소했어요.');
      }
    } catch (e) {
      console.error('[Upgrade] 결제 오류:', e);
      U.toast('결제 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      this.setBusy(false);
    }
  },

  async restore() {
    if (this.busy) return;
    if (!Billing.isAvailable()) {
      const ok = await Billing.refreshWebPro(true);
      U.toast(ok ? '✅ PRO 이용 내역을 확인했어요.' : '복원할 구독 내역이 없어요.');
      if (ok) this.render();
      return;
    }
    this.busy = true;
    U.toast('구매 내역을 확인하고 있어요...');
    try {
      const isPro = await Billing.restore();
      U.toast(isPro ? '✅ PRO 구독이 복원되었어요.' : '복원할 구독 내역이 없어요.');
      if (isPro) this.render();
    } catch (e) {
      console.error('[Upgrade] 복원 오류:', e);
      U.toast('구매 복원에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      this.busy = false;
    }
  },

  /* ── 웹 결제 (토스페이먼츠 결제위젯) ── */
  TOSS_SDK: 'https://js.tosspayments.com/v2/standard',
  TOSS_DOCS_CLIENT_KEY: 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm',   // 토스 문서 공개 테스트 키 (실제 돈 안 나감)
  _widgets: null,

  tossClientKey() { return (window.APP_CONFIG || {}).TOSS_CLIENT_KEY || this.TOSS_DOCS_CLIENT_KEY; },

  _loadToss() {
    if (window.TossPayments) return Promise.resolve();
    return new Promise((ok, fail) => {
      const sc = document.createElement('script');
      sc.src = this.TOSS_SDK; sc.onload = ok; sc.onerror = () => fail(new Error('토스 결제창을 불러오지 못했어요.'));
      document.head.appendChild(sc);
    });
  },

  // 웹 결제: 로드플래너 개인 매니저와 같은 흐름 — 월 정기결제 안내 · 동의 체크 · 결제창
  async renderWebPay(box) {
    if (!box) return;
    const price = Billing.WEB_PRICE;
    const priceLine = `<div class="upg-plan-web"><b>PRO 월 정기</b><span>${price.toLocaleString()}원</span></div>
      <p class="upg-web-note">부가세 포함 · 매달 자동결제 · 언제든 해지</p>`;
    if (typeof Cloud === 'undefined' || !Cloud.isSignedIn()) {
      box.innerHTML = `${priceLine}
        <div class="upg-notice"><b>로그인 후 결제할 수 있어요</b><p>결제한 PRO는 같은 계정으로 로그인한 앱에서도 그대로 쓸 수 있어요.</p></div>
        <button class="btn-upg" onclick="App.navigate('login')">로그인하기</button>`;
      return;
    }
    const test = !(window.APP_CONFIG || {}).TOSS_CLIENT_KEY || /^test_/.test(this.tossClientKey());
    const day = new Date().getDate();
    box.innerHTML = `${priceLine}
      ${test ? '<div class="upg-notice"><b>테스트 결제</b><p>지금은 테스트 모드라 실제로 돈이 나가지 않아요.</p></div>' : ''}
      <div id="toss-methods"></div>
      <div id="toss-agreement"></div>
      <label class="upg-agree"><input type="checkbox" id="upg-agree" onchange="Upgrade.syncWebBtn()">
        <span>매달 ${day}일 ${price.toLocaleString()}원 자동결제에 동의해요<small>언제든 해지할 수 있고, 해지해도 결제한 기간까지는 계속 쓸 수 있어요.</small></span></label>
      <button class="btn-upg" id="upg-web-buy" onclick="Upgrade.payWeb()" disabled><span>결제창 준비 중...</span></button>
      <div class="upg-links"><a href="./privacy.html">개인정보처리방침</a></div>`;
    this._webReady = false;
    try {
      await this._loadToss();
      const toss = window.TossPayments(this.tossClientKey());
      const customerKey = 'bp_' + String(Cloud.userId() || '').replace(/[^A-Za-z0-9_\-=.@]/g, '').slice(0, 40);
      this._widgets = toss.widgets({ customerKey });
      await this._widgets.setAmount({ currency: 'KRW', value: price });
      await this._widgets.renderPaymentMethods({ selector: '#toss-methods', variantKey: 'DEFAULT' });
      await this._widgets.renderAgreement({ selector: '#toss-agreement', variantKey: 'AGREEMENT' });
      this._webReady = true;
      this.syncWebBtn();
    } catch (e) {
      console.error('[Upgrade] 토스 결제위젯 오류:', e);
      const b = U.$('#upg-web-buy'); if (b) b.querySelector('span').textContent = '결제창을 불러오지 못했어요';
      U.toast('결제창을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  },

  /** 동의에 체크하고 결제창이 준비돼야 결제 버튼이 켜짐 */
  syncWebBtn() {
    const b = U.$('#upg-web-buy'), a = U.$('#upg-agree');
    if (!b || this.busy) return;
    if (this._webReady) b.querySelector('span').textContent = `월 ${Billing.WEB_PRICE.toLocaleString()}원 정기결제 시작`;
    b.disabled = !(this._webReady && a && a.checked);
  },

  async payWeb() {
    if (this.busy || !this._widgets) return;
    if (!(U.$('#upg-agree') && U.$('#upg-agree').checked)) { U.toast('자동결제 동의에 체크해 주세요.'); return; }
    this.busy = true;
    const b = U.$('#upg-web-buy'); if (b) { b.disabled = true; b.querySelector('span').textContent = '결제창을 여는 중...'; }
    try {
      const order = await Billing.payApi('prepare');   // 금액·주문번호는 서버가 정함
      await this._widgets.setAmount({ currency: 'KRW', value: order.amount });
      const base = location.origin + location.pathname;
      const u = Cloud.session() && Cloud.session().user;
      await this._widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${base}?pay=success`,
        failUrl: `${base}?pay=fail`,
        customerEmail: (u && u.email) || undefined,
      });
    } catch (e) {
      if (e && (e.code === 'USER_CANCEL' || /취소/.test(e.message || ''))) U.toast('결제를 취소했어요.');
      else { console.error('[Upgrade] 웹 결제 오류:', e); U.toast((e && e.message && e.message.length < 80) ? e.message : '결제 중 문제가 발생했어요.'); }
    } finally {
      this.busy = false;
      this.syncWebBtn();
    }
  },

  /** 토스 결제창에서 돌아왔을 때 (?pay=success&paymentKey=…&orderId=…&amount=…) — 앱 시작 시 한 번 */
  async handleReturn() {
    const q = new URLSearchParams(location.search);
    const pay = q.get('pay');
    if (!pay) return;
    history.replaceState(null, document.title, location.pathname);
    if (pay === 'fail') {
      const code = q.get('code'), msg = q.get('message');
      if (code === 'PAY_PROCESS_CANCELED' || code === 'USER_CANCEL') { U.toast('결제를 취소했어요.'); return; }
      this.showFail(msg || '결제를 완료하지 못했어요.', code);
      return;
    }
    const paymentKey = q.get('paymentKey'), orderId = q.get('orderId'), amount = Number(q.get('amount'));
    if (!paymentKey || !orderId) return;
    U.toast('결제를 확인하고 있어요...');
    try {
      const r = await Billing.payApi('confirm', { paymentKey, orderId, amount });
      if (r && r.status === 'DONE') {
        await Billing.refreshWebPro(true);
        App.navigate('upgrade');
        this.showSuccess(r);
      } else if (r && r.status === 'WAITING_FOR_DEPOSIT') {
        U.toast('입금을 기다리고 있어요. 입금이 확인되면 PRO가 적용돼요.', 4000);
      }
    } catch (e) {
      console.error('[Upgrade] 결제 승인 오류:', e);
      this.showFail((e && e.message) || '결제 승인에 실패했어요. 돈은 빠져나가지 않았어요.', e && e.code);
    }
  },

  /** 결제 실패: 이유 + 다시 결제하기 (자동으로 다른 화면으로 넘어가지 않음) */
  showFail(reason, code) {
    App.navigate('upgrade');
    App.showModal('결제가 안 됐어요', `
      <div class="pay-success">
        <p style="margin-bottom:10px;">돈은 빠져나가지 않았어요.</p>
        <div class="pay-fail-reason"><b>이유</b><br>${U.esc(String(reason).slice(0, 120))}${code ? ` <small style="color:#9aa3b2;">(${U.esc(code)})</small>` : ''}</div>
        <button class="btn-primary" style="width:100%; margin-bottom:var(--sp-2);" onclick="App.closeModal(); Upgrade.renderAction();">다른 카드로 결제하기</button>
        <button class="btn-ghost" style="width:100%;" onclick="App.closeModal();">닫기</button>
      </div>`);
  },

  /** 결제 완료: 주문번호 · 금액 · 다음 결제일 (자동으로 다른 화면으로 넘어가지 않음) */
  showSuccess(r) {
    const won = (n) => Number(n || 0).toLocaleString() + '원';
    const md = (s) => { const d = new Date(s); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
    const rows = r && typeof r === 'object' ? `
        <div class="pay-rows">
          <div><span>주문번호</span><b>${U.esc(r.orderId || '')}</b></div>
          <div><span>결제 금액</span><b>${won(r.amount)} (부가세 포함)</b></div>
          ${r.method ? `<div><span>결제 수단</span><b>${U.esc(r.method)}</b></div>` : ''}
          ${r.periodEnd ? `<div><span>다음 결제일</span><b>${md(r.periodEnd)} (매달 자동결제)</b></div>` : ''}
        </div>` : '';
    App.showModal('결제 완료', `
      <div class="pay-success">
        <div class="pay-success-icon">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h3>PRO가 시작됐어요</h3>
        ${rows || `<p>${typeof r === 'string' ? r : '지금부터 모든 프리미엄 혜택이 적용돼요.'}</p>`}
        <p style="font-size:0.8rem;">카드 매출전표가 결제 증빙이 돼요. 해지해도 결제한 기간까지는 계속 쓸 수 있어요.</p>
        <button class="btn-primary" style="width:100%; margin-top:var(--sp-2);" onclick="App.closeModal(); App.navigate('profile');">확인</button>
      </div>
    `);
  }
};
