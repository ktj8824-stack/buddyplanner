/* ========================================================
   BuddyPlanner — Golfzon G Lounge Style Premium Home JS
   ======================================================== */

const Home = {
  /** 홈 '타임라인' 바로가기: 가장 가까운 예정 라운딩의 타임라인 (없으면 캘린더) */
  openNextTimeline() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let best = -1, bestT = Infinity;
    (State.schedules || []).forEach((s, i) => {
      const t = new Date(s.date).getTime();
      if (t >= today.getTime() && t < bestT) { bestT = t; best = i; }
    });
    if (best >= 0) App.viewTimeline(best); else App.navigate('calendar');
  },
  init() {
    this.render();
  },

  /** 날짜·시각 기준으로 다음에 할 일을 알려 주는 큰 문구 */
  heroMessage(s, tl, diffDays, dateObj, now = new Date()) {
    const at = (hm) => {
      const [h, m] = String(hm || '').split(':').map(Number);
      if (!Number.isFinite(h)) return null;
      const d = new Date(dateObj); d.setHours(h, m || 0, 0, 0);
      if (State.tlPrevDay(s, hm)) d.setDate(d.getDate() - 1); // 새벽 티오프: 준비·출발이 전날 밤
      return d;
    };
    const left = (d) => {
      const min = Math.max(0, Math.round((d - now) / 60000));
      return min >= 60 ? `${Math.floor(min / 60)}시간 ${min % 60 ? (min % 60) + '분' : ''}`.trim() : `${min}분`;
    };
    const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
    const prep = tl.prepStart, dep = tl.homeDepart, tee = tl.teeOff || s.teeOff;

    if (diffDays <= 0) {
      const tPrep = at(prep), tDep = at(dep), tTee = at(tee);
      const rl = (typeof ROUND_LENGTHS !== 'undefined' && (ROUND_LENGTHS[s.roundLength] || ROUND_LENGTHS['18'])) || { min: 300 };
      const tEnd = tTee ? new Date(tTee.getTime() + rl.min * 60000) : null;
      if (tPrep && now < tPrep) return { heading: `오늘 라운딩!<br>${prep} 준비 시작`, btnText: '출발 타임라인 확인' };
      if (tDep && now < tDep) return { heading: `${tDep - now < 3600000 ? `출발까지 ${left(tDep)}` : `${dep} 출발`},<br>준비물 챙기셨나요?`, btnText: '출발 타임라인 확인' };
      if (tTee && now < tTee) return { heading: `${tTee - now < 3600000 ? `티오프까지 ${left(tTee)}` : `티오프 ${tee}`},<br>안전 운전하세요.`, btnText: '타임라인 보기' };
      if (tEnd && now < tEnd) return { heading: `즐거운 라운딩<br>되세요! ⛳`, btnText: '타임라인 보기' };
      let rec = null;
      try {
        const all = JSON.parse(localStorage.getItem('bp_records_v1') || '{}');
        const p = n => String(n).padStart(2, '0');
        const ymd = `${dateObj.getFullYear()}-${p(dateObj.getMonth() + 1)}-${p(dateObj.getDate())}`;
        const k = Object.keys(all).find(x => x.split('#')[0] === ymd);
        rec = k ? all[k] : null;
      } catch (e) {}
      if (rec) return { heading: `${typeof rec.score === 'number' ? '오늘 ' + rec.score + '타,' : '오늘 라운딩,'}<br>수고하셨어요!`, btnText: '기록 보기', btnAction: "App.navigate('record')" };
      return { heading: `오늘 라운딩<br>어떠셨어요?`, btnText: '스코어 기록하기', btnAction: "Home.openScoreForm()" };
    }
    if (diffDays === 1) return { heading: `내일 라운딩,<br>오늘은 일찍 쉬세요.` };
    if (diffDays <= 6) return { heading: `${DAYS[dateObj.getDay()]}요일 라운딩,<br>준비물 미리 챙겨요.` };
    return { heading: `라운딩까지 ${diffDays}일,<br>동선은 준비 완료!` };
  },

  /** 기록 화면을 열고 바로 스코어 입력창 (빈 카드·라운딩 후 안내에서 사용) */
  openScoreForm() {
    App.navigate('record');
    setTimeout(() => { if (typeof Record !== 'undefined' && Record.showRecordForm) Record.showRecordForm(); }, 200);
  },

  /** 홈 출발 알람 스위치: 타임라인의 알람 켜기/끄기와 같은 동작 */
  toggleAlarm(idx) {
    const s = State.schedules[idx];
    if (!s) return;
    Timeline.schedIdx = idx;
    if (s.alarmOff) Timeline.alarmOn(); else Timeline.alarmOffFor(idx);
    this.render();
  },

  /** 🔔 알림: 다가오는 라운딩의 알람 시각 */
  showAlarms() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const list = (State.schedules || []).map((s, i) => ({ s, i })).filter(x => new Date(x.s.date) >= today)
      .sort((a, b) => new Date(a.s.date) - new Date(b.s.date)).slice(0, 5);
    const body = list.length ? list.map(({ s, i }) => {
      const tl = s.timeline || {};
      return `<button class="v2-li" onclick="App.closeModal(); App.viewTimeline(${i})">
        <span class="k"><b style="font-weight:800;">${U.esc(s.course ? s.course.name : '골프장')}</b>
        <small>${U.fmtDateShort(s.date)} · ${s.alarmOff ? '알람 꺼짐' : `준비 ${tl.prepStart || '--:--'} · 출발 ${tl.homeDepart || '--:--'}`}</small></span>
        <svg class="v2-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></button>`;
    }).join('') : `<div class="v2-cal-empty">예정된 알람이 없어요.<br>라운딩을 등록하면 단계마다 알려 드려요.</div>`;
    App.showModal('알림', `<div class="v2-list" style="border:none;">${body}</div>`);
  },

  render() {
    const el = U.$('#screen-home');
    if (!el) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
    const ico = {
      chev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
      plus: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
      flag: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4"/><path d="M6 4h10l-2.5 4L16 12H6"/></svg>',
      bell: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
      menu: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
      group: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9" r="2.6"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><path d="M15 14.6c2.4-.3 4.6 1.1 5.2 4"/></svg>',
      food: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M8 12v9"/><path d="M17 21V3c-2 1.5-3 4-3 7 0 1.7 1 2.7 3 3"/></svg>',
      chat: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5z"/></svg>',
      gift: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0"/></svg>',
      bag: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 14H7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>'
    };

    // 1. 다가오는 라운딩
    const upcoming = (State.schedules || []).filter(s => new Date(s.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 상단 히어로: 예전 G라운지 스타일 (문구 + 미니 타임라인 + 골퍼 그림)
    const arrow = '<div class="mini-tl-arrow"><svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>';
    let subTag = '스마트 라운딩 플래너', mainHeading = '첫 라운딩을<br>등록해 보세요.', btnText = '새 일정 등록하기', btnAction = "App.navigate('register')";
    let dep = '--:--', arr = '--:--', tee = '--:--';
    if (upcoming.length) {
      const s = upcoming[0];
      const idx = State.schedules.indexOf(s);
      if (!s.timeline && State.calculateTimeline) { try { State.calculateTimeline(idx); } catch (e) {} }
      const tl = s.timeline || {};
      const dateObj = new Date(s.date);
      const tg = new Date(dateObj); tg.setHours(0, 0, 0, 0);
      const diffDays = Math.round((tg - today) / 864e5);
      const cName = s.course ? s.course.name : (s.courseName || '골프장');
      const msg = this.heroMessage(s, tl, diffDays, dateObj);
      subTag = `${U.esc(cName)} · ${diffDays <= 0 ? 'D-Day' : 'D-' + diffDays}`;
      mainHeading = msg.heading;
      btnText = msg.btnText || '타임라인 보기';
      btnAction = msg.btnAction || `App.viewTimeline(${idx})`;
      dep = tl.homeDepart || '--:--'; arr = tl.arrival || '--:--'; tee = tl.teeOff || s.teeOff || '--:--';
    }
    const heroHtml = `
      <div class="home-glounge-wrapper">
        <div class="home-glounge-hero">
          <div class="glounge-hero-text">
            <div class="hero-sub-tag">${subTag}</div>
            <div class="hero-main-title">${mainHeading}</div>
            ${upcoming.length ? `
            <div class="hero-inline-timeline" onclick="${btnAction}">
              <div class="mini-tl-node"><span class="mini-tl-tag tag-depart">출발</span><span class="mini-tl-val">${dep}</span></div>
              ${arrow}
              <div class="mini-tl-node"><span class="mini-tl-tag tag-arrival">골프장</span><span class="mini-tl-val">${arr}</span></div>
              ${arrow}
              <div class="mini-tl-node highlight"><span class="mini-tl-tag tag-teeoff">티오프</span><span class="mini-tl-val">${tee}</span></div>
            </div>` : `<div class="hero-empty-hint">골프장·티오프만 넣으면<br>출발 시간이 자동 계산돼요</div>`}
            <button class="glounge-pill-btn" onclick="${btnAction}">${btnText}
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
          <div class="glounge-hero-figure"><img src="img/glounge_hero_golfer.png" alt="" /></div>
        </div>
      </div>`;

    // 2. 스코어 기록 (18홀만 통계)
    let rec = null, best = null, yearly = 0, total = 0;
    try {
      const records = JSON.parse(localStorage.getItem('bp_records_v1') || '{}');
      const dOf = k => (typeof Record !== 'undefined' ? Record.dateOf(k) : String(k).split('#')[0]);
      const isNine = r => (typeof Record !== 'undefined' ? Record.isNine(r) : false);
      const keys = Object.keys(records).filter(k => records[k]).sort((a, b) => dOf(b).localeCompare(dOf(a)) || b.localeCompare(a));
      total = keys.length;
      keys.forEach(k => {
        const r = records[k];
        if (dOf(k).startsWith(String(currentYear))) yearly++;
        if (typeof r.score === 'number' && !isNine(r)) {
          if (!rec) rec = r;
          if (!best || r.score < best.score) best = r;
        }
      });
    } catch (e) { console.warn('Record data parse warning:', e); }

    const scoreHtml = rec ? `
      <div class="v2-score-card" onclick="App.navigate('record')">
        <div class="v2-score-ico">${ico.flag}</div>
        <div class="t"><b>최근 ${rec.score}타 · 베스트 ${best.score}타</b><small>올해 ${yearly}라운드${rec.course ? ' · ' + U.esc(rec.course) : ''}</small></div>
        <button class="v2-score-btn" onclick="event.stopPropagation(); Home.openScoreForm()">기록</button>
      </div>` : `
      <div class="v2-score-card" onclick="Home.openScoreForm()">
        <div class="v2-score-ico">${ico.flag}</div>
        <div class="t"><b>${total ? '스코어를 기록해 보세요' : '첫 스코어를 기록해 보세요'}</b><small>최근 스코어, 라이프 베스트, 올해 라운드가 여기에 쌓여요</small></div>
        <button class="v2-score-btn" onclick="event.stopPropagation(); Home.openScoreForm()">기록</button>
      </div>`;

    // 3. 이번 주
    // 오늘부터 7일 (예전엔 일~토 고정이라 토요일엔 지난 날만 보이고 내일 라운딩이 안 보였음)
    const start = new Date(today);
    let weekHtml = '';
    for (let i = 0; i < 7; i++) { const w = (today.getDay() + i) % 7; weekHtml += `<span class="dn ${w === 0 ? 'sun' : w === 6 ? 'sat' : ''}">${DAYS[w]}</span>`; }
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      weekHtml += `<span class="dd ${d.getTime() === today.getTime() ? 'today' : ''}" onclick="Home.openDay(${d.getFullYear()},${d.getMonth()},${d.getDate()})">${d.getDate()}</span>`;
    }
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      weekHtml += `<span class="dot">${State.hasScheduleOnDate(d.getFullYear(), d.getMonth(), d.getDate()) ? '<i></i>' : ''}</span>`;
    }

    const pm = Points.meta();
    const third = App.COMMUNITY_OPEN
      ? `<div class="v2-tile" onclick="App.navigate('community')"><i class="img" style="background:#faf5ff"><img src="img/icons/community.png?v=1" alt=""></i><span>커뮤니티</span></div>`
      : '';

    el.innerHTML = `
      <div class="screen-scroll dash-scroll bg-light">
        ${heroHtml}
        <div class="home-glounge-sheet v2-home-sheet">
        <div class="v2-home-body">
          <div class="v2-new-pair">
            <div class="v2-new-card" onclick="App.navigate('register')">
              <div class="v2-new-ico img"><img src="img/icons/register.png?v=1" alt=""></div>
              <div class="v2-new-txt"><b>새 라운딩 등록</b><small>출발시간 자동계산</small></div>
            </div>
            <div class="v2-new-card" onclick="Group.openList()">
              <div class="v2-new-ico img" style="background:#fef9c3"><img src="img/icons/group.png?v=1" alt=""></div>
              <div class="v2-new-txt"><b>단체 등록<i class="pro-tag inline">PRO</i></b><small>링크로 한 번에 공유</small></div>
            </div>
          </div>
          <div class="v2-card">
            <div class="v2-week-head"><span class="v2-h2">이번 주</span><button class="v2-link" onclick="App.navigate('calendar')">전체 일정</button></div>
            <div class="v2-week">${weekHtml}</div>
          </div>
          ${typeof AutoNav !== 'undefined' && AutoNav.promoHtml ? AutoNav.promoHtml() : ''}
          ${scoreHtml}
          <div class="v2-tiles">
            <div class="v2-tile" onclick="App.navigate('raffle')"><i class="img" style="background:#fdf2f8"><img src="img/icons/raffle.png?v=1" alt=""></i><span>럭키드로우</span></div>
            <div class="v2-tile" onclick="App.navigate('restaurant')"><i class="img" style="background:#fff7ed"><img src="img/icons/restaurant.png?v=1" alt=""></i><span>추천맛집</span></div>
            ${third}
            <div class="v2-tile" onclick="App.navigate('market')"><i class="img" style="background:#ecfeff"><img src="img/icons/market.png?v=1" alt=""></i><span>마켓</span></div>
          </div>
          <div class="v2-point-row">
            <span class="lbl">내 포인트 <b><span data-points>${Points.balance().toLocaleString()}</span> P</b></span>
            <button class="v2-ad-btn" onclick="Profile.watchAd()">광고 보고 ${pm.ad_points}P 받기</button>
          </div>
          </div>
        </div>
      </div>
    `;
  },

  /** 이번 주 날짜를 누르면 그 날짜의 일정 화면 */
  openDay(y, m, d) {
    State.calYear = y; State.calMonth = m;
    Calendar._pendingSel = { y, m, d };
    App.navigate('calendar');
  }
};
