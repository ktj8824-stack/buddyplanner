/* =========================================
   BuddyPlanner — 골프장 공략 카드
   - 버디 AI가 show_course_guide 를 쓰면 대화에 미니 카드 → '공략 카드 열기'로 전체 화면
   - 카드 내용은 course-guide 서버 함수가 줌 (처음 찾는 골프장만 웹 검색, 이후 모두 재사용)
   ========================================= */

const CourseGuide = {
  _mem: {},         // 이번 실행 중 받은 카드
  _loading: {},
  _busy: {},       // 대화 카드별 '받는 중' (저장하지 않음)

  key(name, sub) { return `${String(name || '').replace(/\s+/g, '')}|${String(sub || '').replace(/\s+/g, '')}`; },

  _cacheGet(k) { try { const v = JSON.parse(localStorage.getItem('bp_cg_' + k) || 'null'); return v && v.g ? v.g : null; } catch (e) { return null; } },
  _cacheSet(k, g) { try { localStorage.setItem('bp_cg_' + k, JSON.stringify({ g, t: Date.now() })); } catch (e) { } },

  /** 카드 받기 (앱에 있으면 바로, 없으면 서버) */
  async load(name, sub) {
    const k = this.key(name, sub);
    if (this._mem[k]) return this._mem[k];
    const local = this._cacheGet(k);
    if (local) { this._mem[k] = local; return local; }
    if (this._loading[k]) return this._loading[k];
    this._loading[k] = (async () => {
      const { url, key } = Cloud.cfg();
      const token = await Cloud._freshToken();
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), 170000) : null;
      try {
        const res = await fetch(`${url}/functions/v1/course-guide`, {
          method: 'POST',
          headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ course_name: name, sub_course: sub || '' }),
          signal: ctl ? ctl.signal : undefined
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.guide) throw new Error(data.message || '공략 카드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
        this._mem[k] = data.guide; this._cacheSet(k, data.guide);
        return data.guide;
      } catch (e) {
        if (e && e.name === 'AbortError') throw new Error('정보를 모으는 데 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.');
        throw e;
      } finally { if (timer) clearTimeout(timer); delete this._loading[k]; }
    })();
    return this._loading[k];
  },

  /* ── 버디 AI 대화 안 미니 카드 ── */
  chatCardHTML(a, msgId, i) {
    const g = a.guide;
    if (!g) {
      const err = a.error;
      if (!err && !this._busy[msgId + i]) setTimeout(() => this._fillChat(msgId, i), 0);
      return `
        <div class="cg-mini" id="cg-mini-${msgId}-${i}">
          <div class="cg-mini-hd"><small>⛳ 공략 카드</small><b>${U.esc(a.course_name)}${a.sub_course ? ' ' + U.esc(a.sub_course) : ''}</b></div>
          <div class="cg-mini-wait">${err ? `😥 ${U.esc(err)}<button onclick="CourseGuide.retry('${msgId}',${i})">다시 시도</button>`
            : `<span class="cg-spin"></span>골프장 정보를 모으는 중이에요<br><small>처음 찾는 골프장은 1분쯤 걸려요</small>`}</div>
        </div>`;
    }
    const s = this._sched(a);
    const tee = this._defTee(g);
    const total = g.holes.reduce((t, h) => t + (h.dist[tee] || 0), 0);
    return `
      <div class="cg-mini">
        <div class="cg-mini-hd"><small>⛳ 공략 카드${s ? ' · ' + U.esc(U.fmtDateShort(s.date)) : ''}</small><b>${U.esc(this.title(g))}</b></div>
        <div class="cg-mini-st">
          <div><b>파${g.par_total || '-'}</b>${g.holes_count}홀</div>
          <div><b>${total ? total.toLocaleString() : '-'}</b>${U.esc(tee || '')}(${g.unit})</div>
          <div><b>${g.holes.filter(h => h.par === 5).map(h => h.no).join('·') || '-'}</b>파5 홀</div>
        </div>
        <button class="cg-mini-go" onclick="CourseGuide.openFromChat('${msgId}',${i})">공략 카드 열기 ›</button>
      </div>`;
  },

  async _fillChat(msgId, i) {
    const msg = (AI.messages || []).find(m => m.id === msgId);
    const a = msg && msg.actions && msg.actions[i];
    if (!a || a.guide || this._busy[msgId + i]) return;
    this._busy[msgId + i] = true;
    try { a.guide = await this.load(a.course_name, a.sub_course); a.error = null; }
    catch (e) { a.error = (e && e.message) || '공략 카드를 만들지 못했어요.'; }
    delete this._busy[msgId + i];
    AI.saveMessages();
    const el = document.getElementById(`cg-mini-${msgId}-${i}`);
    if (el) el.outerHTML = this.chatCardHTML(a, msgId, i);
  },
  retry(msgId, i) {
    const msg = (AI.messages || []).find(m => m.id === msgId);
    const a = msg && msg.actions && msg.actions[i];
    if (!a) return;
    a.error = null;
    const el = document.getElementById(`cg-mini-${msgId}-${i}`);
    if (el) el.outerHTML = this.chatCardHTML(a, msgId, i);
  },

  _sched(a) {
    if (!a) return null;
    if (a.aid) { const s = State.schedules.find(x => x.aid === a.aid); if (s) return s; }
    const nm = String(a.course_name || '').replace(/\s+|cc$|CC$/g, '');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return State.schedules.filter(x => x.course && String(x.course.name || '').replace(/\s+/g, '').indexOf(nm) >= 0 && new Date(x.date) >= now)
      .sort((x, y) => new Date(x.date) - new Date(y.date))[0] || null;
  },

  title(g) { return `${g.official_name || ''}${g.sub_course ? ' ' + g.sub_course : ''}`.trim(); },

  _defTee(g) {
    const tees = g.tees || [];
    let saved = null; try { saved = localStorage.getItem('bp_cg_tee'); } catch (e) { }
    if (saved && tees.includes(saved)) return saved;
    return tees.find(t => /화이트|white/i.test(t)) || tees[Math.floor(tees.length / 2)] || tees[0] || '';
  },

  /* ── 전체 화면 ── */
  openFromChat(msgId, i) {
    const msg = (AI.messages || []).find(m => m.id === msgId);
    const a = msg && msg.actions && msg.actions[i];
    if (a && a.guide) this.open(a.guide, this._sched(a));
  },

  open(g, sched) {
    this.g = g; this.s = sched || null; this.tee = this._defTee(g); this.hole = 0; this.view = 'all'; this.wx = null;
    let el = document.getElementById('cg-screen');
    if (!el) { el = document.createElement('div'); el.id = 'cg-screen'; document.body.appendChild(el); }
    el.className = 'cg-screen open';
    this.render();
    if (this.s && this.s.course && this.s.course.lat && typeof WeatherAPI !== 'undefined') {
      WeatherAPI.fetchRoundForecast(this.s.course.lat, this.s.course.lng, this.s.date, this.s.teeOff)
        .then(w => { if (w && w.hours && this.g === g) { this.wx = w; if (this.view === 'all') this.render(); } }).catch(() => { });
    }
    if (!this._pop) { this._pop = () => this.close(true); }
    try { history.pushState({ cg: 1 }, ''); window.addEventListener('popstate', this._pop, { once: true }); } catch (e) { }
  },

  close(fromBack) {
    const el = document.getElementById('cg-screen');
    if (el) el.remove();
    if (!fromBack) { try { if (history.state && history.state.cg) history.back(); } catch (e) { } }
  },

  setTee(t) { this.tee = t; try { localStorage.setItem('bp_cg_tee', t); } catch (e) { } this.render(); },
  showHole(n) { this.view = 'hole'; this.hole = Math.max(0, Math.min(this.g.holes.length - 1, n)); this.render(); },
  showAll() { this.view = 'all'; this.render(); },

  _strip(active) {
    return `<div class="cg-strip" style="grid-template-columns:repeat(${Math.min(9, this.g.holes.length)},1fr)">${this.g.holes.map((h, i) =>
      `<button class="${h.par === 5 ? 'p5' : h.par === 3 ? 'p3' : ''} ${i === active ? 'on' : ''}" onclick="CourseGuide.showHole(${i})">${h.no}<b>${h.par || '-'}</b>${this.view === 'all' && h.dist[this.tee] ? h.dist[this.tee] : ''}</button>`).join('')}</div>`;
  },

  render() {
    const el = document.getElementById('cg-screen'); if (!el) return;
    const g = this.g, s = this.s;
    const top = `<div class="cg-top"><button class="cg-back" onclick="${this.view === 'hole' ? 'CourseGuide.showAll()' : 'CourseGuide.close()'}">‹</button><b>${this.view === 'hole' ? U.esc(this.title(g)) : '공략 카드'}</b></div>`;
    if (this.view === 'hole') { el.innerHTML = top + this._holeHTML(); this._swipe(el.querySelector('.cg-hcard')); return; }
    const wx = this.wx;
    const temps = wx ? wx.hours.map(h => h.temp) : [];
    const chips = [`파${g.par_total || '-'}`, `${g.holes_count}홀`];
    if (wx) chips.push(`${wx.hours[0].icon} ${Math.min(...temps)}~${Math.max(...temps)}°C`);
    const tees = (g.tees || []).map(t => `<button class="${t === this.tee ? 'on' : ''}" onclick="CourseGuide.setTee(${U.jsq(t)})">${U.esc(t)}</button>`).join('');
    const total = g.holes.reduce((t, h) => t + (h.dist[this.tee] || 0), 0);
    el.innerHTML = top + `
      <div class="cg-body">
        <div class="cg-hero">
          <small>${s ? `${U.esc(U.fmtDateShort(s.date))} 라운딩 · ` : ''}${U.esc(g.region || '')}</small>
          <h1>${U.esc(this.title(g))}</h1>
          <div class="cg-chips">${chips.map(c => `<span>${U.esc(c)}</span>`).join('')}</div>
          ${g.summary ? `<div class="cg-sum">💡 ${U.esc(g.summary)}</div>` : ''}
        </div>
        ${tees ? `<div class="cg-tee">${tees}</div>` : ''}
        ${this._strip(-1)}
        <div class="cg-total">${total ? `${U.esc(this.tee)} 티 합계 <b>${total.toLocaleString()}${g.unit === 'm' ? 'm' : '야드'}</b> · ` : ''}홀을 누르면 홀별 공략이 나와요</div>
        ${g.key_points && g.key_points.length ? `<div class="cg-sec"><b class="t">🏌️ 이 코스 핵심 ${g.key_points.length}가지</b>${g.key_points.map((p, i) => `<div>${'①②③'[i] || '·'} ${U.esc(p)}</div>`).join('')}</div>` : ''}
        ${wx && wx.advice ? `<div class="cg-sec"><b class="t">✅ 그날 날씨 · 챙길 것</b>${wx.hours.map(h => `${h.time} ${h.icon} ${h.temp}° 비 ${h.pop}% 바람 ${h.wind}m/s`).join('<br>')}<div style="margin-top:4px">${U.esc(typeof wx.advice === 'string' ? wx.advice : (wx.advice.text || ''))}</div></div>` : ''}
        ${g.notes ? `<div class="cg-sec cg-note">⚠️ ${U.esc(g.notes)}</div>` : ''}
        <div class="cg-sec cg-src">출처: ${(g.sources || []).map(x => `<a onclick="CourseGuide.openUrl(${U.jsq(x.url)})">${U.esc(x.title)}</a>`).join(' · ') || '없음'}<br>마지막 확인 ${U.esc(g.checked_at || '')} · 홀별 팁 중 '일반 공략'은 거리·파 구성으로 정리한 운영 팁이에요</div>
      </div>`;
  },

  _holeHTML() {
    const g = this.g, h = g.holes[this.hole];
    const dist = Object.entries(h.dist || {});
    const main = h.dist[this.tee];
    const other = dist.filter(([t]) => t !== this.tee).slice(-1)[0];
    let memo = ''; try { memo = localStorage.getItem(`bp_cg_memo_${this.key(g.official_name, g.sub_course)}_${h.no}`) || ''; } catch (e) { }
    const tags = [...(h.tags || []).map(t => `<span class="cg-tag t1">${U.esc(t)}</span>`), `<span class="cg-tag t2">${h.tip_basis === 'source' ? '자료 기반' : '일반 공략'}</span>`].join('');
    const prev = this.hole > 0 ? g.holes[this.hole - 1].no : null, next = this.hole < g.holes.length - 1 ? g.holes[this.hole + 1].no : null;
    return `
      <div class="cg-body cg-hbody">
        ${this._strip(this.hole)}
        <div class="cg-hcard">
          <div class="cg-hh"><span class="cg-no">${h.no}</span><b>파${h.par || '-'}</b><small>${main ? `${U.esc(this.tee)} ${main}` : ''}${other ? ` · ${U.esc(other[0])} ${other[1]}` : ''}${main || other ? ` ${g.unit}` : ''}</small></div>
          ${h.page_url ? `<button class="cg-photo" onclick="CourseGuide.openUrl(${U.jsq(h.page_url)})">📷 공식 홈페이지 홀 사진 보기 ›</button>` : ''}
          <div class="cg-tags">${tags}</div>
          ${h.tip ? `<p class="cg-tip">${U.esc(h.tip)}</p>` : '<p class="cg-tip" style="color:#888">이 홀은 아직 공략 정보가 없어요</p>'}
          ${h.hazard ? `<p class="cg-tip">⚠️ ${U.esc(h.hazard)}</p>` : ''}
          <div class="cg-dots">${g.holes.map((_, i) => `<i class="${i === this.hole ? 'on' : ''}"></i>`).join('')}</div>
        </div>
        <div class="cg-sec"><b class="t">📝 내 메모</b><textarea rows="2" placeholder="라운딩 후 이 홀 메모를 남기면 다음에 같이 보여 드려요" oninput="CourseGuide.saveMemo(${h.no}, this.value)">${U.esc(memo)}</textarea></div>
      </div>
      <div class="cg-nav">
        <button class="soft" ${prev == null ? 'disabled' : ''} onclick="CourseGuide.showHole(${this.hole - 1})">${prev != null ? `‹ ${prev}번` : ''}</button>
        <button class="go" ${next == null ? 'onclick="CourseGuide.showAll()"' : `onclick="CourseGuide.showHole(${this.hole + 1})"`}>${next != null ? `${next}번 ›` : '코스 전체'}</button>
      </div>`;
  },

  saveMemo(no, v) { try { localStorage.setItem(`bp_cg_memo_${this.key(this.g.official_name, this.g.sub_course)}_${no}`, String(v).slice(0, 500)); } catch (e) { } },

  _swipe(card) {
    if (!card) return;
    let x0 = null;
    card.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', e => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) this.showHole(this.hole + (dx < 0 ? 1 : -1));
    });
  },

  openUrl(u) {
    if (typeof AIAgent !== 'undefined' && AIAgent.openUrl) return AIAgent.openUrl(u);
    window.open(u, '_blank');
  }
};
