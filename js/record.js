const Record = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedDate: null,
  records: {},

  init() {
    this.loadRecords();
    this.render();
  },
  
  loadRecords() {
    try {
      const data = localStorage.getItem('bp_records_v1');
      if (data) {
        this.records = JSON.parse(data);
      } else {
        this.records = {};
      }
    } catch(e) {
      this.records = {};
    }
  },

  render() {
    const container = U.$('#screen-record');

    let bestScore = Infinity;
    let bestCourse = '기록 없음';
    let bestDate = '-';
    let totalScore = 0;
    let validScoreCount = 0;
    let sortedRecords = [];
    
    for (const [date, rec] of Object.entries(this.records)) {
      if (rec && typeof rec.score === 'number') {
        totalScore += rec.score;
        validScoreCount++;
        sortedRecords.push({ date, ...rec });

        if (rec.score < bestScore) {
          bestScore = rec.score;
          bestCourse = rec.course;
          const parts = date.split('-');
          if(parts.length === 3) {
            bestDate = `${parts[0]}. ${String(parts[1]).padStart(2, '0')}. ${String(parts[2]).padStart(2, '0')}`;
          } else {
            bestDate = date;
          }
        }
      }
    }
    
    sortedRecords.sort((a,b) => b.date.localeCompare(a.date));
    const recentScore = sortedRecords.length > 0 ? sortedRecords[0].score : '--';
    const avgScore = validScoreCount > 0 ? (totalScore / validScoreCount).toFixed(1) : '--';
    let scoreDisplay = bestScore === Infinity ? '--' : bestScore;

    container.innerHTML = `
      <div class="screen-scroll">
        <!-- 1. MY BEST SCORE -->
        <div style="padding: var(--sp-4);">
          <div class="best-score-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:2;">
              <div>
                <span style="font-size:12px; font-weight:800; color:var(--accent); letter-spacing:1px; margin-bottom:4px; display:block;">MY BEST SCORE</span>
                <div style="font-size:20px; font-weight:800; color:#fff;">
                  ${bestCourse}
                </div>
                <div style="font-size:13px; font-weight:600; color:var(--text-400); margin-top:6px;">${bestDate}</div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end;">
                <div style="display:flex; align-items:baseline; gap:4px;">
                  <span style="font-size:48px; font-weight:900; line-height:1; font-family:'Montserrat', sans-serif; color: #ffffff; text-shadow: 0 4px 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.4);">${scoreDisplay}</span>
                  <span style="font-size:14px; font-weight:700; color:var(--text-300);">타</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 라운딩 핵심 통계 바 (신규 업그레이드) -->
          <div style="display:flex; justify-content:space-around; align-items:center; background:var(--bg-card, #ffffff); border:1px solid var(--border-default); border-radius:14px; padding:12px; margin-top:12px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
            <div style="text-align:center; flex:1;">
              <div style="font-size:11px; font-weight:600; color:var(--text-400); margin-bottom:2px;">총 라운딩</div>
              <div style="font-size:16px; font-weight:800; color:var(--text-100);"><span style="color:var(--accent);">${validScoreCount}</span>회</div>
            </div>
            <div style="width:1px; height:24px; background:var(--border-default);"></div>
            <div style="text-align:center; flex:1;">
              <div style="font-size:11px; font-weight:600; color:var(--text-400); margin-bottom:2px;">평균 타수</div>
              <div style="font-size:16px; font-weight:800; color:var(--text-100);">${avgScore}<span style="font-size:12px; font-weight:600; color:var(--text-400);">타</span></div>
            </div>
            <div style="width:1px; height:24px; background:var(--border-default);"></div>
            <div style="text-align:center; flex:1;">
              <div style="font-size:11px; font-weight:600; color:var(--text-400); margin-bottom:2px;">최근 라운딩</div>
              <div style="font-size:16px; font-weight:800; color:var(--text-100);">${recentScore}<span style="font-size:12px; font-weight:600; color:var(--text-400);">${recentScore !== '--' ? '타' : ''}</span></div>
            </div>
          </div>
        </div>

        <div style="padding: 0 var(--sp-4) var(--sp-4);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h2 style="font-size:18px; font-weight:800; color:var(--text-100); margin:0; display:flex; align-items:center; gap:6px;">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="#f59e0b" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              라운딩 히스토리
            </h2>
            <button onclick="Record.showRecordForm()" style="background:var(--text-100); color:#fff; border:none; padding:7px 14px; border-radius:8px; font-size:14px; font-weight:800; display:flex; align-items:center; gap:5px; cursor:pointer;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              등록
            </button>
          </div>
          
          <div class="record-calendar">
            <div class="record-cal-header">
              <button onclick="Record.prevMonth()"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
              <div class="record-cal-title">${this.currentYear}년 ${this.currentMonth + 1}월</div>
              <button onclick="Record.nextMonth()"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
            </div>
            
            <div class="record-cal-days">
              <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
            </div>
            
            <div class="record-cal-grid" id="record-cal-grid">
              <!-- Calendar cells injected here -->
            </div>
          </div>

          <div id="record-detail-container" style="margin-top:20px;"></div>
        </div>
      </div>
    `;
    
    this.renderCalendarGrid();
  },
  
  prevMonth() {
    this.currentMonth--;
    if(this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.render();
  },
  
  nextMonth() {
    this.currentMonth++;
    if(this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.render();
  },
  
  renderCalendarGrid() {
    const grid = U.$('#record-cal-grid');
    if (!grid) return;
    
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    
    let html = '';
    
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="record-cal-cell empty"></div>`;
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const hasRecord = this.records[dateKey] || this.records[`${this.currentYear}-${this.currentMonth + 1}-${d}`];
      
      let badgeHtml = '';
      if (hasRecord) {
        badgeHtml = `
          <div class="record-badge">
            <div class="record-badge-course">${hasRecord.course}</div>
            <div>${hasRecord.score}타</div>
          </div>
        `;
      } else if (State.aiGeneratingDate === dateKey) {
        badgeHtml = `
          <div style="position:absolute; bottom:4px; right:4px; display:flex; align-items:center; justify-content:center; background:rgba(251,191,36,0.15); color:#d97706; border:1px solid rgba(251,191,36,0.3); padding:1px 3px; border-radius:4px; font-size:8px; font-weight:800; box-shadow:0 1px 2px rgba(0,0,0,0.05); white-space:nowrap;">
            <svg viewBox="0 0 24 24" width="8" height="8" stroke="currentColor" stroke-width="3" fill="none" style="margin-right:2px; animation: spin 2s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            생성중
          </div>
        `;
      }
      
      const selectedClass = (this.selectedDate === d) ? 'selected' : '';
      const clickable = `onclick="Record.selectDate(${d})"`;
      const hasRecordClass = (hasRecord || State.aiGeneratingDate === dateKey) ? 'has-record' : '';
      
      html += `
        <div class="record-cal-cell ${hasRecordClass} ${selectedClass}" ${clickable} style="position:relative;">
          <span class="day-num">${d}</span>
          ${badgeHtml}
        </div>
      `;
    }
    
    grid.innerHTML = html;
  },
  
  selectDate(d) {
    this.selectedDate = d;
    this.renderCalendarGrid();
    
    const dateKeyOld = `${this.currentYear}-${this.currentMonth + 1}-${d}`;
    const dateKeyNew = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const rec = this.records[dateKeyOld] || this.records[dateKeyNew];
    const detailContainer = U.$('#record-detail-container');
    
    if (State.aiGeneratingDate === dateKeyNew || State.aiGeneratingDate === dateKeyOld) {
      detailContainer.innerHTML = `
        <div class="record-card" style="animation: slideUp 0.3s ease; text-align:center; padding: 30px 20px;">
          <div style="font-size:40px; margin-bottom:12px; animation: spin 2s linear infinite; display:inline-block;">⏳</div>
          <div style="font-size:17px; font-weight:800; color:#fff; margin-bottom:6px;">일지 등록중...</div>
          <div style="font-size:13px; font-weight:600; color:rgba(255,255,255,0.6);">AI가 스코어카드를 분석하고 일지를 작성 중입니다.</div>
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
      `;
      return;
    }

    if (rec) {
      const dayNames = ['일','월','화','수','목','금','토'];
      const dayStr = dayNames[new Date(this.currentYear, this.currentMonth, d).getDay()];
      
      let companions = [];
      if (window.State && window.State.schedules) {
        const schedule = window.State.schedules.find(s => s.date === dateKeyNew || s.date === dateKeyOld);
        if (schedule && schedule.companions) {
           companions = schedule.companions;
        }
      }
      
      const dummyScores = [82, 79, 85, 90, 88];
      let companionsHtml = '';
      if (companions.length > 0) {
        companionsHtml = companions.map((name, idx) => `
          <div class="record-stat-item">
            <span class="record-stat-label" style="color:rgba(255,255,255,0.7); font-size:13px;">${name}</span>
            <span class="record-stat-val" style="color:#60a5fa; font-size:14px; font-weight:800;">${dummyScores[idx % dummyScores.length]}타</span>
          </div>
        `).join('');
      } else {
        companionsHtml = `
          <div class="record-stat-item">
            <span class="record-stat-label" style="color:rgba(255,255,255,0.5); font-size:13px;">동반자 정보 없음</span>
          </div>
        `;
      }

      detailContainer.innerHTML = `
        <div class="record-card" style="animation: slideUp 0.3s ease; cursor:pointer;" onclick="Record.showDiaryDetail(${this.currentYear}, ${this.currentMonth}, ${d})">
          <div class="record-card-top">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span class="record-date">${this.currentYear}. ${String(this.currentMonth+1).padStart(2,'0')}. ${String(d).padStart(2,'0')} (${dayStr})</span>
              <span style="font-size:18px; font-weight:800; color:#fff;">${rec.course}</span>
            </div>
            <div class="record-score-box">
              <span class="score-num">${rec.score}</span>
              <span class="score-unit">타</span>
            </div>
          </div>
          <div class="record-card-bottom" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
              ${companionsHtml}
            </div>
            <button onclick="event.stopPropagation(); Record.showRecordForm()" style="background:rgba(255,255,255,0.15); color:#fff; border:none; border-radius:6px; padding:6px 16px; font-size:14px; font-weight:700; cursor:pointer; flex-shrink:0; margin-left:12px;">수정</button>
          </div>
        </div>
      `;
    } else {
      detailContainer.innerHTML = `
        <div class="record-card" style="animation: slideUp 0.3s ease; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:130px; gap:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="font-size:24px;">⛳️</div>
            <div style="font-size:15px; font-weight:700; color:rgba(255,255,255,0.7);">기록이 없는 날입니다</div>
          </div>
          <button class="record-action" onclick="Record.showRecordForm()" style="margin:0; width:100%; padding:10px; font-size:14px; background:rgba(255,255,255,0.15); color:#fff; border:none; border-radius:8px; font-weight:700;">+ 새 라운드 일지 작성하기</button>
        </div>
      `;
    }
  },

  showDetail() {
    this.showRecordForm();
  },

  showRecordForm() {
    const modalId = 'modal-record-form';
    let modal = U.$(`#${modalId}`);
    if (modal) modal.remove();

    // Ensure date variables are initialized
    const y = this.currentYear || new Date().getFullYear();
    const m = this.currentMonth !== undefined ? this.currentMonth : new Date().getMonth();
    const d = this.selectedDate || new Date().getDate();

    const todayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateKeyOld = `${y}-${m + 1}-${d}`;
    const existingRecord = this.records[todayStr] || this.records[dateKeyOld];

    let defaultCourse = existingRecord ? (existingRecord.course || '') : '';
    let defaultTime = existingRecord ? (existingRecord.time || '07:30') : '07:30';

    const html = `
      <div id="${modalId}" class="modal-overlay" style="display:flex; justify-content:center; align-items:flex-end; background:rgba(0,0,0,0.6); position:fixed; top:0; left:0; width:100%; height:100%; z-index:999; opacity:0; transition: opacity 0.3s;">
        <div style="background:var(--bg-app); width:100%; max-width:var(--max-width); height:auto; max-height:90vh; border-radius:24px 24px 0 0; display:flex; flex-direction:column; overflow:hidden; transform:translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);">
          
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid rgba(0,0,0,0.05);">
            <div style="font-size:18px; font-weight:800; color:var(--text-100);">스코어 및 일지 등록</div>
            <button onclick="Record.closeRecordForm()" style="color:var(--text-400); padding:4px;">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <!-- Form Content -->
          <div class="screen-scroll" style="padding:20px; flex:1; display:flex; flex-direction:column; gap:28px;">
            
            <!-- 1. Date & Schedule -->
            <div>
              <div style="font-size:14px; font-weight:800; color:var(--text-100); margin-bottom:12px;">1. 기본 정보</div>
              <div style="display:flex; flex-direction:column; gap:16px;">
                
                <div class="field" style="margin:0;">
                  <label class="field-label" style="font-size:13px;"><span class="req">*</span> 날짜</label>
                  <div class="picker-btn" onclick="Record.openDatePicker()">
                    <span class="picker-val" id="record-date-display" style="color:var(--text-100);">${todayStr}</span>
                    <span class="picker-ico">📅</span>
                    <input type="hidden" id="record-date" value="${todayStr}">
                  </div>
                </div>

                <div class="field" style="margin:0;">
                  <label class="field-label" style="font-size:13px;"><span class="req">*</span> 구장 선택</label>
                  <div class="field-input">
                    <input type="text" id="record-course" value="${defaultCourse}" placeholder="예: 남서울CC" style="width:100%; font-size:15px; font-weight:700; color:var(--text-100); background:transparent; border:none; outline:none;"/>
                    <span class="fi-icon" style="opacity:0.5;">🔍</span>
                  </div>
                </div>

                <div class="field" style="margin:0;">
                  <label class="field-label" style="font-size:13px;"><span class="req">*</span> 티업시간</label>
                  <div class="picker-btn" onclick="Record.openTimePicker()">
                    <span class="picker-val" id="record-time-display" style="color:var(--text-100);">${defaultTime}</span>
                    <span class="picker-ico">⏰</span>
                    <input type="hidden" id="record-time" value="${defaultTime}">
                  </div>
                </div>

              </div>
            </div>

            <hr style="border:none; border-top:1px dashed rgba(0,0,0,0.1); margin:0;">

            <!-- 2. Score Info (Photo Only) -->
            <div>
              <div style="font-size:14px; font-weight:800; color:var(--text-100); margin-bottom:6px;">2. 스코어 등록</div>
              <div style="font-size:13px; font-weight:600; color:var(--text-400); margin-bottom:12px;">스코어카드를 등록하시면 자동으로 점수가 입력됩니다.</div>
              <div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:8px;" class="hide-scrollbar">
                ${[1, 2].map(i => `
                <div style="flex:0 0 auto;">
                  <input type="file" id="upload-scorecard-${i}" accept="image/*" style="display:none;" onchange="Record.handleScoreUpload(${i}, event)">
                  <div id="score-upload-box-${i}" style="background:rgba(0,0,0,0.02); border:2px dashed rgba(0,0,0,0.15); border-radius:12px; width:90px; height:90px; display:flex; flex-direction:column; justify-content:center; align-items:center; cursor:pointer; transition:background 0.2s;" onclick="document.getElementById('upload-scorecard-${i}').click()">
                    <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--accent)" stroke-width="2" fill="none" style="margin-bottom:4px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <div style="font-size:11px; font-weight:700; color:var(--text-300);">${i === 1 ? '전반' : '후반'}</div>
                  </div>
                  <div id="score-preview-box-${i}" style="display:none; position:relative; width:90px; height:90px; border-radius:12px; overflow:hidden; border:1px solid rgba(0,0,0,0.1); background:#f1f5f9;">
                    <img id="score-preview-img-${i}" src="" style="width:100%; height:100%; object-fit:contain; padding:2px; box-sizing:border-box;">
                    <div style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.5); border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer;" onclick="Record.removeScore(${i})">
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                  </div>
                </div>
                `).join('')}
              </div>
              
              <!-- Manual Score Input -->
              <div style="margin-top:16px;">
                <div style="font-size:13px; font-weight:600; color:var(--text-400); margin-bottom:8px;">스코어 직접 입력</div>
                <div style="display:flex; gap:12px; margin-bottom: 12px;">
                  <div class="field" style="margin:0; flex:1;">
                    <label class="field-label" style="font-size:12px;">전반 스코어</label>
                    <div class="field-input" style="padding-right:12px;">
                      <input type="number" id="manual-score-out" placeholder="36" oninput="Record.calculateTotalScore()" style="width:100%; font-size:16px; font-weight:800; color:var(--text-100); background:transparent; border:none; outline:none; text-align:center;"/>
                      <span style="font-size:13px; font-weight:600; color:var(--text-400);">타</span>
                    </div>
                  </div>
                  <div class="field" style="margin:0; flex:1;">
                    <label class="field-label" style="font-size:12px;">후반 스코어</label>
                    <div class="field-input" style="padding-right:12px;">
                      <input type="number" id="manual-score-in" placeholder="36" oninput="Record.calculateTotalScore()" style="width:100%; font-size:16px; font-weight:800; color:var(--text-100); background:transparent; border:none; outline:none; text-align:center;"/>
                      <span style="font-size:13px; font-weight:600; color:var(--text-400);">타</span>
                    </div>
                  </div>
                </div>
                <div class="field" style="margin:0;">
                  <label class="field-label" style="font-size:12px;">총 타수</label>
                  <div class="field-input" style="padding-right:12px;">
                    <input type="number" id="manual-score" placeholder="72" style="width:100%; font-size:16px; font-weight:800; color:var(--text-100); background:transparent; border:none; outline:none; text-align:center;"/>
                    <span style="font-size:13px; font-weight:600; color:var(--text-400);">타</span>
                  </div>
                </div>
              </div>
            </div>

            <hr style="border:none; border-top:1px dashed rgba(0,0,0,0.1); margin:0;">

            <!-- 3. Story & Photos -->
            <div>
              <div style="font-size:14px; font-weight:800; color:var(--text-100); margin-bottom:12px;">3. 일지 작성</div>
              
              <div style="margin-bottom:16px;">
                <div style="font-size:13px; font-weight:600; color:var(--text-400); margin-bottom:8px;">추억을 남길 사진이나 골프장 풍경 사진 (최대 4장)</div>
                <div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:8px;" class="hide-scrollbar">
                  ${[1, 2, 3, 4].map(i => `
                  <div style="flex:0 0 auto;">
                    <input type="file" id="upload-diary-${i}" accept="image/*" style="display:none;" onchange="Record.handleDiaryUpload(${i}, event)">
                    <div id="diary-upload-box-${i}" style="background:rgba(0,0,0,0.02); border:2px dashed rgba(0,0,0,0.15); border-radius:12px; width:90px; height:90px; display:flex; flex-direction:column; justify-content:center; align-items:center; cursor:pointer; transition:background 0.2s;" onclick="document.getElementById('upload-diary-${i}').click()">
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="var(--text-300)" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <div id="diary-preview-box-${i}" style="display:none; position:relative; width:90px; height:90px; border-radius:12px; overflow:hidden; border:1px solid rgba(0,0,0,0.1);">
                      <img id="diary-preview-img-${i}" src="" style="width:100%; height:100%; object-fit:cover;">
                      <div style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.5); border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer;" onclick="Record.removeDiary(${i})">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    </div>
                  </div>
                  `).join('')}
                </div>
              </div>

              <textarea id="record-diary" placeholder="오늘 라운딩에 남기고 싶은 말을 기록해보세요." style="width:100%; height:120px; background:#fff; border:1px solid rgba(0,0,0,0.1); border-radius:12px; padding:16px; font-size:14px; font-family:inherit; resize:none; outline:none;"></textarea>
            </div>

            <div style="height: 40px;"></div>
          </div>

          <!-- Footer Action -->
          <div style="padding:16px 20px; background:#fff; border-top:1px solid rgba(0,0,0,0.05); padding-bottom: max(16px, env(safe-area-inset-bottom));">
            <button onclick="Record.saveRecord()" style="width:100%; background:linear-gradient(135deg, var(--accent), #fbbf24); color:#fff; font-size:16px; font-weight:800; padding:16px; border-radius:12px; box-shadow:0 4px 15px rgba(255,91,41,0.3);">
              다음 단계로
            </button>
          </div>

        </div>
      </div>
      <style>
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    modal = U.$(`#${modalId}`);
    
    // Animate in
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.children[0].style.transform = 'translateY(0)';
    }, 10);
  },

  closeRecordForm() {
    const modalId = 'modal-record-form';
    const modal = U.$(`#${modalId}`);
    if (modal) {
      modal.style.opacity = '0';
          modal.children[0].style.transform = 'translateY(100%)';
      setTimeout(() => modal.remove(), 300);
    }
  },

  openDatePicker() {
    const dStr = U.$('#record-date') ? U.$('#record-date').value : '';
    let curDate = new Date();
    if (dStr) {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        curDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    
    const cy = curDate.getFullYear();
    const cm = curDate.getMonth() + 1;
    const cd = curDate.getDate();

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    const REPEAT = 40;
    const MID = Math.floor(REPEAT / 2);

    let yearHtml = years.map(y => `<div class="wheel-item" data-val="${y}">${y}년</div>`).join('');
    
    let monthItemsHtml = '';
    for(let i=1; i<=12; i++) {
      monthItemsHtml += `<div class="wheel-item" data-val="${i}">${i}월</div>`;
    }
    let monthHtml = monthItemsHtml.repeat(REPEAT);
    
    let dayItemsHtml = '';
    for(let i=1; i<=31; i++) {
      dayItemsHtml += `<div class="wheel-item" data-val="${i}">${i}일</div>`;
    }
    let dayHtml = dayItemsHtml.repeat(REPEAT);

    const content = `
      <div class="wheel-picker" id="r-date-wheel-picker">
        <div class="wheel-sel-bar"></div>
        <div class="wheel-col" id="w-year">${yearHtml}</div>
        <div class="wheel-col" id="w-month">${monthHtml}</div>
        <div class="wheel-col" id="w-day">${dayHtml}</div>
      </div>
      <button class="btn btn-gold" onclick="Record.confirmDatePicker()" style="width:100%">날짜 선택 완료</button>
    `;
    
    App.showModal('📅 라운딩 날짜 선택', content);

    setTimeout(() => {
      const hYear = U.$('#w-year');
      const hMonth = U.$('#w-month');
      const hDay = U.$('#w-day');
      
      const ITEM_HEIGHT = 44;
      const yIdx = years.indexOf(cy);
      hYear.scrollTop = (yIdx > -1 ? yIdx : 1) * ITEM_HEIGHT;
      hMonth.scrollTop = (MID * 12 + cm - 1) * ITEM_HEIGHT;
      hDay.scrollTop = (MID * 31 + cd - 1) * ITEM_HEIGHT;

      [hYear, hMonth, hDay].forEach(col => {
        col.addEventListener('scroll', () => {
          clearTimeout(col.snapTimer);
          col.snapTimer = setTimeout(() => Record.updateWheelActive(col), 50);
        });
        Record.updateWheelActive(col);
      });
    }, 100);
  },

  confirmDatePicker() {
    const ITEM_HEIGHT = 44;
    const getVal = (id) => {
      const col = U.$('#' + id);
      const idx = Math.round(col.scrollTop / ITEM_HEIGHT);
      const item = col.querySelectorAll('.wheel-item')[idx];
      return item ? parseInt(item.dataset.val, 10) : 1;
    };

    const y = getVal('w-year');
    const m = getVal('w-month');
    const d = getVal('w-day');

    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    
    const display = U.$('#record-date-display');
    const input = U.$('#record-date');
    if (display) display.innerText = dateStr;
    if (input) input.value = dateStr;
    
    App.closeModal(); U.haptic();
  },

  openTimePicker() {
    const tStr = U.$('#record-time') ? U.$('#record-time').value : '07:30';
    let defaultH = 7;
    let defaultM = 30;
    if (tStr) {
      const parts = tStr.split(':');
      if (parts.length === 2) {
        defaultH = parseInt(parts[0], 10);
        defaultM = parseInt(parts[1], 10);
      }
    }
    
    const isPM = defaultH >= 12;
    const h12 = defaultH % 12 || 12;

    const REPEAT = 40;
    const MID = Math.floor(REPEAT / 2);

    let ampmHtml = ['오전', '오후'].map(v => `<div class="wheel-item" data-val="${v}">${v}</div>`).join('');
    let hourItems = '';
    for (let i = 1; i <= 12; i++) {
      hourItems += `<div class="wheel-item" data-val="${i}">${i}</div>`;
    }
    let hourHtml = hourItems.repeat(REPEAT);
    
    let minItems = '';
    for (let i = 0; i < 60; i++) {
      minItems += `<div class="wheel-item" data-val="${i}">${String(i).padStart(2, '0')}</div>`;
    }
    let minHtml = minItems.repeat(REPEAT);

    const content = `
      <div class="wheel-picker" id="r-wheel-picker">
        <div class="wheel-sel-bar"></div>
        <div class="wheel-col" id="w-ampm">${ampmHtml}</div>
        <div class="wheel-col" id="w-hour">${hourHtml}</div>
        <div class="wheel-col" id="w-min">${minHtml}</div>
      </div>
      <button class="btn btn-gold" onclick="Record.confirmTimePicker()" style="width:100%">선택 완료</button>
    `;

    App.showModal('⏰ 티오프 시간 선택', content);

    setTimeout(() => {
      const hAmPm = U.$('#w-ampm');
      const hHour = U.$('#w-hour');
      const hMin = U.$('#w-min');
      
      const ITEM_HEIGHT = 44;
      hAmPm.scrollTop = (isPM ? 1 : 0) * ITEM_HEIGHT;
      hHour.scrollTop = (MID * 12 + h12 - 1) * ITEM_HEIGHT;
      hMin.scrollTop = (MID * 60 + defaultM) * ITEM_HEIGHT;

      [hAmPm, hHour, hMin].forEach(col => {
        col.addEventListener('scroll', () => {
          clearTimeout(col.snapTimer);
          col.snapTimer = setTimeout(() => Record.updateWheelActive(col), 50);
        });
        Record.updateWheelActive(col);
      });
    }, 100);
  },

  confirmTimePicker() {
    const ITEM_HEIGHT = 44;
    const getVal = (id) => {
      const col = U.$('#' + id);
      const idx = Math.round(col.scrollTop / ITEM_HEIGHT);
      const item = col.querySelectorAll('.wheel-item')[idx];
      return item ? item.dataset.val : null;
    };

    const ampm = getVal('w-ampm');
    let h = parseInt(getVal('w-hour'), 10);
    const m = parseInt(getVal('w-min'), 10);

    if (ampm === '오후' && h < 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;

    const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    
    const display = U.$('#record-time-display');
    const input = U.$('#record-time');
    if (display) display.innerText = timeStr;
    if (input) input.value = timeStr;
    
    App.closeModal(); U.haptic();
  },

  updateWheelActive(col) {
    const ITEM_HEIGHT = 44;
    const idx = Math.round(col.scrollTop / ITEM_HEIGHT);
    const activeItem = col.querySelector('.wheel-item.active');
    if (activeItem) activeItem.classList.remove('active');
    
    const items = col.querySelectorAll('.wheel-item');
    if (items[idx]) {
      items[idx].classList.add('active');
    }
  },

  compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.6) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * (maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * (maxHeight / height));
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  async handleScoreUpload(idx, event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const base64Image = await this.compressImage(file, 800, 800, 0.6);
      
      document.getElementById(`score-upload-box-${idx}`).style.display = 'none';
      document.getElementById(`score-preview-box-${idx}`).style.display = 'block';
      document.getElementById(`score-preview-img-${idx}`).src = base64Image;
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      U.toast('사진 업로드에 실패했습니다.');
    }
  },

  calculateTotalScore() {
    const outScore = parseInt(document.getElementById('manual-score-out')?.value || 0, 10);
    const inScore = parseInt(document.getElementById('manual-score-in')?.value || 0, 10);
    const totalInput = document.getElementById('manual-score');
    if (totalInput && (outScore > 0 || inScore > 0)) {
      totalInput.value = outScore + inScore;
    }
  },


  removeScore(idx) {
    document.getElementById(`upload-scorecard-${idx}`).value = '';
    document.getElementById(`score-preview-box-${idx}`).style.display = 'none';
    document.getElementById(`score-upload-box-${idx}`).style.display = 'flex';
  },

  async handleDiaryUpload(idx, event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const base64Image = await this.compressImage(file, 800, 800, 0.6);
      document.getElementById(`diary-upload-box-${idx}`).style.display = 'none';
      document.getElementById(`diary-preview-box-${idx}`).style.display = 'block';
      document.getElementById(`diary-preview-img-${idx}`).src = base64Image;
    } catch (e) {
      console.error("Diary upload error:", e);
      U.toast('사진 업로드에 실패했습니다.');
    }
  },

  removeDiary(idx) {
    document.getElementById(`upload-diary-${idx}`).value = '';
    document.getElementById(`diary-preview-box-${idx}`).style.display = 'none';
    document.getElementById(`diary-upload-box-${idx}`).style.display = 'flex';
  },

  saveRecord() {
    try {
      const dateInput = document.getElementById('record-date').value;
      const course = document.getElementById('record-course').value || '이름 모를 구장';
      
      // 수기 입력창에서 실제 데이터 가져오기 (비어있으면 기본값 72)
      const manualScoreOut = document.getElementById('manual-score-out') ? document.getElementById('manual-score-out').value : '';
      const manualScoreIn = document.getElementById('manual-score-in') ? document.getElementById('manual-score-in').value : '';
      const manualScoreTotal = document.getElementById('manual-score') ? document.getElementById('manual-score').value : '';
      
      let finalScore = '72';
      if (manualScoreTotal) {
        finalScore = manualScoreTotal;
      } else if (manualScoreOut && manualScoreIn) {
        finalScore = (parseInt(manualScoreOut, 10) + parseInt(manualScoreIn, 10)).toString();
      }

      const score = finalScore;
      const putts = '0'; // 퍼트수 입력란 삭제에 따른 기본값 처리
      const fairway = '70';
      const green = '60';
      const diary = document.getElementById('record-diary').value || '즐거운 라운딩이었습니다!';

      if (!dateInput) {
        U.toast('날짜를 선택해주세요.');
        return;
      }

      const validDataUrl = (el) => el && el.src && el.src.startsWith('data:image') ? el.src : null;
      const scoreImg1 = validDataUrl(document.getElementById('score-preview-img-1'));
      const scoreImg2 = validDataUrl(document.getElementById('score-preview-img-2'));
      const dImg1 = validDataUrl(document.getElementById('diary-preview-img-1'));
      const dImg2 = validDataUrl(document.getElementById('diary-preview-img-2'));
      const dImg3 = validDataUrl(document.getElementById('diary-preview-img-3'));
      const dImg4 = validDataUrl(document.getElementById('diary-preview-img-4'));

      // Save to this.records
      this.records[dateInput] = {
        course: course,
        score: parseInt(score, 10),
        putts: parseInt(putts, 10),
        fairway: fairway + '%',
        green: green + '%',
        diary: diary,
        scoreImg1, scoreImg2,
        dImg1, dImg2, dImg3, dImg4
      };

      // Save to localStorage
      localStorage.setItem('bp_records_v1', JSON.stringify(this.records));

      U.toast('AI가 일지를 등록 중입니다...');
      
      // Set AI Generating State
      State.aiGeneratingDate = dateInput;
      this.closeRecordForm();
      this.render();

      // Simulate AI loading delay (3.5 seconds)
      setTimeout(() => {
        if (State.aiGeneratingDate === dateInput) {
          State.aiGeneratingDate = null;
          U.toast('🎉 AI 라운딩 일지 작성이 완료되었습니다!');
          
          // If the user is currently viewing the generated date, re-render the card
          if (this.selectedDate) {
            const dStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2,'0')}-${String(this.selectedDate).padStart(2,'0')}`;
            if (dStr === dateInput) {
               this.selectDate(this.selectedDate);
            }
          }
          this.renderCalendarGrid();
        }
      }, 3500);
    } catch (e) {
      alert("Error in saveRecord: " + e.message);
      console.error(e);
    }
  },

  showDiaryDetail(y, m, d) {
    const modalId = 'modal-diary-detail';
    let modal = U.$(`#${modalId}`);
    if (modal) modal.remove();

    const dateStr = `${y}. ${String(m + 1).padStart(2, '0')}. ${String(d).padStart(2, '0')}`;
    const dateKey = `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dateKeyOld = `${y}-${m + 1}-${d}`;
    const rec = this.records[dateKey] || this.records[dateKeyOld] || {
      course: '이름 모를 구장',
      score: 72,
      diary: '즐거운 라운딩이었습니다!'
    };

    let teeTime = '';
    if (window.State && window.State.schedules) {
      const schedule = window.State.schedules.find(s => s.date === dateKey || s.date === dateKeyOld);
      if (schedule && schedule.time) {
         teeTime = schedule.time;
      }
    }
    

    
    // User uploaded photos (Only Diary photos for carousel)
    let photos = [];
    if (rec.dImg1) photos.push(rec.dImg1);
    if (rec.dImg2) photos.push(rec.dImg2);
    if (rec.dImg3) photos.push(rec.dImg3);
    if (rec.dImg4) photos.push(rec.dImg4);

    // Fallback Unsplash dummy images for the carousel if no images were uploaded
    if (photos.length === 0) {
      photos = [
        'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=600&auto=format&fit=crop' // Default Golf course
      ];
    }

    const userName = localStorage.getItem('bp_user_name') || '버디 골퍼';

    const html = `
      <div id="${modalId}" class="modal-overlay" style="display:flex; justify-content:center; align-items:flex-end; background:rgba(0,0,0,0.8); position:fixed; top:0; left:0; width:100%; height:100%; z-index:10000; opacity:0; transition: opacity 0.3s;">
        <div style="background:#fff; width:100%; max-width:var(--max-width); height:95vh; border-radius:24px 24px 0 0; display:flex; flex-direction:column; overflow:hidden; transform:translateY(100%); transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);">
          
          <!-- Sticky Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid rgba(0,0,0,0.05); background:#fff; z-index:10;">
            <button onclick="Record.closeDiaryDetail()" style="color:var(--text-100); padding:4px;">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div style="font-size:17px; font-weight:800; color:var(--text-100);">라운드 일지</div>
            <button onclick="U.toast('공유 메뉴가 열립니다.')" style="color:var(--text-100); padding:4px;">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            </button>
          </div>

          <!-- Content Scroll Area -->
          <div class="screen-scroll" style="flex:1; overflow-y:auto; background:#fafafa;">
            <div style="background:#fff; padding-bottom:24px;">
              
              <!-- 1. Post Header (User, Location, Date) -->
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 16px 12px 16px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg, #fbbf24, #f59e0b); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px;">${userName.charAt(0)}</div>
                  <div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-size:16px; font-weight:800; color:var(--text-100);">${userName}</span>
                    <span style="font-size:14px; font-weight:700; color:var(--text-300);">📍 ${rec.course} · ${dateStr} ${teeTime ? `· ⏰ ${teeTime}` : ''}</span>
                  </div>
                </div>
                <button style="color:var(--text-400);">
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                </button>
              </div>

              <!-- 2. Image Carousel -->
              <div style="position:relative; width:100%; aspect-ratio:1/1.05; background:#eee; overflow:hidden;">
                <div id="diary-img-scroll" style="display:flex; width:100%; height:100%; overflow-x:auto; scroll-snap-type: x mandatory;" class="hide-scrollbar">
                  ${photos.map((src, i) => `
                    <div style="flex-shrink:0; width:100%; height:100%; scroll-snap-align:start; position:relative;">
                      <img src="${src}" style="width:100%; height:100%; object-fit:cover;">
                      <div style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.6); color:#fff; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:700;">${i+1} / ${photos.length}</div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- 4. Score Summary Box -->
              <div style="padding:0 16px; margin-bottom:16px; margin-top:16px;">
                <div style="font-size:16px; font-weight:800; color:var(--text-100); margin-bottom:12px;">최종 스코어</div>
                <div style="background:rgba(37,99,235,0.04); border:1px solid rgba(37,99,235,0.1); border-radius:12px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; flex-direction:column; align-items:flex-start;">
                    <span style="font-size:13px; font-weight:700; color:var(--text-400); margin-bottom:4px;">${userName} (나)</span>
                    <span style="font-size:28px; font-weight:800; color:#2563eb;">${rec.score}<span style="font-size:16px; font-weight:600; color:var(--text-300); margin-left:4px;">타</span></span>
                  </div>
                  <div style="display:flex; gap:8px;">
                    ${rec.scoreImg1 ? `<img src="${rec.scoreImg1}" onclick="Record.showScorecardGallery(['${rec.scoreImg1 || ''}', '${rec.scoreImg2 || ''}'].filter(Boolean), 0)" style="width:48px; height:48px; border-radius:8px; object-fit:cover; border:1px solid rgba(0,0,0,0.1); cursor:pointer;">` : ''}
                    ${rec.scoreImg2 ? `<img src="${rec.scoreImg2}" onclick="Record.showScorecardGallery(['${rec.scoreImg1 || ''}', '${rec.scoreImg2 || ''}'].filter(Boolean), 1)" style="width:48px; height:48px; border-radius:8px; object-fit:cover; border:1px solid rgba(0,0,0,0.1); cursor:pointer;">` : ''}
                  </div>
                </div>
              </div>

              <!-- 5. Story / Content -->
              <div style="padding:0 16px;">
                <p style="font-size:14px; font-weight:500; color:var(--text-100); line-height:1.6; margin:0 0 12px 0;">
                  <span style="font-weight:800; margin-right:4px;">${userName}</span>${rec.diary.replace(/\\n/g, '<br>')}
                </p>
                <div style="font-size:13px; font-weight:600; color:#2563eb;">
                  #명랑골프 #버디플래너 #골프스타그램 #골프일지
                </div>
              </div>

            </div>
            
            <div style="height:40px;"></div>
          </div>
          
        </div>
      </div>
      <style>
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    modal = U.$(`#${modalId}`);
    
    // Animate in
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.children[0].style.transform = 'translateY(0)';
    }, 10);
  },

  showScorecardGallery(images, startIndex = 0) {
    if (!images || images.length === 0) return;
    const html = `
      <div id="modal-fullscreen-gallery" style="display:flex; flex-direction:column; background:rgba(0,0,0,0.95); position:fixed; top:0; left:0; width:100%; height:100%; z-index:10001; opacity:0; transition: opacity 0.3s;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:20px; color:#fff;">
          <div style="font-size:16px; font-weight:700;">스코어카드</div>
          <div onclick="this.parentElement.parentElement.style.opacity='0'; setTimeout(()=>this.parentElement.parentElement.remove(), 300)" style="font-size:32px; font-weight:200; cursor:pointer; line-height:1;">&times;</div>
        </div>
        <div style="flex:1; width:100%; display:flex; overflow-x:auto; scroll-snap-type: x mandatory;" class="hide-scrollbar">
          ${images.map(src => `
            <div style="flex-shrink:0; width:100%; height:100%; scroll-snap-align:start; display:flex; justify-content:center; align-items:center; padding:10px;">
              <img src="${src}" style="max-width:100%; max-height:100%; border-radius:12px; object-fit:contain;">
            </div>
          `).join('')}
        </div>
        <div style="text-align:center; padding:20px; color:rgba(255,255,255,0.5); font-size:13px; font-weight:600;">좌우로 스와이프하여 사진 이동</div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('modal-fullscreen-gallery');
    setTimeout(() => {
      modal.style.opacity = '1';
      const scrollContainer = modal.children[1];
      scrollContainer.scrollLeft = startIndex * scrollContainer.clientWidth;
    }, 10);
  },


  closeDiaryDetail() {
    const modalId = 'modal-diary-detail';
    const modal = U.$(`#${modalId}`);
    if (modal) {
      modal.style.opacity = '0';
      modal.children[0].style.transform = 'translateY(100%)';
      setTimeout(() => {
        modal.remove();
      }, 400);
    }
  }
};

