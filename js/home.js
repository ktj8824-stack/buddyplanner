/* ========================================================
   BuddyPlanner — Golfzon G Lounge Style Premium Home JS
   ======================================================== */

const Home = {
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

  render() {
    const el = U.$('#screen-home');
    if (!el) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    // 1. 다가오는 라운딩 일정 조회
    const upcomingScheds = (State.schedules || []).filter(s => {
      const d = s.date instanceof Date ? s.date : new Date(s.date);
      return d >= today;
    }).sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return da - db;
    });

    let subTag = '스마트 라운딩 플래너';
    let mainHeading = '첫 라운딩을<br>등록해 보세요.';
    let btnText = '새 일정 등록하기';
    let btnAction = "App.navigate('register')";
    let departTime = '--:--';
    let arrivalTime = '--:--';
    let teeOffTime = '--:--';

    if (upcomingScheds.length > 0) {
      const s = upcomingScheds[0];
      const originalIdx = State.schedules.indexOf(s);
      const cName = s.course ? s.course.name : (s.courseName || '골프장');
      const dateObj = s.date instanceof Date ? s.date : new Date(s.date);
      const dday = typeof U !== 'undefined' && U.dday ? U.dday(dateObj) : 'D-Day';

      // 오늘과의 날짜 차이 계산
      const t = new Date(); t.setHours(0,0,0,0);
      const tg = new Date(dateObj); tg.setHours(0,0,0,0);
      const diffDays = Math.ceil((tg - t) / 864e5);

      btnText = '타임라인 보기';
      btnAction = `App.viewTimeline(${originalIdx})`;

      if (!s.timeline && typeof State !== 'undefined' && State.calculateTimeline) {
        try { State.calculateTimeline(originalIdx); } catch(e){}
      }
      const tl = s.timeline || {};
      departTime = tl.homeDepart || '--:--';
      arrivalTime = tl.arrival || '--:--';
      teeOffTime = tl.teeOff || s.teeOff || '--:--';

      // 큰 문구: 다음 라운딩까지 남은 시간과 '지금 할 일'에 맞춰 바뀜
      const msg = this.heroMessage(s, tl, diffDays, dateObj);
      subTag = `${cName} · ${diffDays <= 0 ? 'D-Day' : dday}`;
      mainHeading = msg.heading;
      if (msg.btnText) { btnText = msg.btnText; btnAction = msg.btnAction || btnAction; }
    }

    // 2. 스코어 기록 데이터 조회
    // 기록이 없으면 예시 숫자 대신 빈 화면 안내를 보여줌
    let hasRecent = false, hasBest = false;
    let recentScore = '--';
    let recentDiff = null;
    let recentDate = '';
    let recentCourse = '';

    let bestScore = '--';
    let bestDiff = null;
    let bestDate = '';
    let bestCourse = '';

    let yearlyCount = 0;

    try {
      const recordsData = localStorage.getItem('bp_records_v1');
      if (recordsData) {
        const records = JSON.parse(recordsData);
        // 키: 'YYYY-MM-DD' 또는 같은 날 추가 라운드 'YYYY-MM-DD#2' (Record.dateOf 참고)
        const dOf = k => (typeof Record !== 'undefined' ? Record.dateOf(k) : String(k).split('#')[0]);
        const sortedDates = Object.keys(records).sort((a, b) => dOf(b) === dOf(a) ? b.localeCompare(a) : dOf(b).localeCompare(dOf(a)));
        
        // 최근 스코어·라이프 베스트는 18홀 라운드만 (9홀 기록은 횟수에만 포함)
        const isNine = r => (typeof Record !== 'undefined' ? Record.isNine(r) : false);
        const full = sortedDates.filter(k => records[k] && typeof records[k].score === 'number' && !isNine(records[k]));
        if (sortedDates.length > 0) {
          const r0 = full.length ? records[full[0]] : null;
          if (r0 && typeof r0.score === 'number') {
            hasRecent = true;
            recentScore = r0.score;
            recentDiff = recentScore - 72;
            recentCourse = r0.course || '';
            const p = dOf(full[0]).split('-');
            if (p.length === 3) {
              recentDate = `${p[0].slice(2)}.${p[1]}.${p[2]}`;
            }
          }

          // 라베(Life Best) 찾기
          let minScore = Infinity;
          let minRec = null;
          let minDateStr = '';
          let thisYearRounds = 0;

          sortedDates.forEach(d => {
            const r = records[d];
            if (r) {
              if (d.startsWith(String(currentYear))) {
                thisYearRounds++;
              }
              if (typeof r.score === 'number' && !isNine(r) && r.score < minScore) {
                minScore = r.score;
                minRec = r;
                minDateStr = d;
              }
            }
          });

          if (minScore !== Infinity && minRec) {
            hasBest = true;
            bestScore = minScore;
            bestDiff = bestScore - 72;
            bestCourse = minRec.course || '';
            const bp = dOf(minDateStr).split("-");
            if (bp.length === 3) {
              bestDate = `${bp[0].slice(2)}.${bp[1]}.${bp[2]}`;
            }
          }

          if (thisYearRounds > 0) {
            yearlyCount = thisYearRounds;
          }
        }
      }
    } catch (e) {
      console.warn('Record data parse warning:', e);
    }

    // 3. 포인트 & 광고 시청 카운트
    const currentPoints = Points.balance();
    const pm = Points.meta();

    // 4. 주간 캘린더 날짜 계산 (일요일 ~ 토요일)
    const currentDay = today.getDay(); // 0: 일요일
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      const dateNum = d.getDate();
      const dayName = dayNames[i];

      const hasSchedule = (State.schedules || []).some(s => {
        const sDate = s.date instanceof Date ? s.date : new Date(s.date);
        return sDate.toDateString() === d.toDateString();
      });

      weekDays.push({
        dayName,
        dateNum,
        isToday,
        hasSchedule,
        dayIdx: i
      });
    }

    el.innerHTML = `
      <div class="screen-scroll dash-scroll bg-light">
        
        <!-- 1. Top G Lounge Dark Section -->
        <div class="home-glounge-wrapper">

          <!-- Hero Banner Content (2-Column: Left Text+Timeline+Btn, Right 3D Golfer Figure) -->
          <div class="home-glounge-hero">
            <div class="glounge-hero-text">
              <div class="hero-sub-tag">${subTag}</div>
              <div class="hero-main-title">${mainHeading}</div>

              <!-- Mini Timeline (출발 - 골프장 - 티오프, 위치: 타임라인 보기 바로 위) -->
              ${upcomingScheds.length === 0 ? `<div class="hero-empty-hint">골프장·티오프만 넣으면<br>출발 시간이 자동 계산돼요</div>` : ''}
              <div class="hero-inline-timeline" onclick="${btnAction}" ${upcomingScheds.length === 0 ? 'style="display:none"' : ''}>
                <div class="mini-tl-node">
                  <span class="mini-tl-tag tag-depart">출발</span>
                  <span class="mini-tl-val">${departTime}</span>
                </div>
                <div class="mini-tl-arrow">
                  <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.5" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                </div>
                <div class="mini-tl-node">
                  <span class="mini-tl-tag tag-arrival">골프장</span>
                  <span class="mini-tl-val">${arrivalTime}</span>
                </div>
                <div class="mini-tl-arrow">
                  <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.5" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                </div>
                <div class="mini-tl-node highlight">
                  <span class="mini-tl-tag tag-teeoff">티오프</span>
                  <span class="mini-tl-val">${teeOffTime}</span>
                </div>
              </div>

              <!-- 타임라인 보기 버튼 -->
              <button class="glounge-pill-btn" onclick="${btnAction}">
                ${btnText}
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>

            <!-- 3D Golfer Figure (자연스러운 잔디 & 배경 블렌딩) -->
            <div class="glounge-hero-figure">
              <img src="img/glounge_hero_golfer.png" alt="Golfer 3D" />
            </div>
          </div>
        </div>

        <!-- 2. White Curved Bottom Sheet -->
        <div class="home-glounge-sheet">
          
          <!-- Points & Ad Reward Card (Full Width Slim) -->
          <div class="glounge-point-card" style="margin-bottom: 18px; background: #ffffff; border: 1px solid #eef2f6; border-radius: 16px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 13px; color: #64748b; font-weight: 700;">내 포인트</span>
              <span style="font-size: 16px; font-weight: 800; color: var(--accent); font-family: 'Montserrat', sans-serif;">
                <span data-points>${currentPoints.toLocaleString()}</span> <span style="font-size: 11px; color: #94a3b8;">P</span>
              </span>
            </div>
            <button class="ad-reward-btn" style="padding: 6px 12px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px; border-radius: 8px; border: none; cursor: pointer; width: auto; margin: 0;" onclick="Profile.watchAd()">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> 
              광고 시청 ${pm.ad_points}P <span data-ad-count style="font-size: 10px; opacity: 0.85;">${pm.ad_today}/${pm.ad_limit}</span>
            </button>
          </div>

          <!-- 그다음 라운딩: 가장 가까운 라운딩은 맨 위에 이미 나오므로, 2개 이상일 때 두 번째부터만 -->
          ${upcomingScheds.length > 1 ? `
            <div class="glounge-upcoming-box">
              <div class="upcoming-head">
                <span class="upcoming-title">그다음 라운딩</span>
                <button class="upcoming-more-btn" onclick="App.navigate('calendar')">전체보기 &gt;</button>
              </div>
              ${upcomingScheds.slice(1, 3).map((sched, idx) => {
                const cName = sched.course ? sched.course.name : (sched.courseName || '골프장');
                const dObj = sched.date instanceof Date ? sched.date : new Date(sched.date);
                const dStr = `${dObj.getMonth() + 1}월 ${dObj.getDate()}일 (${U.DAYS ? U.DAYS[dObj.getDay()] : '일'})`;
                const tTime = sched.teeOff || sched.teeTime || '07:00';
                const origIdx = State.schedules.indexOf(sched);
                return `
                  <div class="upcoming-item" style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="App.viewTimeline(${origIdx})">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div style="width:36px; height:36px; border-radius:10px; background:#eff6ff; color:#007aff; display:flex; align-items:center; justify-content:center; font-size:16px;">⛳</div>
                      <div>
                        <div style="font-size:13.5px; font-weight:800; color:#0f172a;">${cName}</div>
                        <div style="font-size:11.5px; color:#64748b;">${dStr} · ${tTime}</div>
                      </div>
                    </div>
                    <div style="font-size:12px; font-weight:700; color:#007aff; background:#eff6ff; padding:4px 8px; border-radius:6px;">
                      타임라인 보기
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          <!-- Modern Weekly Calendar Strip Card (올해 라운드 바로 밑에 배치) -->
          <div class="glounge-week-card">
            <div class="week-card-head">
              <span class="week-card-title">${today.getMonth() + 1}월 일정</span>
              <button class="week-add-btn" onclick="App.navigate('register')">
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                일정등록
              </button>
            </div>

            <div class="week-card-grid" onclick="App.navigate('calendar')">
              ${weekDays.map(item => {
                let dayColor = '#94a3b8';
                if (item.dayIdx === 0) dayColor = '#ef4444'; // 일요일 빨강
                if (item.dayIdx === 6) dayColor = '#3b82f6'; // 토요일 파랑
                
                return `
                  <div class="week-day-col">
                    <span class="week-day-name" style="color: ${dayColor};">${item.dayName}</span>
                    <div class="week-day-num ${item.isToday ? 'is-today' : ''}">
                      ${item.dateNum}
                    </div>
                    ${item.hasSchedule ? '<span class="week-sched-dot"></span>' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Core Tool Quick Launch Grid: 위 2칸(일정등록·단체등록) + 아래 4칸 -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div onclick="App.navigate('register')" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px; display:flex; align-items:center; gap:10px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease; min-width:0;">
              <div style="width:40px; height:40px; border-radius:12px; background:#eff6ff; display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;"><img src="img/icons/register.png?v=1" alt="" style="width:28px;height:28px;object-fit:contain;pointer-events:none;"></div>
              <div style="min-width:0;"><span style="font-size:14px; font-weight:800; color:#0f172a; display:block;">일정등록</span><span style="font-size:11px; color:#94a3b8; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">내 라운딩 · 출발 알람</span></div>
            </div>
            <div onclick="Group.openList()" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px; display:flex; align-items:center; gap:10px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease; min-width:0;">
              <div style="width:40px; height:40px; border-radius:12px; background:#fef9c3; display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;"><img src="img/icons/group.png?v=1" alt="" style="width:28px;height:28px;object-fit:contain;pointer-events:none;"></div>
              <div style="min-width:0;"><span style="font-size:14px; font-weight:800; color:#0f172a; display:block;">단체등록</span><span style="font-size:11px; color:#94a3b8; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">모임 참석 · 조 · 차량</span></div>
            </div>
          </div>
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px;">
            <div onclick="App.navigate('timeline')" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 4px; text-align:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease;">
              <div style="width:38px; height:38px; border-radius:12px; background:#f0fdf4; color:#10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:18px;"><img src="img/icons/timeline.png?v=1" alt="" style="width:28px;height:28px;object-fit:contain;pointer-events:none;"></div>
              <span style="font-size:11.5px; font-weight:700; color:#334155; display:block;">타임라인</span>
            </div>
            <div onclick="App.navigate('market')" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 4px; text-align:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease;">
              <div style="width:38px; height:38px; border-radius:12px; background:#ecfeff; color:#0891b2; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:18px;"><img src="img/icons/market.png?v=1" alt="" style="width:28px;height:28px;object-fit:contain;pointer-events:none;"></div>
              <span style="font-size:11.5px; font-weight:700; color:#334155; display:block;">마켓</span>
            </div>
            ${App.COMMUNITY_OPEN ? `<div onclick="App.navigate('community')" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 4px; text-align:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease;">
              <div style="width:38px; height:38px; border-radius:12px; background:#faf5ff; color:#9333ea; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:18px;"><img src="img/icons/community.png?v=1" alt="" style="width:28px;height:28px;object-fit:contain;pointer-events:none;"></div>
              <span style="font-size:11.5px; font-weight:700; color:#334155; display:block;">커뮤니티</span>
            </div>` : `<div onclick="App.navigate('raffle')" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 4px; text-align:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease;">
              <div style="width:38px; height:38px; border-radius:12px; background:#faf5ff; color:#9333ea; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:18px;"><img src="img/icons/raffle.png?v=1" alt="" style="width:28px;height:28px;object-fit:contain;pointer-events:none;"></div>
              <span style="font-size:11.5px; font-weight:700; color:#334155; display:block;">럭키드로우</span>
            </div>`}
            <div onclick="App.navigate('restaurant')" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 4px; text-align:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease;">
              <div style="width:38px; height:38px; border-radius:12px; background:#fff7ed; color:#ea580c; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:18px;"><img src="img/icons/restaurant.png?v=1" alt="" style="width:28px;height:28px;object-fit:contain;pointer-events:none;"></div>
              <span style="font-size:11.5px; font-weight:700; color:#334155; display:block;">추천맛집</span>
            </div>
          </div>

          <!-- Dual Score Cards (Restored Pastel Colors & 3D Characters) -->
          <div class="glounge-score-grid">
            
            <!-- Left Card: Recent Score (Soft Sky Blue + 3D Golfer) -->
            <div class="glounge-score-card card-blue ${hasRecent ? '' : 'is-empty'}" onclick="${hasRecent ? "App.navigate('record')" : 'Home.openScoreForm()'}">
              <div class="card-label-blue card-label-row"><span>최근 스코어</span>${hasRecent ? `<span class="card-label-date">${recentDate}</span>` : ''}</div>
              ${hasRecent ? `<div class="card-score-row">
                <span class="card-score-num">${recentScore}</span>
                <span class="card-score-diff">(${recentDiff >= 0 ? '+' + recentDiff : recentDiff})</span>
              </div>
              <div class="card-meta-info">
                <span class="card-meta-course">${U.esc(recentCourse)}</span>
              </div>` : `<div class="card-empty-cta">스코어 등록하기 ›</div>
              <div class="card-meta-info"><span class="card-meta-date">라운딩 후 남겨 보세요</span></div>`}
              <div class="card-corner-thumb">
                <img src="img/glounge_thumb_golfer.jpg?v=restore" alt="Golfer Thumbnail" />
              </div>
            </div>

            <!-- Right Card: Life Best (Soft Warm Cream Gold + 3D Trophy) -->
            <div class="glounge-score-card card-gold ${hasBest ? '' : 'is-empty'}" onclick="${hasBest ? "App.navigate('record')" : 'Home.openScoreForm()'}">
              <div class="card-label-gold card-label-row"><span>라이프 베스트</span>${hasBest ? `<span class="card-label-date gold">${bestDate}</span>` : ''}</div>
              ${hasBest ? `<div class="card-score-row">
                <span class="card-score-num gold">${bestScore}</span>
                <span class="card-score-diff gold">(${bestDiff >= 0 ? '+' + bestDiff : bestDiff})</span>
              </div>
              <div class="card-meta-info">
                <span class="card-meta-course gold">${U.esc(bestCourse)}</span>
              </div>` : `<div class="card-empty-cta gold">첫 기록 남기기 ›</div>
              <div class="card-meta-info"><span class="card-meta-date gold">최고 기록이 쌓여요</span></div>`}
              <div class="card-corner-thumb">
                <img src="img/glounge_gold_trophy.jpg" alt="Gold Trophy" />
              </div>
            </div>
          </div>

          <!-- Sleek Yearly Round Stat Card (가로 바 레이아웃 + 3D 원형 배지 아이콘) -->
          <div class="glounge-round-stat-card ${yearlyCount > 0 ? '' : 'is-empty'}" onclick="${yearlyCount > 0 ? "App.navigate('record')" : 'Home.openScoreForm()'}">
            <div class="stat-left">
              <div class="stat-3d-icon-wrap">
                <img src="img/glounge_round_flag.jpg" alt="Round Icon" />
              </div>
              <div class="stat-text-wrap">
                <div class="stat-title">올해 라운드</div>
                <div class="stat-desc">${yearlyCount > 0 ? `올해 <strong>${yearlyCount}번</strong>의 라운드를 즐기고 계시네요.` : '스코어를 남기면 횟수가 쌓여요.'}</div>
              </div>
            </div>
            <div class="stat-right">
              ${yearlyCount > 0 ? `<div class="stat-badge-num">
                <span class="num">${yearlyCount}</span><span class="unit">회</span>
              </div>
              <div class="stat-badge-year">${currentYear}년 누적</div>` : `<span class="stat-empty-cta">기록하기 ›</span>`}
            </div>
          </div>



        </div>
      </div>
    `;
  }
};
