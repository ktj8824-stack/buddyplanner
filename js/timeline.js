/* =========================================
   BuddyPlanner v2 — Timeline Screen
   Multi-step: Home → Restaurant → Golf
   ========================================= */

const Timeline = {
  schedIdx: 0,
  audioCtx: null,
  oscillator: null,
  alarmInterval: null,
  bannerInterval: null,

  init(idx) {
    this.schedIdx = idx !== undefined ? idx : State.currentScheduleIdx;
    this.render();
  },

  render() {
    const el = U.$('#screen-timeline');
    try {
      const s = State.schedules[this.schedIdx];
      if (!s) { el.innerHTML = '<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-500);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div><h2 class="empty-title">일정이 없습니다</h2></div>'; return; }

      let tl = s.timeline;
      // 공유 링크 등으로 인해 timeline이 없는 경우 강제 재계산
      if (!tl) {
        if (typeof State !== 'undefined' && State.calculateTimeline) {
          try { State.calculateTimeline(this.schedIdx); } catch(e) { console.error('Timeline calc error', e); }
          tl = s.timeline;
        }
        if (!tl) {
          el.innerHTML = '<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-500);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div><h2 class="empty-title">타임라인 정보가 부족합니다</h2><p class="empty-desc">필수 정보(시간/장소 등)가 누락되어 타임라인을 계산할 수 없습니다.</p></div>';
          return;
        }
      }

      // 안전하게 객체 접근 보장 (Undefined 방어)
      if (!s.course) s.course = { name: '골프장', lat: 0, lng: 0, region: '' };
      
      const dday = U.dday(s.date);
      const dateStr = U.fmtDateShort(s.date);

    el.innerHTML = this.renderV2(s, tl);
      this.markSteps();
      this.startBannerUpdater();
    } catch (e) {
      console.error('Timeline render crash', e);
      el.innerHTML = `<div class="empty">
        <div class="empty-icon">❌</div>
        <h2 class="empty-title">화면을 불러오지 못했습니다.</h2>
        <p class="empty-desc" style="color:var(--red-400); font-size:12px; margin-top:10px;">${U.esc(e.toString())}</p>
        <button class="btn" style="margin-top:20px;" onclick="App.navigate('calendar')">돌아가기</button>
      </div>`;
    }
  },

  /* ── 2026.11 개편 화면 ── */
  _ico: {
    back: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    pen: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    home: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M4 11 12 4l8 7v9H4z"/></svg>',
    office: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>',
    car: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M5 16V11l2-5h10l2 5v5z"/><path d="M5 16v2M19 16v2"/><circle cx="8.5" cy="13" r=".6" fill="currentColor"/><circle cx="15.5" cy="13" r=".6" fill="currentColor"/></svg>',
    meal: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 3v7a2 2 0 0 0 4 0V3M8 12v9M17 21V3c-2 1.5-3 4-3 7 0 1.7 1 2.7 3 3"/></svg>',
    people: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><circle cx="17" cy="9" r="2.4"/></svg>',
    flag: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4"/><path d="M6 4h10l-2.5 4L16 12H6"/></svg>'
  },

  /** 동선 단계 목록 (화면·지금 할 일 카드·길찾기에서 같이 씀) */
  buildSteps(s, tl) {
    const I = this._ico;
    const startPt = s.startPoint || '집';
    const startIco = /회사|사무실/.test(startPt) ? I.office : /집|자택/.test(startPt) ? I.home : I.pin;
    const home = { name: s.startAddress || startPt, lat: s.startLat || 0, lng: s.startLng || 0 };
    const startFrom = { name: startPt, lat: s.startLat || 0, lng: s.startLng || 0 };
    // 출발지 이름·주소 (집·회사로만 쓰면 어디서 나가는지 몰라서 같이 보여 줌)
    const startAddr = String(s.startAddress || '').trim();
    const place = startAddr && startAddr !== startPt ? startAddr : '';
    const course = { name: s.course.name, lat: s.course.lat, lng: s.course.lng };
    const mp = s.meetingPointObj || {};
    const meet = tl.hasMeetingPoint ? { name: tl.meetingPointName || mp.name || '집결지', lat: mp.lat || 0, lng: mp.lng || 0 } : null;
    const rest = tl.hasMeal && s.mealRestaurant ? { name: s.mealRestaurant.name, lat: s.mealRestaurant.lat, lng: s.mealRestaurant.lng } : null;
    const post = tl.hasPostMeal && tl.postMealRestaurant ? { name: tl.postMealRestaurant.name, lat: tl.postMealRestaurant.lat, lng: tl.postMealRestaurant.lng } : null;
    const next1 = meet || rest || course;
    const mealWord = (t) => { const h = parseInt(String(t || '').split(':')[0], 10); return h < 10 || h >= 20 ? '아침' : h < 15 ? '점심' : '식사'; };
    const roundOver = this.isRoundOver(s);
    const steps = [];
    steps.push({ key: 'prep', time: tl.prepStart, ico: I.home, title: '준비 시작', sub: '보스턴백, 거리측정기, 골프공을 챙기세요' });
    steps.push({ key: 'depart', time: tl.homeDepart, ico: startIco, title: `${startPt}에서 출발`, depart: true, place,
      sub: s.routeEstimated ? `${next1.name}까지 약 ${tl.homeTravelDur}분 (거리로 어림잡음)` : `${next1.name}까지 약 ${tl.homeTravelDur}분`,
      nav: { to: next1, from: startFrom }, tip: '보스턴백, 거리측정기, 골프공 챙기셨나요?' });
    if (meet) {
      steps.push({ key: 'meet', time: tl.meetArrival, ico: I.people, title: '집결지 도착 · 동반자 탑승', sub: `${meet.name} · 여유 약 10분` });
      const nx = rest || course;
      steps.push({ key: 'meetDepart', time: tl.meetDepart, ico: I.car, title: `${U.josa(nx.name, '으로/로')} 출발`, depart: true, sub: `${nx.name}까지 약 ${tl.meetTravelDur}분`, nav: { to: nx, from: meet } });
    }
    if (rest) {
      const rv = ReviewStore.getReviews(tl.restaurantName);
      steps.push({ key: 'meal', time: tl.mealStart, ico: I.meal, meal: true, title: `${tl.restaurantName} ${mealWord(tl.mealStart)}`,
        sub: `식사 약 ${tl.mealDuration}분 · ${roundOver ? '식당을 평가해 주세요' : '평가는 식사 후에 할 수 있어요'}`,
        extra: (rv.count > 0 ? ReviewStore.renderStars(rv.avgRating, rv.count) : '') + (roundOver ? `<button class="v2-step-act" style="padding-left:0" onclick="ReviewStore.openRatingModal(${U.jsq(tl.restaurantName)}, ${U.jsq(s.course.name)})">식당 평가하기</button>` : '') });
      steps.push({ key: 'restDepart', time: tl.restDepart, ico: I.car, title: '골프장으로 출발', depart: true, sub: `${s.course.name}까지 약 ${tl.restTravelDur}분`, nav: { to: course, from: rest } });
    }
    steps.push({ key: 'arrival', time: tl.arrival, ico: I.pin, title: '클럽하우스 도착', inlineSub: `${tl.hasMeal ? '환복' : '조식·환복'} · 여유 ${tl.mannerTime}분` });
    steps.push({ key: 'tee', time: tl.teeOff, tee: true, title: `티오프 · ${(ROUND_LENGTHS[s.roundLength] || ROUND_LENGTHS['18']).label}` });
    // 라운딩 끝나고: 종료 → 샤워·환복 → (로비 약속) → 뒤풀이 출발·도착
    if (tl.roundEnd) {
      const sh = tl.showerMin != null ? tl.showerMin : 30;
      steps.push({ key: 'roundEnd', time: tl.roundEnd, ico: I.pin, title: '라운딩 종료',
        inlineSub: sh ? `샤워·환복 ${sh}분${tl.afterMode === 'asap' ? ` · ${tl.showerEnd} 준비 끝` : ''}` : '샤워 없이 바로 출발' });
    }
    if (tl.afterMode === 'lobby' && tl.meetTime) {
      steps.push({ key: 'lobby', time: tl.meetTime, ico: I.pin, title: '로비에서 만나기',
        inlineSub: tl.showerShort != null ? `⚠️ 샤워·환복 시간이 ${tl.showerShort}분뿐이에요` : '약속 시간' });
    }
    if (post) {
      const rv = ReviewStore.getReviews(post.name);
      const cat = tl.postMealRestaurant.category || (s.postMealRestaurant && s.postMealRestaurant.category) || '';
      if (tl.afterMode !== 'lobby') {
        steps.push({ key: 'postDepart', time: tl.leaveCourse, ico: I.car, title: '뒤풀이 식당으로 출발', depart: true,
          sub: `${post.name}까지 약 ${tl.postTravelDur || 20}분${tl.afterMode === 'place' && tl.showerShort != null ? ` · ⚠️ 샤워·환복 시간이 ${tl.showerShort}분뿐이에요` : ''}`,
          nav: { to: post, from: course } });
      }
      steps.push({ key: 'post', time: tl.postMealStart, ico: I.meal, meal: true, title: `뒤풀이 · ${post.name}`, depart: tl.afterMode === 'lobby',
        sub: `${tl.afterMode === 'place' ? '약속 시간 · ' : ''}${cat ? String(cat).split('>').pop().trim() + ' · ' : ''}약 2시간`, nav: { to: post, from: course },
        extra: (rv.count > 0 ? ReviewStore.renderStars(rv.avgRating, rv.count) : '') + (roundOver ? `<button class="v2-step-act" style="padding-left:0" onclick="ReviewStore.openRatingModal(${U.jsq(post.name)}, ${U.jsq(s.course.name)})">식당 평가하기</button>` : '') });
    }
    steps.push({ key: 'return', time: tl.returnStart, ico: startIco, title: `${U.josa(startPt, '으로/로')} 귀가`, depart: true, place,
      sub: `약 ${tl.returnTravelDur}분 · ${tl.returnEnd} 도착 예상`, nav: { to: home, from: post || course } });
    return steps.filter(x => x.time);
  },

  renderV2(s, tl) {
    const I = this._ico;
    const idx = this.schedIdx;
    const steps = this.buildSteps(s, tl);
    this._steps = steps;
    const d = new Date(s.date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    const diff = Math.round((dd - today) / 864e5);
    const region = s.course.region || (s.course.addr ? Register.regionOf(s.course.addr) : '');
    const on = !s.alarmOff;
    const teeI = steps.findIndex(x => x.tee);
    const prevDay = (t, i) => (i < teeI && State.tlPrevDay(s, t)) ? '<small>전날</small>' : '';

    const stepHtml = steps.map((st, i) => {
      if (st.tee) return `<div class="v2-tee v2-tlitem" data-i="${i}"><div class="v2-tee-ico">${I.flag}</div><div><b>${st.time}</b><span>${U.esc(st.title)}</span></div></div>`;
      return `<div class="v2-step v2-tlitem${st.meal ? ' meal' : ''}" data-i="${i}">
        <div class="v2-step-row">
          <span class="v2-step-ico${st.meal ? ' meal' : ''}">${st.ico}</span>
          <span class="v2-step-time">${st.time}${prevDay(st.time, i)}</span>
          <span class="v2-step-title">${U.esc(st.title)}${st.place ? `<small class="v2-step-place">📍 ${U.esc(st.place)}</small>` : ''}${st.inlineSub ? `<small style="display:block; font-size:14px; color:var(--v2-sub); font-weight:500; margin-top:2px;">${U.esc(st.inlineSub)}</small>` : ''}</span>
          ${st.nav ? `<button class="v2-step-act" onclick="Timeline.navStep(${i})">길찾기</button>` : ''}
          <span class="v2-step-now" style="display:none">지금</span>
        </div>
        ${st.sub ? `<div class="v2-step-sub">${U.esc(st.sub)}</div>` : ''}
        ${st.extra ? `<div class="v2-step-extra">${st.extra}</div>` : ''}
      </div>`;
    }).join('');

    return `
      <div class="v2-pagehead center">
        <button class="v2-iconbtn" onclick="App.navigate('calendar')" aria-label="뒤로가기">${I.back}</button>
        <h1>스마트 타임라인</h1>
        <button class="v2-editbtn" onclick="Register.edit(${idx})" aria-label="일정 수정">${I.pen}<span>수정</span></button>
      </div>
      <div class="v2-scroll">
        <div class="v2-body">
          <div class="v2-card">
            <div class="v2-tl-head">
              <div style="min-width:0;"><div class="v2-tl-name">${U.esc(s.course.name)}</div>
              <div class="v2-tl-meta">${d.getMonth() + 1}월 ${d.getDate()}일 (${U.DAYS[d.getDay()]}) · 티오프 ${U.esc(s.teeOff)}${region ? ' · ' + U.esc(region) : ''}</div></div>
              <span class="v2-pill ${diff < 0 ? 'blue' : 'green'}">${diff === 0 ? '오늘' : diff > 0 ? 'D-' + diff : '지난 라운딩'}</span>
            </div>
            <div class="v2-alarm-box${on ? '' : ' off'}" id="tl-alarm-box">
              <div><b>${on ? '알람 켜짐' : '알람 꺼짐'}</b><small>${on ? '단계마다 미리 알려 드려요' : '켜면 준비·출발 시간에 알려 드려요'}</small></div>
              <button id="tl-alarm-btn" class="v2-switch${on ? ' on alarm-on' : ''}" role="switch" aria-checked="${on}" aria-label="알람" onclick="Timeline.toggleAlarm()"></button>
            </div>
          </div>
          ${s.groupCode ? `<div class="tl-group-link" onclick="Group.openCode(${U.jsq(s.groupCode)})">👥 단체 일정 · 우리 조 보기 <span>›</span></div>` : ''}
          <div id="tl-now-card"></div>
          <div class="v2-route-title">${diff <= 0 && diff > -1 ? '오늘의 동선' : '그날의 동선'}</div>
          <div class="v2-tl-list" style="display:flex; flex-direction:column; gap:10px;">${stepHtml}</div>
          <div class="v2-tl-foot">
            <button class="v2-btn-line" onclick="App.showWeather(${idx})">골프장 날씨 보기</button>
            <div class="v2-tl-mini">
              <button onclick="Timeline.shareTimeline()">카카오톡 공유</button>
              <button onclick="U.downloadICS(State.schedules[${idx}])">캘린더에 저장</button>
            </div>
          </div>
          ${this.renderCompanions(s.companions)}
          <button class="v2-tl-del" onclick="Timeline.deleteSchedule()">이 일정 삭제하기</button>
        </div>
      </div>`;
  },

  /** 단계 상태(지난 단계·지금 단계)와 '지금 할 일' 카드 */
  markSteps() {
    const s = State.schedules[this.schedIdx];
    const steps = this._steps || [];
    if (!s || !steps.length) return;
    const now = new Date();
    // 티오프 전 단계는 State.tlAt(전날 밤 처리), 티오프 뒤 단계는 그날(자정을 넘기면 다음 날)
    const teeI = steps.findIndex(x => x.tee);
    const toMin = (t) => { const [h, m] = String(t || '').split(':').map(Number); return h * 60 + (m || 0); };
    const at = (t) => {
      const i = steps.findIndex(x => x.time === t);
      if (i >= 0 && teeI >= 0 && i > teeI) {
        const d0 = new Date(s.date); const [h, m] = String(t).split(':').map(Number);
        d0.setHours(h, m || 0, 0, 0);
        if (toMin(t) < toMin(steps[teeI].time)) d0.setDate(d0.getDate() + 1);
        return d0;
      }
      return State.tlAt(s, t);
    };
    const d = new Date(s.date); d.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // 라운딩 진행 중(준비 6시간 전 ~ 마지막 단계 3시간 후)이면 '지금' 표시 (새벽 티오프의 전날 밤 준비도 포함)
    const tFirst = at(steps[0].time), tLast = at(steps[steps.length - 1].time);
    const isToday = !!(tFirst && tLast && now >= new Date(tFirst.getTime() - 6 * 3600000) && now <= new Date(tLast.getTime() + 3 * 3600000));
    const doneKeys = (s.tlDone && s.tlDone.day === d.getTime()) ? s.tlDone.keys : [];
    let nowIdx = -1;
    if (isToday) {
      steps.forEach((st, i) => {
        const nx = steps[i + 1];
        const nextAt = nx ? at(nx.time) : new Date(at(st.time).getTime() + 120 * 60000);
        st.state = (nextAt <= now || doneKeys.indexOf(st.key) >= 0) ? 'done' : '';
      });
      // 손으로 '출발했어요'를 누른 단계 앞은 모두 지난 것으로
      let lastDone = -1; steps.forEach((st, i) => { if (st.state === 'done') lastDone = i; });
      steps.forEach((st, i) => { if (i < lastDone) st.state = 'done'; });
      nowIdx = steps.findIndex(st => st.state !== 'done');
      if (nowIdx >= 0) steps[nowIdx].state = 'now';
    }
    U.$$('#screen-timeline .v2-tlitem').forEach(el => {
      const st = steps[Number(el.dataset.i)];
      if (!st) return;
      el.classList.toggle('done', st.state === 'done');
      el.classList.toggle('now', st.state === 'now' && !st.tee);
      const ic = el.querySelector('.v2-step-ico');
      if (ic && st.state === 'done') ic.innerHTML = this._ico.check;
      const nw = el.querySelector('.v2-step-now');
      const act = el.querySelector('.v2-step-act');
      if (nw) nw.style.display = st.state === 'now' ? '' : 'none';
      if (act && st.state === 'now') act.style.display = 'none';
    });

    // 지금 할 일: 오늘 다음 출발 단계 / 다른 날은 첫 출발 단계
    const card = U.$('#tl-now-card');
    if (!card) return;
    let target = -1;
    if (isToday) target = steps.findIndex((st, i) => i >= Math.max(nowIdx, 0) && st.depart && st.state !== 'done');
    else if (tFirst > now) target = steps.findIndex(st => st.depart);
    if (target < 0) { card.innerHTML = ''; return; }
    const st = steps[target];
    const mins = Math.round((at(st.time) - now) / 60000);
    let pill;
    if (mins >= 18 * 60) { const t1 = at(st.time); const t1d = new Date(t1); t1d.setHours(0, 0, 0, 0); const dd = Math.round((t1d - today) / 864e5); pill = dd <= 1 ? '내일 출발' : `${dd}일 후 출발`; }
    else if (mins > 0) pill = mins >= 60 ? `${Math.floor(mins / 60)}시간 ${mins % 60 ? (mins % 60) + '분 ' : ''}후 출발` : `${mins}분 후 출발`;
    else pill = '지금 출발';
    card.innerHTML = `
      <div class="v2-now">
        <div class="v2-now-top"><span>${isToday ? '지금 할 일' : '첫 출발'}</span><span class="v2-pill yellow">${pill}</span></div>
        <div class="v2-now-main"><b>${st.time}</b><span>${U.esc(st.title)}</span></div>
        ${st.place ? `<div class="v2-now-place">📍 ${U.esc(st.place)}</div>` : ''}
        <div class="v2-now-desc">${U.esc(st.sub || '')}${st.tip ? ' · ' + U.esc(st.tip) : ''}</div>
        <div class="v2-now-btns">
          <button class="tmap" onclick="Timeline.navStep(${target}, 'tmap')">TMAP</button>
          <button class="kakao" onclick="Timeline.navStep(${target}, 'kakao')">카카오내비</button>
        </div>
        ${isToday ? `<button class="v2-now-done" onclick="Timeline.markDeparted(${target})">출발했어요</button>` : ''}
      </div>`;
  },

  /** 단계의 길찾기: 앱을 정해 주면 그 앱, 아니면 기본 내비(없으면 고르기) */
  navStep(i, app) {
    const st = (this._steps || [])[i];
    if (!st || !st.nav) return;
    const to = st.nav.to, from = st.nav.from && st.nav.from.lat ? st.nav.from : { name: '', lat: 0, lng: 0 };
    const go = (a) => this.openNav(a, to.name, to.lat, to.lng, from.name, from.lat, from.lng);
    if (app) return go(app);
    const pref = typeof AutoNav !== 'undefined' ? AutoNav.pref() : 'choice';
    if (pref === 'tmap' || pref === 'kakao') return go(pref);
    Timeline._navPick = go;
    App.showModal('길찾기', `
      <div style="font-size:15px; color:#475569; margin-bottom:14px;">${U.esc(to.name)}</div>
      <div class="v2-now-btns" style="margin-top:0;">
        <button class="tmap" style="border:1px solid var(--v2-line);" onclick="App.closeModal(); Timeline._navPick('tmap')">TMAP</button>
        <button class="kakao" onclick="App.closeModal(); Timeline._navPick('kakao')">카카오내비</button>
      </div>`);
  },

  /** '출발했어요': 그 단계까지 지난 것으로 표시 (그날만) */
  markDeparted(i) {
    const s = State.schedules[this.schedIdx];
    const st = (this._steps || [])[i];
    if (!s || !st) return;
    const d = new Date(s.date); d.setHours(0, 0, 0, 0);
    if (!s.tlDone || s.tlDone.day !== d.getTime()) s.tlDone = { day: d.getTime(), keys: [] };
    if (s.tlDone.keys.indexOf(st.key) < 0) s.tlDone.keys.push(st.key);
    this._tripOf(s).left[st.key] = Date.now();   // 실제 출발 시각 (나중에 준비 시간 맞춤에 씀)
    State.saveSchedules();
    U.toast('안전 운전하세요! 🚗');
    this.render();
  },

  hidePastItems() { this.markSteps(); },

  /** 라운딩 당일 기록: 알람 확인·다시 알림 시각(ack/snooze), '출발했어요' 시각(left), 예정 시각(plan)
   *  나중에 '보통 몇 분 늦게 나가는지'를 계산해 준비 시간을 맞춰 주는 재료 */
  _tripOf(s) {
    const d = new Date(s.date); d.setHours(0, 0, 0, 0);
    if (!s.trip || s.trip.day !== d.getTime()) s.trip = { day: d.getTime(), ack: {}, snooze: {}, left: {}, plan: {} };
    const tl = s.timeline || {};
    ['prepStart', 'homeDepart', 'restDepart', 'arrival', 'teeOff'].forEach(k => { if (tl[k] && !s.trip.plan[k]) s.trip.plan[k] = tl[k]; });
    return s.trip;
  },
  _logTrip(type) {
    try {
      const last = this._alarmCtxLast || {};
      const s = last.s;
      if (!s || !last.kind || State.schedules.indexOf(s) < 0) return;
      const trip = this._tripOf(s);
      if (type === 'snooze') trip.snooze[last.kind] = (trip.snooze[last.kind] || 0) + 1;
      else if (!trip.ack[last.kind]) {
        trip.ack[last.kind] = Date.now();
        // 준비 알람을 확인했으면 타임라인의 '준비 시작'은 지난 것으로 (그날만)
        if (last.kind === 'prep') {
          if (!s.tlDone || s.tlDone.day !== trip.day) s.tlDone = { day: trip.day, keys: [] };
          if (s.tlDone.keys.indexOf('prep') < 0) s.tlDone.keys.push('prep');
        }
      }
      State.saveSchedules();
    } catch (e) { console.warn('[알람 기록] 저장 실패', e); }
  },

  async deleteSchedule() {
    if (await App.ask('일정을 삭제할까요?', '일정과 알람이 함께 지워져요.', { ok: '삭제' })) {
      this.clearSchedAlarms(State.schedules[this.schedIdx], true);
      State.schedules.splice(this.schedIdx, 1);
      State.saveSchedules();
      App.navigate('home');
      U.toast('🗑️ 일정이 삭제되었습니다.');
    }
  },



  shareTimeline() {
    const s = State.schedules[this.schedIdx];
    if (!s) {
      U.toast('공유할 일정을 찾을 수 없습니다.');
      return;
    }
    let tl = s.timeline;
    if (!tl) {
      if (typeof State !== 'undefined' && State.calculateTimeline) {
        State.calculateTimeline(this.schedIdx);
        tl = s.timeline;
      }
      if (!tl) {
        U.toast('타임라인 정보가 부족하여 공유할 수 없습니다.');
        return;
      }
    }
    Timeline._pendingShareS = s;
    const baseDomain = 'https://buddyplanner.kr';

    // ── 카카오톡 공유 용: 초경량 압축 방식 v2 (?s=) ────────────────────────────
    const c = s.course || {};
    const r = s.mealRestaurant || {};
    const mp = s.meetingPointObj || {};
    const pm = s.postMealRestaurant || {};
    
    // 날짜는 그 지역 날짜 그대로(YYYY-MM-DDT00:00:00), 좌표는 소수 5자리(약 1m) — 링크를 짧게
    let dateVal = '';
    try { const d = new Date(s.date); if (!isNaN(d)) dateVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00`; } catch (e) { }
    const g5 = (v) => (v === '' || v == null || isNaN(Number(v))) ? '' : String(Math.round(Number(v) * 1e5) / 1e5);

    const arr = [
      'v2',
      dateVal,
      s.teeOff || '',
      s.startPoint || '집',
      c.name || '',
      '',
      g5(c.lat),
      g5(c.lng),
      r.name || '',
      g5(r.lat),
      g5(r.lng),
      s.prepTime || 30,
      s.travelTime || 60,
      s.hasMeal ? 1 : 0,
      s.mealDuration || 0,
      s.travelToRestaurant || 0,
      s.hasMeetingPoint ? 1 : 0,
      mp.name || '',
      g5(mp.lat),
      g5(mp.lng),
      s.travelToMeeting || 0,
      s.hasPostMeal ? 1 : 0,
      pm.name || '',
      g5(pm.lat),
      g5(pm.lng),
      c.region || '',  // arr[25]: 골프장 지역 (시/도 구)
      s.roundLength || '18',                                   // arr[26]: 18홀 / 9홀
      (s.afterMeet && s.afterMeet.mode) || 'asap',            // arr[27]: 끝나고 모이는 방식
      (s.afterMeet && s.afterMeet.mode !== 'asap' && s.afterMeet.time) || '', // arr[28]: 약속 시각
      String(s.sharedFrom || State.aidOf(s) || '').replace(/[^0-9a-z]/gi, '').slice(0, 20)  // arr[29]: 원본 일정 번호 (고쳐서 다시 보내면 받은 쪽 일정을 바꿔 끼움)
    ];
    // 한글을 %EC%98%A4… 로 풀지 않고 짧은 코드(?b=)로 묶음 — 링크 길이 약 1/3
    const packed = btoa(unescape(encodeURIComponent(arr.join('|')))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    Timeline._pendingShareUrl = baseDomain + '/?b=' + packed;

    // 즉시 카카오톡 공유 실행!
    this.executeKakaoShare();
  },

  /** 카카오톡 공유 카드 (일정 + 버튼 2개). 웹은 카카오 JS, 앱은 카카오 SDK(KakaoShare 플러그인) */
  _kakaoFeed() {
    const s = Timeline._pendingShareS || {};
    const url = Timeline._pendingShareUrl;
    const courseName = s.course ? s.course.name : '골프장';
    const dateStr = s.date ? U.fmtDateShort(s.date) : '';
    const teeOff = s.teeOff || '';
    const shareLinkObj = { mobileWebUrl: url, webUrl: url };
    return {
      objectType: 'feed',
      content: {
        title: `⛳ [BuddyPlanner] ${courseName} 라운딩 일정`,
        description: `📅 ${dateStr} ${teeOff}\n📍 ${courseName}\n내 출발지만 고르면 출발 시간과 길안내가 바로 맞춰져요`,
        imageUrl: 'https://buddyplanner.kr/img/share.jpg',
        link: shareLinkObj,
      },
      buttons: [
        { title: '앱 설치하고 받기', link: { mobileWebUrl: url + '&get=app', webUrl: url + '&get=app' } },
        { title: '로그인 없이 받기', link: shareLinkObj }
      ]
    };
  },

  executeKakaoShare() {
    if (!Timeline._pendingShareUrl) { U.toast('공유할 링크를 만들지 못했어요.'); return; }
    // 앱: 카카오 SDK로 카드 공유 → 안 되면(카톡 없음·옛 앱) 휴대폰 공유 창
    if (U.isNativeApp()) {
      U.kakaoNativeShare(Timeline._kakaoFeed()).then(ok => { if (!ok) Timeline.shareFallback(); });
      return;
    }
    try {
      if (!U.kakaoSend(Timeline._kakaoFeed())) throw new Error('no kakao share');
    } catch (e) {
      console.error('Kakao share error:', e);
      Timeline.shareFallback();
    }
  },

  /** 카카오톡 공유가 안 될 때: 휴대폰 기본 공유 → 안 되면 링크 복사 */
  async shareFallback() {
    const url = Timeline._pendingShareUrl || '';
    const s = Timeline._pendingShareS || {};
    if (!url) { U.toast('공유할 링크를 만들지 못했어요.'); return; }
    const course = s.course ? s.course.name : '골프장';
    const title = `⛳ ${course} 라운딩 일정`;
    const when = `${s.date ? U.fmtDateShort(s.date) : ''} ${s.teeOff || ''}`.trim();
    // 문자·카톡 붙여넣기용: 링크는 하나만 — 누르면 '앱으로 받기 / 로그인 없이 받기'를 고르는 화면이 떠요
    const text = `${title}${when ? `\n📅 ${when}` : ''}\n내 출발지만 고르면 출발 시간과 길안내가 바로 맞춰져요\n\n👇 눌러서 받기 (앱 · 로그인 없이)\n${url}&pick=1`;
    await U.shareOut({ title, text, url: '' });
  },

  renderRouteSummary(s, tl) {
    const startPt = s.startPoint || '집';
    let startSvg = `<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
    if (startPt.includes('회사') || startPt.includes('사무실')) {
      startSvg = `<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
    } else if (startPt.includes('집') || startPt.includes('자택')) {
      startSvg = `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    }

    if (tl.hasMeal) {
      return `
        <div class="route-summary">
          <div class="route-node active">
            <div class="route-icon">${startSvg}</div>
            <span class="route-label">${startPt.slice(0, 5)}</span>
          </div>
          <div class="route-arrow"><span class="route-time">${tl.homeTravelDur}분</span></div>
          <div class="route-node gold">
            <div class="route-icon">
              <svg viewBox="0 0 24 24"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"></path></svg>
            </div>
            <span class="route-label">${tl.restaurantName.slice(0, 5)}</span>
          </div>
          <div class="route-arrow"><span class="route-time">${tl.restTravelDur}분</span></div>
          <div class="route-node">
            <div class="route-icon">
              <svg viewBox="0 0 24 24"><path d="M4 22V2l10 5-10 5"></path></svg>
            </div>
            <span class="route-label">${s.course.name.slice(0,6)}</span>
          </div>
        </div>
      `;
    }
    return `
      <div class="route-summary">
        <div class="route-node active">
          <div class="route-icon">${startSvg}</div>
          <span class="route-label">${startPt.slice(0, 5)}</span>
        </div>
        <div class="route-arrow"><span class="route-time">${tl.homeTravelDur}분</span></div>
        <div class="route-node">
          <div class="route-icon">
            <svg viewBox="0 0 24 24"><path d="M4 22V2l10 5-10 5"></path></svg>
          </div>
          <span class="route-label">${s.course.name.slice(0,6)}</span>
        </div>
      </div>
    `;
  },

  renderCompanions(companions) {
    if (!companions || !companions.length) return '';
    return `
      <div class="comp-section">
        <div class="comp-card">
          <div class="comp-head">
            <h3 class="comp-title">💬 동반자 방</h3>
            <span class="chip chip-gold">${companions.length}명</span>
          </div>
          <div class="comp-list">
            ${companions.map(c => `
              <div class="comp-row">
                <div class="comp-info">
                  <div class="comp-avatar" style="background:linear-gradient(135deg,${c.color || '#3b82f6'},${c.color || '#3b82f6'}88)">${c.emoji || U.esc(String(c.name || '?').charAt(0))}</div>
                  <div>
                    <div class="comp-name">${U.esc(c.name)}</div>
                    <div class="comp-status">대기 중</div>
                  </div>
                </div>
                <button class="status-btn" data-name="${U.esc(c.name)}" onclick="Timeline.toggleStatus(this,this.dataset.name)">출발함</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  openNav(app, destName, destLat, destLng, startName='', startLat=0, startLng=0) {
    if (app === 'tmap') {
      U.toast(`🗺️ Tmap으로 길안내를 시작합니다: ${U.esc(destName)}`);
      if (startLat && startLng) {
        window.location.href = `tmap://route?startname=${encodeURIComponent(startName)}&startx=${startLng}&starty=${startLat}&goalname=${encodeURIComponent(destName)}&goalx=${destLng}&goaly=${destLat}`;
      } else {
        window.location.href = `tmap://route?goalname=${encodeURIComponent(destName)}&goalx=${destLng}&goaly=${destLat}`;
      }
    } else if (app === 'kakao') {
      // 카카오내비 앱으로 바로 길안내 (카카오 JS SDK의 Navi.start, 앱이 없으면 설치 화면).
      // SDK가 없거나 실패하면 예전처럼 카카오맵 길찾기로
      // 아이폰 앱: 웹용 SDK는 앱 주소(capacitor://localhost)라 카카오내비 인증이 거절됨 → 아이폰 SDK와 같은 형식으로 직접 호출
      if (destLat && destLng && this._kakaoNaviIOS(destName, destLat, destLng, startName, startLat, startLng)) return;
      try {
        // 카카오 SDK는 init을 해야 Navi가 생김 → 먼저 init
        if (typeof Kakao !== 'undefined' && destLat && destLng) {
          if (!Kakao.isInitialized() && typeof Login !== 'undefined' && Login.KAKAO_JS_KEY && Login.KAKAO_JS_KEY !== 'YOUR_KAKAO_JS_KEY') Kakao.init(Login.KAKAO_JS_KEY);
          if (Kakao.isInitialized() && Kakao.Navi && Kakao.Navi.start) {
            U.toast(`🚙 카카오내비로 길안내를 시작합니다: ${U.esc(destName)}`);
            Kakao.Navi.start({ name: String(destName || '목적지').slice(0, 50), x: Number(destLng), y: Number(destLat), coordType: 'wgs84' });
            return;
          }
        }
      } catch (e) { console.warn('[카카오내비] 실행 실패, 카카오맵으로 엽니다', e); }
      U.toast(`🚙 카카오맵으로 길안내를 시작합니다: ${U.esc(destName)}`);
      if (startLat && startLng) {
        window.location.href = `kakaomap://route?sp=${startLat},${startLng}&ep=${destLat},${destLng}&by=CAR`;
      } else {
        window.location.href = `https://map.kakao.com/link/to/${encodeURIComponent(destName)},${destLat},${destLng}`;
      }
    }
  },

  /** 아이폰 앱에서 카카오내비 길안내 (카카오 iOS SDK의 NaviApi.navigateUrl과 같은 URL: 네이티브 앱 키 + 번들 ID로 인증) */
  _kakaoNaviIOS(destName, destLat, destLng, startName, startLat, startLng) {
    const C = window.Capacitor;
    if (!C || !C.getPlatform || C.getPlatform() !== 'ios') return false;
    const key = (window.APP_CONFIG || {}).KAKAO_NATIVE_APP_KEY;
    if (!key) return false;
    const go = (bundleId, ver) => {
      const param = { destination: { name: String(destName || '목적지').slice(0, 50), x: String(destLng), y: String(destLat) }, option: { coord_type: 'wgs84' } };
      const lang = (navigator.language || 'ko-KR');
      const os = ((navigator.userAgent.match(/OS (\d+)_(\d+)/) || []).slice(1).join('.')) || '17.0';
      const ka = `sdk/2.30.0 sdk_type/swift os/ios-${os} lang/${lang} res/${screen.width}x${screen.height} device/iPhone origin/${bundleId} app_ver/${ver} module_type/open`;
      const url = 'kakaonavi-sdk://navigate?param=' + encodeURIComponent(JSON.stringify(param))
        + '&appkey=' + encodeURIComponent(key) + '&apiver=1.0'
        + '&extras=' + encodeURIComponent(JSON.stringify({ KA: ka, appPkg: bundleId }));
      U.toast(`🚙 카카오내비로 길안내를 시작합니다: ${U.esc(destName)}`);
      window.location.href = url;
      // 카카오내비가 없으면 앱이 그대로 → 카카오맵 길찾기로
      setTimeout(() => {
        if (document.hidden) return;
        window.location.href = startLat && startLng
          ? `kakaomap://route?sp=${startLat},${startLng}&ep=${destLat},${destLng}&by=CAR`
          : `https://map.kakao.com/link/to/${encodeURIComponent(destName)},${destLat},${destLng}`;
      }, 1800);
    };
    const A = C.Plugins && C.Plugins.App;
    if (A && A.getInfo) A.getInfo().then(i => go(i.id || 'com.myB', i.version || '1.0')).catch(() => go('com.myB', '1.0'));
    else go('com.myB', '1.0');
    return true;
  },

  /** 한 일정에 걸린 앱 안 타이머(앱 켤 때 자동 예약분 포함)를 모두 지움. native=true면 폰 알람도 취소 */
  clearSchedAlarms(s, native) {
    if (!s) return;
    this._schedTimers = this._schedTimers || new Map();
    const key = State.aidOf(s);
    const ids = this._schedTimers.get(key) || [];
    ids.forEach(id => clearTimeout(id));
    this._schedTimers.delete(key);
    if (this.alarmTimeouts) this.alarmTimeouts = this.alarmTimeouts.filter(id => !ids.includes(id));
    if (native && window.NativeApp && typeof window.NativeApp.cancelAlarm === 'function') {
      this.nativeAlarmTimes(s).forEach(t => { try { window.NativeApp.cancelAlarm(t); } catch (e) {} });
    }
  },

  _trackTimer(s, id) {
    this._schedTimers = this._schedTimers || new Map();
    const key = State.aidOf(s);
    if (!this._schedTimers.has(key)) this._schedTimers.set(key, []);
    this._schedTimers.get(key).push(id);
    this.alarmTimeouts = this.alarmTimeouts || [];
    this.alarmTimeouts.push(id);
  },

  toggleAlarm() {
    const s = State.schedules[this.schedIdx];
    if (!s) return;
    if (!s.alarmOff) this.alarmOffFor(this.schedIdx);
    else this.alarmOn();
  },

  /** 알람 끄기: 이 일정의 앱 안 타이머와 폰 알람을 취소하고 꺼둔 상태를 저장 (앱 재실행 시 자동 예약 방지) */
  alarmOffFor(idx) {
    const s = State.schedules[idx];
    if (!s) return;
    this.clearSchedAlarms(s, true);
    s.alarmOff = true;
    State.saveSchedules();
    this.syncAlarmUI(false);
    U.toast('출발 알람을 껐어요.');
  },

  /** 화면의 알람 스위치 모양 맞추기 */
  syncAlarmUI(on) {
    const sw = U.$('#tl-alarm-btn');
    if (sw) { sw.classList.toggle('on', on); sw.classList.toggle('alarm-on', on); sw.setAttribute('aria-checked', on); }
    const box = U.$('#tl-alarm-box');
    if (box) {
      box.classList.toggle('off', !on);
      const b = box.querySelector('b'), sm = box.querySelector('small');
      if (b) b.textContent = on ? '알람 켜짐' : '알람 꺼짐';
      if (sm) sm.textContent = on ? '단계마다 미리 알려 드려요' : '켜면 준비·출발 시간에 알려 드려요';
    }
  },

  /** 알람 켜기 (일정 생성·수정 직후에도 호출). 이미 켜져 있어도 기존 예약을 지우고 다시 예약하므로 중복되지 않음 */
  alarmOn() {
    this.syncAlarmUI(true);
    {
      this.initAudioContext();

      const sched = State.schedules[this.schedIdx];
      if (sched && sched.alarmOff) { sched.alarmOff = false; State.saveSchedules(); }

      // 안드로이드 앱: 네이티브 알람 예약 (필요한 권한은 이때 처음 안내)
      if (window.NativeApp) {
        this.scheduleTimelineAlarms();
        U.toast('타임라인 일정에 맞춰 알람이 예약되었습니다!');
        setTimeout(() => this.offerOverlayPopup(), 1200);
        return;
      }

      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            U.toast('실제 타임라인 일정에 맞춰 알람이 예약되었습니다!');
          } else {
            U.toast('푸시 알림은 차단되었지만 앱 내 알람은 작동합니다.');
          }
          this.scheduleTimelineAlarms();
        });
      } else {
        U.toast('아이폰 푸시 알림은 지원하지 않지만 앱 내 알람은 정상 작동합니다!');
        this.scheduleTimelineAlarms();
      }
    }
  },

  /** 네이티브 알람으로 예약되는 시각 목록 (예약·취소에 같은 값을 사용) */
  nativeAlarmTimes(s) {
    if (!s || !s.timeline || !s.date) return [];
    const tl = s.timeline;
    return [tl.prepStart, tl.homeDepart, tl.restDepart].filter(Boolean).map(timeStr => State.tlAt(s, timeStr).getTime());
  },

  /** 출발 알림 팝업(다른 앱 위에 표시)은 원하는 사용자에게만, 최초 1회 안내 */
  offerOverlayPopup() {
    const na = window.NativeApp;
    if (!na || typeof na.canDrawOverlays !== 'function' || na.canDrawOverlays()) return;
    if (localStorage.getItem('bp_overlay_offered') === 'true') return;
    localStorage.setItem('bp_overlay_offered', 'true');
    App.showModal('출발 알림 팝업', `
      <div class="pay-success" style="padding-top:var(--sp-2);">
        <p>알람이 울릴 때 다른 앱을 쓰고 있어도<br>화면 위에 <b>남은 동선</b>을 작은 팝업으로 보여드릴 수 있어요.<br><br>
        사용하시려면 다음 화면에서 <b>'다른 앱 위에 표시'</b>를 허용해 주세요.</p>
        <button class="btn-primary" style="width:100%; margin-bottom:var(--sp-2);" onclick="App.closeModal(); window.NativeApp.openOverlaySettings();">팝업 사용하기</button>
        <button class="btn-ghost" style="width:100%;" onclick="App.closeModal();">괜찮아요</button>
      </div>`);
  },

  /** 라운딩이 끝났는지 (식당 평가·스코어 기록은 끝난 뒤에만 권함) */
  isRoundOver(s) {
    if (!s || !s.date) return false;
    const d = new Date(s.date);
    const [h, m] = String(s.teeOff || '07:00').split(':').map(Number);
    const rl = ROUND_LENGTHS[s.roundLength] || ROUND_LENGTHS['18'];
    d.setHours(h || 0, m || 0, 0, 0);
    return Date.now() > d.getTime() + rl.min * 60000;
  },

  /**
   * 울리지 않는 안내 알림 예약 (앱에서만):
   *  - 라운딩 전날 밤 9시: 준비 시작·출발 시각과 날씨 확인 안내
   *  - 귀가 도착 1시간 뒤(늦어도 밤 10시): 스코어 기록 안내 (이미 기록했으면 생략)
   */
  scheduleReminders() {
    const N = window.NativeApp;
    if (!N || typeof N.setReminder !== 'function') return;
    const KEY = 'bp_reminders_v1';
    let prev = [];
    try { prev = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
    prev.forEach(t => { try { N.cancelAlarm(t); } catch (e) {} });

    let records = {};
    try { records = JSON.parse(localStorage.getItem('bp_records_v1') || '{}'); } catch (e) {}
    const pad = n => String(n).padStart(2, '0');
    const now = Date.now();
    const next = [];
    (State.schedules || []).forEach((s, idx) => {
      if (!s || !s.date || s.alarmOff) return;
      if (!s.timeline) { try { State.calculateTimeline(idx); } catch (e) { return; } }
      const tl = s.timeline || {};
      const day = new Date(s.date); day.setHours(0, 0, 0, 0);
      const name = (s.course && s.course.name) || '라운딩';

      const eve = new Date(day); eve.setDate(eve.getDate() - 1); eve.setHours(21, 0, 0, 0);
      if (eve.getTime() > now) {
        try {
          N.setReminder(eve.getTime(), `내일 ${name} 라운딩`,
            `${U.fmtTimeKo(tl.prepStart)} 준비 시작, ${U.fmtTimeKo(tl.homeDepart)} 출발이에요. 날씨와 준비물을 확인하고 일찍 쉬세요.`);
          next.push(eve.getTime());
        } catch (e) {}
      }

      const ymd = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
      const recorded = Object.keys(records).some(k => k.split('#')[0] === ymd);
      const [rh, rm] = String(tl.returnEnd || '').split(':').map(Number);
      if (!recorded && Number.isFinite(rh)) {
        const home = new Date(day); home.setHours(rh, rm || 0, 0, 0);
        if (home.getTime() < day.getTime() + 6 * 3600000) home.setDate(home.getDate() + 1); // 자정 넘긴 귀가
        // 집에 도착하고 1시간 뒤. 단, 밤 10시는 넘기지 않음 (귀가가 더 늦으면 도착 10분 뒤)
        const cap = new Date(day); cap.setHours(22, 0, 0, 0);
        const when = Math.min(home.getTime() + 3600000, Math.max(cap.getTime(), home.getTime() + 600000));
        if (when > now) {
          try {
            N.setReminder(when, '오늘 라운딩 어떠셨어요? ⛳', `${name} 스코어를 남겨 두면 기록과 라이프 베스트가 쌓여요.`);
            next.push(when);
          } catch (e) {}
        }
      }
    });
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
  },

  autoScheduleAllAlarms() {
    try { this.scheduleReminders(); } catch (e) { console.warn('reminders', e); }
    this.alarmTimeouts = this.alarmTimeouts || [];
    this.alarmTimeouts.forEach(id => clearTimeout(id));
    this.alarmTimeouts = [];
    this._schedTimers = new Map();

    const now = new Date();
    State.schedules.forEach((s) => {
      if (!s.timeline || !s.date || s.alarmOff) return;
      // 오늘·내일 라운딩만 (새벽 티오프는 준비 시작이 전날 밤일 수 있음)
      const sDate = new Date(s.date); sDate.setHours(0, 0, 0, 0);
      const today0 = new Date(now); today0.setHours(0, 0, 0, 0);
      const dayDiff = Math.round((sDate - today0) / 86400000);
      if (dayDiff === 0 || dayDiff === 1) {
        
        const tl = s.timeline;
        const getTargetTime = (timeStr) => {
          if (!timeStr) return -1;
          const d = State.tlAt(s, timeStr);
          return d ? d.getTime() : -1;
        };

        const events = [];
        const iPrep = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        const iHome = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
        const iMeal = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"></path></svg>`;
        const iRest = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
        const iArrive = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 21h18M9 21V10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11M2 14h20"></path></svg>`;
        const iTee = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--gold-500)" stroke-width="2"><path d="M4 22V2l10 5-10 5"></path></svg>`;

        if (tl.prepStart) events.push({ isNative: true, isPrep: true, time: tl.prepStart, title: '준비', msg: '준비 시작 - 보스턴백과 준비물을 챙겨주세요!', icon: iPrep, emoji: '🏃' });
        if (tl.homeDepart) events.push({ isNative: true, time: tl.homeDepart, title: '이동', msg: '출발 시간입니다! 목적지로 출발하세요 🚗', icon: iHome, emoji: '🚗' });
        if (tl.mealStart) events.push({ time: tl.mealStart, title: '식사', msg: '식당 예약 시간입니다. 든든한 식사 하세요 🍽️', icon: iMeal, emoji: '🍚' });
        if (tl.restDepart) events.push({ isNative: true, time: tl.restDepart, title: '이동', msg: '골프장으로 출발할 시간입니다 🚙', icon: iRest, emoji: '🚗' });
        if (tl.arrival) events.push({ time: tl.arrival, title: '도착', msg: '클럽하우스 도착 시간입니다. 환복을 준비하세요 🏌️', icon: iArrive, emoji: '👔' });
        if (tl.teeOff) events.push({ time: tl.teeOff, title: '티오프', msg: '곧 티오프 시간입니다! 멋진 라운딩 되세요 ⛳', icon: iTee, emoji: '⛳' });

        const timelineData = events.map(ev => ({
          time: ev.time,
          title: ev.title,
          subtitle: ev.msg,
          emoji: ev.emoji
        }));
        const timelineJson = JSON.stringify(timelineData);

        events.forEach(ev => {
          const targetTime = getTargetTime(ev.time);
          const delay = targetTime - Date.now();
          if (delay > 0 && delay < 36 * 3600000) {
            if ((ev.isNative || ev.isPrep) && window.NativeApp) {
              if (typeof window.NativeApp.setAlarmWithData === 'function') {
                try { window.NativeApp.setAlarmWithData(targetTime, timelineJson); } catch(e) {}
              } else if (typeof window.NativeApp.setAlarm === 'function') {
                window.NativeApp.setAlarm(targetTime);
              }
            }
            const timeoutId = setTimeout(() => {
              // 앱이 잠들어 있다 늦게 깨면 지난 알람이 한꺼번에 울림 → 폰 알람이 이미 울렸으니 2분 넘게 늦으면 건너뜀
              if (window.NativeApp && Date.now() - targetTime > 2 * 60000) return;
              try {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('BuddyPlanner 타임라인', {
                    body: ev.msg,
                    icon: 'assets/icons/icon-192x192.png'
                  });
                }
              } catch (e) {
                console.warn('Notification failed:', e);
              }
              Timeline.playAlarmSound(ev.msg, '⏰ 타임라인 알람', ev.icon, { s, time: ev.time });
            }, delay);
            this._trackTimer(s, timeoutId);
          }
        });
      }
    });

    const unlockAudio = () => {
      Timeline.initAudioContext();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio, {passive: true});
  },

  scheduleTimelineAlarms() {
    this.alarmTimeouts = this.alarmTimeouts || [];
    const s = State.schedules[this.schedIdx];
    if (!s || !s.timeline) return;
    // 같은 일정에 앞서 걸어 둔 앱 안 타이머는 지우고 다시 검 (중복 알람 방지)
    this.clearSchedAlarms(s, false);
    
    const tl = s.timeline;
    
    const getTargetTime = (timeStr) => {
      if (!timeStr) return -1;
      const d = State.tlAt(s, timeStr);
      return d ? d.getTime() : -1;
    };

    const events = [];
    const iPrep = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const iHome = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    const iMeal = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"></path></svg>`;
    const iRest = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
    const iArrive = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 21h18M9 21V10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11M2 14h20"></path></svg>`;
    const iTee = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--gold-500)" stroke-width="2"><path d="M4 22V2l10 5-10 5"></path></svg>`;

    if (tl.prepStart) events.push({ isNative: true, isPrep: true, time: tl.prepStart, title: '준비', msg: '준비 시작 - 보스턴백과 준비물을 챙겨주세요!', icon: iPrep, emoji: '🏃' });
    if (tl.homeDepart) events.push({ isNative: true, time: tl.homeDepart, title: '이동', msg: '출발 시간입니다! 목적지로 출발하세요 🚗', icon: iHome, emoji: '🚗' });
    if (tl.mealStart) events.push({ time: tl.mealStart, title: '식사', msg: '식당 예약 시간입니다. 든든한 식사 하세요 🍽️', icon: iMeal, emoji: '🍚' });
    if (tl.restDepart) events.push({ isNative: true, time: tl.restDepart, title: '이동', msg: '골프장으로 출발할 시간입니다 🚙', icon: iRest, emoji: '🚗' });
    if (tl.arrival) events.push({ time: tl.arrival, title: '도착', msg: '클럽하우스 도착 시간입니다. 환복을 준비하세요 🏌️', icon: iArrive, emoji: '👔' });
    if (tl.teeOff) events.push({ time: tl.teeOff, title: '티오프', msg: '곧 티오프 시간입니다! 멋진 라운딩 되세요 ⛳', icon: iTee, emoji: '⛳' });

    const timelineData = events.map(ev => ({
      time: ev.time,
      title: ev.title,
      subtitle: ev.msg,
      emoji: ev.emoji
    }));
    const timelineJson = JSON.stringify(timelineData);

    let scheduledCount = 0;
    events.forEach(ev => {
      const targetTime = getTargetTime(ev.time);
      const delay = targetTime - Date.now();
      if (delay > 0) {
        if ((ev.isNative || ev.isPrep) && window.NativeApp) {
          if (typeof window.NativeApp.setAlarmWithData === 'function') {
            try { window.NativeApp.setAlarmWithData(targetTime, timelineJson); } catch(e) {}
          } else if (typeof window.NativeApp.setAlarm === 'function') {
            window.NativeApp.setAlarm(targetTime);
          }
        }
        // setTimeout은 약 24.8일(2^31-1ms)을 넘기면 바로 실행돼 버림 → 먼 일정은 앱 안 타이머를 걸지 않음 (폰 알람은 위에서 예약)
        if (delay >= 2147483647) { scheduledCount++; return; }
        const timeoutId = setTimeout(() => {
          // 앱이 잠들어 있다 늦게 깨면 지난 알람이 한꺼번에 울림 → 폰 알람이 이미 울렸으니 2분 넘게 늦으면 건너뜀
          if (window.NativeApp && Date.now() - targetTime > 2 * 60000) return;
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('BuddyPlanner 타임라인', {
                body: ev.msg,
                icon: 'assets/icons/icon-192x192.png'
              });
            }
          } catch (e) {
            console.warn('Notification failed:', e);
          }
          
          Timeline.playAlarmSound(ev.msg, '⏰ 타임라인 알람', ev.icon, { s, time: ev.time });
        }, delay);
        this._trackTimer(s, timeoutId);
        scheduledCount++;
      }
    });

    if (scheduledCount === 0) {
      U.toast('오늘 이후의 일정이거나 이미 지난 일정이라 알람을 예약하지 않았습니다.');
    }
  },

  toggleStatus(btn, name) {
    const row = btn.closest('.comp-row');
    const st = row.querySelector('.comp-status');
    if (btn.textContent.trim() === '출발함') {
      btn.textContent = '도착함'; st.textContent = '🚗 이동 중'; st.className = 'comp-status departed';
      U.toast(`${U.esc(name)}님 출발로 표시했어요 🚗`);
    } else {
      btn.textContent = '완료'; btn.disabled = true; btn.style.opacity = '0.4';
      st.textContent = '✅ 도착 완료'; st.className = 'comp-status arrived';
      U.toast(`${U.esc(name)}님 도착으로 표시했어요 ✅`);
    }
    U.haptic();
  },

  showChecklist() {
    const icons = ['🎒','📏','⛳','🧤','☀️','🧺'];
    const items = CHECKLIST.map((c,i) => `
      <div class="modal-item" onclick="this.classList.toggle('selected');U.haptic();">
        <div class="modal-item-icon">${icons[i]}</div>
        <span class="modal-item-text">${c}</span>
        <div class="modal-item-check">✓</div>
      </div>
    `).join('');
    App.showModal('✅ 라운딩 체크리스트', items);
  },

  initAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  playAlarmSound(msg, title = '🚨 타임라인 알람', iconHtml = null, ctx = null) {
    this._lastRingAt = Date.now();   // 아이폰: 같은 알람이 알림으로 또 울리지 않게
    if (!this.audioCtx) this.initAudioContext();
    
    // 한 번만 울리는 알림음 (A5 -> C#6)
    try {
      this.oscillator = this.audioCtx.createOscillator();
      this.oscillator.type = 'sine';
      this.oscillator.frequency.setValueAtTime(880, this.audioCtx.currentTime); 
      this.oscillator.frequency.setValueAtTime(1108.73, this.audioCtx.currentTime + 0.15);
      
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.setValueAtTime(1, this.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

      this.oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      this.oscillator.start();
      this.oscillator.stop(this.audioCtx.currentTime + 0.5);
    } catch(e) {
      console.warn('Audio play failed:', e);
    }

    this.showAlarmPopup(msg, title, iconHtml, ctx);
  },

  /** 알람이 어느 일정·어느 단계인지 찾기 (아이폰 알림처럼 정보가 없을 때는 지금과 가장 가까운 단계) */
  _alarmCtx(ctx) {
    if (ctx && ctx.preview) return null;   // 마이 화면 '알람 미리 듣기'는 실제 일정 알람 화면으로 만들지 않음
    const steps = [['prepStart', 'prep'], ['homeDepart', 'depart'], ['mealStart', 'meal'], ['restDepart', 'restDepart'], ['arrival', 'arrival'], ['teeOff', 'tee']];
    const at = (s, t) => { try { const d = State.tlAt(s, t); return d ? d.getTime() : NaN; } catch (e) { return NaN; } };
    const now = Date.now();
    let best = null;
    const list = ctx && ctx.s ? [ctx.s] : (State.schedules || []);
    list.forEach(s => {
      if (!s || !s.timeline) return;
      steps.forEach(([k, kind]) => {
        const t = s.timeline[k]; if (!t) return;
        if (ctx && ctx.time && t !== ctx.time) return;
        const ms = at(s, t); if (isNaN(ms)) return;
        const gap = Math.abs(ms - now);
        if (!ctx && gap > 3 * 3600000) return;
        if (!best || gap < best.gap) best = { s, k, kind, t, ms, gap };
      });
    });
    return best;
  },

  showAlarmPopup(msg, title, iconHtml, ctx) {
    const old = document.getElementById('tl-alarm-popup');
    if (old) old.remove();
    const c = this._alarmCtx(ctx);
    const s = c && c.s, tl = (s && s.timeline) || {};
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const hm = c ? c.t : `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dd = c ? new Date(c.ms) : now;
    const kindInfo = {
      prep:       ['준비 알람', '준비할 시간이에요', '🎒 보스턴백·골프화·장갑 챙기세요'],
      depart:     ['출발 알람', '출발할 시간이에요', '🚗 출발하면 "출발했어요"를 눌러 주세요'],
      meal:       ['식사 알람', '식사할 시간이에요', '🍽️ 식사 후 골프장 출발 시간을 확인하세요'],
      restDepart: ['출발 알람', '골프장으로 출발할 시간이에요', '🚗 지금 출발하면 여유 있게 도착해요'],
      arrival:    ['도착 알람', '클럽하우스 도착 시간이에요', '👔 환복하고 연습 그린에서 몸 풀어 보세요'],
      tee:        ['티오프 알람', '곧 티오프예요', '⛳ 멋진 라운딩 되세요'],
    };
    const ki = kindInfo[c ? c.kind : ''] || [String(title || '알람').replace(/^[^\w가-힣]+/, '').trim() || '알람', '알람 시간이에요', ''];
    const course = s ? (s.course ? s.course.name : (s.courseName || '골프장')) : '';
    const depT = tl.restDepart && c && (c.kind === 'meal' || c.kind === 'restDepart') ? tl.restDepart : tl.homeDepart;
    let lead = '';
    if (s && depT && tl.teeOff && c && ['prep', 'depart', 'meal', 'restDepart'].includes(c.kind)) lead = tl.arrival ? `${depT}에 나가면 ${tl.arrival} 도착해요` : `${depT}에 나가면 티오프 전에 도착해요`;
    else if (s && tl.teeOff && c && c.kind === 'arrival') lead = `티오프 ${tl.teeOff}까지 여유 있게 준비하세요`;
    else if (s && tl.teeOff) lead = `티오프 ${tl.teeOff}`;
    else lead = U.esc(msg || '');

    // 다음 알람
    let next = '';
    if (s && c) {
      const order = ['prepStart', 'homeDepart', 'mealStart', 'restDepart', 'arrival', 'teeOff'];
      const nm = { prepStart: '준비', homeDepart: '출발', mealStart: '식사', restDepart: '골프장 출발', arrival: '도착', teeOff: '티오프' };
      for (let i = order.indexOf(c.k) + 1; i < order.length; i++) { if (tl[order[i]]) { next = `${tl[order[i]]}에 ${nm[order[i]]} 알림`; break; } }
    }
    this._snoozeLeft = (ctx && ctx._snoozeLeft != null) ? ctx._snoozeLeft : 2;
    const left = this._snoozeLeft;
    const foot = s ? [left > 0 ? `다시 울림 ${left}번 남았어요` : '', next].filter(Boolean).join(' · ') : '';
    const idx = s ? State.schedules.indexOf(s) : -1;
    this._alarmCtxLast = { s, time: c ? c.t : null, kind: c ? c.kind : null, msg, title, iconHtml };

    const popup = document.createElement('div');
    popup.id = 'tl-alarm-popup';
    popup.className = 'v2-alarm';
    popup.innerHTML = `
      <div class="v2-alarm-in">
        <div class="v2-alarm-top">${dd.getMonth() + 1}월 ${dd.getDate()}일 (${days[dd.getDay()]}) · ${U.esc(ki[0])}</div>
        <div class="v2-alarm-time">${U.esc(hm)}</div>
        <div class="v2-alarm-head">${U.esc(ki[1])}</div>
        ${s ? `<div class="v2-alarm-card">
          <div class="v2-alarm-c1">라운딩 · ${U.esc(course)}${tl.teeOff ? ' · 티오프 ' + U.esc(tl.teeOff) : ''}</div>
          <div class="v2-alarm-c2">${lead}</div>
          ${ki[2] ? `<div class="v2-alarm-c3">${U.esc(ki[2])}</div>` : ''}
          <div class="v2-alarm-c3" id="v2-alarm-wx" hidden></div>
          ${c && ['prep', 'depart', 'meal', 'restDepart'].includes(c.kind) ? `<div class="v2-alarm-c5" id="v2-alarm-tr">🚗 내 위치에서 실시간 길 확인 중…</div>` : ''}
          ${tl.hasMeetingPoint && c && ['prep', 'depart'].includes(c.kind) ? `<div class="v2-alarm-c4">📍 집결지 · ${U.esc(tl.meetingPointName || (s.meetingPointObj || {}).name || '집결지')}${tl.meetArrival ? ' ' + U.esc(tl.meetArrival) + ' 도착' : ''}</div>` : ''}
        </div>` : (msg ? `<div class="v2-alarm-card"><div class="v2-alarm-c2">${U.esc(msg)}</div></div>` : '')}
        <div class="v2-alarm-btns">
          <button class="v2-alarm-ok" onclick="Timeline.closeAlarm()">확인했어요</button>
          ${idx >= 0 ? `<div class="v2-alarm-row">
            <button onclick="Timeline.snoozeAlarm()" ${left > 0 ? '' : 'disabled'}>5분 뒤 다시</button>
            <button onclick="Timeline.closeAlarm(${idx})">타임라인 보기</button>
          </div>` : ''}
        </div>
        ${foot ? `<div class="v2-alarm-foot">${U.esc(foot)}</div>` : ''}
      </div>`;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('on'));
    try { U.haptic && U.haptic(); } catch (e) {}
    if (c) { this._alarmWeather(c, popup).catch(() => {}); this._alarmTraffic(c, popup).catch(() => {}); }
  },

  /** 알람 카드: 골프장 티오프 시각 날씨 */
  async _alarmWeather(c, popup) {
    // 이 알람 화면 안에서만 찾음 (앞 알람의 늦은 결과가 다음 알람 화면에 들어가지 않게)
    const s = c.s, el = () => (popup && popup.isConnected) ? popup.querySelector('#v2-alarm-wx') : null;
    if (!s.course || !s.course.lat || !s.course.lng || typeof WeatherAPI === 'undefined') return;
    const fc = await WeatherAPI.fetchRoundForecast(s.course.lat, s.course.lng, s.date, (s.timeline || {}).teeOff || s.teeOff);
    const h = fc && fc.hours && fc.hours[0]; const e = el();
    if (!h || !e) return;
    const maxPop = Math.max(...fc.hours.map(x => x.pop || 0));
    if (maxPop >= 50) { e.textContent = `☔ 비 예보 ${maxPop}% · 우산·여벌 옷 챙기세요`; }
    else if (h.temp <= 3) { e.textContent = `🧣 티오프 ${h.temp}° · 쌀쌀해요, 보온 챙기세요`; }
    else { e.textContent = `${h.icon || '🌤️'} 티오프 ${h.text || ''} ${h.temp}°${h.wind ? ' · 바람 ' + h.wind + 'm/s' : ''}`; e.classList.add('soft'); }
    e.hidden = false;
  },

  /** 알람 카드: 로드플래너처럼 내 위치 → 다음 목적지 실시간 소요시간 (평소보다 막히는지) */
  async _alarmTraffic(c, popup) {
    const s = c.s, tl = s.timeline || {};
    const el = () => (popup && popup.isConnected) ? popup.querySelector('#v2-alarm-tr') : null;
    const done = (txt, cls) => { const e = el(); if (!e) return; if (!txt) { e.remove(); return; } e.textContent = txt; if (cls) e.classList.add(cls); };
    if (typeof TmapAPI === 'undefined' || !TmapAPI.getRouteTime) return done('');
    const pt = o => o && (o.lat || o.y) && (o.lng || o.x) ? { lat: +(o.lat || o.y), lng: +(o.lng || o.x), name: o.name } : null;
    let dest = null, plan = 0, target = '';
    if (c.kind === 'meal' || c.kind === 'restDepart') { dest = pt(s.course); plan = tl.restTravelDur; target = tl.arrival; }
    else if (tl.hasMeetingPoint && pt(s.meetingPointObj)) { dest = pt(s.meetingPointObj); plan = tl.homeTravelDur; target = tl.meetArrival; }
    else if (tl.restaurantName && pt(s.mealRestaurant)) { dest = pt(s.mealRestaurant); plan = tl.homeTravelDur; target = tl.mealStart; }
    else { dest = pt(s.course); plan = tl.homeTravelDur || s.travelTime; target = tl.arrival; }
    if (!dest) return done('');
    let from = null;
    if (navigator.geolocation) {
      const pos = await new Promise(res => { try { navigator.geolocation.getCurrentPosition(p => res(p), () => res(null), { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }); } catch (e) { res(null); } });
      if (pos) from = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
    if (!from && s.startLat && s.startLng && c.kind !== 'meal' && c.kind !== 'restDepart') from = { lat: +s.startLat, lng: +s.startLng };
    if (!from) return done('');
    // 길 찾기가 10초 넘게 걸리면 '확인 중'을 지움
    const eta = await Promise.race([TmapAPI.getRouteTime(from.lng, from.lat, dest.lng, dest.lat), new Promise(r => setTimeout(() => r(null), 10000))]);
    if (!eta || eta > 600) return done('');
    const pad = n => String(n).padStart(2, '0');
    const arr = new Date(Date.now() + eta * 60000);
    const arrive = `${pad(arr.getHours())}:${pad(arr.getMinutes())}`;
    const diff = plan ? eta - plan : 0;
    let late = 0;
    if (target) { const t = State.tlAt(s, target); if (t) late = Math.round((arr - t) / 60000); }
    if (late > 0) done(`⏰ 지금 나가도 목표 ${target} 도착보다 ${late}분 늦어요 · ${arrive} 도착`, 'warn');
    else if (diff >= 5) done(`🚦 평소보다 ${diff}분 막혀요 · 지금 나가면 ${arrive} 도착`);
    else if (diff <= -5) done(`🚗 평소보다 ${-diff}분 빨라요 · 지금 나가면 ${arrive} 도착`);
    else done(`🚗 지금 길 ${eta}분 · 지금 나가면 ${arrive} 도착`);
  },

  closeAlarm(idx, opt) {
    // 아이폰: 확인한 알람이 1·2분 뒤 또 울리지 않게 (다시 알림은 snoozeAlarm에서 따로 알림)
    if (!(opt && opt.snooze) && window.NativeApp && NativeApp.ackAlarm) { try { NativeApp.ackAlarm(); } catch (e) { } }
    if (!(opt && opt.snooze)) this._logTrip('ack');
    else this._logTrip('snooze');
    const p = document.getElementById('tl-alarm-popup');
    if (p) { p.classList.remove('on'); setTimeout(() => p.remove(), 250); }
    if (typeof idx === 'number' && idx >= 0 && App.viewTimeline) App.viewTimeline(idx);
  },

  snoozeAlarm() {
    const last = this._alarmCtxLast || {};
    const left = Math.max(0, (this._snoozeLeft || 0) - 1);
    clearTimeout(this._snoozeTimer);
    const at = Date.now() + 5 * 60000;
    // 안드로이드는 폰 알람을 20초 늦게 걸어, 앱이 켜져 있으면 앱 안 타이머가 먼저 울리고 폰 알람을 지울 시간을 줌
    const nativeAt = window.NativeApp && NativeApp.cancelSnooze ? at + 20000 : at;
    this._snoozeTimer = setTimeout(() => {
      if (this._lastRingAt && Date.now() - this._lastRingAt < 60000) return;   // 아이폰 알림이 먼저 울렸으면 한 번만
      if (window.NativeApp && NativeApp.snoozeAlarm && Date.now() - at > 2 * 60000) return;   // 잠금 중 폰 알람이 이미 울림 → 앱을 연 뒤 또 울리지 않게
      // 안드로이드: 앱 안에서 제때 울리면 같은 시각 폰 알람은 지움 (두 번 울리지 않게)
      if (window.NativeApp && NativeApp.cancelSnooze) { try { NativeApp.cancelSnooze(nativeAt); } catch (e) { } }
      this.playAlarmSound(last.msg, last.title, last.iconHtml, last.s ? { s: last.s, time: last.time, _snoozeLeft: left } : null);
    }, 5 * 60000);
    // 아이폰·안드로이드: 앱을 닫거나 화면을 잠가도 5분 뒤 울리게 폰 알람으로도 예약 (앱이 켜져 있으면 위 타이머가 먼저 울리고 폰 알람은 건너뜀/지움)
    if (window.NativeApp && NativeApp.snoozeAlarm) {
      try { NativeApp.snoozeAlarm(nativeAt, last.title || '⏰ 다시 알림', '5분이 지났어요. ' + String(last.msg || ''), last.s && State.aidOf ? State.aidOf(last.s) : ''); } catch (e) { }
    }
    this.closeAlarm(undefined, { snooze: true });
    U.toast('5분 뒤에 다시 알려 드릴게요');
  },

  startBannerUpdater() {
    this.stopBannerUpdater();
    const s = State.schedules[this.schedIdx];
    if (!s || !s.timeline) return;

    const updateBanner = () => {
      const tl = s.timeline;
      const now = Date.now();
      
      const parseTime = (timeStr) => {
        if (!timeStr) return Infinity;
        const td = State.tlAt(s, timeStr);
        return td ? td.getTime() : Infinity;
      };

      const events = [
        { time: parseTime(tl.prepStart), name: '준비 중 (짐 챙기기)' },
        { time: parseTime(tl.homeDepart), name: '목적지로 이동 중 🚗' },
        { time: parseTime(tl.mealStart), name: '식사 중 🍽️' },
        { time: parseTime(tl.restDepart), name: '골프장으로 이동 중 🚙' },
        { time: parseTime(tl.arrival), name: '환복 및 라운딩 준비 🏌️' },
        { time: parseTime(tl.teeOff), name: '라운딩 진행 중 ⛳' },
      ].filter(e => e.time !== Infinity).sort((a, b) => a.time - b.time);

      let currentEvent = null;
      const teeOffTime = parseTime(tl.teeOff);
      const roundOver = teeOffTime !== Infinity && now > teeOffTime + 5 * 60 * 60 * 1000;
      for (let i = roundOver ? -1 : events.length - 1; i >= 0; i--) {
        if (now >= events[i].time) {
          currentEvent = events[i].name;
          break;
        }
      }

      if (State.screen === 'timeline' && Timeline.schedIdx === State.schedules.indexOf(s)) { try { Timeline.markSteps(); } catch (e) {} }
      const banner = U.$('#tl-sticky-banner');
      const bannerText = U.$('#tl-banner-text');
      if (banner && bannerText) {
        if (currentEvent) {
          banner.style.display = 'block';
          bannerText.textContent = '현재 일정: ' + currentEvent;
        } else {
          banner.style.display = 'none';
        }
      }
    };

    updateBanner();
    this.bannerInterval = setInterval(updateBanner, 10000); // 10초마다 갱신
  },

  stopBannerUpdater() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
      this.bannerInterval = null;
    }
  },

  stopAlarmSound() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.oscillator) {
      try { this.oscillator.stop(); this.oscillator.disconnect(); } catch(e) {}
      this.oscillator = null;
    }
    App.closeModal();
  }
};
