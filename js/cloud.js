/* =========================================
   BuddyPlanner — 클라우드 동기화 (Supabase)

   - 외부 라이브러리 없이 Supabase REST API(Auth / PostgREST / Storage)를 직접 호출합니다.
   - 오프라인 우선: 앱은 지금처럼 localStorage에 저장하고, 동기화 대상 키가 바뀌면
     잠시 후 서버로 올립니다. 앱을 켜거나 다시 열 때 서버의 최신 값을 받아옵니다.
   - 충돌 처리: 키 단위로 '나중에 수정된 쪽'이 이깁니다.
   - 사진(data:image/...)은 저장소 버킷에 올리고, 서버에는 {"$img": 경로}만 저장합니다.
   - config.js에 SUPABASE_URL / SUPABASE_ANON_KEY가 없으면 아무 동작도 하지 않습니다(기기 저장만).
   ========================================= */

const Cloud = {
  /** 서버와 동기화하는 localStorage 키 */
  SYNC_KEYS: [
    // 포인트는 서버 장부(point_ledger)가 기준이라 여기서 동기화하지 않음 (js/points.js)
    'bp_schedules_v2', 'bp_records_v1', 'bp_ai_messages_v1',
    'bp_user_name', 'bp_home', 'bp_office', 'bp_font', 'bp_size', 'bp_onboarded'
  ],
  SESSION_KEY: 'bp_cloud_session',
  META_KEY: 'bp_sync_meta',      // { key: 마지막 로컬 수정 시각(ms) }
  DIRTY_KEY: 'bp_sync_dirty',    // 서버에 아직 못 올린 키 목록
  LAST_KEY: 'bp_sync_last',      // 마지막 동기화 성공 시각
  BUCKET: 'photos',

  status: 'off',                 // off | signed_out | syncing | synced | offline | error
  _tracking: true,
  _pushTimer: null,
  _syncing: null,
  _lastPull: 0,

  /* ── 설정 ── */
  cfg() {
    const c = window.APP_CONFIG || {};
    return { url: String(c.SUPABASE_URL || '').replace(/\/+$/, ''), key: c.SUPABASE_ANON_KEY || '' };
  },
  isConfigured() {
    const c = this.cfg();
    return !!(c.url && c.key);
  },
  isSignedIn() {
    return !!this.session();
  },

  /* ── 초기화 (앱 시작 시 1회) ── */
  init() {
    if (!this.isConfigured()) { this.status = 'off'; return null; }
    this._installStorageHook();

    // 웹: 카카오 OAuth 리디렉트로 돌아온 경우 주소의 토큰을 세션으로 저장
    const redirected = this._consumeRedirect();

    this.status = this.isSignedIn() ? 'synced' : 'signed_out';
    if (this.isSignedIn() && !redirected) {
      this.sync().catch(() => {});
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - this._lastPull > 60 * 1000) this.sync().catch(() => {});
    });
    window.addEventListener('online', () => this.sync().catch(() => {}));
    return redirected;   // 리디렉트 로그인 정보 (App이 로그인 완료 처리에 사용)
  },

  /* ── localStorage 변경 감지 ── */
  _installStorageHook() {
    if (this._hooked || typeof Storage === 'undefined') return;
    this._hooked = true;
    const self = this;
    const origSet = Storage.prototype.setItem;
    const origRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, v) {
      origSet.call(this, k, v);
      if (this === window.localStorage) self._onLocalChange(k);
    };
    Storage.prototype.removeItem = function (k) {
      origRemove.call(this, k);
      if (this === window.localStorage) self._onLocalChange(k);
    };
  },

  _onLocalChange(k) {
    if (!this._tracking || this.SYNC_KEYS.indexOf(k) < 0) return;
    const meta = this._meta();
    meta[k] = Date.now();
    this._raw(this.META_KEY, JSON.stringify(meta));
    const dirty = this._dirty();
    if (dirty.indexOf(k) < 0) { dirty.push(k); this._raw(this.DIRTY_KEY, JSON.stringify(dirty)); }
    if (this.isSignedIn()) {
      clearTimeout(this._pushTimer);
      this._pushTimer = setTimeout(() => this.push().catch(() => {}), 2000);
    }
  },

  /** 동기화 대상으로 기록하지 않고 localStorage를 바꿀 때 (데모 데이터, 서버 값 반영 등) */
  withoutTracking(fn) {
    const prev = this._tracking;
    this._tracking = false;
    try { return fn(); } finally { this._tracking = prev; }
  },

  _raw(k, v) { // 추적 없이 쓰기
    this.withoutTracking(() => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)));
  },
  _json(k, fallback) {
    try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; }
  },
  _meta() { return this._json(this.META_KEY, {}); },
  _dirty() { return this._json(this.DIRTY_KEY, []); },
  pendingCount() { return this._dirty().length; },
  lastSyncAt() { return parseInt(localStorage.getItem(this.LAST_KEY) || '0', 10) || 0; },

  /* ── 인증 ── */
  session() { return this._json(this.SESSION_KEY, null); },
  userId() { const s = this.session(); return s && s.user && s.user.id; },

  _saveSession(data) {
    if (!data || !data.access_token) throw new Error('세션 정보가 없습니다.');
    const s = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at ? data.expires_at * 1000 : Date.now() + (data.expires_in || 3600) * 1000,
      user: data.user ? { id: data.user.id, email: data.user.email || '', meta: data.user.user_metadata || {} } : (this.session() || {}).user
    };
    this._raw(this.SESSION_KEY, JSON.stringify(s));
    return s;
  },

  async _authFetch(path, body) {
    const { url, key } = this.cfg();
    const res = await fetch(`${url}/auth/v1/${path}`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || data.error_description || data.message || `인증 실패 (${res.status})`);
    return data;
  },

  /** 카카오·구글 ID 토큰으로 Supabase 로그인 */
  async signInWithIdToken(provider, idToken, nonce) {
    if (!this.isConfigured()) return null;
    if (!idToken) throw new Error('ID 토큰이 없습니다.');
    const body = { provider, id_token: idToken };
    if (nonce) body.nonce = nonce;
    const s = this._saveSession(await this._authFetch('token?grant_type=id_token', body));
    this.status = 'synced';
    return s;
  },

  /** 웹: 카카오 등 OAuth 로그인 페이지로 이동 (돌아오면 init에서 세션 처리) */
  startOAuth(provider) {
    const { url } = this.cfg();
    const back = window.location.origin + window.location.pathname;
    window.location.href = `${url}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(back)}`;
  },

  _consumeRedirect() {
    const hash = window.location.hash || '';
    if (hash.indexOf('access_token=') < 0) return null;
    const p = new URLSearchParams(hash.slice(1));
    try {
      const s = this._saveSession({
        access_token: p.get('access_token'),
        refresh_token: p.get('refresh_token'),
        expires_at: parseInt(p.get('expires_at') || '0', 10) || null,
        expires_in: parseInt(p.get('expires_in') || '3600', 10)
      });
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
      return { session: s, provider: p.get('provider') || 'kakao' };
    } catch (e) {
      console.warn('[Cloud] 리디렉트 처리 실패', e);
      return null;
    }
  },

  /** 리디렉트 로그인 후 사용자 정보(이름·이메일) 조회 */
  async fetchUser() {
    const user = await this._api('auth/v1/user');
    const s = this.session();
    if (s && user) { s.user = { id: user.id, email: user.email || '', meta: user.user_metadata || {} }; this._raw(this.SESSION_KEY, JSON.stringify(s)); }
    return user;
  },

  async _freshToken() {
    const s = this.session();
    if (!s) throw new Error('로그인이 필요합니다.');
    if (Date.now() < s.expires_at - 60 * 1000) return s.access_token;
    try {
      return this._saveSession(await this._authFetch('token?grant_type=refresh_token', { refresh_token: s.refresh_token })).access_token;
    } catch (e) {
      if (navigator.onLine !== false) { this._raw(this.SESSION_KEY, null); this.status = 'signed_out'; }
      throw e;
    }
  },

  /** 로그인 없이도 되는 조회 (로그인했으면 내 정보까지 함께) — 럭키드로우 목록, 마켓 상품 */
  async publicApi(path, opts = {}) {
    if (this.isSignedIn()) {
      try { return await this._api(path, opts); } catch (e) { if (e.status !== 401) throw e; }
    }
    const { url, key } = this.cfg();
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    let body = opts.body;
    if (body !== undefined && typeof body !== 'string') { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    const res = await fetch(`${url}/${path}`, { method: opts.method || 'GET', headers, body });
    if (!res.ok) { const err = new Error(`서버 오류 (${res.status})`); err.status = res.status; throw err; }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  /** 인증된 API 호출 (path 예: 'rest/v1/user_data') */
  async _api(path, opts = {}) {
    const { url, key } = this.cfg();
    const token = await this._freshToken();
    const headers = Object.assign({ apikey: key, Authorization: `Bearer ${token}` }, opts.headers || {});
    let body = opts.body;
    if (body !== undefined && !(body instanceof Blob) && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const res = await fetch(`${url}/${path}`, { method: opts.method || 'GET', headers, body });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      const err = new Error(`서버 오류 (${res.status}) ${t.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    if (opts.raw) return res;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  async signOut() {
    try { if (this.isSignedIn()) await this._api('auth/v1/logout', { method: 'POST' }); } catch (e) { /* 이미 만료 등 */ }
    this._raw(this.SESSION_KEY, null);
    this.status = this.isConfigured() ? 'signed_out' : 'off';
  },

  /** 로그아웃 시 이 기기에 남은 동기화 데이터 정리 (다음 로그인 계정과 섞이지 않게) */
  clearLocalData() {
    this.withoutTracking(() => {
      this.SYNC_KEYS.forEach(k => localStorage.removeItem(k));
      [this.META_KEY, this.DIRTY_KEY, this.LAST_KEY, 'bp_points', 'bp_points_meta'].forEach(k => localStorage.removeItem(k));
    });
  },

  /* ── 동기화 ── */
  /** 서버에서 받고(pull) → 바뀐 것을 올림(push). 동시에 한 번만 실행 */
  sync(opts = {}) {
    if (!this.isConfigured() || !this.isSignedIn()) return Promise.resolve(false);
    if (this._syncing) return this._syncing;
    this.status = 'syncing';
    this._emit();
    this._syncing = (async () => {
      try {
        const applied = await this._pull(opts);
        await this.push();
        this._raw(this.LAST_KEY, String(Date.now()));
        this.status = 'synced';
        if (applied.length) this._afterRemoteApplied(applied);
        if (typeof Points !== 'undefined') Points.refresh();
        return true;
      } catch (e) {
        console.warn('[Cloud] 동기화 실패', e);
        this.status = navigator.onLine === false ? 'offline' : 'error';
        throw e;
      } finally {
        this._syncing = null;
        this._emit();
      }
    })();
    return this._syncing;
  },

  async _pull() {
    this._lastPull = Date.now();
    const rows = await this._api('rest/v1/user_data?select=key,value,updated_at') || [];
    const meta = this._meta();
    const dirty = this._dirty();
    const applied = [];
    const serverKeys = {};

    for (const row of rows) {
      if (this.SYNC_KEYS.indexOf(row.key) < 0) continue;
      const serverTs = Date.parse(row.updated_at) || 0;
      serverKeys[row.key] = serverTs;
      const localTs = meta[row.key] || 0;
      if (serverTs <= localTs) continue;

      // 서버 값이 더 최신 → 기기에 반영 (덮어쓰기 전 기존 값은 한 번 백업)
      const before = localStorage.getItem(row.key);
      if (before != null && localTs === 0 && !localStorage.getItem('bp_backup_' + row.key)) {
        try { this._raw('bp_backup_' + row.key, before); } catch (e) { /* 용량 부족 시 백업 생략 */ }
      }
      const value = await this._restoreImages(row.value, before);
      this._writeLocal(row.key, value);
      meta[row.key] = serverTs;
      const di = dirty.indexOf(row.key);
      if (di >= 0) dirty.splice(di, 1);
      applied.push(row.key);
    }

    // 서버가 비어 있으면(첫 로그인) 기기에 있던 데이터를 모두 올림
    const serverEmpty = rows.length === 0;
    this.SYNC_KEYS.forEach(k => {
      if (serverKeys[k] || dirty.indexOf(k) >= 0) return;
      if (localStorage.getItem(k) == null) return;
      if (serverEmpty || meta[k]) {
        if (!meta[k]) meta[k] = Date.now();
        dirty.push(k);
      }
    });

    this._raw(this.META_KEY, JSON.stringify(meta));
    this._raw(this.DIRTY_KEY, JSON.stringify(dirty));
    return applied;
  },

  /** 아직 못 올린 키를 서버에 업로드 */
  async push() {
    if (!this.isConfigured() || !this.isSignedIn()) return false;
    const dirty = this._dirty();
    if (!dirty.length) return true;
    const uid = this.userId();
    const meta = this._meta();
    const rows = [];
    for (const k of dirty) {
      const raw = localStorage.getItem(k);
      let value;
      if (raw == null) value = { $deleted: true };
      else {
        try { value = JSON.parse(raw); } catch (e) { value = { $raw: raw }; }
        if (value === null) value = { $raw: raw };
        value = await this._uploadImages(value, uid);
      }
      rows.push({ user_id: uid, key: k, value, updated_at: new Date(meta[k] || Date.now()).toISOString() });
    }
    await this._api('rest/v1/user_data?on_conflict=user_id,key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: rows
    });
    // 업로드하는 동안 다시 바뀐 키는 남겨둠
    const sent = rows.map(r => r.key);
    const meta2 = this._meta();
    const still = this._dirty().filter(k => sent.indexOf(k) < 0 || (meta2[k] || 0) > (meta[k] || 0));
    this._raw(this.DIRTY_KEY, JSON.stringify(still));
    if (sent.indexOf('bp_records_v1') >= 0) this._cleanupPhotos().catch(() => {});
    this._raw(this.LAST_KEY, String(Date.now()));
    this._emit();
    return true;
  },

  _writeLocal(k, value) {
    this.withoutTracking(() => {
      if (value && typeof value === 'object' && value.$deleted) localStorage.removeItem(k);
      else if (value && typeof value === 'object' && typeof value.$raw === 'string') localStorage.setItem(k, value.$raw);
      else localStorage.setItem(k, JSON.stringify(value));
    });
  },

  _afterRemoteApplied(keys) {
    try {
      if (keys.indexOf('bp_schedules_v2') >= 0 && typeof State !== 'undefined') State.loadSchedules();
      if (keys.indexOf('bp_ai_messages_v1') >= 0 && typeof AI !== 'undefined') AI.isInitialized = false;
      if ((keys.indexOf('bp_font') >= 0 || keys.indexOf('bp_size') >= 0) && typeof App !== 'undefined') App.loadPreferences();
      // 현재 화면을 새 데이터로 다시 그림 (로그인·온보딩 화면은 제외)
      const s = typeof State !== 'undefined' && State.screen;
      if (s && ['splash', 'login', 'onboarding'].indexOf(s) < 0 && typeof App !== 'undefined') App.navigate(s);
    } catch (e) { console.warn('[Cloud] 화면 갱신 실패', e); }
  },

  /* ── 사진 처리 ── */
  async _hash(str) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let h1 = 0x811c9dc5, h2 = 0;
      for (let i = 0; i < str.length; i++) { h1 = Math.imul(h1 ^ str.charCodeAt(i), 16777619); h2 = (h2 * 31 + str.charCodeAt(i)) | 0; }
      return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16) + str.length.toString(16);
    }
  },

  async _mapDeep(v, fn) {
    if (Array.isArray(v)) { const out = []; for (const x of v) out.push(await this._mapDeep(x, fn)); return out; }
    if (v && typeof v === 'object') {
      const r = await fn(v, true);
      if (r !== undefined) return r;
      const out = {};
      for (const k of Object.keys(v)) out[k] = await this._mapDeep(v[k], fn);
      return out;
    }
    const r = await fn(v, false);
    return r !== undefined ? r : v;
  },

  /** data:image/... 문자열을 저장소에 올리고 {"$img": 경로}로 바꿈 */
  async _uploadImages(value, uid) {
    const uploaded = this._json('bp_sync_uploaded', {});
    let changed = false;
    const out = await this._mapDeep(value, async (v, isObj) => {
      if (isObj || typeof v !== 'string' || v.indexOf('data:image/') !== 0) return undefined;
      const m = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(v);
      if (!m) return undefined;
      const ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
      const path = `${uid}/${await this._hash(v)}.${ext}`;
      if (!uploaded[path]) {
        const blob = this._dataUrlToBlob(v, m[1]);
        if (!blob) return undefined;   // 손상된 사진은 건너뜀 (동기화 전체가 멈추지 않게)
        await this._api(`storage/v1/object/${this.BUCKET}/${path}`, {
          method: 'POST', headers: { 'Content-Type': m[1], 'x-upsert': 'true' }, body: blob
        });
        uploaded[path] = 1;
        changed = true;
      }
      return { $img: path };
    });
    if (changed) this._raw('bp_sync_uploaded', JSON.stringify(uploaded));
    return out;
  },

  _dataUrlToBlob(dataUrl, mime) {
    try {
      const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch (e) {
      console.warn('[Cloud] 사진 데이터 변환 실패', e);
      return null;
    }
  },

  /** {"$img": 경로}를 사진 데이터로 되돌림 (기기에 같은 사진이 있으면 재사용) */
  async _restoreImages(value, localRaw) {
    const uid = this.userId();
    const local = {};
    if (localRaw && localRaw.indexOf('data:image/') >= 0) {
      const found = localRaw.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g) || [];
      for (const d of found) local[await this._hash(d)] = d;
    }
    return this._mapDeep(value, async (v, isObj) => {
      if (!isObj || typeof v.$img !== 'string' || Object.keys(v).length !== 1) return undefined;
      const path = v.$img;
      if (uid && path.indexOf(uid + '/') !== 0) return '';  // 다른 사용자 경로는 무시
      const hash = path.split('/').pop().split('.')[0];
      if (local[hash]) return local[hash];
      try {
        const res = await this._api(`storage/v1/object/authenticated/${this.BUCKET}/${path}`, { raw: true });
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('[Cloud] 사진 다운로드 실패', path, e);
        return '';
      }
    });
  },

  async _listPhotos() {
    const uid = this.userId();
    const list = await this._api(`storage/v1/object/list/${this.BUCKET}`, {
      method: 'POST', body: { prefix: uid, limit: 1000, offset: 0 }
    }) || [];
    return list.filter(f => f && f.name && f.id !== null).map(f => `${uid}/${f.name}`);
  },

  /** 기록에서 지워진 사진 파일 정리 */
  async _cleanupPhotos() {
    const raw = localStorage.getItem('bp_records_v1') || '';
    const used = {};
    for (const d of (raw.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g) || [])) used[await this._hash(d)] = 1;
    const unused = (await this._listPhotos()).filter(p => !used[p.split('/').pop().split('.')[0]]);
    if (!unused.length) return;
    await this._api(`storage/v1/object/${this.BUCKET}`, { method: 'DELETE', body: { prefixes: unused } });
    const uploaded = this._json('bp_sync_uploaded', {});
    unused.forEach(p => delete uploaded[p]);
    this._raw('bp_sync_uploaded', JSON.stringify(uploaded));
  },

  /* ── 회원 탈퇴: 서버의 사진·데이터·계정 삭제 ── */
  async deleteAccount() {
    if (!this.isConfigured() || !this.isSignedIn()) return true;
    const photos = await this._listPhotos();
    if (photos.length) await this._api(`storage/v1/object/${this.BUCKET}`, { method: 'DELETE', body: { prefixes: photos } });
    await this._api('rest/v1/rpc/delete_my_account', { method: 'POST', body: {} });
    this._raw(this.SESSION_KEY, null);
    this._raw('bp_sync_uploaded', null);
    this.status = 'signed_out';
    return true;
  },

  /* ── 상태 표시 ── */
  statusText() {
    if (!this.isConfigured()) return '';
    if (!this.isSignedIn()) return '로그인하면 데이터가 클라우드에 저장돼요';
    if (this.status === 'syncing') return '동기화 중...';
    if (this.status === 'offline') return '오프라인 · 연결되면 자동으로 동기화돼요';
    if (this.status === 'error') return '동기화 실패 · 잠시 후 다시 시도해 주세요';
    if (this.pendingCount()) return '동기화 대기 중';
    const t = this.lastSyncAt();
    if (!t) return '동기화 준비됨';
    const m = Math.floor((Date.now() - t) / 60000);
    return `동기화됨 · ${m < 1 ? '방금' : m < 60 ? m + '분 전' : Math.floor(m / 60) + '시간 전'}`;
  },

  _emit() {
    const el = document.getElementById('cloud-status-text');
    if (el) el.textContent = this.statusText();
  }
};

window.Cloud = Cloud;
