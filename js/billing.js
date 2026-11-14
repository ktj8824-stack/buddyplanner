/* =========================================
   BuddyPlanner — 결제 (구글 플레이 결제 + RevenueCat)

   - 실제 결제는 구글 플레이가 처리하고, 결제 검증·구독 상태는 RevenueCat이 관리합니다.
   - PRO 여부 = 앱 결제(RevenueCat "pro" 권한) 또는 웹 결제(buddyplanner.kr 토스페이먼츠, 서버 pro-pay 함수) 중 하나라도 유효.
   - 웹 결제는 웹에서만 열립니다. 앱 안에서는 웹 결제로 안내하지 않고, 웹에서 산 PRO를 인정만 합니다 (앱스토어 규정).
   - localStorage에는 오프라인 시작용 캐시만 저장하며, 앱이 켜질 때마다 서버 기준으로 다시 맞춥니다.
   ========================================= */

const Billing = {
  ENTITLEMENT_ID: 'pro',          // RevenueCat 대시보드의 Entitlement 식별자
  CACHE_KEY: 'bp_pro_cache',
  PLAY_PACKAGE: 'com.myB',

  configured: false,
  packages: { monthly: null, annual: null },
  activeEntitlement: null,        // { expirationDate, willRenew, productIdentifier, ... }
  _lastRefresh: 0,
  WEB_PRICE: 4900,                // 웹 결제 PRO 1개월 (서버 pro-pay 함수가 실제 금액을 정함)
  rcPro: false,                   // 앱 결제(RevenueCat)로 PRO
  webPro: false,                  // 웹 결제(토스)로 PRO
  webProUntil: null,
  payMode: null,                  // 'test' | 'live' (서버 결제 키 기준)
  _lastWeb: 0,

  /* ── 환경 확인 ── */
  isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  },

  plugin() {
    if (!this.isNative()) return null;
    const cap = window.Capacitor;
    if (!cap.Plugins.Purchases && cap.registerPlugin) {
      cap.Plugins.Purchases = cap.registerPlugin('Purchases');
    }
    return cap.Plugins.Purchases || null;
  },

  apiKey() {
    const c = window.APP_CONFIG || {};
    const ios = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() === 'ios';
    // 아이폰은 애플 결제용 키(appl_)가 따로 필요. 안드로이드 키(goog_)를 아이폰에 쓰면 안 됨
    return (ios ? c.REVENUECAT_IOS_KEY : c.REVENUECAT_ANDROID_KEY) || '';
  },

  /** 앱에서 결제가 가능한 상태인지 (네이티브 + 키 설정됨) */
  isAvailable() {
    return this.isNative() && !!this.apiKey() && !!this.plugin();
  },

  /* ── 초기화 ── */
  /** 앱 시작 시 캐시로 PRO 상태를 먼저 복원 (광고 표시 여부 결정용) */
  loadCachedStatus() {
    // 이전 버전의 가짜 결제 플래그는 더 이상 사용하지 않음
    localStorage.removeItem('bp_pro');
    State.isPro = localStorage.getItem(this.CACHE_KEY) === 'true';
  },

  async init() {
    this.refreshPromo();
    // 웹 결제 PRO는 앱·웹 모두에서 확인 (로그인한 경우)
    this.refreshWebPro(true);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.refreshWebPro(); });
    if (!this.isAvailable()) return;
    try {
      // 클라우드 로그인 사용자는 Supabase 사용자 ID로 결제 계정을 연결 (서버가 PRO 여부를 확인할 수 있게)
      const uid = (typeof Cloud !== 'undefined' && Cloud.userId()) || null;
      await this.plugin().configure(uid ? { apiKey: this.apiKey(), appUserID: uid } : { apiKey: this.apiKey() });
      this.configured = true;
    } catch (e) {
      console.error('[Billing] configure 실패:', e);
      return;
    }

    await this.refresh(true);

    // 앱으로 돌아올 때 구독 상태 재확인 (해지·만료·다른 기기 구매 반영)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.refresh();
    });
  },

  /* ── 구독 상태 ── */
  async refresh(force = false) {
    if (!this.configured) return State.isPro;
    // 너무 잦은 호출 방지 (1분)
    if (!force && Date.now() - this._lastRefresh < 60 * 1000) return State.isPro;
    this._lastRefresh = Date.now();
    try {
      const res = await this.plugin().getCustomerInfo();
      this._applyCustomerInfo(res && (res.customerInfo || res));
    } catch (e) {
      // 네트워크 오류 시 캐시 상태 유지
      console.warn('[Billing] 구독 상태 확인 실패:', e);
    }
    return State.isPro;
  },

  _applyCustomerInfo(info) {
    const active = info && info.entitlements && info.entitlements.active;
    const ent = active ? active[this.ENTITLEMENT_ID] : null;
    this.activeEntitlement = ent || null;
    this.rcPro = !!ent;
    this._rcChecked = true;
    this._setPro(this.rcPro || this.webPro);
  },

  /* ── 웹 결제(토스) PRO ── */
  async payApi(action, extra = {}) {
    if (typeof Cloud === 'undefined' || !Cloud.isSignedIn()) { const e = new Error('로그인이 필요해요.'); e.code = 'LOGIN'; throw e; }
    return await Cloud._api('functions/v1/pro-pay', { method: 'POST', body: Object.assign({ action }, extra) });
  },

  async refreshWebPro(force = false) {
    if (typeof Cloud === 'undefined' || !Cloud.isSignedIn()) {
      this.webPro = false; this.webProUntil = null;
      if (!this.rcPro && (!this.isNative() || !this.isAvailable())) this._setPro(false);
      return false;
    }
    if (!force && Date.now() - this._lastWeb < 60 * 1000) return this.webPro;
    this._lastWeb = Date.now();
    try {
      const r = await this.payApi('status');
      this.webPro = !!(r && r.active);
      this.webProUntil = (r && r.proUntil) || null;
      this.payMode = (r && r.mode) || null;
      // 앱 구독(RevenueCat) 확인이 아직이면 웹 결과만으로 PRO 를 끄지 않음 (앱에서 구독한 사람이 켤 때 PRO 가 풀리던 문제, 2026-11-11 점검)
      const rcPending = this.isNative() && this.isAvailable() && !this._rcChecked;
      if (this.webPro || this.rcPro || !rcPending) this._setPro(this.rcPro || this.webPro);
    } catch (e) {
      console.warn('[Billing] 웹 결제 상태 확인 실패:', e && e.message);   // 네트워크 오류 시 캐시 유지
    }
    return this.webPro;
  },

  _setPro(isPro) {
    const changed = State.isPro !== isPro;
    State.isPro = isPro;
    localStorage.setItem(this.CACHE_KEY, isPro ? 'true' : 'false');
    if (!changed) return;

    if (typeof App !== 'undefined' && App.applyProStatus) App.applyProStatus();
    if (State.screen === 'profile' && typeof Profile !== 'undefined') Profile.render();
    if (State.screen === 'upgrade' && typeof Upgrade !== 'undefined') Upgrade.render();
  },

  /* ── 상품 ── */
  async loadPackages() {
    if (!this.configured) return this.packages;
    const offerings = await this.plugin().getOfferings();
    const current = offerings && offerings.current;
    const list = (current && current.availablePackages) || [];
    const find = (type) => list.find(p => p.packageType === type) || null;
    this.packages = {
      monthly: (current && current.monthly) || find('MONTHLY'),
      annual: (current && current.annual) || find('ANNUAL')
    };
    return this.packages;
  },

  /* ── 구매 ── */
  /**
   * @returns {'success'|'cancelled'|'pending'} 실패 시 Error throw
   */
  async purchase(kind) {
    const pkg = this.packages[kind];
    if (!this.configured || !pkg) throw new Error('구독 상품을 불러오지 못했습니다.');
    try {
      const res = await this.plugin().purchasePackage({ aPackage: pkg });
      this._applyCustomerInfo(res && res.customerInfo);
      // 결제는 됐지만 아직 승인 대기(예: 편의점 결제 등)인 경우
      return State.isPro ? 'success' : 'pending';
    } catch (e) {
      if (this._isCancelled(e)) return 'cancelled';
      throw e;
    }
  },

  async restore() {
    if (!this.configured) throw new Error('결제 기능을 사용할 수 없습니다.');
    const res = await this.plugin().restorePurchases();
    this._applyCustomerInfo(res && (res.customerInfo || res));
    return State.isPro;
  },

  _isCancelled(e) {
    if (!e) return false;
    const code = String(e.code != null ? e.code : '');
    const msg = String(e.message || e.errorMessage || '');
    // RevenueCat PURCHASE_CANCELLED_ERROR 코드는 '1'
    return e.userCancelled === true || code === '1' || code === 'PURCHASE_CANCELLED' || /cancel/i.test(msg);
  },

  /** 클라우드 로그인 직후: 결제 계정을 Supabase 사용자 ID에 연결 (기존 구매도 함께 이전됨) */
  async linkCloudUser() {
    const uid = (typeof Cloud !== 'undefined' && Cloud.userId()) || null;
    if (!this.configured || !uid) return;
    try {
      const res = await this.plugin().logIn({ appUserID: uid });
      this._applyCustomerInfo(res && (res.customerInfo || res));
    } catch (e) { console.warn('[Billing] 결제 계정 연결 실패', e); }
  },
  /** 로그인 직후 공통: 앱 결제 연결 + 웹 결제 PRO 확인 */
  async onSignedIn() { await this.linkCloudUser(); await this.refreshWebPro(true); },

  /** 로그아웃: 결제 계정을 익명으로 되돌림 */
  async unlinkCloudUser() {
    this.webPro = false; this.webProUntil = null;
    if (!this.configured) { this._setPro(false); return; }
    try {
      const res = await this.plugin().logOut();
      this._applyCustomerInfo(res && (res.customerInfo || res));
    } catch (e) { /* 이미 익명 */ }
  },

  /* ── 출시 기념 PRO 무료 기간 ──
     기간 동안 PRO 기능(AI 비서·단체 등록·무제한 일정·당일 예보)을 모두에게 열어 줌.
     결제 스위치(payments_open)가 닫혀 있으면 마감일이 지나도 계속 무료이고 결제 화면이 나오지 않음.
     광고 제거는 포함하지 않음 (State.isPro = 실제 유료 PRO만).
     마감일은 서버 app_settings.pro_free_until 로 바꿀 수 있고, 못 받아오면 아래 기본값 사용. */
  PROMO_DEFAULT: '2027-03-31T23:59:59+09:00',
  PROMO_KEY: 'bp_promo_until',
  PAY_KEY: 'bp_pay_open',
  /** 결제 스위치 (서버 app_settings.payments_open). 서버가 '열림'이라고 알려 준 적이 있을 때만 true.
      닫혀 있으면 날짜와 상관없이 결제 화면이 나오지 않고, 모든 기능이 계속 무료 */
  payOpen() {
    try { return localStorage.getItem(this.PAY_KEY) === 'on'; } catch (e) { return false; }
  },
  promoUntil() {
    let v = null;
    try { v = localStorage.getItem(this.PROMO_KEY); } catch (e) { /* */ }
    if (v === 'off') return new Date(0);
    const d = new Date(v || this.PROMO_DEFAULT);
    return isNaN(d) ? new Date(this.PROMO_DEFAULT) : d;
  },
  /** 안내에 적는 무료 마감일이 아직 안 지났는지 */
  promoDated() { return Date.now() < this.promoUntil().getTime(); },
  /** 무료로 쓰는 중인지: 결제가 닫혀 있거나, 무료 마감일 전 */
  promoActive() { return !this.payOpen() || this.promoDated(); },
  promoLabel() {
    const d = new Date(this.promoUntil().getTime() + 9 * 3600 * 1000);
    return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
  },
  /** 화면에 적는 말: '2027년 3월 31일까지 무료' (마감일이 지났는데 결제가 닫혀 있으면 '지금은 모두 무료') */
  promoText() { return this.promoDated() ? `${this.promoLabel()}까지 무료` : '지금은 모두 무료'; },
  /** 무료 기간 남은 날 (한국 날짜 기준, 마지막 날 = 1일) */
  promoDaysLeft() {
    const kst = t => Math.floor((t + 9 * 3600 * 1000) / 86400000);
    return Math.max(0, kst(this.promoUntil().getTime()) - kst(Date.now()) + 1);
  },
  /** PRO 기능을 쓸 수 있는지 (유료 PRO 또는 무료 기간) — 광고 여부는 State.isPro로 따로 판단 */
  hasPro() { return !!State.isPro || this.promoActive(); },
  async refreshPromo() {
    try {
      if (typeof Cloud === 'undefined' || !Cloud.isConfigured()) return;
      const { url, key } = Cloud.cfg();
      const res = await fetch(`${url}/rest/v1/rpc/bp_public_settings`, {
        method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!res.ok) return;
      const j = await res.json();
      // 안내에 적을 날짜는 pro_free_label (없으면 예전처럼 pro_free_until)
      const v = j && (j.pro_free_label || j.pro_free_until);
      const before = this.promoActive() + '|' + this.promoText();
      // 서버가 값을 비워 두면(행 삭제) 무료 기간 끝 → 기본값으로 돌아가지 않게 '끝남'을 저장
      try {
        localStorage.setItem(this.PROMO_KEY, v || 'off');
        localStorage.setItem(this.PAY_KEY, j && j.payments_open === true ? 'on' : 'off');
      } catch (e) { /* */ }
      if (before !== this.promoActive() + '|' + this.promoText() && typeof App !== 'undefined' && App.applyProStatus) App.applyProStatus();
    } catch (e) { /* 네트워크 오류 시 저장된 값 유지 */ }
  },

  /* ── 무료 사용자 일정 개수 제한 ── */
  FREE_SCHEDULE_LIMIT: 3,

  /** 오늘 이후(오늘 포함) 예정된 라운딩 수. 지난 라운딩은 제한에 포함하지 않음 */
  upcomingScheduleCount() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return (State.schedules || []).filter(s => s && s.date && new Date(s.date).getTime() >= today).length;
  },

  canAddSchedule() {
    return this.hasPro() || this.upcomingScheduleCount() < this.FREE_SCHEDULE_LIMIT;
  },

  /** 새 일정을 추가할 수 있으면 true, 아니면 PRO 안내를 띄우고 false */
  guardScheduleLimit() {
    if (this.canAddSchedule()) return true;
    App.showModal('예정된 라운딩이 가득 찼어요', `
      <div class="pay-success" style="padding-top:var(--sp-2);">
        <p>무료 회원은 예정된 라운딩을 <b>${this.FREE_SCHEDULE_LIMIT}개</b>까지 등록할 수 있어요.<br>
        지난 라운딩은 개수에 포함되지 않아요.</p>
        <button class="btn-primary" style="width:100%; margin-bottom:var(--sp-2);" onclick="App.closeModal(); App.navigate('upgrade');">PRO로 무제한 등록하기</button>
        <button class="btn-ghost" style="width:100%;" onclick="App.closeModal();">닫기</button>
      </div>`);
    return false;
  },

  _isIOSApp() {
    return !!(window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() === 'ios');
  },
  /** 결제 안내에 쓰는 스토어 이름 (아이폰 앱이면 App Store) */
  storeName() { return this._isIOSApp() ? 'App Store' : '구글 플레이'; },
  manageHint() { return this._isIOSApp() ? '아이폰 설정 > Apple ID > 구독' : '구글 플레이 > 결제 및 정기 결제'; },

  /* ── 구독 관리 (해지·결제수단 변경은 각 스토어에서) ── */
  openManage() {
    if (this._isIOSApp()) { window.location.href = 'itms-apps://apps.apple.com/account/subscriptions'; return; }
    const sku = this.activeEntitlement && this.activeEntitlement.productIdentifier;
    let url = `https://play.google.com/store/account/subscriptions?package=${this.PLAY_PACKAGE}`;
    // RevenueCat 상품 ID는 "구독ID:기본요금제ID" 형식일 수 있음 → 구독 ID만 사용
    if (sku) url += `&sku=${encodeURIComponent(String(sku).split(':')[0])}`;
    window.location.href = url;
  },

  openStoreListing() {
    if (this._isIOSApp()) { window.location.href = 'itms-apps://apps.apple.com/app/id6802747027'; return; }
    window.location.href = `https://play.google.com/store/apps/details?id=${this.PLAY_PACKAGE}`;
  }
};

window.Billing = Billing;
