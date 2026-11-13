/* =========================================
   BuddyPlanner — 공유받은 일정: 앱으로 받기 / 홈 화면에 추가
   - 카톡 '앱 설치하고 받기' 버튼(?get=app) → 앱 열기 · 스토어로 안내
   - 웹에서 공유받은 일정을 저장한 뒤 → 앱 설치 / 홈 화면 추가 안내
   - 홈 화면 아이콘 주소(?r=)에 일정을 통째로 담아, 눌렀을 때 저장된 게 없어도 바로 그 일정이 열림
     (아이폰은 홈 화면 아이콘이 사파리와 저장 공간을 따로 씀. 서버에는 아무것도 저장하지 않음)
   ========================================= */

const HomeAdd = {
  PLAY_ID: 'com.myB',
  IOS_STORE: '',                       // 앱스토어 출시 후 주소를 넣으면 아이폰도 스토어로 바로 연결
  ANDROID_SCHEME: 'com.myB',
  IOS_SCHEME: 'buddyplanner',

  isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  isAndroid() { return /android/i.test(navigator.userAgent); },
  inKakao() { return /kakaotalk/i.test(navigator.userAgent); },

  /* ── 1. 카톡 '앱 설치하고 받기' ─────────────────────── */
  /** ?get=app 으로 들어왔을 때 (웹) */
  openGetApp(rawUrl, sched) {
    const q = rawUrl.indexOf('?') >= 0 ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
    const keep = q.split('&').filter(p => p && !/^get=/.test(p)).join('&');
    const webUrl = 'https://buddyplanner.kr/?' + keep;
    this._getApp = { keep, webUrl, sched };
    const c = (sched && sched.course) || {};
    const when = sched && sched.date ? `${U.fmtDateShort(sched.date)} ${sched.teeOff || ''}` : '';
    const ios = this.isIOS();
    const iosReady = !!this.IOS_STORE;
    this._sheet('ha-getapp', `
      <div class="ha-top"><img src="icon-192.png" alt=""><div><b>${U.esc(c.name || '라운딩 일정')}</b><small>${U.esc(when)}</small></div></div>
      <h3>앱으로 받기</h3>
      <p class="ha-sub">앱으로 받으면 출발 시간에 알람이 울리고, 차에 타면 길안내가 켜져요.</p>
      ${ios && !iosReady ? `<p class="ha-note">아이폰 앱은 앱스토어 출시를 준비하고 있어요. 지금은 아래 '로그인 없이 받기'로 받아 주세요.</p>` : `
      <button class="ha-btn navy" onclick="HomeAdd.goStore()">📲 앱 설치하고 받기</button>
      ${ios ? `<p class="ha-hint">설치하고 앱을 처음 열면 <b>붙여넣기</b> 버튼 한 번으로 이 일정을 불러와요.</p>` : ''}
      <button class="ha-btn ghost" onclick="HomeAdd.openInApp()">이미 앱이 있어요 · 앱에서 열기</button>`}
      <button class="ha-btn soft" onclick="HomeAdd.closeSheet(); App.handleIncomingUrl(HomeAdd._getApp.webUrl)">🌐 로그인 없이 받기</button>
    `);
    // 카톡 버튼을 누른 그대로 스토어로 바로 (안드로이드: 앱 있으면 앱, 없으면 플레이스토어 / 아이폰: 앱스토어 주소가 생기면)
    if (this.isAndroid() || (ios && iosReady)) setTimeout(() => this.goStore(), 250);
  },

  _storeUrl() {
    if (this.isIOS()) return this.IOS_STORE;
    // 안드로이드: 설치 후 처음 열 때 이 일정을 이어받도록 정보를 실어 보냄 (앱이 Install Referrer로 읽음)
    return `https://play.google.com/store/apps/details?id=${this.PLAY_ID}&referrer=${encodeURIComponent(this._getApp.keep)}`;
  },

  async goStore() {
    const g = this._getApp; if (!g) return;
    if (this.isIOS() && !this.IOS_STORE) { U.toast('아이폰 앱은 앱스토어 출시를 준비하고 있어요', 3000); return; }
    // 아이폰: 앱스토어는 정보를 못 실어 보내서 링크를 복사해 둠 → 앱 첫 화면의 '붙여넣기'로 불러옴
    try { await navigator.clipboard.writeText(g.webUrl); } catch (e) { /* 안 되면 카톡 버튼을 다시 누르면 됨 */ }
    if (this.isAndroid()) {
      // 앱이 있으면 바로 앱으로, 없으면 플레이스토어로
      const fb = encodeURIComponent(this._storeUrl());
      location.href = `intent://share?${g.keep}#Intent;scheme=${this.ANDROID_SCHEME};package=${this.PLAY_ID};S.browser_fallback_url=${fb};end`;
      return;
    }
    location.href = this._storeUrl();
  },

  openInApp() {
    const g = this._getApp; if (!g) return;
    if (this.isAndroid()) { location.href = `intent://share?${g.keep}#Intent;scheme=${this.ANDROID_SCHEME};package=${this.PLAY_ID};end`; return; }
    location.href = `${this.IOS_SCHEME}://share?${g.keep}`;
  },

  /* ── 안드로이드 크롬: '홈 화면에 추가' 시스템 창 (한 번 누르면 아이콘이 생김) ── */
  _bip: null,
  initInstall() {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this._bip = e; });
    window.addEventListener('appinstalled', () => { this._bip = null; U.toast('홈 화면에 아이콘이 생겼어요'); this.closeSheet(); });
  },
  isStandalone() { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } },

  /** '홈 화면에 추가' 버튼 */
  async addHome() {
    if (this.isAndroid()) {
      // 카톡 안 브라우저에서는 설치 창이 안 뜸 → 크롬으로 열고, 거기서 한 번 더 누르게
      if (this.inKakao()) {
        const u = location.href.replace(/^https?:\/\//, '').replace(/([?&])add=1&?/, '$1');
        location.href = `intent://${u}${u.indexOf('?') >= 0 ? '&' : '?'}add=1#Intent;scheme=https;package=com.android.chrome;end`;
        return;
      }
      if (this._bip) {
        const e = this._bip; this._bip = null;
        try { e.prompt(); const r = await e.userChoice; if (r && r.outcome === 'accepted') { this.closeSheet(); return; } } catch (err) { }
        return;
      }
    }
    if (this.isIOS() && !this.inKakao()) return this.arrowGuide();
    this.showHow();
  },

  /** 아이폰 사파리: 아래 공유 버튼에 화살표를 띄워 따라 하게 */
  arrowGuide() {
    const s = State.schedules[this._idx]; if (!s) return;
    this.prepare(this._idx);
    this.closeSheet();
    const bg = document.createElement('div');
    bg.className = 'ha-arrow'; bg.id = 'ha-sheet-bg';
    document.body.classList.add('ha-guide');
    bg.innerHTML = `
      <div class="ha-tip">
        <div class="st"><span class="n on">1</span><div><b>아래 공유 버튼</b>을 누르세요 <span class="sh">□↑</span></div></div>
        <div class="st"><span class="n">2</span><div>목록을 올려 <b>홈 화면에 추가</b></div></div>
        <div class="st"><span class="n">3</span><div>오른쪽 위 <b>추가</b> → 끝!</div></div>
        <div class="mini"><img src="${this.iconURL(s)}" alt="">이 아이콘이 생겨요 · <b>${U.esc(this.label(s))}</b></div>
        <button class="ha-later" onclick="HomeAdd.closeSheet()">닫기</button>
      </div>
      <div class="ha-down">⬇</div>`;
    bg.addEventListener('click', e => { if (e.target === bg) this.closeSheet(); });
    document.body.appendChild(bg);
  },

  /* ── 2. 웹에서 저장한 뒤 안내 ───────────────────────── */
  /** 공유받은 일정을 웹에서 저장한 직후 */
  offer(idx) {
    if (U.isNativeApp()) return;
    const s = State.schedules[idx]; if (!s) return;
    this._idx = idx;
    this.prepare(idx);
    const c = s.course || {};
    const iosNoStore = this.isIOS() && !this.IOS_STORE;
    this._sheet('ha-offer', `
      <div class="ha-ok">✓</div>
      <h3 style="text-align:center">일정을 저장했어요</h3>
      <p class="ha-sub" style="text-align:center">${U.esc(U.fmtDateShort(new Date(s.date)))} ${U.esc(s.teeOff || '')} · ${U.esc(c.name || '')}</p>
      ${iosNoStore ? '' : `<div class="ha-opt on"><span class="i">📲</span><div><b>앱 설치하기</b><small>출발 알람 · 차에 타면 길안내 (가장 추천)</small></div></div>`}
      <div class="ha-opt k"><span class="i">💬</span><div><b>카톡 나에게 보내기</b><small>'나와의 채팅'에 이 일정을 보내 둬요. 누르면 바로 열려요</small></div></div>
      <div class="ha-opt"><span class="i">🏠</span><div><b>홈 화면에 추가</b><small>${this.isAndroid() ? 'BuddyPlanner 아이콘이 생겨요. 누르면 다가오는 일정이 바로 보여요' : `「${U.esc(this.label(s))}」 아이콘 · 화살표 따라 3번 누르기`}</small></div></div>
      ${iosNoStore ? '' : `<button class="ha-btn navy" onclick="HomeAdd.installFromOffer()">앱 설치하기</button>`}
      <div class="ha-row"><button class="ha-btn kakao" onclick="HomeAdd.sendToMe()">💬 나에게 보내기</button><button class="ha-btn soft" onclick="HomeAdd.addHome()">🏠 홈 화면에</button></div>
      <button class="ha-later" onclick="HomeAdd.closeSheet()">나중에 할게요</button>
    `);
  },

  /** 카톡 '나와의 채팅'에 이 일정을 보내 두기 (카톡 공유 창에서 '나와의 채팅'을 고름 · 로그인 없음) */
  sendToMe() {
    const s = State.schedules[this._idx]; if (!s) return;
    const url = 'https://buddyplanner.kr/?r=' + this.pack(s);
    const c = s.course || {};
    const d = new Date(s.date);
    const tl = s.timeline || {};
    const dep = tl.homeDepart || "";
    const route = [s.hasMeetingPoint && s.meetingPointObj ? s.meetingPointObj.name : null, s.hasMeal && s.mealRestaurant ? s.mealRestaurant.name : null, '골프장'].filter(Boolean).join(' → ');
    const title = `⛳ ${d.getMonth() + 1}/${d.getDate()} ${c.name || '라운딩'} · 내 일정`;
    const desc = `${s.teeOff || ''} 티오프 · ${s.startAddress || s.startPoint || ''}에서 출발${dep ? ' ' + dep : ''}\n${route}`;
    try {
      if (U.kakaoSend({
        objectType: 'feed',
        content: { title, description: desc, imageUrl: 'https://buddyplanner.kr/img/share.jpg', link: { mobileWebUrl: url, webUrl: url } },
        buttons: [
          { title: '내 일정 열기', link: { mobileWebUrl: url, webUrl: url } },
          { title: '앱 설치하기', link: { mobileWebUrl: url + '&get=app', webUrl: url + '&get=app' } }
        ]
      })) { U.toast("카톡에서 '나와의 채팅'을 골라 보내 주세요", 3000); return; }
    } catch (e) { console.warn('[나에게 보내기]', e); }
    U.shareOut({ title, text: `${title}\n${desc}\n\n👇 내 일정 열기\n${url}` });
  },

  installFromOffer() {
    const s = State.schedules[this._idx]; if (!s) return;
    const keep = 'r=' + this.pack(s);
    this._getApp = { keep, webUrl: 'https://buddyplanner.kr/?' + keep, sched: s };
    this.goStore();
  },

  showHow() {
    const s = State.schedules[this._idx]; if (!s) return;
    this.prepare(this._idx);
    const ios = !this.isAndroid();
    const kakao = this.inKakao();
    const label = this.label(s);
    const steps = (isIOS) => isIOS ? [
      kakao ? '카톡 안에서 열렸다면 오른쪽 아래 <b>⋯ → 다른 브라우저로 열기</b> (사파리)' : null,
      '아래쪽 <b>공유 버튼 (□↑)</b> 누르기',
      '<b>홈 화면에 추가</b> 누르기',
      `이름이 <b>${U.esc(label)}</b>로 들어가 있어요. <b>추가</b>를 누르면 끝!`
    ] : [
      kakao ? '카톡 안에서 열렸다면 오른쪽 위 <b>⋮ → 다른 브라우저로 열기</b> (크롬)' : null,
      '오른쪽 위 <b>⋮ 메뉴</b> 누르기',
      '<b>홈 화면에 추가</b> 누르기',
      `이름이 <b>${U.esc(label)}</b>로 들어가 있어요. <b>추가</b>를 누르면 끝!`
    ];
    const list = (isIOS) => steps(isIOS).filter(Boolean).map((t, i) => `<div class="ha-step"><span class="n">${i + 1}</span><p>${t}</p></div>`).join('');
    this._sheet('ha-how', `
      <h3>홈 화면에 추가하기</h3>
      <div class="ha-tab"><button class="${ios ? 'on' : ''}" onclick="HomeAdd._tab(this,'i')">아이폰 (사파리)</button><button class="${ios ? '' : 'on'}" onclick="HomeAdd._tab(this,'a')">안드로이드 (크롬)</button></div>
      <div class="ha-steps" data-k="i" style="${ios ? '' : 'display:none'}">${list(true)}</div>
      <div class="ha-steps" data-k="a" style="${ios ? 'display:none' : ''}">${list(false)}</div>
      <div class="ha-prev"><img src="${this.iconURL(s)}" alt=""><div><b>${U.esc(label)}</b><small>이렇게 생긴 아이콘이 생겨요</small></div></div>
      ${kakao ? `<button class="ha-btn navy" onclick="HomeAdd.openExternal()">다른 브라우저로 열기</button>` : ''}
      <button class="ha-later" onclick="HomeAdd.closeSheet()">닫기</button>
    `);
  },
  _tab(btn, k) {
    btn.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
    document.querySelectorAll('#ha-how .ha-steps').forEach(d => { d.style.display = d.dataset.k === k ? '' : 'none'; });
  },
  /** 카톡 안 브라우저 → 기본 브라우저로 (홈 화면 추가는 사파리·크롬에서만 됨) */
  openExternal() {
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
  },

  /* ── 3. 홈 화면 아이콘 준비: 이름 · 날짜 아이콘 · 열면 이 일정 ─────────── */
  label(s) {
    const d = new Date(s.date);
    // '오렌지듄스 영종' → '오렌지듄스', '스카이72 하늘코스' → '스카이72' (홈 화면 이름은 10~12자만 보임)
    const strip = (t) => t.replace(/(CC|C\.C\.?|컨트리클럽|골프클럽|골프장|GC|골프앤리조트|리조트)$/i, '');
    const words = String((s.course && s.course.name) || '라운딩').trim().split(/\s+/);
    let name = strip(words[0]);
    if (name.length < 2 && words[1]) name = strip(words[0] + words[1]);
    return `${d.getMonth() + 1}/${d.getDate()} ${name.slice(0, 7)}`;
  },

  iconURL(s) {
    if (this._icon && this._icon.k === s.date + s.teeOff) return this._icon.url;
    const d = new Date(s.date);
    const txt = `${d.getMonth() + 1}/${d.getDate()}`;
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const g = cv.getContext('2d');
    const img = document.getElementById('ha-icon-src');
    if (img && img.complete && img.naturalWidth) g.drawImage(img, 0, 0, 512, 512);
    else { g.fillStyle = '#16140f'; g.fillRect(0, 0, 512, 512); }
    g.fillStyle = '#10b981';
    const r = 40, x = 70, y = 360, w = 372, h = 110;
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.font = '800 92px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 418);
    let url = '';
    try { url = cv.toDataURL('image/png'); } catch (e) { url = 'icon-512.png'; }
    this._icon = { k: s.date + s.teeOff, url };
    return url;
  },

  /** 일정을 주소에 담기 (서버 저장 없음) */
  pack(s) {
    const o = {
      v: 1, c: s.course && { n: s.course.name, a: s.course.addr || '', y: s.course.lat, x: s.course.lng, g: s.course.region || '' },
      d: new Date(s.date).toISOString(), t: s.teeOff, p: s.prepTime, tt: s.travelTime,
      sp: s.startPoint, sa: s.startAddress, sy: s.startLat, sx: s.startLng,
      m: s.hasMeal ? 1 : 0, md: s.mealDuration, mr: s.mealRestaurant && { n: s.mealRestaurant.name, y: s.mealRestaurant.lat, x: s.mealRestaurant.lng, dm: s.mealRestaurant.distMin || 0 },
      tr: s.travelToRestaurant || 0,
      mp: s.hasMeetingPoint && s.meetingPointObj ? { n: s.meetingPointObj.name, y: s.meetingPointObj.lat, x: s.meetingPointObj.lng } : null, tm: s.travelToMeeting || 0,
      pm: s.hasPostMeal && s.postMealRestaurant ? { n: s.postMealRestaurant.name, y: s.postMealRestaurant.lat, x: s.postMealRestaurant.lng } : null,
      rl: s.roundLength || '18'
    };
    const b = btoa(unescape(encodeURIComponent(JSON.stringify(o))));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },

  unpack(str) {
    try {
      let b = String(str).replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      const o = JSON.parse(decodeURIComponent(escape(atob(b))));
      if (!o || !o.c || !o.d) return null;
      const pt = (p) => p && p.n ? { name: p.n, lat: +p.y || 0, lng: +p.x || 0 } : null;
      const s = {
        course: { name: o.c.n, addr: o.c.a || '', lat: +o.c.y || 0, lng: +o.c.x || 0, region: o.c.g || '' },
        date: new Date(o.d), teeOff: o.t, prepTime: +o.p || 30, companions: [], travelTime: +o.tt || 60,
        hasMeal: !!o.m && !!o.mr, mealDuration: +o.md || 0, mealRestaurant: o.mr ? Object.assign(pt(o.mr), { distMin: +o.mr.dm || 0 }) : null,
        hasPostMeal: !!o.pm, postMealRestaurant: pt(o.pm), travelToRestaurant: +o.tr || 0,
        startPoint: o.sp || '집', startAddress: o.sa || '', startLat: +o.sy || 0, startLng: +o.sx || 0,
        hasMeetingPoint: !!o.mp, meetingPointObj: pt(o.mp), travelToMeeting: +o.tm || 0,
        groupCode: null, roundLength: o.rl || '18'
      };
      return App.sanitizeShared(s);
    } catch (e) { console.warn('[홈 화면 링크] 풀기 실패', e); return null; }
  },

  /** 홈 화면 아이콘으로 열었을 때: 저장된 같은 일정이 있으면 그걸, 없으면 다시 만들어서 타임라인 열기 */
  restore(str) {
    const s = this.unpack(str); if (!s) return false;
    const key = (x) => `${(x.course && x.course.name) || ''}|${new Date(x.date).toDateString()}|${x.teeOff}`;
    let idx = State.schedules.findIndex(x => key(x) === key(s));
    if (idx < 0) { State.addSchedule(s); idx = State.schedules.length - 1; }
    try { if (typeof Splash !== 'undefined') { clearTimeout(Splash.timeoutId); Splash.done = true; } } catch (e) { }
    App.viewTimeline(idx);
    this._idx = idx;
    if (/[?&]get=app\b/.test(location.search) && !U.isNativeApp()) { setTimeout(() => this.installFromOffer(), 600); return true; }
    if (/[?&]add=1\b/.test(location.search) && !this.isStandalone()) setTimeout(() => this.offer(idx), 900);
    return true;
  },

  /** 홈 화면에 추가될 이름 · 아이콘 · 주소를 이 일정으로 바꿔 둠 */
  prepare(idx) {
    const s = State.schedules[idx]; if (!s) return;
    const label = this.label(s);
    const url = 'https://buddyplanner.kr/?r=' + this.pack(s);
    const icon = this.iconURL(s);
    try { history.replaceState(null, '', '/?r=' + this.pack(s)); } catch (e) { }
    document.title = label;
    const meta = (name, val) => { let m = document.querySelector(`meta[name="${name}"]`); if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); } m.content = val; };
    meta('apple-mobile-web-app-title', label);
    meta('application-name', label);
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(l => l.remove());
    const l = document.createElement('link'); l.rel = 'apple-touch-icon'; l.href = icon; document.head.appendChild(l);
    // 안드로이드 크롬: 매니페스트도 이 일정 것으로
    try {
      const man = { name: label, short_name: label, start_url: url, scope: 'https://buddyplanner.kr/', display: 'standalone', background_color: '#ffffff', theme_color: '#ffffff',
        icons: [{ src: icon, sizes: '512x512', type: 'image/png' }] };
      const ml = this.isAndroid() ? null : document.querySelector('link[rel="manifest"]');
      if (ml) ml.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(man));
    } catch (e) { }
  },

  /* ── 공통: 아래에서 올라오는 창 ─────────────────── */
  _sheet(id, inner) {
    this.closeSheet();
    const bg = document.createElement('div');
    bg.className = 'ha-bg'; bg.id = 'ha-sheet-bg';
    bg.innerHTML = `<div class="ha-sheet" id="${id}">${inner}</div>`;
    bg.addEventListener('click', e => { if (e.target === bg) this.closeSheet(); });
    document.body.appendChild(bg);
    requestAnimationFrame(() => bg.classList.add('open'));
  },
  closeSheet() { const b = document.getElementById('ha-sheet-bg'); if (b) b.remove(); document.body.classList.remove('ha-guide'); }
};

try { HomeAdd.initInstall(); } catch (e) { }
