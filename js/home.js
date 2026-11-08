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

    let heroHtml;
    if (upcoming.length) {
      const s = upcoming[0];
      const idx = State.schedules.indexOf(s);
      if (!s.timeline && State.calculateTimeline) { try { State.calculateTimeline(idx); } catch (e) {} }
      const tl = s.timeline || {};
      const dateObj = new Date(s.date);
      const tg = new Date(dateObj); tg.setHours(0, 0, 0, 0);
      const diffDays = Math.round((tg - today) / 864e5);
      const cName = s.course ? s.course.name : (s.courseName || '골프장');
      const region = Register && Register.regionOf ? (s.course && (s.course.region || Register.regionOf(s.course.addr || s.course.address))) : '';
      const msg = this.heroMessage(s, tl, diffDays, dateObj);
      const btnText = diffDays <= 0 && msg.btnText ? msg.btnText : '타임라인 보기';
      const btnAction = diffDays <= 0 && msg.btnAction ? msg.btnAction : `App.viewTimeline(${idx})`;
      const startPt = s.startPoint || '집';
      const on = !s.alarmOff;
      heroHtml = `
        <div class="v2-hero-tag">${diffDays <= 0 ? '오늘 라운딩 · D-Day' : `다음 라운딩 · D-${diffDays}`}</div>
        <div class="v2-hero-title">${U.esc(cName)}</div>
        <div class="v2-hero-sub">${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${DAYS[dateObj.getDay()]})${region ? ' · ' + U.esc(region) : ''}</div>
        <div class="v2-hero-times" onclick="App.viewTimeline(${idx})">
          <div class="v2-hero-time"><span>${U.esc(String(startPt).slice(0, 4))}에서 출발</span><b>${tl.homeDepart || '--:--'}</b></div>
          <div class="v2-hero-time"><span>골프장 도착</span><b>${tl.arrival || '--:--'}</b></div>
          <div class="v2-hero-time tee"><span>티오프</span><b>${tl.teeOff || s.teeOff || '--:--'}</b></div>
        </div>
        <div class="v2-hero-alarm">
          <div><b>출발 알람 ${on ? '켜짐' : '꺼짐'}</b><small>${on ? `${tl.prepStart || '준비'} 준비 시작부터 단계마다 알려 드려요` : '켜면 준비·출발 시간에 알려 드려요'}</small></div>
          <button class="v2-switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="출발 알람" onclick="Home.toggleAlarm(${idx})"></button>
        </div>
        <button class="v2-hero-btn" onclick="${btnAction}">${btnText} ${ico.chev}</button>`;
    } else {
      heroHtml = `
        <div class="v2-hero-tag">다음 라운딩</div>
        <div class="v2-hero-title">첫 라운딩을 등록해 보세요</div>
        <div class="v2-hero-empty">골프장과 티오프만 넣으면 출발 시간과<br>단계별 알람을 자동으로 맞춰 드려요.</div>
        <button class="v2-hero-btn" onclick="App.navigate('register')">새 라운딩 등록 ${ico.chev}</button>`;
    }

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
    const start = new Date(today); start.setDate(today.getDate() - today.getDay());
    let weekHtml = '';
    for (let i = 0; i < 7; i++) weekHtml += `<span class="dn ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${DAYS[i]}</span>`;
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
      ? `<div class="v2-tile" onclick="App.navigate('community')"><i>${ico.chat}</i><span>커뮤니티</span></div>`
      : `<div class="v2-tile" onclick="App.navigate('raffle')"><i>${ico.gift}</i><span>럭키드로우</span></div>`;

    el.innerHTML = `
      <div class="v2-scroll">
        <div class="v2-home-hero">
          <div class="v2-brand">
            <div class="v2-brand-logo">B</div>
            <div class="v2-brand-name">BuddyPlanner${State.isPro ? ' <span class="glounge-brand-badge">PRO</span>' : ''}</div>
            <button class="v2-iconbtn" onclick="Home.showAlarms()" aria-label="알림">${ico.bell}</button>
            <button class="v2-iconbtn" onclick="App.openMenu()" aria-label="전체 메뉴">${ico.menu}</button>
          </div>
          ${heroHtml}
        </div>
        <div class="v2-home-body">
          <div class="v2-new-card" onclick="App.navigate('register')">
            <div class="v2-new-ico">${ico.plus}</div>
            <div style="flex:1; min-width:0;"><b>새 라운딩 등록</b><small>골프장과 티오프만 넣으면 출발 시간을 계산해 드려요</small></div>
            <span class="v2-chev">${ico.chev}</span>
          </div>
          <div class="v2-card">
            <div class="v2-week-head"><span class="v2-h2">이번 주</span><button class="v2-link" onclick="App.navigate('calendar')">전체 일정</button></div>
            <div class="v2-week">${weekHtml}</div>
          </div>
          ${scoreHtml}
          <div class="v2-tiles">
            <div class="v2-tile" onclick="Group.openList()"><i>${ico.group}</i><span>단체 등록</span></div>
            <div class="v2-tile" onclick="App.navigate('restaurant')"><i>${ico.food}</i><span>추천 맛집</span></div>
            ${third}
            <div class="v2-tile" onclick="App.navigate('market')"><i>${ico.bag}</i><span>마켓</span></div>
          </div>
          <div class="v2-point-row">
            <span class="lbl">내 포인트 <b><span data-points>${Points.balance().toLocaleString()}</span> P</b></span>
            <button class="v2-ad-btn" onclick="Profile.watchAd()">광고 보고 ${pm.ad_points}P 받기</button>
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
