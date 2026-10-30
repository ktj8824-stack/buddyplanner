/* =========================================
   BuddyPlanner — 결제 (구글 플레이 결제 + RevenueCat)

   - 실제 결제는 구글 플레이가 처리하고, 결제 검증·구독 상태는 RevenueCat이 관리합니다.
   - PRO 여부는 RevenueCat의 "pro" 권한(Entitlement)이 활성인지로만 판단합니다.
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
    return (window.APP_CONFIG || {}).REVENUECAT_ANDROID_KEY || '';
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
    State.isPro = this.isNative() && localStorage.getItem(this.CACHE_KEY) === 'true';
  },

  async init() {
    if (!this.isAvailable()) {
      // 웹이거나 키가 없으면 PRO를 켤 방법이 없음
      if (!this.isNative()) this._setPro(false);
      return;
    }
    try {
      await this.plugin().configure({ apiKey: this.apiKey() });
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
    this._setPro(!!ent);
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

  /* ── 구독 관리 (해지·결제수단 변경은 구글 플레이에서) ── */
  openManage() {
    const sku = this.activeEntitlement && this.activeEntitlement.productIdentifier;
    let url = `https://play.google.com/store/account/subscriptions?package=${this.PLAY_PACKAGE}`;
    // RevenueCat 상품 ID는 "구독ID:기본요금제ID" 형식일 수 있음 → 구독 ID만 사용
    if (sku) url += `&sku=${encodeURIComponent(String(sku).split(':')[0])}`;
    window.location.href = url;
  },

  openStoreListing() {
    window.location.href = `https://play.google.com/store/apps/details?id=${this.PLAY_PACKAGE}`;
  }
};

window.Billing = Billing;
