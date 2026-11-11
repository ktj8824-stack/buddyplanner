/* =========================================
   BuddyPlanner — 차에 타면 자동 길안내 (로드플래너 AutoNav를 골프 일정에 맞게 옮김)
   앱 주소 뒤에 ?go=next 를 붙여 열면, 오늘 라운딩의 '지금 가야 할 곳'으로
   기본 내비(티맵/카카오내비)를 정해 두었으면 바로 열고, '매번 선택'이면 내비 고르기 창을 띄웁니다.
   - 아이폰: 단축어 자동화 "CarPlay(또는 차 블루투스)에 연결되면 → URL 열기"
   - 갤럭시: 모드 및 루틴 "차량 블루투스 연결 시 → 웹페이지 열기"
   가야 할 곳: 집 → (모임장소) → (식당) → 골프장 → (뒷풀이 식당) → 집
   ========================================= */
const AutoNav = {
  WEB_LINK: 'https://buddyplanner.kr/?go=next',
  APP_LINK: 'buddyplanner://next',   // 아이폰 앱: 사파리 대신 앱이 바로 열림 → 내비 열 때 'TMAP에서 열겠습니까?' 확인창 없음
  /** 단축어에 넣을 링크: 아이폰 앱에서는 앱 전용 주소, 그 밖(웹·안드로이드)은 웹 주소 */
  get LINK() { return this._isIOSApp() ? this.APP_LINK : this.WEB_LINK; },
  _isIOSApp() { const C = window.Capacitor; return !!(C && C.getPlatform && C.getPlatform() === 'ios'); },
  /** 앱 전용 주소로 열렸는지 (buddyplanner://next, buddyplanner://go=next 등) */
  isAppLink(url) { return /^buddyplanner:\/\/(go[=/])?next\b/i.test(String(url || '')); },
  WAIT_MS: 8000,
  LATE_MIN: 45,          // 골프장 쪽 구간은 티오프 + 45분까지 유효
  EARLY_MIN: 30,         // 다음 구간 출발 30분 전부터는 그 구간으로 봄 (식당에서 조금 일찍 나서도 골프장으로)
  HOME_GRACE: 180,       // 귀가 출발 후 3시간이 지나면 오늘 이동은 끝난 것으로 봄
  _timer: null,

  // 주소에 go=next 가 있으면 지우고 true
  _consumeFlag() {
    try {
      const u = new URL(location.href);
      const q = u.searchParams.get('go');
      const h = (u.hash || '').replace(/^#/, '');
      if (q !== 'next' && h !== 'go=next' && h !== 'next') return false;
      u.searchParams.delete('go');
      if (h === 'go=next' || h === 'next') u.hash = '';
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
      return true;
    } catch (e) { return false; }
  },

  init() {
    if (this._consumeFlag()) { this.start(); return; }
    // 아이폰 앱이 앱 전용 주소로 처음 켜진 경우 (이미 켜져 있을 때는 appUrlOpen에서 처리)
    try {
      const A = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if (A && A.getLaunchUrl) A.getLaunchUrl().then(r => { if (r && this.isAppLink(r.url) && !this._launched) { this._launched = true; this.start(); } }).catch(() => {});
    } catch (e) { /* */ }
  },

  /* ── 공유 화면용 '바로 길안내' (로그인 없이, 지금 있는 곳에서 출발) ── */
  _quick: [], _quickSel: 0,
  /** dests: [{label, name, lat, lng}] — 위치가 있는 곳만 버튼으로 */
  quickHTML(dests) {
    const esc = this._esc;
    const list = (dests || []).filter(d => d && d.lat && d.lng);
    if (!list.length) return '';
    this._quick = list; this._quickSel = 0;
    return `
      <div class="qnav" id="qnav">
        <div class="qnav-h">🚗 바로 길안내 <small>지금 있는 곳에서 출발해요</small></div>
        ${list.length > 1 ? `<div class="qnav-dest">${list.map((d, i) => `<button type="button" class="qnav-chip${i === 0 ? ' on' : ''}" onclick="AutoNav.quickPick(${i})">${esc(d.label)}</button>`).join('')}</div>` : ''}
        <div class="qnav-to">📍 <b id="qnav-name">${esc(list[0].name)}</b></div>
        <div class="qnav-b">
          <button type="button" class="qnav-btn tmap" onclick="AutoNav.quickGo('tmap')">티맵</button>
          <button type="button" class="qnav-btn kakao" onclick="AutoNav.quickGo('kakao')">카카오내비</button>
        </div>
      </div>`;
  },
  quickPick(i) {
    this._quickSel = i;
    document.querySelectorAll('#qnav .qnav-chip').forEach((b, j) => b.classList.toggle('on', j === i));
    const n = document.getElementById('qnav-name'); if (n && this._quick[i]) n.textContent = this._quick[i].name;
  },
  quickGo(app) {
    const d = this._quick[this._quickSel || 0];
    if (d && typeof Timeline !== 'undefined' && Timeline.openNav) Timeline.openNav(app, d.name, d.lat, d.lng);
  },

  _min(hm) {
    const m = String(hm || '').match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  },

  /** 오늘 라운딩의 이동 구간들 (출발 시각 순) */
  _legs(s) {
    const tl = s.timeline || {};
    const home = { name: s.startAddress || s.startPoint || '집', lat: s.startLat, lng: s.startLng };
    const course = { name: s.course.name, lat: s.course.lat, lng: s.course.lng };
    const meet = s.hasMeetingPoint && s.meetingPointObj ? { name: s.meetingPointObj.name || '모임장소', lat: s.meetingPointObj.lat, lng: s.meetingPointObj.lng } : null;
    const rest = s.hasMeal && s.mealRestaurant ? { name: s.mealRestaurant.name || '식당', lat: s.mealRestaurant.lat, lng: s.mealRestaurant.lng } : null;
    const post = s.hasPostMeal && s.postMealRestaurant ? { name: s.postMealRestaurant.name || '뒷풀이 식당', lat: s.postMealRestaurant.lat, lng: s.postMealRestaurant.lng } : null;
    const legs = [];
    const first = meet || rest || course;
    legs.push({ dep: tl.homeDepart, from: home, to: first, label: meet ? '모임장소로 출발' : rest ? '식당으로 출발' : '골프장으로 출발' });
    if (meet) legs.push({ dep: tl.meetDepart, from: meet, to: rest || course, label: rest ? '식당으로 출발' : '골프장으로 출발' });
    if (rest) legs.push({ dep: tl.restDepart, from: rest, to: course, label: '골프장으로 출발' });
    if (post) legs.push({ dep: tl.roundEnd, from: course, to: post, label: '뒷풀이 식당으로' });
    legs.push({ dep: tl.returnStart, from: post || course, to: home, label: '집으로 귀가' });
    // 구간마다 '언제까지 이 구간이 맞는지(until)'를 붙임 (라운딩 날 0시 기준 분, 전날 밤 출발은 음수)
    //  - 골프장 쪽으로 가는 구간: 티오프 + 45분까지 (늦게 출발해도 골프장으로 안내)
    //  - 뒷풀이 식당: 귀가 출발 시각까지 / 집으로 귀가: 귀가 출발 + 3시간까지
    const tee = this._min(s.teeOff);
    const out = [];
    for (const l of legs) {
      let dep = this._min(l.dep);
      if (dep == null || !l.to || !l.to.lat || !l.to.lng) continue;
      const toCourseSide = l.label !== '뒷풀이 식당으로' && l.label !== '집으로 귀가';
      if (toCourseSide && tee != null && dep > tee) dep -= 1440;   // 새벽 티오프: 전날 밤 출발
      let until;
      if (toCourseSide) until = (tee != null ? tee : dep) + this.LATE_MIN;
      else if (l.label === '뒷풀이 식당으로') until = this._min(tl.returnStart) != null ? this._min(tl.returnStart) : 1440;
      else until = dep + this.HOME_GRACE;
      out.push({ ...l, depMin: dep, until });
    }
    return out;
  },

  /** 지금 가야 할 곳: 오늘 라운딩(또는 오늘 밤에 출발하는 내일 새벽 라운딩)에서 아직 끝나지 않은 첫 구간 */
  nextLeg(now = new Date()) {
    if (typeof State === 'undefined' || !Array.isArray(State.schedules)) return null;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let todayCount = 0;
    const cands = [];
    State.schedules.forEach((s, idx) => {
      if (!s || !s.date || !s.course) return;
      const d = new Date(s.date);
      const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today0) / 86400000);
      if (diff !== 0 && diff !== 1) return;
      if (!s.timeline) { try { State.calculateTimeline(idx); } catch (e) { return; } }
      const legs = this._legs(s);
      if (!legs.length) return;
      const cur = nowMin - diff * 1440;          // 라운딩 날 0시 기준 지금 (내일 라운딩이면 음수)
      if (diff === 1) {
        // 내일 라운딩은 오늘 밤에 출발하는 경우만, 출발 3시간 전부터
        if (legs[0].depMin >= 0 || cur < legs[0].depMin - 180) return;
      }
      todayCount++;
      // 아직 유효한 구간 중, 출발 시각(30분 일찍까지)이 된 마지막 구간 = 지금 타야 하는 구간
      //   예) 06:45 식당 앞 → '식당→골프장' / 07:40 늦게 출발 → 그래도 '식당→골프장' / 05:10 집 → '집→식당'
      const open = legs.filter(l => cur < l.until);
      if (!open.length) return;
      let pick = open[0];
      for (const l of open) if (l.depMin <= cur + this.EARLY_MIN) pick = l;
      cands.push({ ...pick, depMin: pick.depMin + diff * 1440, s });
    });
    // 후보가 여럿이면 출발 시각이 지금과 가장 가까운 구간 (예: 밤 11시 45분 = 오늘 귀가보다 오늘 밤 출발하는 내일 새벽 라운딩)
    cands.sort((a, b) => Math.abs(a.depMin - nowMin) - Math.abs(b.depMin - nowMin));
    return { todayCount, leg: cands[0] || null };
  },

  start() {
    try { localStorage.setItem('bp_autonav_used', String(Date.now())); } catch (e) { }   // 한 번 실행됨 → 홈 홍보 줄 숨김
    this._overlay('<div class="an-t">오늘 일정을 확인하는 중…</div>', false);
    const began = Date.now();
    const tick = () => {
      const r = this.nextLeg();
      if (r && r.leg) return this._ready(r.leg);
      if (Date.now() - began < this.WAIT_MS) { this._timer = setTimeout(tick, 500); return; }
      if (r && r.todayCount) return this._message('오늘 이동이 모두 끝났어요', '수고하셨습니다. 즐거운 라운딩이었길 바라요! ⛳');
      if (typeof Cloud !== 'undefined' && Cloud.isConfigured && Cloud.isConfigured() && !Cloud.isSignedIn())
        return this._message('로그인이 필요해요', (this._isIOSApp() ? '버디플래너 앱에' : '사파리에서 버디플래너에') + ' 로그인해 주세요. 그래야 오늘 라운딩을 찾을 수 있어요.');
      return this._message('오늘 라운딩 일정이 없어요', '라운딩 날 차에 타면 골프장으로 바로 안내해 드려요.');
    };
    tick();
  },

  _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },

  _ready(leg) {
    const esc = this._esc;
    this._leg = leg;
    const pref = this.pref();
    const app = pref === 'tmap' ? '티맵' : pref === 'kakao' ? '카카오내비' : '';
    const left = 0;
    const tee = leg.s.teeOff ? ` · 티오프 ${U.fmtTimeKo ? U.fmtTimeKo(leg.s.teeOff) : leg.s.teeOff}` : '';
    const body = () => `
      <div class="an-k">⛳ ${esc(leg.s.course.name)}${esc(tee)}</div>
      <div class="an-t">${esc(leg.label)} · ${esc(U.fmtTimeKo ? U.fmtTimeKo(leg.dep) : leg.dep)}</div>
      <div class="an-d">📍 ${esc(leg.to.name)}</div>
      <div class="an-c">${app ? `<b>${left}</b>초 뒤 ${app}${app === '티맵' ? '으로' : '로'} 안내를 시작합니다` : '어느 내비로 안내할까요?'}</div>
      <div class="an-b">
        ${app ? `<button type="button" class="an-x" onclick="AutoNav.cancel()">취소</button>
        <button type="button" class="an-go" onclick="AutoNav.go()">지금 안내</button>`
        : `<button type="button" class="an-go an-tmap" onclick="AutoNav.go('tmap')">티맵</button>
        <button type="button" class="an-go an-kakao" onclick="AutoNav.go('kakao')">카카오내비</button>`}
      </div>
      ${app ? '' : '<button type="button" class="an-link" onclick="AutoNav.cancel()">닫기</button>'}`;
    // 기본 내비를 정해 두었으면 기다리지 않고 바로 내비를 엶 (운전 중 화면을 누를 일이 없게)
    if (app) {
      return this.go();
    }
    this._overlay(body(), true);
  },

  go(appArg) {
    clearTimeout(this._timer);
    const l = this._leg;
    this._close();
    if (!l) return;
    const app = appArg || this.pref();
    // 출발지는 넘기지 않음 → 내비가 지금 차가 있는 곳(현재 위치)에서 안내 (집에서 늦게 나오거나 다른 곳에서 출발해도 맞게)
    if (typeof Timeline !== 'undefined' && Timeline.openNav) Timeline.openNav(app === 'kakao' ? 'kakao' : 'tmap', l.to.name, l.to.lat, l.to.lng);
  },

  cancel() { clearTimeout(this._timer); this._close(); },

  _message(title, sub) {
    clearTimeout(this._timer);
    this._overlay(`<div class="an-t">${title}</div>${sub ? `<div class="an-d">${sub}</div>` : ''}
      <div class="an-b"><button type="button" class="an-go" onclick="AutoNav.cancel()">확인</button></div>`, true);
  },

  _overlay(html, closable) {
    let bg = document.getElementById('an-bg');
    if (!bg) {
      if (!document.getElementById('an-style')) {
        const st = document.createElement('style');
        st.id = 'an-style';
        st.textContent = `
#an-bg{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px 16px calc(20px + env(safe-area-inset-bottom));}
#an-box{width:100%;max-width:440px;background:#fff;border-radius:20px;padding:20px 18px 16px;box-shadow:0 20px 50px rgba(0,0,0,.25);color:#0f172a;}
#an-box .an-k{font-size:13px;font-weight:800;color:#059669;margin-bottom:4px;}
#an-box .an-t{font-size:20px;font-weight:800;letter-spacing:-.02em;line-height:1.35;}
#an-box .an-d{font-size:14.5px;color:#475569;margin-top:6px;line-height:1.45;word-break:keep-all;}
#an-box .an-c{font-size:14px;color:#334155;margin-top:14px;font-weight:600;}
#an-box .an-c b{color:#059669;font-size:17px;}
#an-box .an-b{display:flex;gap:8px;margin-top:16px;}
#an-box .an-b button{flex:1;height:48px;border-radius:12px;font-size:15.5px;font-weight:800;border:0;cursor:pointer;}
#an-box .an-x{background:#f1f5f9;color:#334155;}
#an-box .an-go{background:#059669;color:#fff;}
#an-box .an-tmap{background:#2563eb;}
#an-box .an-kakao{background:#fee500;color:#191919;}
#an-box .an-link{display:block;width:100%;margin-top:10px;background:none;border:0;color:#64748b;font-size:14px;font-weight:600;cursor:pointer;}`;
        document.head.appendChild(st);
      }
      bg = document.createElement('div');
      bg.id = 'an-bg';
      bg.innerHTML = '<div id="an-box" role="dialog" aria-live="polite"></div>';
      document.body.appendChild(bg);
    }
    bg.onclick = closable ? (e => { if (e.target === bg) this.cancel(); }) : null;
    document.getElementById('an-box').innerHTML = html;
  },

  _close() { const bg = document.getElementById('an-bg'); if (bg) bg.remove(); },

  pref() { try { return localStorage.getItem('bp_preferred_navi') || 'choice'; } catch (e) { return 'choice'; } },
  setPref(v, el) {
    try { localStorage.setItem('bp_preferred_navi', v); } catch (e) { }
    if (el && el.parentElement) el.parentElement.querySelectorAll('.setting-opt-btn').forEach(b => b.classList.toggle('active', b === el));
  },

  copyLink(el) {
    const done = () => { if (typeof U !== 'undefined') U.toast('링크를 복사했어요.'); if (el) { el.textContent = '복사됨 ✓'; setTimeout(() => { el.textContent = '링크 복사'; }, 1600); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(this.LINK).then(done, () => prompt('아래 링크를 복사하세요', this.LINK));
    else prompt('아래 링크를 복사하세요', this.LINK);
  },

  // 홈 화면 홍보 줄: 한 번도 실행된 적 없고 ✕를 안 눌렀을 때만
  promoHtml() {
    try { if (localStorage.getItem('bp_autonav_used') || localStorage.getItem('bp_autonav_promo_off')) return ''; } catch (e) { return ''; }
    const os = /Android/i.test(navigator.userAgent) ? 'android' : 'ios';
    return `<div class="anp" role="note">
      <a class="anp-go" href="autonav-guide.html?os=${os}">
        <span class="anp-ic" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M6 17l1.5-5h9L18 17M7.5 12l1.2-3.6A2 2 0 0 1 10.6 7h2.8a2 2 0 0 1 1.9 1.4L16.5 12"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/></svg></span>
        <span class="anp-t"><b>차에 타면 길안내가 저절로</b><small>차에 연결되면 골프장 내비 자동 실행</small></span>
        <span class="anp-btn">1분 설정</span>
      </a>
      <button type="button" class="anp-x" aria-label="다시 보지 않기" onclick="AutoNav.hidePromo()">✕</button>
    </div>`;
  },
  hidePromo() {
    try { localStorage.setItem('bp_autonav_promo_off', '1'); } catch (e) { }
    document.querySelectorAll('.anp').forEach(el => el.remove());
  },

  // 내 정보 > 차에 타면 자동 길안내
  openGuide() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const pref = this.pref();
    const opt = (v, label) => `<button type="button" class="setting-opt-btn${pref === v ? ' active' : ''}" onclick="AutoNav.setPref('${v}', this)">${label}</button>`;
    const S = 'font-size:14px;line-height:1.6;color:var(--text-200,#334155);';
    const ios = `
      <div style="font-weight:800;font-size:15px;margin:14px 0 6px;">아이폰</div>
      <ol style="${S}padding-left:22px;margin:0;list-style:decimal;">
        <li><b>단축어</b> 앱 → 아래 <b>자동화</b> → <b>＋</b></li>
        <li><b>CarPlay</b> 선택 → <b>연결될 때</b> → <b>즉시 실행</b></li>
        <li>동작에서 <b>URL 열기</b> 추가 → 아래 링크 붙여넣기</li>
      </ol>
      <div style="font-size:12.5px;color:#64748b;margin-top:6px;">CarPlay가 없으면 2번에서 <b>블루투스</b> → 차량 이름을 고르세요. ${this._isIOSApp() ? '버디플래너 앱이 바로 열려요. 예전에 웹 주소(https://…)를 넣었다면 이 링크로 바꿔 주세요.' : '버디플래너에 로그인된 Safari에서 열립니다. 버디플래너 앱을 쓰면 앱에서 이 링크를 복사해 넣으세요. 내비를 열 때 확인 창이 뜨지 않아요.'}</div>`;
    const android = `
      <div style="font-weight:800;font-size:15px;margin:14px 0 6px;">갤럭시</div>
      <ol style="${S}padding-left:22px;margin:0;list-style:decimal;">
        <li><b>설정</b> → <b>모드 및 루틴</b> → <b>루틴</b> → <b>＋</b></li>
        <li>조건: <b>블루투스 기기 연결</b> → 차량 선택 (Android Auto도 가능)</li>
        <li>실행: <b>웹페이지 열기</b>(또는 링크 열기) → 아래 링크</li>
      </ol>`;
    const html = `
      <div style="${S}">라운딩 날 차에 타서 휴대폰이 차와 연결되면, 버디플래너가 열리면서 <b>지금 가야 할 곳</b>(모임장소·식당·골프장·집)으로 내비가 자동으로 켜집니다.</div>
      <div style="font-weight:800;font-size:15px;margin:16px 0 8px;">1. 기본 내비</div>
      <div class="setting-options" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">${opt('tmap', '티맵')}${opt('kakao', '카카오내비')}${opt('choice', '매번 선택')}</div>
      <div style="font-weight:800;font-size:15px;margin:18px 0 8px;">2. 자동 실행 링크</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input readonly value="${this.LINK}" onclick="this.select()" style="flex:1;min-width:0;height:42px;border:1px solid #e2e8f0;border-radius:10px;padding:0 10px;font-size:16px;background:#f8fafc;color:#0f172a;">
        <button type="button" onclick="AutoNav.copyLink(this)" style="height:42px;padding:0 14px;border-radius:10px;border:0;background:#059669;color:#fff;font-weight:800;font-size:14px;cursor:pointer;white-space:nowrap;">링크 복사</button>
      </div>
      <div style="font-weight:800;font-size:15px;margin:18px 0 0;">3. 휴대폰에 자동 실행 등록</div>
      ${isAndroid ? android + ios : ios + android}
      <a href="autonav-guide.html?os=${isAndroid ? 'android' : 'ios'}" style="display:flex;align-items:center;justify-content:center;width:100%;height:46px;margin-top:18px;border-radius:12px;background:#059669;color:#fff;font-weight:800;font-size:15px;text-decoration:none;">그림으로 보는 설정 가이드</a>
      <button type="button" onclick="App.closeModal(); AutoNav.start()" style="width:100%;height:46px;margin-top:8px;border-radius:12px;border:1px solid #a7f3d0;background:#ecfdf5;color:#047857;font-weight:800;font-size:15px;cursor:pointer;">지금 시험해 보기</button>`;
    App.showModal('🚗 차에 타면 자동 길안내', html);
  },
};
window.AutoNav = AutoNav;
