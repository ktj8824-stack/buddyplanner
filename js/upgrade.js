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
        <button class="header-btn" onclick="App.navigate('profile')" style="background:rgba(0,0,0,0.3); border-color:rgba(255,255,255,0.1);">
          <svg viewBox="0 0 24 24" style="stroke:#fff;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
      </div>

      <div class="screen-scroll" style="padding-top:0;">
        <div class="upgrade-hero">
          <div class="upg-crown">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M2 19h20v2H2v-2zm19-11c-.55 0-1 .45-1 1v4l-3-2-2 3-3-4-3 4-2-3-3 2v-4c0-.55-.45-1-1-1s-1 .45-1 1v7h20V9c0-.55-.45-1-1-1zM7 6c.83 0 1.5-.67 1.5-1.5S7.83 3 7 3s-1.5.67-1.5 1.5S6.17 6 7 6zm10 0c.83 0 1.5-.67 1.5-1.5S17.83 3 17 3s-1.5.67-1.5 1.5S16.17 6 17 6zm-5-2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>
          </div>
          <h2 class="upg-title">버디플래너 PRO</h2>
          <p class="upg-subtitle">프리미엄 혜택으로 골프 라이프를 완벽하게</p>
        </div>

        <div class="upg-content">
          <h3 class="upg-feature-title">PRO 멤버십 혜택</h3>
          <div class="feat-list">
            <div class="feat-item stag">
              <div class="feat-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
              <div class="feat-text">
                <h4>무제한 라운딩 플랜</h4>
                <p>일정 등록 개수 제한 없이 마음껏 라운딩을 계획하세요.</p>
              </div>
            </div>
            <div class="feat-item stag">
              <div class="feat-icon blue"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19c-2.485 0-4.5-2.015-4.5-4.5v-1.043c0-1.802 1.34-3.327 3.125-3.488A4.502 4.502 0 0 1 22 14.5c0 2.485-2.015 4.5-4.5 4.5zM2 14.5c0 2.485 2.015 4.5 4.5 4.5h.5A4.5 4.5 0 0 0 11.5 14.5v-1.043C11.5 11.655 10.16 10.13 8.375 9.97A4.502 4.502 0 0 0 2 14.5z"></path></svg></div>
              <div class="feat-text">
                <h4>14일 초정밀 날씨 예보</h4>
                <p>바람, 습도, 자외선 지수 등 골퍼를 위한 심층 날씨 정보를 제공합니다.</p>
              </div>
            </div>
            <div class="feat-item stag">
              <div class="feat-icon purple"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
              <div class="feat-text">
                <h4>AI 동반자 분석 & 매칭</h4>
                <p>나의 스코어 및 플레이 성향을 분석하여 최적의 동반자를 추천합니다.</p>
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

    // 2) 웹(PWA): 결제는 앱에서만 가능
    if (!Billing.isNative()) {
      box.innerHTML = `
        <div class="upg-notice">
          <b>PRO 구독은 안드로이드 앱에서 할 수 있어요</b>
          <p>구글 플레이 스토어에서 버디플래너 앱을 설치한 뒤 구독해 주세요.</p>
        </div>
        <button class="btn-upg" onclick="Billing.openStoreListing()">구글 플레이에서 앱 받기</button>`;
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
        결제는 구글 플레이 계정으로 진행되며, 해지하지 않으면 구독 기간이 끝날 때 자동으로 갱신돼요.
        해지는 언제든 구글 플레이 &gt; 결제 및 정기 결제에서 할 수 있어요.
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
      ${Billing.isNative() ? `<button class="btn-upg btn-upg-outline" onclick="Billing.openManage()">구독 관리 (구글 플레이)</button>` : ''}`;
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
    this.setBusy(true, '구글 플레이 결제창을 여는 중...');
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
      U.toast('구매 복원은 안드로이드 앱에서 할 수 있어요.');
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

  showSuccess() {
    App.showModal('구독 완료', `
      <div class="pay-success">
        <div class="pay-success-icon">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h3>PRO 회원이 되셨어요!</h3>
        <p>지금부터 모든 프리미엄 혜택이 적용돼요.</p>
        <button class="btn-primary" style="width:100%; margin-top:var(--sp-4);" onclick="App.closeModal(); App.navigate('profile');">확인</button>
      </div>
    `);
  }
};
