const Record = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedDate: null,
  
  // Dummy data
  records: {
    '2026-7-15': { score: 82, putts: 32, fairway: '60%', green: '45%', course: '남서울CC' },
    '2026-7-8': { score: 85, putts: 36, fairway: '55%', green: '40%', course: '세종필드' }
  },

  init() {
    this.render();
  },

  render() {
    const container = U.$('#screen-record');
    container.innerHTML = `
      <div class="screen-scroll">
        <!-- 1. MY BEST SCORE -->
        <div style="padding: var(--sp-4);">
          <div class="best-score-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:2;">
              <div>
                <span style="font-size:12px; font-weight:800; color:var(--accent); letter-spacing:1px; margin-bottom:4px; display:block;">MY BEST SCORE</span>
                <div style="font-size:20px; font-weight:800; color:#fff;">
                  잭니클라우스CC
                </div>
                <div style="font-size:13px; font-weight:600; color:var(--text-400); margin-top:6px;">2026. 05. 12</div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end;">
                <div style="display:flex; align-items:baseline; gap:4px;">
                  <span style="font-size:48px; font-weight:900; line-height:1; font-family:'Montserrat', sans-serif; color: #ffffff; text-shadow: 0 4px 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.4);">78</span>
                  <span style="font-size:14px; font-weight:700; color:var(--text-300);">타</span>
                </div>
              </div>
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
    
    if (State.aiGeneratingDate === dateKeyNew) {
      this.showDiaryDetail(this.currentYear, this.currentMonth, d);
      detailContainer.innerHTML = '';
      return;
    }

    if (rec) {
      const dayNames = ['일','월','화','수','목','금','토'];
      const dayStr = dayNames[new Date(this.currentYear, this.currentMonth, d).getDay()];
      
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
          <div class="record-card-bottom">
            <div class="record-stat-item">
              <span class="record-stat-label">퍼트 수</span>
              <span class="record-stat-val">${rec.putts}개</span>
            </div>
            <div class="record-stat-item">
              <span class="record-stat-label">페어웨이</span>
              <span class="record-stat-val">${rec.fairway}</span>
            </div>
            <div class="record-stat-item">
              <span class="record-stat-label">그린적중</span>
              <span class="record-stat-val">${rec.green}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      detailContainer.innerHTML = `
        <div class="record-card" style="animation: slideUp 0.3s ease; text-align:center; padding: 30px 20px;">
          <div style="font-size:40px; margin-bottom:10px;">⛳️</div>
          <div style="font-size:15px; font-weight:700; color:var(--text-200); margin-bottom:4px;">기록이 없는 날입니다</div>
          <button class="record-action" onclick="Record.showDetail()" style="margin-top:16px;">새 라운드 일지 작성하기</button>
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

    const html = `
      <div id="${modalId}" class="modal-overlay" style="display:flex; justify-content:center; align-items:flex-end; background:rgba(0,0,0,0.6); position:fixed; top:0; left:0; width:100%; height:100%; z-index:9999; opacity:0; transition: opacity 0.3s;">
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
              <div style="font-size:14px; font-weight:800; color:var(--text-100); margin-bottom:12px;">1. 날짜 및 일정 선택</div>
              <div style="display:flex; flex-direction:column; gap:12px;">
                <label style="display:flex; align-items:center; background:#fff; border:1px solid rgba(0,0,0,0.1); border-radius:12px; padding:12px 16px; cursor:pointer;">
                  <span style="font-size:14px; font-weight:600; color:var(--text-400); width:60px;">날짜</span>
                  <input type="date" value="${todayStr}" onclick="try{this.showPicker()}catch(e){}" style="flex:1; border:none; font-size:15px; font-weight:700; color:var(--text-100); background:transparent; outline:none; cursor:pointer;">
                </label>
                <label style="display:flex; align-items:center; background:#fff; border:1px solid rgba(0,0,0,0.1); border-radius:12px; padding:12px 16px; cursor:pointer;">
                  <span style="font-size:14px; font-weight:600; color:var(--text-400); width:60px;">일정</span>
                  <select style="flex:1; border:none; font-size:15px; font-weight:700; color:var(--text-100); background:transparent; outline:none; padding-right:10px; cursor:pointer;">
                    <option value="">일정을 선택하세요 (선택)</option>
                    <option value="1">베어즈베스트 청라 (07:30)</option>
                    <option value="2">스카이72 (13:00)</option>
                  </select>
                </label>
              </div>
            </div>

            <hr style="border:none; border-top:1px dashed rgba(0,0,0,0.1); margin:0;">

            <!-- 2. Photo Uploads -->
            <div>
              <div style="font-size:14px; font-weight:800; color:var(--text-100); margin-bottom:12px;">2. 라운딩 사진 등록</div>
              
              <div style="display:flex; flex-direction:column; gap:16px;">
                <!-- Scorecard Photo -->
                <div>
                  <div style="font-size:13px; font-weight:600; color:var(--text-400); margin-bottom:8px;">스코어카드 사진 (필수)</div>
                  
                  <input type="file" id="upload-scorecard" accept="image/*" style="display:none;" onchange="Record.handleScorecardUpload(event)">
                  
                  <!-- Upload Box -->
                  <div id="scorecard-upload-box" style="background:rgba(0,0,0,0.02); border:2px dashed rgba(0,0,0,0.15); border-radius:16px; height:100px; display:flex; flex-direction:column; justify-content:center; align-items:center; cursor:pointer; transition:background 0.2s;" onclick="document.getElementById('upload-scorecard').click()">
                    <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--accent)" stroke-width="2" fill="none" style="margin-bottom:6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <div style="font-size:13px; font-weight:700; color:var(--text-300);">스코어카드 등록</div>
                  </div>

                  <!-- Preview Box (Hidden initially) -->
                  <div id="scorecard-preview-box" style="display:none; position:relative; width:100%; height:120px; border-radius:16px; overflow:hidden; border:1px solid rgba(0,0,0,0.1);">
                    <img id="scorecard-preview-img" src="" style="width:100%; height:100%; object-fit:cover;">
                    <div style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.5); border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer;" onclick="Record.removeScorecard()">
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                  </div>
                </div>

                <!-- Other Photos (Companions, Course) -->
                <div>
                  <div style="font-size:13px; font-weight:600; color:var(--text-400); margin-bottom:8px;">동반자 / 골프장 / 추억 사진 (선택)</div>
                  
                  <input type="file" id="upload-additional" accept="image/*" multiple style="display:none;" onchange="Record.handleAdditionalUpload(event)">
                  
                  <div id="additional-photos-container" style="display:flex; gap:12px; overflow-x:auto; padding-bottom:8px;" class="hide-scrollbar">
                    
                    <!-- Add Photo Button -->
                    <div style="flex-shrink:0; width:100px; height:100px; background:rgba(0,0,0,0.02); border:2px dashed rgba(0,0,0,0.15); border-radius:16px; display:flex; flex-direction:column; justify-content:center; align-items:center; cursor:pointer;" onclick="document.getElementById('upload-additional').click()">
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="var(--text-300)" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      <div style="font-size:12px; font-weight:600; color:var(--text-300); margin-top:4px;">추가하기</div>
                    </div>
                    
                    <!-- Photos will be appended here via JS -->
                    
                  </div>
                </div>
              </div>
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

  handleScorecardUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('scorecard-upload-box').style.display = 'none';
      document.getElementById('scorecard-preview-box').style.display = 'block';
      document.getElementById('scorecard-preview-img').src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  removeScorecard() {
    document.getElementById('upload-scorecard').value = '';
    document.getElementById('scorecard-preview-box').style.display = 'none';
    document.getElementById('scorecard-upload-box').style.display = 'flex';
  },

  handleAdditionalUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const container = document.getElementById('additional-photos-container');

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Create random ID to identify for removal
        const photoId = 'photo-' + Math.random().toString(36).substr(2, 9);
        
        const photoHtml = `
          <div id="${photoId}" style="flex-shrink:0; width:100px; height:100px; border-radius:16px; background:url('${e.target.result}') center/cover; position:relative; border:1px solid rgba(0,0,0,0.1);">
            <div style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.5); border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer;" onclick="document.getElementById('${photoId}').remove()">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
          </div>
        `;
        
        // Add to container (after the add button)
        container.insertAdjacentHTML('beforeend', photoHtml);
      };
      reader.readAsDataURL(file);
    });
    
    // Clear the input so same files can be re-selected if needed
    event.target.value = '';
  },

  saveRecord() {
    // Save the selected date for generating status
    const dateInput = U.$('#modal-record-form input[type="date"]');
    if (dateInput && dateInput.value) {
      State.aiGeneratingDate = dateInput.value;
    } else {
      const y = this.currentYear || new Date().getFullYear();
      const m = this.currentMonth !== undefined ? this.currentMonth : new Date().getMonth();
      const d = this.selectedDate || new Date().getDate();
      State.aiGeneratingDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // Show AI generating overlay
    const overlayHtml = `
      <div id="ai-loading-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(5px); z-index:10000; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; animation: fadeIn 0.3s;">
        <div style="width:60px; height:60px; border:5px solid rgba(255,255,255,0.2); border-top-color:var(--accent); border-radius:50%; animation: spin 1s linear infinite; margin-bottom:28px;"></div>
        <div style="font-size:20px; font-weight:800; margin-bottom:12px; letter-spacing:-0.5px;">AI가 일지를 생성 중입니다</div>
        <div style="font-size:14px; font-weight:500; color:rgba(255,255,255,0.7); text-align:center; padding:0 40px; line-height:1.6;">스코어카드와 사진을 분석하여<br>멋진 라운드 일지를 자동으로 작성하고 있습니다.<br><span style="color:#fbbf24; font-weight:700;">약 1~2분의 시간이 필요합니다.</span></div>
        
        <button onclick="document.getElementById('ai-loading-overlay').remove(); Record.closeRecordForm(); App.navigate('record'); Record.render(); U.toast('백그라운드에서 AI 생성이 계속 진행됩니다.');" style="margin-top:40px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); color:#fff; padding:10px 24px; border-radius:24px; font-size:14px; font-weight:600; transition:background 0.2s;">
          닫기 (백그라운드에서 계속 진행)
        </button>
        <style>
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        </style>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlayHtml);
  },

  showDiaryDetail(y, m, d) {
    const modalId = 'modal-diary-detail';
    let modal = U.$(`#${modalId}`);
    if (modal) modal.remove();

    const dateStr = `${y}. ${String(m + 1).padStart(2, '0')}. ${String(d).padStart(2, '0')}`;
    
    // Unsplash dummy images for the carousel
    const photos = [
      'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=600&auto=format&fit=crop', // Golf course
      'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?q=80&w=600&auto=format&fit=crop', // Swing
      'https://images.unsplash.com/photo-1622228514981-d112d7c5040e?q=80&w=600&auto=format&fit=crop'  // Scorecard / Golf ball
    ];

    const html = `
      <div id="${modalId}" class="modal-overlay" style="display:flex; justify-content:center; align-items:flex-end; background:rgba(0,0,0,0.8); position:fixed; top:0; left:0; width:100%; height:100%; z-index:10000; opacity:0; transition: opacity 0.3s;">
        <div style="background:#fff; width:100%; max-width:var(--max-width); height:95vh; border-radius:24px 24px 0 0; display:flex; flex-direction:column; overflow:hidden; transform:translateY(100%); transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);">
          
          <!-- Sticky Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid rgba(0,0,0,0.05); background:#fff; z-index:10;">
            <button onclick="Record.closeDiaryDetail()" style="color:var(--text-100); padding:4px;">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div style="font-size:17px; font-weight:800; color:var(--text-100);">AI 라운드 일지</div>
            <button onclick="U.toast('공유 메뉴가 열립니다.')" style="color:var(--text-100); padding:4px;">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            </button>
          </div>

          <!-- Content Scroll Area -->
          <div class="screen-scroll" style="flex:1; overflow-y:auto; background:#fafafa;">
            <div style="background:#fff; padding-bottom:24px;">
              
              <!-- 1. Post Header (User, Location, Date) -->
              <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #fbbf24, #f59e0b); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16px;">myB</div>
                  <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:14px; font-weight:800; color:var(--text-100);">김나이스</span>
                    <span style="font-size:12px; font-weight:600; color:var(--text-400);">📍 베어즈베스트 청라 CC · ${dateStr}</span>
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

              <!-- 3. Interaction Bar -->
              <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px;">
                <div style="display:flex; gap:16px;">
                  <svg viewBox="0 0 24 24" width="26" height="26" stroke="var(--text-100)" stroke-width="2" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                  <svg viewBox="0 0 24 24" width="26" height="26" stroke="var(--text-100)" stroke-width="2" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  <svg viewBox="0 0 24 24" width="26" height="26" stroke="var(--text-100)" stroke-width="2" fill="none"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </div>
                <div style="font-size:13px; font-weight:700; color:var(--text-100);">좋아요 124개</div>
              </div>

              <!-- 4. Score Summary Box -->
              <div style="padding:0 16px; margin-bottom:16px;">
                <div style="background:rgba(37,99,235,0.04); border:1px solid rgba(37,99,235,0.1); border-radius:12px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex:1; border-right:1px solid rgba(0,0,0,0.05);">
                    <span style="font-size:11px; font-weight:700; color:var(--text-400); margin-bottom:4px;">최종 스코어</span>
                    <span style="font-size:18px; font-weight:800; color:#2563eb;">78<span style="font-size:12px; font-weight:600; color:var(--text-300);">타</span></span>
                  </div>
                  <div style="display:flex; flex-direction:column; align-items:center; flex:1; border-right:1px solid rgba(0,0,0,0.05);">
                    <span style="font-size:11px; font-weight:700; color:var(--text-400); margin-bottom:4px;">퍼트 수</span>
                    <span style="font-size:18px; font-weight:800; color:var(--text-200);">30<span style="font-size:12px; font-weight:600; color:var(--text-300);">개</span></span>
                  </div>
                  <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
                    <span style="font-size:11px; font-weight:700; color:var(--text-400); margin-bottom:4px;">페어웨이 안착</span>
                    <span style="font-size:18px; font-weight:800; color:var(--text-200);">70<span style="font-size:12px; font-weight:600; color:var(--text-300);">%</span></span>
                  </div>
                </div>
              </div>

              <!-- 5. Story / Content -->
              <div style="padding:0 16px;">
                <p style="font-size:14px; font-weight:500; color:var(--text-100); line-height:1.6; margin:0 0 12px 0;">
                  <span style="font-weight:800; margin-right:4px;">myB</span>오늘 베어즈베스트 청라에서 기적 같은 라운드를 펼쳤어요! 날씨도 구름 한 점 없이 맑았고, 무엇보다 샷 감각이 너무 좋아서 생애 첫 싱글을 기록했습니다. ⛳️✨<br><br>전반엔 살짝 긴장했지만 후반 홀부터 연속 파 행진! 동반자들의 응원 덕분에 끝까지 멘탈 꽉 잡을 수 있었네요. 다음번엔 언더파 도전 가보자고! 🔥
                </p>
                <div style="font-size:13px; font-weight:600; color:#2563eb;">
                  #명랑골프 #베어즈베스트 #버디플래너 #라베달성 #싱글골퍼 #골프스타그램 #골프일지
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

