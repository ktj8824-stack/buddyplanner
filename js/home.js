/* ========================================================
   BuddyPlanner — Golfzon G Lounge Style Premium Home JS
   ======================================================== */

const Home = {
  init() {
    this.render();
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
    let mainHeading = '다음 라운딩 일정을 등록하고,<br>스마트 타임라인을 경험해 보세요.';
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

      // D-Day 연동 동적 헤딩 문구 (상단 태그에 골프장명과 D-Day가 이미 표시되므로 중복 제거)
      if (diffDays === 0 || dday === 'D-Day') {
        subTag = `${cName} · D-Day`;
        mainHeading = `티오프 전 여유로운 출발,<br>지금 시작해 보세요.`;
        btnText = '출발 타임라인 확인';
      } else if (diffDays >= 1 && diffDays <= 3) {
        subTag = `${cName} · ${dday}`;
        mainHeading = `티오프까지 완벽한<br>스마트 동선을 안내합니다.`;
      } else {
        subTag = `${cName} · ${dday}`;
        mainHeading = `티오프 맞춤 역산과<br>최적 동선을 확인하세요.`;
      }

      if (!s.timeline && typeof State !== 'undefined' && State.calculateTimeline) {
        try { State.calculateTimeline(originalIdx); } catch(e){}
      }
      const tl = s.timeline || {};
      departTime = tl.homeDepart || '05:20';
      arrivalTime = tl.arrival || '06:20';
      teeOffTime = tl.teeOff || s.teeOff || '07:00';
    }

    // 2. 스코어 기록 데이터 조회
    let recentScore = 85;
    let recentDiff = 13;
    let recentDate = '26.10.11';
    let recentCourse = 'THE HEAVEN CC';

    let bestScore = 85;
    let bestDiff = 13;
    let bestDate = '26.10.11';
    let bestCourse = 'THE HEAVEN CC';

    let yearlyCount = 3;

    try {
      const recordsData = localStorage.getItem('bp_records_v1');
      if (recordsData) {
        const records = JSON.parse(recordsData);
        const sortedDates = Object.keys(records).sort((a, b) => new Date(b) - new Date(a));
        
        if (sortedDates.length > 0) {
          const r0 = records[sortedDates[0]];
          if (r0 && typeof r0.score === 'number') {
            recentScore = r0.score;
            recentDiff = recentScore - 72;
            recentCourse = r0.course || recentCourse;
            const p = sortedDates[0].split('-');
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
            if (r && typeof r.score === 'number') {
              if (d.startsWith(String(currentYear))) {
                thisYearRounds++;
              }
              if (r.score < minScore) {
                minScore = r.score;
                minRec = r;
                minDateStr = d;
              }
            }
          });

          if (minScore !== Infinity && minRec) {
            bestScore = minScore;
            bestDiff = bestScore - 72;
            bestCourse = minRec.course || bestCourse;
            const bp = minDateStr.split('-');
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
    const currentPoints = parseInt(localStorage.getItem('bp_points') || '0', 10);
    const todayStr = new Date().toLocaleDateString('ko-KR');
    const adCount = (localStorage.getItem('bp_ad_date') === todayStr) ? parseInt(localStorage.getItem('bp_ad_count') || '0', 10) : 0;

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
              <div class="hero-inline-timeline" onclick="${btnAction}">
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
          
          <!-- Dual Score Cards (Restored Pastel Colors & 3D Characters) -->
          <div class="glounge-score-grid">
            
            <!-- Left Card: Recent Score (Soft Sky Blue + 3D Golfer) -->
            <div class="glounge-score-card card-blue" onclick="App.navigate('record')">
              <div class="card-label-blue">최근 스코어</div>
              <div class="card-score-row">
                <span class="card-score-num">${recentScore}</span>
                <span class="card-score-diff">(${recentDiff >= 0 ? '+' + recentDiff : recentDiff})</span>
              </div>
              <div class="card-meta-info">
                <span class="card-meta-date">${recentDate}</span>
                <span class="card-meta-course">${recentCourse}</span>
              </div>
              <div class="card-corner-thumb">
                <img src="img/glounge_thumb_golfer.jpg?v=restore" alt="Golfer Thumbnail" />
              </div>
            </div>

            <!-- Right Card: Life Best (Soft Warm Cream Gold + 3D Trophy) -->
            <div class="glounge-score-card card-gold" onclick="App.navigate('record')">
              <div class="card-label-gold">라이프 베스트</div>
              <div class="card-score-row">
                <span class="card-score-num gold">${bestScore}</span>
                <span class="card-score-diff gold">(${bestDiff >= 0 ? '+' + bestDiff : bestDiff})</span>
              </div>
              <div class="card-meta-info">
                <span class="card-meta-date gold">${bestDate}</span>
                <span class="card-meta-course gold">${bestCourse}</span>
              </div>
              <div class="card-corner-thumb">
                <img src="img/glounge_gold_trophy.jpg" alt="Gold Trophy" />
              </div>
            </div>
          </div>

          <!-- Sleek Yearly Round Stat Card (가로 바 레이아웃 + 3D 원형 배지 아이콘) -->
          <div class="glounge-round-stat-card" onclick="App.navigate('record')">
            <div class="stat-left">
              <div class="stat-3d-icon-wrap">
                <img src="img/glounge_round_flag.jpg" alt="Round Icon" />
              </div>
              <div class="stat-text-wrap">
                <div class="stat-title">올해 라운드</div>
                <div class="stat-desc">올해 <strong>${yearlyCount}번</strong>의 라운드를 즐기고 계시네요.</div>
              </div>
            </div>
            <div class="stat-right">
              <div class="stat-badge-num">
                <span class="num">${yearlyCount}</span><span class="unit">회</span>
              </div>
              <div class="stat-badge-year">${currentYear}년 누적</div>
            </div>
          </div>

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

          <!-- Points & Ad Reward Card (Full Width Slim) -->
          <div class="glounge-point-card" style="margin-bottom: 18px; background: #ffffff; border: 1px solid #eef2f6; border-radius: 16px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 13px; color: #64748b; font-weight: 700;">내 포인트</span>
              <span style="font-size: 16px; font-weight: 800; color: var(--accent); font-family: 'Montserrat', sans-serif;">
                ${currentPoints.toLocaleString()} <span style="font-size: 11px; color: #94a3b8;">P</span>
              </span>
            </div>
            <button class="ad-reward-btn" style="padding: 6px 12px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px; border-radius: 8px; border: none; cursor: pointer; width: auto; margin: 0;" onclick="Profile.watchAd()">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> 
              광고 시청 50P <span style="font-size: 10px; opacity: 0.85;">(${adCount}/20)</span>
            </button>
          </div>

          <!-- Core Tool Quick Launch Grid -->
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
            <div onclick="App.navigate('register')" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 6px; text-align:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease;">
              <div style="width:38px; height:38px; border-radius:12px; background:#eff6ff; color:#007aff; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:18px;">⛳</div>
              <span style="font-size:11.5px; font-weight:700; color:#334155; display:block;">일정등록</span>
            </div>
            <div onclick="App.navigate('timeline')" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 6px; text-align:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease;">
              <div style="width:38px; height:38px; border-radius:12px; background:#f0fdf4; color:#10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:18px;">⏱️</div>
              <span style="font-size:11.5px; font-weight:700; color:#334155; display:block;">타임라인</span>
            </div>
            <div onclick="App.navigate('restaurant')" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 6px; text-align:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease;">
              <div style="width:38px; height:38px; border-radius:12px; background:#fff7ed; color:#ea580c; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:18px;">🍽️</div>
              <span style="font-size:11.5px; font-weight:700; color:#334155; display:block;">추천맛집</span>
            </div>
            <div onclick="App.navigate('community')" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:12px 6px; text-align:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.02); transition:transform 0.15s ease;">
              <div style="width:38px; height:38px; border-radius:12px; background:#faf5ff; color:#9333ea; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:18px;">💬</div>
              <span style="font-size:11.5px; font-weight:700; color:#334155; display:block;">커뮤니티</span>
            </div>
          </div>

          <!-- Upcoming Schedule Mini Pass (If scheduled) -->
          ${upcomingScheds.length > 0 ? `
            <div class="glounge-upcoming-box">
              <div class="upcoming-head">
                <span class="upcoming-title">다가오는 라운딩</span>
                <button class="upcoming-more-btn" onclick="App.navigate('calendar')">전체보기 &gt;</button>
              </div>
              ${upcomingScheds.slice(0, 2).map((sched, idx) => {
                const cName = sched.course ? sched.course.name : (sched.courseName || '골프장');
                const dObj = sched.date instanceof Date ? sched.date : new Date(sched.date);
                const dStr = `${dObj.getMonth() + 1}월 ${dObj.getDate()}일 (${U.DAYS ? U.DAYS[dObj.getDay()] : '일'})`;
                const tTime = sched.teeOff || sched.teeTime || '07:00';
                const origIdx = State.schedules.indexOf(sched);
                return `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="App.viewTimeline(${origIdx})">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div style="width:36px; height:36px; border-radius:10px; background:#eff6ff; color:#007aff; display:flex; align-items:center; justify-content:center; font-size:16px;">⛳</div>
                      <div>
                        <div style="font-size:13.5px; font-weight:800; color:#0f172a;">${cName}</div>
                        <div style="font-size:11.5px; color:#64748b;">${dStr} · ${tTime}</div>
                      </div>
                    </div>
                    <div style="font-size:12px; font-weight:700; color:#059669; background:#ecfdf5; padding:4px 8px; border-radius:6px;">
                      역산 확인
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }
};
