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

  /* ── 날짜별 여러 라운드 ──
     키: 'YYYY-MM-DD'(첫 라운드), 'YYYY-MM-DD#2', '#3' … (같은 날 추가 라운드)
     예전 형식 'YYYY-M-D' 키도 그대로 읽음 */
  dateOf(key) {
    const base = String(key).split('#')[0];
    const p = base.split('-');
    return p.length === 3 ? `${p[0]}-${String(p[1]).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}` : base;
  },
  ymd(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; },
  roundsOn(dateStr) {
    return Object.keys(this.records)
      .filter(k => this.records[k] && this.dateOf(k) === dateStr)
      .sort((a, b) => {
        const ta = this.records[a].time || '', tb = this.records[b].time || '';
        return ta && tb && ta !== tb ? ta.localeCompare(tb) : a.localeCompare(b);
      })
      .map(k => ({ key: k, rec: this.records[k] }));
  },
  nextKey(dateStr) {
    if (!this.records[dateStr]) return dateStr;
    let n = 2;
    while (this.records[`${dateStr}#${n}`]) n++;
    return `${dateStr}#${n}`;
  },
  scoredList() {
    return Object.keys(this.records)
      .filter(k => this.records[k] && typeof this.records[k].score === 'number')
      .map(k => ({ key: k, date: this.dateOf(k), ...this.records[k] }))
      .sort((a, b) => a.date === b.date ? a.key.localeCompare(b.key) : a.date.localeCompare(b.date));
  },

  /** 최근 라운드 타수 추이 (작은 선 그래프) */
  trendHtml(list) {
    const pts = list.slice(-12);
    if (pts.length < 2) return '';
    const W = 320, H = 96, PADX = 14, PADY = 18;
    const scores = pts.map(p => p.score);
    let lo = Math.min(...scores), hi = Math.max(...scores);
    if (hi - lo < 6) { const mid = (hi + lo) / 2; lo = mid - 3; hi = mid + 3; }
    const x = i => PADX + (W - PADX * 2) * (i / (pts.length - 1));
    const y = v => PADY + (H - PADY * 2) * ((v - lo) / (hi - lo));   // 타수가 낮을수록 위
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
    const best = Math.min(...scores);
    const dots = pts.map((p, i) => {
      const isBest = p.score === best, isLast = i === pts.length - 1;
      const label = isBest || isLast || i === 0 ? `<text x="${x(i).toFixed(1)}" y="${(y(p.score) - 7).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="800" fill="${isBest ? '#d97706' : '#334155'}">${p.score}</text>` : '';
      return `<circle cx="${x(i).toFixed(1)}" cy="${y(p.score).toFixed(1)}" r="${isLast ? 4 : 3}" fill="${isBest ? '#f59e0b' : '#007aff'}" stroke="#fff" stroke-width="1.5"/>${label}`;
    }).join('');
    const first = pts[0].date.slice(2).replace(/-/g, '.'), last = pts[pts.length - 1].date.slice(2).replace(/-/g, '.');
    const delta = pts[pts.length - 1].score - pts[0].score;
    const msg = delta < 0 ? `처음보다 <b style="color:#059669;">${-delta}타 줄었어요</b>` : delta > 0 ? `처음보다 ${delta}타 늘었어요` : '꾸준히 유지하고 있어요';
    return `
      <div class="rec-trend">
        <div class="rec-trend-head"><span>최근 ${pts.length}라운드 타수</span><span class="rec-trend-msg">${msg}</span></div>
        <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img" aria-label="최근 라운드 타수 추이">
          <path d="${line}" fill="none" stroke="#007aff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
          ${dots}
        </svg>
        <div class="rec-trend-foot"><span>${first}</span><span>● 베스트</span><span>${last}</span></div>
      </div>`;
  },

  render() {
    const container = U.$('#screen-record');
    const list = this.scoredList();
    const validScoreCount = list.length;
    const totalScore = list.reduce((t, r) => t + r.score, 0);
    const recentScore = list.length ? list[list.length - 1].score : '--';

    const avgScore = validScoreCount > 0 ? (totalScore / validScoreCount).toFixed(1) : '--';
    const displayCount = validScoreCount;

    container.innerHTML = `
      <div class="screen-scroll" style="background:#f8fafc; padding-top:var(--header-h); padding-bottom:calc(var(--nav-h) + 16px);">
        
        <!-- Record Top Section -->
        <div style="padding: 16px 20px 8px;">
          
          <!-- 라운딩 핵심 통계 바 (Unified Style) -->
          <div style="display:flex; justify-content:space-around; align-items:center; background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; padding:14px 12px; margin-bottom:18px; box-shadow:0 2px 10px rgba(0,0,0,0.02);">
            <div style="text-align:center; flex:1;">
              <div style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:3px;">총 라운딩</div>
              <div style="font-size:17px; font-weight:800; color:#0f172a;"><span style="color:#007aff;">${displayCount}</span>회</div>
            </div>
            <div style="width:1px; height:24px; background:#e2e8f0;"></div>
            <div style="text-align:center; flex:1;">
              <div style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:3px;">평균 타수</div>
              <div style="font-size:17px; font-weight:800; color:#0f172a;">${avgScore}<span style="font-size:12px; font-weight:700; color:#64748b;">타</span></div>
            </div>
            <div style="width:1px; height:24px; background:#e2e8f0;"></div>
            <div style="text-align:center; flex:1;">
              <div style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:3px;">최근 타수</div>
              <div style="font-size:17px; font-weight:800; color:#0f172a;">${recentScore}<span style="font-size:12px; font-weight:700; color:#64748b;">타</span></div>
            </div>
          </div>
          ${this.trendHtml(list)}
        </div>

        <div style="padding: 0 16px 12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h2 style="font-size:18px; font-weight:800; color:#0f172a; margin:0; display:flex; align-items:center; gap:6px;">
              <span>📅</span>
              라운딩 스코어 캘린더
            </h2>
            <button onclick="Record.showRecordForm()" style="background:#04122d; color:#fff; border:none; padding:8px 16px; border-radius:9999px; font-size:13px; font-weight:800; display:flex; align-items:center; gap:6px; cursor:pointer; box-shadow:0 3px 10px rgba(4,18,45,0.2);">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              스코어 등록
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
    for (let i = 0; i < firstDay; i++) html += `<div class="record-cal-cell empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const rounds = this.roundsOn(this.ymd(this.currentYear, this.currentMonth, d));
      let badgeHtml = '';
      if (rounds.length) {
        const r0 = rounds[0].rec;
        badgeHtml = `
          <div class="record-badge">
            <div class="record-badge-course">${U.esc(r0.course || '')}</div>
            <div>${typeof r0.score === 'number' ? r0.score + '타' : '기록'}${rounds.length > 1 ? ` <span class="record-badge-more">+${rounds.length - 1}</span>` : ''}</div>
          </div>`;
      }
      const selectedClass = (this.selectedDate === d) ? 'selected' : '';
      html += `
        <div class="record-cal-cell ${rounds.length ? 'has-record' : ''} ${selectedClass}" onclick="Record.selectDate(${d})" style="position:relative;">
          <span class="day-num">${d}</span>
          ${badgeHtml}
        </div>`;
    }
    grid.innerHTML = html;
  },

  selectDate(d) {
    this.selectedDate = d;
    this.renderCalendarGrid();
    const dateStr = this.ymd(this.currentYear, this.currentMonth, d);
    const rounds = this.roundsOn(dateStr);
    const detailContainer = U.$('#record-detail-container');
    const dayStr = ['일', '월', '화', '수', '목', '금', '토'][new Date(this.currentYear, this.currentMonth, d).getDay()];
    const dateLabel = `${this.currentYear}. ${String(this.currentMonth + 1).padStart(2, '0')}. ${String(d).padStart(2, '0')} (${dayStr})`;

    if (!rounds.length) {
      detailContainer.innerHTML = `
        <div class="record-card" style="animation: slideUp 0.3s ease; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:130px; gap:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="font-size:24px;">⛳️</div>
            <div style="font-size:15px; font-weight:700; color:#64748b;">기록이 없는 날입니다</div>
          </div>
          <button class="record-action" onclick="Record.showRecordForm()" style="margin:0; width:100%; padding:11px; font-size:14px; background:#04122d; color:#fff; border:none; border-radius:10px; font-weight:800;">+ 새 라운드 일지 작성하기</button>
        </div>`;
      return;
    }

    // 그날 일정의 동반자 (일정이 하나일 때만 연결)
    let companions = [];
    if (window.State && window.State.schedules) {
      const same = window.State.schedules.filter(s => {
        const sd = s.date instanceof Date ? s.date : new Date(s.date);
        return !isNaN(sd) && this.ymd(sd.getFullYear(), sd.getMonth(), sd.getDate()) === dateStr;
      });
      if (same.length === 1 && rounds.length === 1) companions = same[0].companions || [];
    }
    const companionsHtml = companions.length
      ? companions.map(c => `<div class="record-stat-item"><span class="record-stat-label" style="color:#0f172a; font-size:13px; font-weight:700;">${U.esc((c && c.name) || c)}</span><span class="record-stat-val" style="color:#94a3b8; font-size:12px; font-weight:700;">함께한 동반자</span></div>`).join('')
      : '';

    detailContainer.innerHTML = rounds.map(({ key, rec }, idx) => `
      <div class="record-card" style="animation: slideUp 0.3s ease; cursor:pointer; margin-bottom:10px;" onclick="Record.showDiaryDetail('${key}')">
        <div class="record-card-top">
          <div style="display:flex; flex-direction:column; gap:4px; min-width:0;">
            <span class="record-date">${dateLabel}${rounds.length > 1 ? ` · ${idx + 1}라운드` : ''}${rec.time ? ` · ${U.esc(rec.time)}` : ''}</span>
            <span style="font-size:18px; font-weight:800; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${U.esc(rec.course || '')}</span>
          </div>
          <div class="record-score-box">
            <span class="score-num">${typeof rec.score === 'number' ? rec.score : '-'}</span>
            <span class="score-unit">타</span>
          </div>
        </div>
        <div class="record-card-bottom" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; flex-direction:column; gap:6px; flex:1; min-width:0;">
            ${companionsHtml || `<span style="color:#64748b; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${rec.diary ? U.esc(rec.diary.slice(0, 40)) : '눌러서 일지 자세히 보기 ›'}</span>`}
          </div>
          <button onclick="event.stopPropagation(); Record.showRecordForm('${key}')" style="background:#f1f5f9; color:#334155; border:1px solid #e2e8f0; border-radius:8px; padding:6px 16px; font-size:13px; font-weight:800; cursor:pointer; flex-shrink:0; margin-left:12px;">수정</button>
        </div>
      </div>`).join('') + `
      <button onclick="Record.showRecordForm()" class="rec-add-round">+ 이날 라운드 추가</button>`;
  },

  showDetail() {
    this.showRecordForm();
  },

  /** editKey가 있으면 그 라운드 수정, 없으면 선택한 날짜에 새 라운드 */
  showRecordForm(editKey) {
    const modalId = 'modal-record-form';
    let modal = U.$(`#${modalId}`);
    if (modal) modal.remove();

    // Ensure date variables are initialized
    const y = this.currentYear || new Date().getFullYear();
    const m = this.currentMonth !== undefined ? this.currentMonth : new Date().getMonth();
    const d = this.selectedDate || new Date().getDate();

    const existingRecord = editKey && this.records[editKey] ? this.records[editKey] : null;
    const todayStr = existingRecord ? this.dateOf(editKey) : this.ymd(y, m, d);

    let defaultCourse = existingRecord ? (existingRecord.course || '') : '';
    let defaultTime = existingRecord ? (existingRecord.time || '07:30') : '07:30';
    // 수정할 때 원래 키를 기억 (날짜를 바꾸면 새 날짜로 옮겨짐)
    this._editingKey = existingRecord ? editKey : null;

    const html = `
      <div id="${modalId}" class="modal-overlay" style="display:flex; justify-content:center; align-items:flex-end; background:rgba(0,0,0,0.6); position:fixed; top:0; left:0; width:100%; height:100%; z-index:999; opacity:0; transition: opacity 0.3s;">
        <div style="background:#ffffff; width:100%; max-width:var(--max-width); height:auto; max-height:88vh; border-radius:20px 20px 0 0; display:flex; flex-direction:column; overflow:hidden; transform:translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);">
          
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #f1f5f9;">
            <div style="font-size:16px; font-weight:800; color:#0f172a; letter-spacing:-0.3px;">${existingRecord ? '라운드 기록 수정' : '스코어 및 일지 등록'}</div>
            <button onclick="Record.closeRecordForm()" style="color:#64748b; padding:4px; border:none; background:transparent; cursor:pointer;" aria-label="닫기">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <!-- Form Content -->
          <div class="screen-scroll" style="padding:14px 16px; flex:1; display:flex; flex-direction:column; gap:14px; background:#f8fafc;">
            
            <!-- 1. Date & Schedule -->
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 13px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
              <div style="font-size:13.5px; font-weight:800; color:#0f172a; margin-bottom:8px; display:flex; align-items:center; gap:5px;">
                <span>📋</span> 1. 기본 정보
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                
                <div class="field" style="margin:0;">
                  <label class="field-label" style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:3px;"><span class="req" style="color:#ef4444;">*</span> 날짜</label>
                  <div class="picker-btn" onclick="Record.openDatePicker()" style="height:38px; padding:0 12px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
                    <span class="picker-val" id="record-date-display" style="font-size:13px; font-weight:700; color:#0f172a;">${todayStr}</span>
                    <span class="picker-ico" style="font-size:14px;">📅</span>
                    <input type="hidden" id="record-date" value="${todayStr}">
                  </div>
                </div>

                <div class="field" style="margin:0;">
                  <label class="field-label" style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:3px;"><span class="req" style="color:#ef4444;">*</span> 구장 선택</label>
                  <div class="field-input" style="height:38px; padding:0 12px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center;">
                    <input type="text" id="record-course" value="${U.esc(defaultCourse)}" placeholder="예: 남서울CC" style="width:100%; font-size:13px; font-weight:700; color:#0f172a; background:transparent; border:none; outline:none;"/>
                    <span class="fi-icon" style="font-size:13.5px; opacity:0.5;">🔍</span>
                  </div>
                </div>

                <div class="field" style="margin:0;">
                  <label class="field-label" style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:3px;"><span class="req" style="color:#ef4444;">*</span> 티업시간</label>
                  <div class="picker-btn" onclick="Record.openTimePicker()" style="height:38px; padding:0 12px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
                    <span class="picker-val" id="record-time-display" style="font-size:13px; font-weight:700; color:#0f172a;">${defaultTime}</span>
                    <span class="picker-ico" style="font-size:14px;">⏰</span>
                    <input type="hidden" id="record-time" value="${defaultTime}">
                  </div>
                </div>

              </div>
            </div>

            <!-- 2. Score Info (Photo Only) -->
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 13px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
              <div style="font-size:13.5px; font-weight:800; color:#0f172a; margin-bottom:3px; display:flex; align-items:center; gap:5px;">
                <span>⛳</span> 2. 스코어 등록
              </div>
              <div style="font-size:11px; font-weight:600; color:#64748b; margin-bottom:8px;">스코어카드 사진을 함께 남겨 두세요. (PRO는 AI 비서에게 사진을 보내면 타수를 자동으로 읽어 드려요)</div>
              <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:4px;" class="hide-scrollbar">
                ${[1, 2].map(i => `
                <div style="flex:0 0 auto;">
                  <input type="file" id="upload-scorecard-${i}" accept="image/*" style="display:none;" onchange="Record.handleScoreUpload(${i}, event)">
                  <div id="score-upload-box-${i}" style="background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:8px; width:68px; height:68px; display:flex; flex-direction:column; justify-content:center; align-items:center; cursor:pointer; transition:all 0.15s ease;" onclick="document.getElementById('upload-scorecard-${i}').click()">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="#007aff" stroke-width="2" fill="none" style="margin-bottom:2px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <div style="font-size:10.5px; font-weight:700; color:#475569;">${i === 1 ? '전반' : '후반'}</div>
                  </div>
                  <div id="score-preview-box-${i}" style="display:none; position:relative; width:68px; height:68px; border-radius:8px; overflow:hidden; border:1px solid #cbd5e1; background:#f1f5f9;">
                    <img id="score-preview-img-${i}" src="" style="width:100%; height:100%; object-fit:contain; padding:2px; box-sizing:border-box;">
                    <div style="position:absolute; top:3px; right:3px; background:rgba(0,0,0,0.5); border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer;" onclick="Record.removeScore(${i})">
                      <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                  </div>
                </div>
                `).join('')}
              </div>
              
              <!-- Manual Score Input (3-Column compact layout) -->
              <div style="margin-top:10px;">
                <div style="font-size:11.5px; font-weight:700; color:#64748b; margin-bottom:6px;">스코어 직접 입력</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px;">
                  <div class="field" style="margin:0;">
                    <label class="field-label" style="font-size:10.5px; font-weight:700; color:#64748b; margin-bottom:2px;">전반 스코어</label>
                    <div class="field-input" style="height:36px; padding:0 8px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center;">
                      <input type="number" id="manual-score-out" placeholder="36" oninput="Record.calculateTotalScore()" style="width:100%; font-size:14px; font-weight:800; color:#0f172a; background:transparent; border:none; outline:none; text-align:center;"/>
                      <span style="font-size:11.5px; font-weight:600; color:#94a3b8; flex-shrink:0;">타</span>
                    </div>
                  </div>
                  <div class="field" style="margin:0;">
                    <label class="field-label" style="font-size:10.5px; font-weight:700; color:#64748b; margin-bottom:2px;">후반 스코어</label>
                    <div class="field-input" style="height:36px; padding:0 8px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center;">
                      <input type="number" id="manual-score-in" placeholder="36" oninput="Record.calculateTotalScore()" style="width:100%; font-size:14px; font-weight:800; color:#0f172a; background:transparent; border:none; outline:none; text-align:center;"/>
                      <span style="font-size:11.5px; font-weight:600; color:#94a3b8; flex-shrink:0;">타</span>
                    </div>
                  </div>
                  <div class="field" style="margin:0;">
                    <label class="field-label" style="font-size:10.5px; font-weight:700; color:#64748b; margin-bottom:2px;">총 타수</label>
                    <div class="field-input" style="height:36px; padding:0 8px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center;">
                      <input type="number" id="manual-score" placeholder="72" style="width:100%; font-size:14px; font-weight:800; color:#0f172a; background:transparent; border:none; outline:none; text-align:center;"/>
                      <span style="font-size:11.5px; font-weight:600; color:#94a3b8; flex-shrink:0;">타</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 홀별 직접 입력 (선택) -->
              <details class="rec-holes" id="rec-holes" ${existingRecord && Array.isArray(existingRecord.holes) && existingRecord.holes.length === 18 ? 'open' : ''}>
                <summary>홀별 스코어 입력 <span>(선택)</span></summary>
                ${[0, 9].map(start => `
                <div class="rec-holes-label">${start ? '후반 IN (10~18번)' : '전반 OUT (1~9번)'}</div>
                <div class="rec-holes-grid">
                  ${Array.from({ length: 9 }, (_, k) => start + k).map(h => `
                  <label><span>${h + 1}</span><input type="number" inputmode="numeric" min="1" max="15" id="hole-${h}" oninput="Record.onHoleInput()"></label>`).join('')}
                </div>`).join('')}
                <div class="rec-holes-hint">18홀을 모두 입력하면 전반·후반·총 타수가 자동으로 채워져요.</div>
              </details>
            </div>

            <!-- 3. Story & Photos -->
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 13px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
              <div style="font-size:13.5px; font-weight:800; color:#0f172a; margin-bottom:4px; display:flex; align-items:center; gap:5px;">
                <span>📝</span> 3. 일지 작성
              </div>
              
              <div style="margin-bottom:8px;">
                <div style="font-size:11px; font-weight:600; color:#64748b; margin-bottom:6px;">추억을 남길 사진이나 골프장 풍경 사진 (최대 4장)</div>
                <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:4px;" class="hide-scrollbar">
                  ${[1, 2, 3, 4].map(i => `
                  <div style="flex:0 0 auto;">
                    <input type="file" id="upload-diary-${i}" accept="image/*" style="display:none;" onchange="Record.handleDiaryUpload(${i}, event)">
                    <div id="diary-upload-box-${i}" style="background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:8px; width:64px; height:64px; display:flex; flex-direction:column; justify-content:center; align-items:center; cursor:pointer; transition:all 0.15s ease;" onclick="document.getElementById('upload-diary-${i}').click()">
                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="#94a3b8" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <div id="diary-preview-box-${i}" style="display:none; position:relative; width:64px; height:64px; border-radius:8px; overflow:hidden; border:1px solid #cbd5e1;">
                      <img id="diary-preview-img-${i}" src="" style="width:100%; height:100%; object-fit:cover;">
                      <div style="position:absolute; top:3px; right:3px; background:rgba(0,0,0,0.5); border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer;" onclick="Record.removeDiary(${i})">
                        <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    </div>
                  </div>
                  `).join('')}
                </div>
              </div>

              <textarea id="record-diary" placeholder="오늘 라운딩에 남기고 싶은 말을 기록해보세요." style="width:100%; height:64px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; font-size:12.5px; font-family:inherit; resize:none; outline:none; box-sizing:border-box; color:#0f172a;"></textarea>
            </div>

            <div style="height: 10px;"></div>
          </div>

          <!-- Footer Action -->
          <div style="padding:10px 16px; background:#fff; border-top:1px solid #f1f5f9; padding-bottom: max(10px, env(safe-area-inset-bottom)); display:flex; gap:8px;">
            ${existingRecord ? `<button onclick="Record.deleteRecord()" style="flex:0 0 auto; height:44px; padding:0 16px; background:#fff; color:#ef4444; font-size:14px; font-weight:800; border-radius:10px; border:1px solid #fecaca; cursor:pointer;">삭제</button>` : ''}
            <button onclick="Record.saveRecord()" style="flex:1; width:100%; height:44px; background:linear-gradient(135deg, #007aff 0%, #0056b3 100%); color:#fff; font-size:14.5px; font-weight:800; border-radius:10px; border:none; box-shadow:0 3px 12px rgba(0,122,255,0.25); cursor:pointer; display:flex; align-items:center; justify-content:center;">
              ${existingRecord ? '수정 완료' : '저장하기'}
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
    if (existingRecord) this._fillForm(existingRecord);
    
    // Animate in
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.children[0].style.transform = 'translateY(0)';
    }, 10);
  },

  readHoles() {
    const vals = Array.from({ length: 18 }, (_, h) => {
      const el = document.getElementById(`hole-${h}`);
      const n = el ? parseInt(el.value, 10) : NaN;
      return isFinite(n) && n > 0 ? n : null;
    });
    return { vals, filled: vals.filter(v => v != null).length };
  },

  onHoleInput() {
    const { vals } = this.readHoles();
    const sum = a => a.reduce((t, n) => t + (n || 0), 0);
    const out = vals.slice(0, 9), inn = vals.slice(9);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    if (out.every(v => v != null)) set('manual-score-out', sum(out));
    if (inn.every(v => v != null)) set('manual-score-in', sum(inn));
    if (vals.every(v => v != null)) set('manual-score', sum(vals));
  },

  /** 수정할 때 기존 타수·일지·사진을 폼에 채움 (예전에는 빈 폼이라 저장하면 내용이 지워졌음) */
  _fillForm(rec) {
    const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
    if (Array.isArray(rec.holes) && rec.holes.length === 18) rec.holes.forEach((n, h) => set(`hole-${h}`, n));
    if (typeof rec.score === 'number') set('manual-score', rec.score);
    if (Array.isArray(rec.holes) && rec.holes.length === 18) {
      const sum = (a) => a.reduce((t, n) => t + (Number(n) || 0), 0);
      set('manual-score-out', sum(rec.holes.slice(0, 9)));
      set('manual-score-in', sum(rec.holes.slice(9)));
    }
    set('record-diary', rec.diary || '');
    const show = (kind, i, src) => {
      if (!src || !String(src).startsWith('data:image')) return;
      document.getElementById(`${kind}-upload-box-${i}`).style.display = 'none';
      document.getElementById(`${kind}-preview-box-${i}`).style.display = 'block';
      document.getElementById(`${kind}-preview-img-${i}`).src = src;
    };
    show('score', 1, rec.scoreImg1); show('score', 2, rec.scoreImg2);
    [rec.dImg1, rec.dImg2, rec.dImg3, rec.dImg4].forEach((src, i) => show('diary', i + 1, src));
  },

  deleteRecord() {
    const key = this._editingKey;
    if (!key || !this.records[key]) return;
    if (!confirm('이 라운드 기록을 삭제할까요? 사진과 일지도 함께 지워져요.')) return;
    delete this.records[key];
    localStorage.setItem('bp_records_v1', JSON.stringify(this.records));
    this._editingKey = null;
    this.closeRecordForm();
    this.render();
    if (this.selectedDate) this.selectDate(this.selectedDate);
    U.toast('기록을 삭제했어요.');
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
      if (!dateInput) { U.toast('날짜를 선택해주세요.'); return; }
      const course = (document.getElementById('record-course').value || '').trim();
      if (!course) { U.toast('구장 이름을 입력해 주세요.'); return; }
      const time = (document.getElementById('record-time') || {}).value || '';

      const num = (id) => { const el = document.getElementById(id); const n = el ? parseInt(el.value, 10) : NaN; return isFinite(n) ? n : null; };
      const total = num('manual-score'), out = num('manual-score-out'), inn = num('manual-score-in');
      let score = total != null ? total : (out != null && inn != null ? out + inn : null);
      const holeInput = this.readHoles();
      if (holeInput.filled && holeInput.filled < 18) { U.toast(`홀별 스코어는 18홀을 모두 입력하거나 비워 두세요. (${holeInput.filled}/18)`); return; }
      if (holeInput.filled === 18) {
        const hs = holeInput.vals.reduce((t, n) => t + n, 0);
        if (score != null && score !== hs) { U.toast(`홀별 합계(${hs}타)와 총 타수(${score}타)가 달라요.`); return; }
        score = hs;
      }

      const validDataUrl = (el) => el && el.src && el.src.startsWith('data:image') && el.closest('[id$="preview-box-1"],[id$="preview-box-2"],[id$="preview-box-3"],[id$="preview-box-4"]').style.display !== 'none' ? el.src : null;
      const img = (id) => validDataUrl(document.getElementById(id));
      const scoreImg1 = img('score-preview-img-1'), scoreImg2 = img('score-preview-img-2');

      // 예전에는 타수를 비워 두면 72타로 저장됐음 → 타수나 스코어카드 사진 중 하나는 있어야 저장
      if (score == null && !scoreImg1 && !scoreImg2) { U.toast('타수를 입력하거나 스코어카드 사진을 올려 주세요.'); return; }
      if (score != null && (score < 18 || score > 200)) { U.toast('타수를 다시 확인해 주세요. (18~200타)'); return; }

      const prev = (this._editingKey && this.records[this._editingKey]) || {};
      const rec = {
        ...prev,
        course, time, score, scoreImg1, scoreImg2,
        diary: (document.getElementById('record-diary').value || '').trim(),
        dImg1: img('diary-preview-img-1'), dImg2: img('diary-preview-img-2'),
        dImg3: img('diary-preview-img-3'), dImg4: img('diary-preview-img-4'),
      };
      // 입력하지 않은 값(퍼트·페어웨이·그린)을 지어서 저장하지 않음
      delete rec.putts; delete rec.fairway; delete rec.green;
      if (holeInput.filled === 18) rec.holes = holeInput.vals;
      // 홀별 점수는 합계가 타수와 같을 때만 유지
      if (Array.isArray(rec.holes) && rec.holes.reduce((t, n) => t + (Number(n) || 0), 0) !== score) delete rec.holes;

      // 같은 날 여러 라운드: 새 기록은 비어 있는 키(날짜, 날짜#2 …)에 저장
      let key = this._editingKey;
      if (!key || this.dateOf(key) !== dateInput) {
        if (key) delete this.records[key];
        key = this.nextKey(dateInput);
      }
      this.records[key] = rec;
      localStorage.setItem('bp_records_v1', JSON.stringify(this.records));
      this._editingKey = null;

      const [yy, mm, dd] = dateInput.split('-').map(Number);
      this.currentYear = yy; this.currentMonth = mm - 1; this.selectedDate = dd;
      this.closeRecordForm();
      this.render();
      this.selectDate(dd);
      U.toast('라운딩 기록을 저장했어요 ⛳');
    } catch (e) {
      console.error(e);
      U.toast('저장 중 문제가 생겼어요. 사진 수를 줄여 다시 시도해 주세요.');
    }
  },

  showDiaryDetail(key) {
    const modalId = 'modal-diary-detail';
    let modal = U.$(`#${modalId}`);
    if (modal) modal.remove();

    const rec = this.records[key];
    if (!rec) return;
    const dateKey = this.dateOf(key);
    const dateStr = dateKey.replace(/-/g, '. ');
    this._shareRec = { rec, dateStr };

    let teeTime = '';
    if (!teeTime && rec.time) teeTime = rec.time;
    

    
    // User uploaded photos (Only Diary photos for carousel)
    let photos = [];
    if (rec.dImg1) photos.push(rec.dImg1);
    if (rec.dImg2) photos.push(rec.dImg2);
    if (rec.dImg3) photos.push(rec.dImg3);
    if (rec.dImg4) photos.push(rec.dImg4);

    // 홀별 점수 (AI 비서가 스코어카드에서 읽은 경우)
    let holesHtml = '';
    if (Array.isArray(rec.holes) && rec.holes.length === 18) {
      const row = (from) => rec.holes.slice(from, from + 9).map((n, k) => `<div style="text-align:center;"><div style="font-size:10px; color:var(--text-400); font-weight:700;">${from + k + 1}</div><div style="font-size:14px; font-weight:800; color:var(--text-100);">${Number(n) || '-'}</div></div>`).join('');
      const sum = (a) => a.reduce((t, n) => t + (Number(n) || 0), 0);
      holesHtml = `
        <div style="margin-top:10px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px;">
          <div style="display:grid; grid-template-columns:repeat(9,1fr); gap:2px;">${row(0)}</div>
          <div style="font-size:11px; font-weight:700; color:var(--text-400); text-align:right; margin:4px 0 8px;">전반 ${sum(rec.holes.slice(0, 9))}타</div>
          <div style="display:grid; grid-template-columns:repeat(9,1fr); gap:2px;">${row(9)}</div>
          <div style="font-size:11px; font-weight:700; color:var(--text-400); text-align:right; margin-top:4px;">후반 ${sum(rec.holes.slice(9))}타</div>
        </div>`;
    }

    const userName = U.esc(localStorage.getItem('bp_user_name') || '버디 골퍼');

    const html = `
      <div id="${modalId}" class="modal-overlay" style="display:flex; justify-content:center; align-items:flex-end; background:rgba(0,0,0,0.8); position:fixed; top:0; left:0; width:100%; height:100%; z-index:10000; opacity:0; transition: opacity 0.3s;">
        <div style="background:#fff; width:100%; max-width:var(--max-width); height:95vh; border-radius:24px 24px 0 0; display:flex; flex-direction:column; overflow:hidden; transform:translateY(100%); transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);">
          
          <!-- Sticky Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid rgba(0,0,0,0.05); background:#fff; z-index:10;">
            <button onclick="Record.closeDiaryDetail()" style="color:var(--text-100); padding:4px;">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div style="font-size:17px; font-weight:800; color:var(--text-100);">라운드 일지</div>
            <button onclick="Record.shareRecord()" style="color:var(--text-100); padding:4px;" aria-label="공유">
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
                    <span style="font-size:14px; font-weight:700; color:var(--text-300);">📍 ${U.esc(rec.course || '')} · ${dateStr} ${teeTime ? `· ⏰ ${U.esc(teeTime)}` : ''}</span>
                  </div>
                </div>
              </div>

              <!-- 2. Image Carousel -->
              ${photos.length === 0 ? '' : `<div style="position:relative; width:100%; aspect-ratio:1/1.05; background:#eee; overflow:hidden;">
                <div id="diary-img-scroll" style="display:flex; width:100%; height:100%; overflow-x:auto; scroll-snap-type: x mandatory;" class="hide-scrollbar">
                  ${photos.map((src, i) => `
                    <div style="flex-shrink:0; width:100%; height:100%; scroll-snap-align:start; position:relative;">
                      <img src="${src}" style="width:100%; height:100%; object-fit:cover;">
                      <div style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.6); color:#fff; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:700;">${i+1} / ${photos.length}</div>
                    </div>
                  `).join('')}
                </div>
              </div>`}

              <!-- 4. Score Summary Box -->
              <div style="padding:0 16px; margin-bottom:16px; margin-top:16px;">
                <div style="font-size:16px; font-weight:800; color:var(--text-100); margin-bottom:12px;">최종 스코어</div>
                <div style="background:rgba(37,99,235,0.04); border:1px solid rgba(37,99,235,0.1); border-radius:12px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; flex-direction:column; align-items:flex-start;">
                    <span style="font-size:13px; font-weight:700; color:var(--text-400); margin-bottom:4px;">${userName} (나)</span>
                    <span style="font-size:28px; font-weight:800; color:#2563eb;">${typeof rec.score === 'number' ? rec.score : '-'}<span style="font-size:16px; font-weight:600; color:var(--text-300); margin-left:4px;">타</span></span>
                  </div>
                  <div style="display:flex; gap:8px;">
                    ${rec.scoreImg1 ? `<img src="${rec.scoreImg1}" onclick="Record.showScorecardGallery(['${rec.scoreImg1 || ''}', '${rec.scoreImg2 || ''}'].filter(Boolean), 0)" style="width:48px; height:48px; border-radius:8px; object-fit:cover; border:1px solid rgba(0,0,0,0.1); cursor:pointer;">` : ''}
                    ${rec.scoreImg2 ? `<img src="${rec.scoreImg2}" onclick="Record.showScorecardGallery(['${rec.scoreImg1 || ''}', '${rec.scoreImg2 || ''}'].filter(Boolean), 1)" style="width:48px; height:48px; border-radius:8px; object-fit:cover; border:1px solid rgba(0,0,0,0.1); cursor:pointer;">` : ''}
                  </div>
                </div>
                ${holesHtml}
              </div>

              <!-- 5. Story / Content -->
              <div style="padding:0 16px;">
                ${rec.diary ? `<p style="font-size:14px; font-weight:500; color:var(--text-100); line-height:1.6; margin:0 0 12px 0; white-space:pre-wrap;"><span style="font-weight:800; margin-right:4px;">${userName}</span>${U.esc(rec.diary)}</p>` : ''}
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

  /** 기록 공유 (휴대폰 공유창 → 안 되면 복사) */
  async shareRecord() {
    const it = this._shareRec; if (!it) return;
    const r = it.rec;
    const text = `⛳ ${it.dateStr} ${r.course || ''}${typeof r.score === 'number' ? ` · ${r.score}타` : ''}${r.diary ? `\n${r.diary}` : ''}\n\n#버디플래너`;
    try {
      const Share = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
      if (Share) { await Share.share({ title: '라운딩 기록', text }); return; }
      if (navigator.share) { await navigator.share({ title: '라운딩 기록', text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); U.toast('기록을 복사했어요. 원하는 곳에 붙여 넣으세요.'); }
    catch (e) { U.toast('공유할 수 없어요.'); }
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

