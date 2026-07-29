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

    el.innerHTML = `
      <div class="header">
        <button class="header-btn" onclick="App.navigate('calendar')">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 class="header-title">스마트 타임라인</h1>
        <button class="header-btn" onclick="U.downloadICS(State.schedules[${this.schedIdx}])">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
      </div>

      <!-- Sticky Event Banner -->
      <div id="tl-sticky-banner" style="display:none; flex-shrink:0; z-index:90; background:var(--accent); color:#fff; padding:12px 16px; font-size:14px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.15); transition:all 0.3s ease;">
        <span style="font-weight:var(--fw-bold);" id="tl-banner-text">현재 진행 중인 일정 없음</span>
      </div>

      <div class="screen-scroll" style="padding-top:0;">
        <!-- Hero -->
        <div class="tl-hero">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h2 class="tl-course" style="margin:0;"><span class="accent">${s.course.name}</span></h2>
            <div class="tl-dday" style="display:inline-flex; align-items:center; gap:6px; font-size:15px; padding:6px 12px; margin:0;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${dday}</span>
            </div>
          </div>
          <div class="tl-meta" style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${dateStr}
            </span>
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${U.fmtTimeKo(s.teeOff)}
            </span>
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;"><path d="M12 2c3.866 0 7 3.134 7 7 0 5.25-7 13-7 13S5 14.25 5 9c0-3.866 3.134-7 7-7z"></path><circle cx="12" cy="9" r="2.5"></circle></svg>
              ${s.course.region}
            </span>
          </div>
        </div>


        <!-- Timeline -->
        <div class="tl-section">
          <div class="tl-head" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
            <div style="flex: 1; min-width: 0;">
              <h3 class="tl-title" style="display:flex; align-items:center; gap:6px; margin-bottom: 4px;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                타임라인
              </h3>
              <p class="tl-sub">${tl.hasMeal ? '출발지 → 식당 → 골프코스 동선 연산' : '출발지 → 골프코스 최적 경로'}</p>
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end;">
              <button id="tl-alarm-btn" onclick="Timeline.toggleAlarm()" style="border:1px solid var(--accent); background:transparent; color:var(--accent); cursor:pointer; padding: 4px 12px; font-size: 13px; font-weight: bold; border-radius: 20px; line-height: 1.2; white-space: nowrap; transition:all 0.3s ease;">
                🔔 알람 켜기
              </button>
              <button style="border:1px solid var(--gold-500); background:var(--gold-dim); color:var(--gold-400); cursor:pointer; padding: 4px 12px; font-size: 13px; font-weight: bold; border-radius: 20px; line-height: 1.2; white-space: nowrap;" onclick="Register.edit(${this.schedIdx})">
                ✏️ 일정 수정
              </button>
            </div>
          </div>

          <div class="tl-list">
            ${this.renderTimelineItems(s, tl)}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-acts" style="display:flex; gap:12px; padding:0 var(--sp-5) var(--sp-5);">
          <button class="qact" onclick="App.navigate('restaurant')">
            <span class="qact-icon" style="display:inline-flex; width:36px; height:36px; align-items:center; justify-content:center; border-radius:50%; background:rgba(255, 149, 0, 0.15); color:var(--ios-orange);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px; height:20px;"><path d="M12 2c3.866 0 7 3.134 7 7 0 5.25-7 13-7 13S5 14.25 5 9c0-3.866 3.134-7 7-7z"></path><circle cx="12" cy="9" r="2.5"></circle></svg>
            </span>
            <span>주변 맛집</span>
          </button>
          <button class="qact" onclick="Timeline.showChecklist()">
            <span class="qact-icon" style="display:inline-flex; width:36px; height:36px; align-items:center; justify-content:center; border-radius:50%; background:var(--accent-dim); color:var(--accent);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:20px; height:20px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
            <span>준비물 체크</span>
          </button>
          <button class="qact" onclick="Timeline.shareTimeline()">
            <span class="qact-icon" style="display:inline-flex; width:36px; height:36px; align-items:center; justify-content:center; border-radius:50%; background:rgba(254, 229, 0, 0.2); color:#3c1e1e;">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px; height:20px;"><path d="M12 3c-5.523 0-10 3.553-10 7.938 0 2.825 1.83 5.303 4.606 6.744l-1.01 3.7c-.053.195.166.353.332.227l4.316-2.82c.575.08 1.162.124 1.756.124 5.523 0 10-3.553 10-7.938C22 6.553 17.523 3 12 3z"/></svg>
            </span>
            <span>일정 공유</span>
          </button>
          <button class="qact" onclick="U.downloadICS(State.schedules[${this.schedIdx}])">
            <span class="qact-icon" style="display:inline-flex; width:36px; height:36px; align-items:center; justify-content:center; border-radius:50%; background:rgba(142, 142, 147, 0.15); color:var(--text-300);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px; height:18px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </span>
            <span>일정 캘린더</span>
          </button>
          <button class="qact" onclick="U.openNativeAlarm(${this.schedIdx})">
            <span class="qact-icon" style="display:inline-flex; width:36px; height:36px; align-items:center; justify-content:center; border-radius:50%; background:rgba(255, 59, 48, 0.15); color:var(--ios-red);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px; height:20px;"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2"></path><path d="M5 3L2 6"></path><path d="M19 3l3 3"></path></svg>
            </span>
            <span>기상 알람</span>
          </button>
        </div>

        <!-- Companions -->
        ${this.renderCompanions(s.companions)}

        <!-- Delete Plan -->
        <div style="padding:var(--sp-4) var(--sp-5) calc(var(--sp-5) * 2); text-align:center;">
          <button class="btn" style="background:transparent; border:1px solid rgba(255,59,48,0.3); color:var(--red-400); width:100%; font-size:var(--fs-sm);" onclick="Timeline.deleteSchedule()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:-3px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            이 일정 삭제하기
          </button>
        </div>
      </div>
    `;

      this.hidePastItems();
      setTimeout(() => U.stagger(U.$('.tl-list'), '.tl-item:not([style*="display: none"])', 120), 200);
      
      this.startBannerUpdater();
    } catch (e) {
      console.error('Timeline render crash', e);
      el.innerHTML = `<div class="empty">
        <div class="empty-icon">❌</div>
        <h2 class="empty-title">화면을 불러오지 못했습니다.</h2>
        <p class="empty-desc" style="color:var(--red-400); font-size:12px; margin-top:10px;">${e.toString()}</p>
        <button class="btn" style="margin-top:20px;" onclick="App.navigate('calendar')">돌아가기</button>
      </div>`;
    }
  },

  hidePastItems() {
    const s = State.schedules[this.schedIdx];
    if (!s) return;
    
    // We only hide items if the schedule date is today or in the past
    // If it's in the future, we don't hide anything.
    const now = new Date();
    let isToday = false;
    let isPastDate = false;

    if (s.date) {
      const sDate = new Date(s.date);
      if (sDate.getFullYear() === now.getFullYear() && sDate.getMonth() === now.getMonth() && sDate.getDate() === now.getDate()) {
        isToday = true;
      } else if (sDate < now) {
        isPastDate = true;
      }
    } else {
      // If no date is set, assume it's today for demonstration purposes
      isToday = true;
    }

    if (!isToday && !isPastDate) {
      // Future date - mark the first item as 'now'
      const firstItem = U.$('.tl-item');
      if (firstItem) firstItem.classList.add('now');
      return;
    }

    const items = document.querySelectorAll('.tl-item');
    let foundNow = false;

    // Extract times for all items first
    const itemData = Array.from(items).map(item => {
      const timeEl = item.querySelector('.tl-time');
      let timeTotal = 0;
      if (timeEl) {
        const [h, m] = timeEl.innerText.trim().split(':').map(Number);
        timeTotal = h * 60 + m;
      }
      return { item, time: timeTotal };
    });

    const nowTotal = now.getHours() * 60 + now.getMinutes();

    itemData.forEach((data, index) => {
      const { item, time } = data;
      if (time === 0) return; // Skip items without time
      
      let isPastTime = false;
      let shouldHide = false;

      if (isPastDate) {
        isPastTime = true;
        shouldHide = false; // Do not hide for past days
      } else if (isToday) {
        // An event is only fully "past" (and hidden) if the NEXT event has already started
        let nextTime = Infinity;
        if (index < itemData.length - 1) {
          nextTime = itemData[index + 1].time;
        } else {
          // If it's the very last event (e.g. arrival), hide it 2 hours after it begins
          nextTime = time + 120;
        }

        if (nextTime <= nowTotal) {
          isPastTime = true;
          shouldHide = true; // Hide if the NEXT schedule has arrived
        }
      }

      if (isPastTime) {
        if (shouldHide) {
          item.style.display = 'none';
        } else {
          item.style.display = 'block';
        }
        item.classList.remove('now');
        item.classList.add('done');
      } else {
        item.style.display = 'block';
        if (!foundNow) {
          item.classList.add('now'); // This makes the CURRENTLY ongoing event highlighted!
          foundNow = true;
        } else {
          item.classList.remove('now');
        }
      }
    });

    // If all items are in the past and hidden, maybe show a message
    const visibleItems = document.querySelectorAll('.tl-item[style*="display: block"]');
    if (visibleItems.length === 0) {
      const list = U.$('.tl-list');
      if (list && !U.$('.tl-empty-msg')) {
        list.innerHTML += `<div class="tl-empty-msg" style="text-align:center; padding:40px 20px; color:var(--text-400);">모든 일정이 종료되었습니다. 수고하셨습니다! 👏</div>`;
      }
    }
  },

  deleteSchedule() {
    if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
      State.schedules.splice(this.schedIdx, 1);
      State.saveSchedules();
      App.navigate('home');
      U.toast('🗑️ 일정이 삭제되었습니다.');
    }
  },



  shareTimeline() {
    const s = State.schedules[this.schedIdx];
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
    const baseDomain = 'https://buddyplanner.kr';

    // ── 타임라인 공유하기(텍스트 복사) 용: 기존 풀 JSON 방식 (#shared=) ─────
    // 이 방식은 항상 작동하고, URL 길이 제한이 없어 모든 일정 정보가 정상 복원됩니다.
    const compactSched = { ...s };
    delete compactSched.timeline;
    compactSched.companions = [];
    const fullPayload = encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(compactSched))));
    const textShareUrl = baseDomain + '/#shared=' + fullPayload;

    // ── 카카오톡 공유 용: 초경량 압축 방식 (?s=) ────────────────────────────
    // 카카오 서버의 URL 길이 제한을 피하기 위해 핵심 정보만 압축해서 전송
    const c = s.course || {};
    const r = s.mealRestaurant || {};
    const arr = [
      s.date || '',
      s.teeOff || '',
      s.startPoint || '집',
      c.name || '',
      c.lat || '',
      c.lng || '',
      r.name || '',
      r.lat || '',
      r.lng || '',
      s.prepTime || 30,
      s.travelTime || 60,
      s.hasMeal ? 1 : 0,
      s.mealDuration || 0,
      s.travelToRestaurant || 0
    ];
    const kakaoPayload = encodeURIComponent(arr.join('|'));
    const kakaoShareUrl = baseDomain + '/?s=' + kakaoPayload;

    const dateStr = U.fmtDateShort(s.date);
    const startPt = s.startPoint || '집';
    const cName = s.course ? s.course.name : '골프장';
    
    let textStr = `⛳ [버디플래너] 라운딩 타임라인 안내 ⛳\n\n`;
    textStr += `📅 일시: ${dateStr}\n`;
    textStr += `📍 장소: ${cName}\n`;
    textStr += `⏰ 티오프: ${s.teeOff}\n\n`;
    textStr += `🚗 [이동 동선 & 시간표]\n`;
    textStr += `[${tl.homeDepart}] 출발 (${startPt})\n`;
    
    if (tl.hasMeal) {
      const rName = s.mealRestaurant ? s.mealRestaurant.name : '식당';
      textStr += `[${tl.mealStart}] 식당 도착 (${rName})\n`;
      textStr += `[${tl.restDepart}] 식당 출발\n`;
    }
    
    textStr += `[${tl.arrival}] 골프장 도착\n`;
    textStr += `[${s.teeOff}] 라운딩 시작\n`;
    
    const teeParts = (s.teeOff||'07:00').split(':');
    const playEndMins = parseInt(teeParts[0],10)*60 + parseInt(teeParts[1],10) + 300;
    const playEndHH = Math.floor(playEndMins/60).toString().padStart(2,'0');
    const playEndMM = (playEndMins%60).toString().padStart(2,'0');
    textStr += `[${playEndHH}:${playEndMM}] 라운딩 종료\n`;
    textStr += `[${tl.returnStart}] 귀가 출발\n`;
    textStr += `[${tl.returnEnd}] 귀가 완료\n\n`;
    textStr += `🔗 [자세한 타임라인 & 내비게이션 보기]\n${textShareUrl}`;

    this.showShareModal(textStr, textShareUrl, kakaoShareUrl, s);
  },

  showShareModal(shareText, textShareUrl, kakaoShareUrl, s) {
    Timeline._pendingShareText = shareText;
    Timeline._pendingShareUrl = kakaoShareUrl;    // 카카오용 짧은 URL
    Timeline._pendingTextUrl  = textShareUrl;      // 텍스트 복사용 풀 URL
    Timeline._pendingShareS = s;

    let modal = U.$('#share-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'share-modal';
      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; box-sizing:border-box; backdrop-filter:blur(5px);';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div style="background:var(--bg-card); border-radius:24px; width:100%; max-width:400px; padding:24px; text-align:center; position:relative; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <button onclick="document.getElementById('share-modal').style.display='none'" style="position:absolute; top:16px; right:16px; background:none; border:none; color:var(--text-300); font-size:24px; cursor:pointer;">✕</button>
        <h3 style="margin:0 0 16px 0; color:var(--text-100); font-size:18px;">공유 준비 완료! 🎉</h3>
        <p style="font-size:13px; color:var(--text-300); margin-bottom:24px; line-height:1.4;">원하시는 공유 방식을 선택해주세요!</p>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <button onclick="Timeline.executeKakaoShare()" style="background:#FEE500; color:#3c1e1e; border:none; padding:16px; border-radius:12px; font-weight:700; font-size:16px; cursor:pointer;">
            💬 카카오톡 일정 링크 공유
          </button>
          <button onclick="Timeline.copyDetailedText()" style="background:var(--bg-input); color:var(--text-100); border:1px solid var(--border-color); padding:16px; border-radius:12px; font-weight:700; font-size:16px; cursor:pointer;">
            🔗 타임라인 공유하기
          </button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  },

  copyDetailedText() {
    const text = Timeline._pendingShareText;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      U.toast('✅ 상세 타임라인이 복사되었습니다! 카톡이나 문자에 붙여넣기 하세요.', 3000);
      document.getElementById('share-modal').style.display = 'none';
    } catch(e) {
      U.toast('복사를 지원하지 않는 기기입니다.');
    }
  },

  executeKakaoShare() {
    if (typeof Kakao !== 'undefined') {
      try {
        if (!Kakao.isInitialized()) Kakao.init('5729341d219d8cb6f0a189fa86c91456');
        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: `⛳ ${Timeline._pendingShareS.course.name} 라운딩 일정`,
            description: '아래 버튼을 눌러 타임라인과 내비게이션을 같이 이용해보세요!',
            imageUrl: 'https://files.catbox.moe/672ojg.png',
            link: { mobileWebUrl: Timeline._pendingShareUrl, webUrl: Timeline._pendingShareUrl },
          },
          buttons: [{ title: '일정 및 타임라인 같이 보기', link: { mobileWebUrl: Timeline._pendingShareUrl, webUrl: Timeline._pendingShareUrl } }]
        });
        document.getElementById('share-modal').style.display='none';
      } catch (e) {
        console.error(e);
        U.toast('카카오톡 공유를 실행할 수 없습니다.');
      }
    } else {
      U.toast('카카오톡 모듈이 로드되지 않았습니다.');
    }
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
              <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
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

  renderTimelineItems(s, tl) {
    let items = '';
    const startPt = s.startPoint || '집';
    const tmapIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-top:-1px"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;
    const kakaoIcon = `<svg width="15" height="15" viewBox="0 0 24 24" style="margin-top:-1px"><path fill="#191919" d="M12 3c-5.523 0-10 3.553-10 7.938 0 2.825 1.83 5.303 4.606 6.744l-1.01 3.7c-.053.195.166.353.332.227l4.316-2.82c.575.08 1.162.124 1.756.124 5.523 0 10-3.553 10-7.938C22 6.553 17.523 3 12 3z"/></svg>`;
    const ratingIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="margin-top:-2px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

    let startIconHtml = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-3px; margin-right:4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
    if (startPt.includes('회사') || startPt.includes('사무실')) {
      startIconHtml = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-3px; margin-right:4px;"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
    } else if (startPt.includes('집') || startPt.includes('자택')) {
      startIconHtml = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-3px; margin-right:4px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    }

    // 1) 준비 시작
    items += `
      <div class="tl-item stag">
        <div class="tl-dot"></div>
        <div class="tl-card">
          <div class="tl-time">${tl.prepStart}</div>
          <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            준비 시작
          </div>
          <div class="tl-detail">"${startPt}에서 출발하기 전 보스턴백, 거리측정기, 골프공을 챙기세요."</div>
        </div>
      </div>`;

    let nextDestName = '';
    let nextDestLat = 0;
    let nextDestLng = 0;
    
    if (tl.hasMeal) {
      nextDestName = s.mealRestaurant.name;
      nextDestLat = s.mealRestaurant.lat;
      nextDestLng = s.mealRestaurant.lng;
    } else {
      nextDestName = s.course.name;
      nextDestLat = s.course.lat;
      nextDestLng = s.course.lng;
    }

    if (tl.hasMeetingPoint) {
      // 2) 출발지 → 집결지 출발
      items += `
        <div class="tl-item stag">
          <div class="tl-dot"></div>
          <div class="tl-card">
            <div class="tl-time">${tl.homeDepart}</div>
            <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
              ${startIconHtml}
              ${startPt}에서 출발하기
            </div>
            <div class="tl-detail">집결지(${tl.meetingPointName})까지 약 ${tl.homeTravelDur}분 소요</div>
            <div class="tl-nav-btns">
              <button class="tl-nav-btn tmap" onclick="Timeline.openNav('tmap','${tl.meetingPointName}',${s.meetingPointObj?.lat||0},${s.meetingPointObj?.lng||0},'${startPt}',${s.startLat||0},${s.startLng||0})">${tmapIcon} TMAP</button>
              <button class="tl-nav-btn kakao" onclick="Timeline.openNav('kakao','${tl.meetingPointName}',${s.meetingPointObj?.lat||0},${s.meetingPointObj?.lng||0},'${startPt}',${s.startLat||0},${s.startLng||0})">${kakaoIcon} 카카오내비</button>
            </div>
          </div>
        </div>`;

      // 2-1) 집결지 도착 및 탑승
      items += `
        <div class="tl-item stag">
          <div class="tl-dot"></div>
          <div class="tl-card">
            <div class="tl-time">${tl.meetArrival}</div>
            <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              집결지 도착 및 동반자 탑승
            </div>
            <div class="tl-detail">여유 대기 시간 (약 10분)</div>
          </div>
        </div>`;

      // 2-2) 집결지 → 다음 목적지 출발
      items += `
        <div class="tl-item stag">
          <div class="tl-dot"></div>
          <div class="tl-card">
            <div class="tl-time">${tl.meetDepart}</div>
            <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
              ${nextDestName}(으)로 출발
            </div>
            <div class="tl-detail">예측 길찾기 기준 약 ${tl.meetTravelDur}분 소요</div>
            <div class="tl-nav-btns">
              <button class="tl-nav-btn tmap" onclick="Timeline.openNav('tmap','${nextDestName}',${nextDestLat},${nextDestLng},'${tl.meetingPointName}',${s.meetingPointObj?.lat||0},${s.meetingPointObj?.lng||0})">${tmapIcon} TMAP</button>
              <button class="tl-nav-btn kakao" onclick="Timeline.openNav('kakao','${nextDestName}',${nextDestLat},${nextDestLng},'${tl.meetingPointName}',${s.meetingPointObj?.lat||0},${s.meetingPointObj?.lng||0})">${kakaoIcon} 카카오내비</button>
            </div>
          </div>
        </div>`;
    } else {
      // 2) 출발지 → 다음 목적지 출발
      items += `
        <div class="tl-item stag">
          <div class="tl-dot"></div>
          <div class="tl-card">
            <div class="tl-time">${tl.homeDepart}</div>
            <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
              ${startIconHtml}
              ${startPt}에서 출발하기
            </div>
            <div class="tl-detail">예측 길찾기 기준 ${nextDestName}까지 약 ${tl.homeTravelDur}분 소요</div>
            <div class="tl-nav-btns">
              <button class="tl-nav-btn tmap" onclick="Timeline.openNav('tmap','${nextDestName}',${nextDestLat},${nextDestLng},'${startPt}',${s.startLat||0},${s.startLng||0})">${tmapIcon} TMAP</button>
              <button class="tl-nav-btn kakao" onclick="Timeline.openNav('kakao','${nextDestName}',${nextDestLat},${nextDestLng},'${startPt}',${s.startLat||0},${s.startLng||0})">${kakaoIcon} 카카오내비</button>
            </div>
          </div>
        </div>`;
    }

    if (tl.hasMeal) {
      // 3) 식사
      const mealReview = ReviewStore.getReviews(tl.restaurantName);
      const mealRatingHtml = mealReview.count > 0 
        ? `<div style="margin-top:4px;">${ReviewStore.renderStars(mealReview.avgRating, mealReview.count)}</div>` 
        : '';
      items += `
        <div class="tl-item meal stag">
          <div class="tl-dot"></div>
          <div class="tl-card">
            <div class="tl-time">${tl.mealStart}</div>
            <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              ${tl.restaurantName} 식사
            </div>
            <div class="tl-detail">식사 시간 약 ${tl.mealDuration}분</div>
            ${mealRatingHtml}
            <button class="tl-nav-btn rating" style="margin-top:6px;" onclick="ReviewStore.openRatingModal('${tl.restaurantName}', '${s.course.name}')">${ratingIcon} 식당 평가하기</button>
          </div>
        </div>`;

      // 4) 식당 → 골프장 출발
      items += `
        <div class="tl-item stag">
          <div class="tl-dot"></div>
          <div class="tl-card">
            <div class="tl-time">${tl.restDepart}</div>
            <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
              골프장으로 출발
            </div>
            <div class="tl-detail">${s.course.name}까지 약 ${tl.restTravelDur}분 소요</div>
            <div class="tl-nav-btns">
              <button class="tl-nav-btn tmap" onclick="Timeline.openNav('tmap','${s.course.name}',${s.course.lat},${s.course.lng},'${s.mealRestaurant.name}',${s.mealRestaurant.lat},${s.mealRestaurant.lng})">${tmapIcon} TMAP</button>
              <button class="tl-nav-btn kakao" onclick="Timeline.openNav('kakao','${s.course.name}',${s.course.lat},${s.course.lng},'${s.mealRestaurant.name}',${s.mealRestaurant.lat},${s.mealRestaurant.lng})">${kakaoIcon} 카카오내비</button>
            </div>
          </div>
        </div>`;
    }

    // 도착
    items += `
      <div class="tl-item stag">
        <div class="tl-dot"></div>
        <div class="tl-card">
          <div class="tl-time">${tl.arrival}</div>
          <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M9 21V10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11M2 14h20"></path></svg>
            클럽하우스 도착
          </div>
          <div class="tl-detail">조식 및 환복 여유 시간 (${tl.mannerTime}분)</div>
        </div>
      </div>`;

    // 티오프
    items += `
      <div class="tl-item gold stag">
        <div class="tl-dot"></div>
        <div class="tl-card">
          <div class="tl-time">${tl.teeOff}</div>
          <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 22V2l10 5-10 5"></path></svg>
            티오프!
          </div>
          <div class="tl-detail">멋진 라운딩 되세요! 🏌️‍♂️</div>
        </div>
      </div>`;

    if (tl.hasPostMeal && tl.postMealRestaurant) {
      const postReview = ReviewStore.getReviews(tl.postMealRestaurant.name);
      const postRatingHtml = postReview.count > 0 
        ? `<div style="margin-top:4px;">${ReviewStore.renderStars(postReview.avgRating, postReview.count)}</div>` 
        : '';
      items += `
      <div class="tl-item meal stag" style="margin-top:var(--sp-4);">
        <div class="tl-dot"></div>
        <div class="tl-card">
          <div class="tl-time">${tl.postMealStart}</div>
          <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
            🍻 ${tl.postMealRestaurant.name} (뒷풀이)
          </div>
          <div class="tl-detail">라운딩 후 식사 예정 (약 2시간)</div>
          ${postRatingHtml}
          <div class="tl-nav-btns">
            <button class="tl-nav-btn tmap" onclick="Timeline.openNav('tmap','${tl.postMealRestaurant.name}',${tl.postMealRestaurant.lat},${tl.postMealRestaurant.lng},'${s.course.name}',${s.course.lat},${s.course.lng})">${tmapIcon} TMAP</button>
            <button class="tl-nav-btn kakao" onclick="Timeline.openNav('kakao','${tl.postMealRestaurant.name}',${tl.postMealRestaurant.lat},${tl.postMealRestaurant.lng},'${s.course.name}',${s.course.lat},${s.course.lng})">${kakaoIcon} 카카오내비</button>
            <button class="tl-nav-btn rating" onclick="ReviewStore.openRatingModal('${tl.postMealRestaurant.name}', '${s.course.name}')">${ratingIcon} 식당 평가하기</button>
          </div>
        </div>
      </div>`;
    }

    // 6) 귀가
    const returnStartLat = s.hasPostMeal && s.postMealRestaurant ? s.postMealRestaurant.lat : s.course.lat;
    const returnStartLng = s.hasPostMeal && s.postMealRestaurant ? s.postMealRestaurant.lng : s.course.lng;
    const returnStartName = s.hasPostMeal && s.postMealRestaurant ? s.postMealRestaurant.name : s.course.name;
    const returnDestName = s.startAddress || startPt;
    const returnDestLat = s.startLat || 0;
    const returnDestLng = s.startLng || 0;

    items += `
      <div class="tl-item stag" style="margin-top:var(--sp-4);">
        <div class="tl-dot"></div>
        <div class="tl-card">
          <div class="tl-time">${tl.returnStart}</div>
          <div class="tl-event" style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            ${startPt}으로 귀가
          </div>
          <div class="tl-detail">약 ${tl.returnTravelDur}분 소요 예상 (도착 시간: ${tl.returnEnd})</div>
          <div class="tl-nav-btns">
            <button class="tl-nav-btn tmap" onclick="Timeline.openNav('tmap','${returnDestName}',${returnDestLat},${returnDestLng})">${tmapIcon} TMAP</button>
            <button class="tl-nav-btn kakao" onclick="Timeline.openNav('kakao','${returnDestName}',${returnDestLat},${returnDestLng})">${kakaoIcon} 카카오내비</button>
          </div>
        </div>
      </div>`;

    return items;
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
                  <div class="comp-avatar" style="background:linear-gradient(135deg,${c.color},${c.color}88)">${c.emoji}</div>
                  <div>
                    <div class="comp-name">${c.name}</div>
                    <div class="comp-status">대기 중</div>
                  </div>
                </div>
                <button class="status-btn" onclick="Timeline.toggleStatus(this,'${c.name}')">출발함</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  openNav(app, destName, destLat, destLng, startName='', startLat=0, startLng=0) {
    if (app === 'tmap') {
      U.toast(`🗺️ Tmap으로 길안내를 시작합니다: ${destName}`);
      if (startLat && startLng) {
        window.location.href = `tmap://route?startname=${encodeURIComponent(startName)}&startx=${startLng}&starty=${startLat}&goalname=${encodeURIComponent(destName)}&goalx=${destLng}&goaly=${destLat}`;
      } else {
        window.location.href = `tmap://route?goalname=${encodeURIComponent(destName)}&goalx=${destLng}&goaly=${destLat}`;
      }
    } else if (app === 'kakao') {
      U.toast(`🚙 카카오맵/내비로 길안내를 시작합니다: ${destName}`);
      if (startLat && startLng) {
        window.location.href = `kakaomap://route?sp=${startLat},${startLng}&ep=${destLat},${destLng}&by=CAR`;
      } else {
        window.location.href = `https://map.kakao.com/link/to/${encodeURIComponent(destName)},${destLat},${destLng}`;
      }
    }
  },

  toggleAlarm() {
    const btn = U.$('#tl-alarm-btn');
    if (!btn) return;
    
    const isAlarmOn = btn.classList.contains('alarm-on');
    if (isAlarmOn) {
      btn.classList.remove('alarm-on');
      btn.innerHTML = '🔔 알람 켜기';
      btn.style.background = 'transparent';
      btn.style.color = 'var(--accent)';
      
      if (this.alarmTimeouts) {
        this.alarmTimeouts.forEach(id => clearTimeout(id));
        this.alarmTimeouts = [];
      }
      
      U.toast('동선 타임라인 알람이 해제되었습니다.');
    } else {
      btn.classList.add('alarm-on');
      btn.innerHTML = '🔔 알람 켜짐';
      btn.style.background = 'var(--accent)';
      btn.style.color = '#fff';
      
      this.initAudioContext();
      
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

  autoScheduleAllAlarms() {
    this.alarmTimeouts = this.alarmTimeouts || [];
    this.alarmTimeouts.forEach(id => clearTimeout(id));
    this.alarmTimeouts = [];

    const now = new Date();
    State.schedules.forEach((s) => {
      if (!s.timeline || !s.date) return;
      const sDate = new Date(s.date);
      if (sDate.getFullYear() === now.getFullYear() && 
          sDate.getMonth() === now.getMonth() && 
          sDate.getDate() === now.getDate()) {
        
        const tl = s.timeline;
        const dateStr = s.date;
        const getDelay = (timeStr) => {
          if (!timeStr) return -1;
          const [hour, min] = timeStr.split(':').map(Number);
          const targetDate = new Date(dateStr);
          targetDate.setHours(hour, min, 0, 0);
          return targetDate.getTime() - Date.now();
        };

        const events = [];
        const iPrep = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        const iHome = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
        const iMeal = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
        const iRest = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
        const iArrive = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 21h18M9 21V10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11M2 14h20"></path></svg>`;
        const iTee = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--gold-500)" stroke-width="2"><path d="M4 22V2l10 5-10 5"></path></svg>`;

        if (tl.prepStart) events.push({ time: tl.prepStart, msg: '준비 시작 - 보스턴백과 준비물을 챙겨주세요!', icon: iPrep });
        if (tl.homeDepart) events.push({ time: tl.homeDepart, msg: '출발 시간입니다! 목적지로 출발하세요 🚗', icon: iHome });
        if (tl.mealStart) events.push({ time: tl.mealStart, msg: '식당 예약 시간입니다. 든든한 식사 하세요 🍽️', icon: iMeal });
        if (tl.restDepart) events.push({ time: tl.restDepart, msg: '골프장으로 출발할 시간입니다 🚙', icon: iRest });
        if (tl.arrival) events.push({ time: tl.arrival, msg: '클럽하우스 도착 시간입니다. 환복을 준비하세요 🏌️', icon: iArrive });
        if (tl.teeOff) events.push({ time: tl.teeOff, msg: '곧 티오프 시간입니다! 멋진 라운딩 되세요 ⛳', icon: iTee });

        events.forEach(ev => {
          const delay = getDelay(ev.time);
          if (delay > 0) {
            const timeoutId = setTimeout(() => {
              try {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('버디플래너 타임라인', {
                    body: ev.msg,
                    icon: 'assets/icons/icon-192x192.png'
                  });
                }
              } catch (e) {
                console.warn('Notification failed:', e);
              }
              Timeline.playAlarmSound(ev.msg, '⏰ 타임라인 알람', ev.icon);
            }, delay);
            this.alarmTimeouts.push(timeoutId);
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
    
    const tl = s.timeline;
    const dateStr = s.date;
    
    const getDelay = (timeStr) => {
      if (!timeStr) return -1;
      const [hour, min] = timeStr.split(':').map(Number);
      const targetDate = new Date(dateStr);
      targetDate.setHours(hour, min, 0, 0);
      return targetDate.getTime() - Date.now();
    };

    const events = [];
    const iPrep = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const iHome = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    const iMeal = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
    const iRest = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
    const iArrive = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 21h18M9 21V10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11M2 14h20"></path></svg>`;
    const iTee = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--gold-500)" stroke-width="2"><path d="M4 22V2l10 5-10 5"></path></svg>`;

    if (tl.prepStart) events.push({ time: tl.prepStart, msg: '준비 시작 - 보스턴백과 준비물을 챙겨주세요!', icon: iPrep });
    if (tl.homeDepart) events.push({ time: tl.homeDepart, msg: '출발 시간입니다! 목적지로 출발하세요 🚗', icon: iHome });
    if (tl.mealStart) events.push({ time: tl.mealStart, msg: '식당 예약 시간입니다. 든든한 식사 하세요 🍽️', icon: iMeal });
    if (tl.restDepart) events.push({ time: tl.restDepart, msg: '골프장으로 출발할 시간입니다 🚙', icon: iRest });
    if (tl.arrival) events.push({ time: tl.arrival, msg: '클럽하우스 도착 시간입니다. 환복을 준비하세요 🏌️', icon: iArrive });
    if (tl.teeOff) events.push({ time: tl.teeOff, msg: '곧 티오프 시간입니다! 멋진 라운딩 되세요 ⛳', icon: iTee });

    let scheduledCount = 0;
    events.forEach(ev => {
      const delay = getDelay(ev.time);
      if (delay > 0) {
        const timeoutId = setTimeout(() => {
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('버디플래너 타임라인', {
                body: ev.msg,
                icon: 'assets/icons/icon-192x192.png'
              });
            }
          } catch (e) {
            console.warn('Notification failed:', e);
          }
          
          Timeline.playAlarmSound(ev.msg, '⏰ 타임라인 알람', ev.icon);
        }, delay);
        this.alarmTimeouts.push(timeoutId);
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
      U.toast(`${name}님에게 출발 알림을 보냈습니다 🚗`);
    } else {
      btn.textContent = '완료'; btn.disabled = true; btn.style.opacity = '0.4';
      st.textContent = '✅ 도착 완료'; st.className = 'comp-status arrived';
      U.toast(`${name}님에게 도착 알림을 보냈습니다 ✅`);
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

  playAlarmSound(msg, title = '🚨 타임라인 알람', iconHtml = null) {
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

    this.showAlarmPopup(msg, title, iconHtml);
  },

  showAlarmPopup(msg, title, iconHtml) {
    const old = document.getElementById('tl-alarm-popup');
    if (old) old.remove();

    const popup = document.createElement('div');
    popup.id = 'tl-alarm-popup';
    popup.style.position = 'fixed';
    popup.style.top = '16px';
    popup.style.left = '16px';
    popup.style.right = '16px';
    popup.style.background = 'var(--bg-card)';
    popup.style.border = '1px solid var(--accent)';
    popup.style.borderRadius = 'var(--r-md)';
    popup.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
    popup.style.zIndex = '9999';
    popup.style.padding = '16px';
    popup.style.display = 'flex';
    popup.style.alignItems = 'center';
    popup.style.gap = '16px';
    popup.style.transform = 'translateY(-150%)';
    popup.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
    
    // 아이콘 크기 축소
    const displayIcon = iconHtml ? iconHtml.replace('width="48"', 'width="32"').replace('height="48"', 'height="32"') : `<div style="font-size:2rem;">⏰</div>`;

    popup.innerHTML = `
      <div style="flex-shrink:0;">${displayIcon}</div>
      <div style="flex-grow:1;">
        <div style="font-size:12px; color:var(--accent); font-weight:var(--fw-bold); margin-bottom:4px;">${title}</div>
        <div style="font-size:14px; font-weight:var(--fw-bold); color:var(--text-100); line-height:1.4;">${msg}</div>
      </div>
      <button onclick="this.parentElement.style.transform='translateY(-150%)'; setTimeout(()=>this.parentElement.remove(), 400);" style="flex-shrink:0; background:none; border:none; color:var(--text-300); padding:4px; cursor:pointer;">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    document.body.appendChild(popup);

    requestAnimationFrame(() => {
      popup.style.transform = 'translateY(0)';
    });

    // 10초 뒤 자동 숨김
    setTimeout(() => {
      if (popup.parentElement) {
        popup.style.transform = 'translateY(-150%)';
        setTimeout(() => popup.remove(), 400);
      }
    }, 10000);
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
        const [hour, min] = timeStr.split(':').map(Number);
        const td = new Date(s.date);
        td.setHours(hour, min, 0, 0);
        return td.getTime();
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
      for (let i = events.length - 1; i >= 0; i--) {
        if (now >= events[i].time) {
          currentEvent = events[i].name;
          break;
        }
      }

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
