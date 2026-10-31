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
      <div class="header" style="height:52px; padding:0 var(--sp-4); background:#ffffff; border-bottom:1px solid #f1f5f9; box-shadow:none;">
        <button class="header-btn" onclick="App.navigate('calendar')" aria-label="뒤로가기">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 class="header-title" style="font-size:17px; font-weight:800; color:var(--text-100); letter-spacing:-0.4px;">스마트 타임라인</h1>
        <button class="header-btn" onclick="U.downloadICS(State.schedules[${this.schedIdx}])" aria-label="캘린더 저장">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
      </div>

      <!-- Sticky Event Banner -->
      <div id="tl-sticky-banner" style="display:none; flex-shrink:0; z-index:90; background:var(--accent); color:#fff; padding:10px 16px; font-size:13px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.15); transition:all 0.3s ease;">
        <span style="font-weight:var(--fw-bold);" id="tl-banner-text">현재 진행 중인 일정 없음</span>
      </div>

      <div class="screen-scroll" style="padding-top:0;">
        <!-- Hero -->
        <div class="tl-hero">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h2 class="tl-course" style="margin:0;"><span class="accent">${s.course.name}</span></h2>
            <div class="tl-dday" style="display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:800; padding:3px 8px; border-radius:6px; margin:0;">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${dday}</span>
            </div>
          </div>
          <div class="tl-meta">
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${dateStr}
            </span>
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${U.fmtTimeKo(s.teeOff)}
            </span>
            ${(s.course.region || s.course.addr) ? `<span style="display:inline-flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;"><path d="M12 2c3.866 0 7 3.134 7 7 0 5.25-7 13-7 13S5 14.25 5 9c0-3.866 3.134-7 7-7z"></path><circle cx="12" cy="9" r="2.5"></circle></svg>
              ${U.esc(s.course.region || String(s.course.addr).split(' ').slice(0, 2).join(' '))}
            </span>` : ''}
          </div>
        </div>


        <!-- Timeline -->
        <div class="tl-section">
          <div class="tl-head" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
            <div style="flex: 1; min-width: 0;">
              <h3 class="tl-title" style="display:flex; align-items:center; gap:6px; margin-bottom: 2px;">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                타임라인
              </h3>
              <p class="tl-sub">${tl.hasMeal ? '출발지 → 식당 → 골프코스 동선 연산' : '출발지 → 골프코스 최적 경로'}</p>
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end;">
              <button onclick="App.showWeather(${this.schedIdx})" style="border:1px solid rgba(14,165,233,0.3); background:#f0f9ff; color:#0369a1; cursor:pointer; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 6px; line-height: 1.2; white-space: nowrap;">
                🌤️ 날씨
              </button>
              <button id="tl-alarm-btn" onclick="Timeline.toggleAlarm()" style="border:1px solid #cbd5e1; background:#ffffff; color:#334155; cursor:pointer; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 6px; line-height: 1.2; white-space: nowrap; transition:all 0.2s ease;">
                🔔 알람 켜기
              </button>
              <button style="border:1px solid rgba(217,119,6,0.25); background:#fffbeb; color:#b45309; cursor:pointer; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 6px; line-height: 1.2; white-space: nowrap; transition:all 0.2s ease;" onclick="Register.edit(${this.schedIdx})">
                ✏️ 일정 수정
              </button>
            </div>
          </div>

          <div class="tl-list">
            ${this.renderTimelineItems(s, tl)}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-acts" style="display:flex; gap:12px; padding:0 var(--sp-5) var(--sp-5); justify-content:center;">
          <button class="qact" onclick="Timeline.shareTimeline()">
            <span class="qact-icon" style="display:inline-flex; width:36px; height:36px; align-items:center; justify-content:center; border-radius:50%; background:rgba(254, 229, 0, 0.2); color:#3c1e1e;">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px; height:20px;"><path d="M12 3c-5.523 0-10 3.553-10 7.938 0 2.825 1.83 5.303 4.606 6.744l-1.01 3.7c-.053.195.166.353.332.227l4.316-2.82c.575.08 1.162.124 1.756.124 5.523 0 10-3.553 10-7.938C22 6.553 17.523 3 12 3z"/></svg>
            </span>
            <span>카카오톡 공유</span>
          </button>
          <button class="qact" onclick="U.downloadICS(State.schedules[${this.schedIdx}])">
            <span class="qact-icon" style="display:inline-flex; width:36px; height:36px; align-items:center; justify-content:center; border-radius:50%; background:rgba(142, 142, 147, 0.15); color:var(--text-300);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px; height:18px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </span>
            <span>일정 캘린더</span>
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
    
    let dateVal = s.date || '';
    if (dateVal instanceof Date) {
      dateVal = dateVal.toISOString();
    } else if (typeof dateVal === 'string' && !dateVal.includes('T')) {
      try { dateVal = new Date(dateVal).toISOString(); } catch(e) {}
    }

    const arr = [
      'v2',
      dateVal,
      s.teeOff || '',
      s.startPoint || '집',
      c.name || '',
      c.addr || '',
      c.lat || '',
      c.lng || '',
      r.name || '',
      r.lat || '',
      r.lng || '',
      s.prepTime || 30,
      s.travelTime || 60,
      s.hasMeal ? 1 : 0,
      s.mealDuration || 0,
      s.travelToRestaurant || 0,
      s.hasMeetingPoint ? 1 : 0,
      mp.name || '',
      mp.lat || '',
      mp.lng || '',
      s.travelToMeeting || 0,
      s.hasPostMeal ? 1 : 0,
      pm.name || '',
      pm.lat || '',
      pm.lng || '',
      c.region || ''  // arr[25]: 골프장 지역 (시/도 구)
    ];
    const kakaoPayload = encodeURIComponent(arr.join('|'));
    Timeline._pendingShareUrl = baseDomain + '/?s=' + kakaoPayload;

    // 즉시 카카오톡 공유 실행!
    this.executeKakaoShare();
  },

  executeKakaoShare() {
    if (typeof Kakao !== 'undefined') {
      try {
        if (!Kakao.isInitialized()) {
          Kakao.init(Login.KAKAO_JS_KEY);
        }
        const s = Timeline._pendingShareS || {};
        const courseName = s.course ? s.course.name : '골프장';
        const dateStr = s.date ? U.fmtDateShort(s.date) : '';
        const teeOff = s.teeOff || '';

        const shareLinkObj = {
          mobileWebUrl: Timeline._pendingShareUrl,
          webUrl: Timeline._pendingShareUrl
        };

        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: `⛳ [버디플래너] ${courseName} 라운딩 일정`,
            description: `📅 일시: ${dateStr} ${teeOff}\n📍 장소: ${courseName}\n\n아래 버튼을 눌러 일정을 추가하고 맞춤 편집해 보세요!`,
            imageUrl: 'https://files.catbox.moe/672ojg.png',
            link: shareLinkObj,
          },
          buttons: [
            {
              title: '일정 확인 및 내 스케줄에 추가 ⛳',
              link: shareLinkObj
            }
          ]
        });
      } catch (e) {
        console.error('Kakao share error:', e);
        U.toast('카카오톡 공유 실패: ' + (e.message || e));
      }
    } else {
      U.toast('카카오톡 SDK 모듈이 로드되지 않았습니다.');
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

    let startIconHtml = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
    if (startPt.includes('회사') || startPt.includes('사무실')) {
      startIconHtml = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
    } else if (startPt.includes('집') || startPt.includes('자택')) {
      startIconHtml = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
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

      // 폰에 예약된 네이티브 알람도 취소하고, 꺼둔 상태를 저장 (앱 재실행 시 자동 예약 방지)
      const s = State.schedules[this.schedIdx];
      if (s) {
        if (window.NativeApp && typeof window.NativeApp.cancelAlarm === 'function') {
          this.nativeAlarmTimes(s).forEach(t => { try { window.NativeApp.cancelAlarm(t); } catch (e) {} });
        }
        s.alarmOff = true;
        State.saveSchedules();
      }
      
      U.toast('동선 타임라인 알람이 해제되었습니다.');
    } else {
      btn.classList.add('alarm-on');
      btn.innerHTML = '🔔 알람 켜짐';
      btn.style.background = 'var(--accent)';
      btn.style.color = '#fff';
      
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
    return [tl.prepStart, tl.homeDepart, tl.restDepart].filter(Boolean).map(timeStr => {
      const [hour, min] = timeStr.split(':').map(Number);
      const d = new Date(s.date);
      d.setHours(hour, min, 0, 0);
      return d.getTime();
    });
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

  autoScheduleAllAlarms() {
    this.alarmTimeouts = this.alarmTimeouts || [];
    this.alarmTimeouts.forEach(id => clearTimeout(id));
    this.alarmTimeouts = [];

    const now = new Date();
    State.schedules.forEach((s) => {
      if (!s.timeline || !s.date || s.alarmOff) return;
      const sDate = new Date(s.date);
      if (sDate.getFullYear() === now.getFullYear() && 
          sDate.getMonth() === now.getMonth() && 
          sDate.getDate() === now.getDate()) {
        
        const tl = s.timeline;
        const dateStr = s.date;
        const getTargetTime = (timeStr) => {
          if (!timeStr) return -1;
          const [hour, min] = timeStr.split(':').map(Number);
          const targetDate = new Date(dateStr);
          targetDate.setHours(hour, min, 0, 0);
          return targetDate.getTime();
        };

        const events = [];
        const iPrep = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        const iHome = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
        const iMeal = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
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
          if (delay > 0) {
            if ((ev.isNative || ev.isPrep) && window.NativeApp) {
              if (typeof window.NativeApp.setAlarmWithData === 'function') {
                try { window.NativeApp.setAlarmWithData(targetTime, timelineJson); } catch(e) {}
              } else if (typeof window.NativeApp.setAlarm === 'function') {
                window.NativeApp.setAlarm(targetTime);
              }
            }
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
    
    const getTargetTime = (timeStr) => {
      if (!timeStr) return -1;
      const [hour, min] = timeStr.split(':').map(Number);
      const targetDate = new Date(dateStr);
      targetDate.setHours(hour, min, 0, 0);
      return targetDate.getTime();
    };

    const events = [];
    const iPrep = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const iHome = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    const iMeal = `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
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
      U.toast(`${U.esc(name)}님에게 출발 알림을 보냈습니다 🚗`);
    } else {
      btn.textContent = '완료'; btn.disabled = true; btn.style.opacity = '0.4';
      st.textContent = '✅ 도착 완료'; st.className = 'comp-status arrived';
      U.toast(`${U.esc(name)}님에게 도착 알림을 보냈습니다 ✅`);
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
      const teeOffTime = parseTime(tl.teeOff);
      const roundOver = teeOffTime !== Infinity && now > teeOffTime + 5 * 60 * 60 * 1000;
      for (let i = roundOver ? -1 : events.length - 1; i >= 0; i--) {
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
