/* =========================================
   BuddyPlanner — 포인트 (서버 장부 기준)

   - 포인트는 Supabase 서버 장부(point_ledger)의 합계만 인정합니다.
     기기에는 화면 표시용 숫자만 저장하고, 적립·사용은 모두 서버 함수가 처리합니다.
   - 포인트는 광고 시청 등으로 무료로만 적립되며 돈으로 판매하지 않습니다.
   - 광고 보상: 서버 설정이 'client'면 앱이 시청 완료를 알리고(하루 한도는 서버가 확인),
     'ssv'면 Google AdMob 서버가 직접 서버에 알려 줍니다(admob-reward 함수).
   ========================================= */

const Points = {
  CACHE_KEY: 'bp_points',
  META_KEY: 'bp_points_meta',

  available() {
    return typeof Cloud !== 'undefined' && Cloud.isConfigured() && Cloud.isSignedIn();
  },

  balance() {
    return parseInt(localStorage.getItem(this.CACHE_KEY) || '0', 10) || 0;
  },

  _today() { return new Date().toLocaleDateString('ko-KR'); },

  meta() {
    let m = {};
    try { m = JSON.parse(localStorage.getItem(this.META_KEY) || '{}') || {}; } catch (e) { m = {}; }
    if (m.day !== this._today()) m.ad_today = 0;
    const rules = Object.assign({ attend: 3, streak_days: 7, streak_bonus: 10, round: 20, food: 10, post: 5, food_limit: 2, post_limit: 2, expire_days: 365 }, m.rules || {});
    return { ad_today: m.ad_today || 0, ad_limit: m.ad_limit || 10, ad_points: m.ad_points || 10, ad_mode: m.ad_mode || 'client',
      attended_today: m.day === this._today() && !!m.attended_today, expiring_soon: m.expiring_soon || 0, rules };
  },

  /** 서버 응답으로 표시용 값 갱신 */
  _apply(r) {
    if (!r || typeof r !== 'object') return;
    if (typeof r.balance === 'number') localStorage.setItem(this.CACHE_KEY, String(r.balance));
    const m = this.meta();
    ['ad_today', 'ad_limit', 'ad_points', 'ad_mode', 'attended_today', 'expiring_soon', 'rules'].forEach(k => { if (r[k] != null) m[k] = r[k]; });
    m.day = this._today();
    localStorage.setItem(this.META_KEY, JSON.stringify(m));
    this.updateUI();
  },

  /** 화면의 포인트 숫자 갱신 (data-points, data-ad-count 속성) */
  updateUI() {
    const b = this.balance().toLocaleString();
    document.querySelectorAll('[data-points]').forEach(el => { el.textContent = b; });
    const m = this.meta();
    document.querySelectorAll('[data-ad-count]').forEach(el => { el.textContent = `${m.ad_today}/${m.ad_limit}`; });
  },

  async rpc(fn, body = {}) {
    return Cloud._api(`rest/v1/rpc/${fn}`, { method: 'POST', body });
  },

  async refresh() {
    if (!this.available()) return null;
    try {
      const r = await this.rpc('my_points');
      this._apply(r);
      return r;
    } catch (e) {
      console.warn('[Points] 조회 실패', e);
      return null;
    }
  },

  /** 로그인하지 않았으면 안내하고 false */
  requireLogin(what = '포인트') {
    if (typeof Cloud === 'undefined' || !Cloud.isConfigured()) {
      U.toast(`${what} 서비스를 준비하고 있어요.`);
      return false;
    }
    if (Cloud.isSignedIn()) return true;
    App.showModal('로그인이 필요해요', `
      <div class="pay-success" style="padding-top:var(--sp-2);">
        <p>${what}는 계정에 안전하게 보관돼요.<br>로그인하면 폰을 바꿔도 그대로 이어져요.</p>
        <button class="btn-primary" style="width:100%; margin-bottom:var(--sp-2);" onclick="App.closeModal(); App.navigate('login');">로그인하기</button>
        <button class="btn-ghost" style="width:100%;" onclick="App.closeModal();">나중에</button>
      </div>`);
    return false;
  },

  /** 광고 시청 전 확인 (하루 한도는 서버가 최종 판단) */
  canWatchAd() {
    if (!this.requireLogin('포인트')) return false;
    const m = this.meta();
    if (m.ad_today >= m.ad_limit) {
      U.toast(`오늘은 광고 보상을 모두 받았어요 (${m.ad_limit}회). 내일 다시 도전해 주세요!`);
      return false;
    }
    return true;
  },

  /** AdMob 서버 검증용 옵션 (서버가 누구에게 적립할지 알 수 있게) */
  ssvOptions() {
    const uid = typeof Cloud !== 'undefined' ? Cloud.userId() : null;
    return uid ? { userId: uid, customData: 'bp' } : undefined;
  },

  _busy: false,

  /** 출석 체크 (하루 1번, 연속 출석 보너스는 서버가 계산) */
  async checkIn() {
    if (!this.requireLogin('포인트')) return;
    try {
      const r = await this.rpc('daily_check_in');
      if (r && r.ok) {
        this._apply({ balance: r.balance, attended_today: true });
        U.toast(r.bonus ? `🎉 ${r.streak}일 연속 출석! ${r.earned}P 적립` : `출석 완료! ${r.earned}P 적립 (연속 ${r.streak}일)`);
        U.haptic && U.haptic();
      } else if (r && r.error === 'already') {
        this._apply({ balance: r.balance, attended_today: true });
        U.toast('오늘은 이미 출석했어요. 내일 또 만나요!');
      }
    } catch (e) { U.toast('출석하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
    if (State.screen === 'raffle' && typeof Raffle !== 'undefined') Raffle.render();
  },

  /** 활동(글·별점) 뒤 포인트가 늘었으면 알려 줌 — 적립은 서버가 자동으로 함 */
  async noticeEarned(label) {
    if (!this.available()) return;
    const before = this.balance();
    const r = await this.refresh();
    if (r && typeof r.balance === 'number' && r.balance > before) U.toast(`${label} +${r.balance - before}P 적립됐어요`);
  },

  /** 라운딩 후기 (스코어 + 한 줄 일기): 서버 동기화가 끝난 뒤 적립 요청 */
  async earnRound(dateStr) {
    if (!this.available() || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return;
    try { if (typeof Cloud !== 'undefined' && Cloud.push) await Cloud.push(); } catch (e) { }
    for (const wait of [0, 4000]) {
      if (wait) await new Promise(res => setTimeout(res, wait));
      try {
        const r = await this.rpc('earn_round_review', { p_date: dateStr });
        if (r && r.ok) { this._apply({ balance: r.balance }); U.toast(`라운딩 후기 +${r.earned}P 적립됐어요`); return; }
        if (r && r.error !== 'no_review') return;   // 이미 받음·하루 한도·오래된 기록
      } catch (e) { return; }
    }
  },

  /** 광고를 끝까지 봤을 때 */
  async onAdRewarded() {
    if (!this.available() || this._busy) return;
    this._busy = true;
    const before = this.balance();
    try {
      const r = await this.rpc('earn_ad_points');
      this._apply(r);
      if (r && r.ok) {
        U.toast(`🎉 ${r.earned}P 적립! (오늘 ${r.ad_today}/${r.ad_limit}회)`);
        U.haptic && U.haptic();
      } else if (r && r.error === 'daily_limit') {
        U.toast('오늘은 광고 보상을 모두 받았어요. 내일 다시 도전해 주세요!');
      } else if (r && r.error === 'use_ssv') {
        // Google 서버가 확인해 주면 적립됨 → 잠시 후 다시 조회
        U.toast('적립을 확인하고 있어요…');
        for (const wait of [2500, 5000, 10000]) {
          await new Promise(res => setTimeout(res, wait));
          const now = await this.refresh();
          if (now && now.balance > before) { U.toast(`🎉 ${now.balance - before}P 적립되었어요!`); break; }
        }
      }
    } catch (e) {
      console.warn('[Points] 적립 실패', e);
      U.toast('포인트 적립에 실패했어요. 잠시 후 다시 확인해 주세요.');
    } finally {
      this._busy = false;
    }
  }
};
