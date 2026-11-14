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
  /** 9홀 라운드 여부: 직접 표시했거나, 표시가 없고 60타 미만(18홀 기록 없음)이면 9홀로 봄 */
  isNine(rec) {
    if (!rec) return false;
    if (rec.nine === true) return true;
    if (rec.nine === false) return false;
    return typeof rec.score === 'number' && rec.score < 60 && !(Array.isArray(rec.holes) && rec.holes.length === 18);
  },

  /** 통계(평균·베스트·추이)용: 18홀 라운드만 */
  scoredList() {
    return Object.keys(this.records)
      .filter(k => this.records[k] && typeof this.records[k].score === 'number' && !this.isNine(this.records[k]))
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

  view: 'list',

  /** 최근 라운딩 중 아직 기록이 없는 일정 (14일 이내) */
  pendingRound() {
    const now = new Date();
    const list = ((typeof State !== 'undefined' && State.schedules) || []).filter(s => {
      if (!s || !s.date) return false;
      const d = new Date(s.date);
      const [h, m] = String(s.teeOff || '07:00').split(':').map(Number);
      d.setHours(h || 0, m || 0, 0, 0);
      const ago = (now - d) / 864e5;
      return ago > 0.1 && ago <= 14 && !this.roundsOn(this.ymd(d.getFullYear(), d.getMonth(), d.getDate())).length;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
    return list[0] || null;
  },

  /** 기록 화면에서 바로: 그날 날짜로 직접 입력 */
  writeFor(dateIso) {
    if (dateIso) {
      const d = new Date(dateIso);
      this.currentYear = d.getFullYear(); this.currentMonth = d.getMonth(); this.selectedDate = d.getDate();
    } else {
      const t = new Date(); this.currentYear = t.getFullYear(); this.currentMonth = t.getMonth(); this.selectedDate = t.getDate();
    }
    this.showRecordForm();
  },

  /** 스코어카드 사진 → 버디 AI가 홀별 타수를 읽음 */
  async onCardPhoto(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const dataUrl = await this.compressImage(file, 1400, 1400, 0.8);
      input.value = '';
      App.navigate('ai');
      setTimeout(() => { try { AI.processUserMessage('스코어카드 사진이에요. 타수를 기록해 주세요.', dataUrl); } catch (e) { U.toast('사진을 보내지 못했어요.'); } }, 350);
    } catch (e) { U.toast('사진을 불러오지 못했어요.'); }
  },

  setView(v) { this.view = v; this.render(); },

  render() {
    const container = U.$('#screen-record');
    const list = this.scoredList();
    const year = String(new Date().getFullYear());
    const yearCount = Object.keys(this.records).filter(k => this.records[k] && this.dateOf(k).startsWith(year)).length;
    const avg = list.length ? (list.reduce((t, r) => t + r.score, 0) / list.length).toFixed(1) : '--';
    const best = list.length ? Math.min(...list.map(r => r.score)) : null;
    const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
    const cam = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
    const chev = '<svg class="v2-chev" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

    // 1. 상단: 기록 안 한 최근 라운딩
    const pr = this.pendingRound();
    let heroTitle, heroMeta = '', heroDate = '';
    if (pr) {
      const d = new Date(pr.date);
      heroTitle = `${U.esc(pr.course ? pr.course.name : '골프장')} 스코어를 남겨 볼까요?`;
      heroMeta = `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]}) · 티오프 ${U.esc(pr.teeOff || '')}${(pr.companions || []).length ? ` · 동반자 ${pr.companions.length}명` : ''}`;
      heroDate = d.toISOString();
    } else {
      heroTitle = '오늘 라운드 스코어를 남겨 볼까요?';
    }

    // 2. 최근 5라운드 막대
    const last5 = list.slice(-5);
    let barsHtml = '';
    if (last5.length >= 2) {
      const sc = last5.map(r => r.score);
      const lo = Math.min(...sc) - 4, hi = Math.max(...sc);
      const delta = sc[sc.length - 1] - sc[0];
      const msg = delta < 0 ? `${-delta}타 줄었어요` : delta > 0 ? `${delta}타 늘었어요` : '그대로예요';
      barsHtml = `
        <div class="v2-card">
          <div class="v2-bars-head"><b>최근 ${last5.length}라운드 흐름</b><span class="${delta > 0 ? 'up' : ''}">${msg}</span></div>
          <div class="v2-bars">
            ${last5.map((r, i) => {
              const h = 30 + 70 * ((r.score - lo) / Math.max(1, hi - lo));
              const [, mm, dd] = r.date.split('-');
              return `<div class="v2-bar ${i === last5.length - 1 ? 'last' : ''}"><em>${r.score}</em><i style="height:${h.toFixed(0)}%"></i><small>${+mm}/${+dd}</small></div>`;
            }).join('')}
          </div>
        </div>`;
    }

    // 3. 라운드 일지
    const keys = Object.keys(this.records).filter(k => this.records[k])
      .sort((a, b) => this.dateOf(b).localeCompare(this.dateOf(a)) || b.localeCompare(a));
    const logHtml = keys.length ? keys.map(k => {
      const r = this.records[k];
      const [, mm, dd] = this.dateOf(k).split('-');
      const sch = this.schedulesOn(this.dateOf(k));
      const comp = (r.companions && r.companions.length) || (sch.length === 1 ? (sch[0].companions || []).length : 0);
      const photos = ['dImg1', 'dImg2', 'dImg3', 'dImg4'].filter(x => r[x]).length;
      const isBest = best !== null && r.score === best && !this.isNine(r);
      const meta = [`${+mm}월 ${+dd}일`, comp ? `동반자 ${comp}명` : '', photos ? `사진 ${photos}장` : '', this.isNine(r) ? '9홀' : ''].filter(Boolean).join(' · ');
      return `<div class="v2-log" onclick="Record.showDiaryDetail(${U.jsq(k)})">
        <div class="v2-log-score"><b>${typeof r.score === 'number' ? r.score : '-'}</b><small>타</small></div>
        <div class="v2-log-info"><div class="t"><span class="nm">${U.esc(r.course || '라운드')}</span>${isBest ? '<span class="v2-pill amber">베스트</span>' : ''}</div><div class="m">${meta}</div></div>
        ${chev}
      </div>`;
    }).join('') : `<div class="v2-empty">아직 남긴 라운드가 없어요.<br>스코어를 남기면 여기에 일지로 쌓여요.</div>`;

    const calHtml = `
      <div class="v2-card" style="padding:14px;">
        <div class="record-calendar" style="margin:0; box-shadow:none; border:none; padding:0;">
          <div class="record-cal-header">
            <button onclick="Record.prevMonth()" aria-label="이전 달"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
            <div class="record-cal-title">${this.currentYear}년 ${this.currentMonth + 1}월</div>
            <button onclick="Record.nextMonth()" aria-label="다음 달"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
          </div>
          <div class="record-cal-days"><div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div></div>
          <div class="record-cal-grid" id="record-cal-grid"></div>
        </div>
      </div>
      <div id="record-detail-container"></div>`;

    container.innerHTML = `
      <div class="v2-pagehead"><h1>기록</h1></div>
      <div class="v2-scroll">
        <div class="v2-body">
          <div class="v2-rec-hero">
            <div class="tag">${pr ? '라운딩 수고하셨어요' : '라운드 기록'}</div>
            <h3>${heroTitle}</h3>
            ${heroMeta ? `<div class="meta">${heroMeta}</div>` : ''}
            <div class="btns">
              <button class="w" onclick="document.getElementById('rec-card-input').click()">${cam} 스코어카드 촬영</button>
              <button class="o" onclick="Record.writeFor(${heroDate ? U.jsq(heroDate) : "''"})">직접 입력</button>
            </div>
            <input type="file" id="rec-card-input" accept="image/*" style="display:none" onchange="Record.onCardPhoto(this)">
            <div class="foot">사진을 올리면 버디 AI가 홀별 타수를 읽어 채워 드려요</div>
          </div>
          <div class="v2-stats">
            <div class="v2-stat"><span>올해 라운드</span><b>${yearCount}회</b></div>
            <div class="v2-stat"><span>평균 타수</span><b>${avg}</b></div>
            <div class="v2-stat best"><span>베스트</span><b>${best !== null ? best : '--'}</b></div>
          </div>
          ${barsHtml}
          <div class="v2-log-head"><b>라운드 일지</b>
            <div class="v2-seg"><button class="${this.view === 'list' ? 'on' : ''}" onclick="Record.setView('list')">목록</button><button class="${this.view === 'cal' ? 'on' : ''}" onclick="Record.setView('cal')">달력</button></div>
          </div>
          ${this.view === 'cal' ? calHtml : `<div style="display:flex; flex-direction:column; gap:10px;">${logHtml}</div>`}
        </div>
      </div>
    `;
    if (this.view === 'cal') this.renderCalendarGrid();
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
  
  /** 그날의 라운딩 일정 (YYYY-MM-DD) */
  schedulesOn(dateStr) {
    return ((typeof State !== 'undefined' && State.schedules) || []).filter(s => {
      const sd = s && (s.date instanceof Date ? s.date : new Date(s.date));
      return sd && !isNaN(sd) && this.ymd(sd.getFullYear(), sd.getMonth(), sd.getDate()) === dateStr;
    });
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
      // 기록은 없지만 라운딩 일정이 있는 날: 예정(앞으로) / 기록하기(지난 날)
      let plannedClass = '';
      if (!rounds.length) {
        const sch = this.schedulesOn(this.ymd(this.currentYear, this.currentMonth, d));
        if (sch.length) {
          const past = new Date(this.currentYear, this.currentMonth, d) <= new Date();
          plannedClass = past ? 'has-plan past' : 'has-plan';
          badgeHtml = `
          <div class="record-badge plan ${past ? 'past' : ''}">
            <div class="record-badge-course">${U.esc((sch[0].course && sch[0].course.name) || '')}</div>
            <div>${past ? '기록하기' : '예정'}</div>
          </div>`;
        }
      }
      const selectedClass = (this.selectedDate === d) ? 'selected' : '';
      html += `
        <div class="record-cal-cell ${rounds.length ? 'has-record' : ''} ${plannedClass} ${selectedClass}" onclick="Record.selectDate(${d})" style="position:relative;">
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
    if (!detailContainer) return;
    const dayStr = ['일', '월', '화', '수', '목', '금', '토'][new Date(this.currentYear, this.currentMonth, d).getDay()];
    const dateLabel = `${this.currentYear}. ${String(this.currentMonth + 1).padStart(2, '0')}. ${String(d).padStart(2, '0')} (${dayStr})`;

    const planned = rounds.length ? [] : this.schedulesOn(dateStr);
    if (!rounds.length && planned.length) {
      const sc = planned[0];
      const idx = State.schedules.indexOf(sc);
      const past = new Date(this.currentYear, this.currentMonth, d) <= new Date();
      detailContainer.innerHTML = `
        <div class="record-card" style="animation: slideUp 0.3s ease; display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div style="min-width:0;">
              <div class="record-date">${dateLabel} · ${U.esc(sc.teeOff || '')} 티오프</div>
              <div style="font-size:17px; font-weight:800; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${U.esc((sc.course && sc.course.name) || '')}</div>
            </div>
            <span style="flex-shrink:0; font-size:11.5px; font-weight:800; padding:4px 9px; border-radius:999px; ${past ? 'background:#fff7ed; color:#c2410c;' : 'background:#eff6ff; color:#1d4ed8;'}">${past ? '기록 전' : '예정'}</span>
          </div>
          ${past
            ? `<button class="record-action" onclick="Record.showRecordForm()" style="margin:0; width:100%; padding:11px; font-size:14px; background:#04122d; color:#fff; border:none; border-radius:10px; font-weight:800;">⛳ 이날 스코어 기록하기</button>`
            : `<button onclick="App.viewTimeline(${idx})" style="margin:0; width:100%; padding:11px; font-size:14px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:10px; font-weight:800; cursor:pointer;">타임라인 보기</button>`}
        </div>`;
      return;
    }

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
    if (typeof State !== 'undefined' && State.schedules) {
      const same = State.schedules.filter(s => {
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
            ${this.isNine(rec) ? '<span class="rec-nine">9홀</span>' : ''}
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
    // 새 기록: 그날 라운딩 일정이 있으면 골프장·티오프를 미리 채움
    if (!existingRecord) {
      const sc = this.schedulesOn(todayStr)[0];
      if (sc) { defaultCourse = (sc.course && sc.course.name) || ''; defaultTime = sc.teeOff || defaultTime; }
    }
    // 수정할 때 원래 키를 기억 (날짜를 바꾸면 새 날짜로 옮겨짐)
    this._editingKey = existingRecord ? editKey : null;

    // 그날 일정 (골프장·동반자 표시용)
    const sched = this.schedulesOn(todayStr)[0] || null;
    const comp = sched ? (sched.companions || []).length : 0;
    const fromSched = !existingRecord && sched;
    const hasHoles = !!(existingRecord && Array.isArray(existingRecord.holes) && existingRecord.holes.length === 18);
    this._mode = existingRecord && !hasHoles && typeof existingRecord.score === 'number' ? 'total' : 'holes';
    this._hole = 0;
    const [ry, rm, rd] = todayStr.split('-').map(Number);
    const rdate = new Date(ry, rm - 1, rd);
    const dlabel = `${rm}월 ${rd}일 (${['일', '월', '화', '수', '목', '금', '토'][rdate.getDay()]})`;
    const back = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
    const photo = (kind, i, label) => `
      <div class="v2-sc-ph">
        <input type="file" id="upload-${kind === 'score' ? 'scorecard' : 'diary'}-${i}" accept="image/*" style="display:none;" onchange="Record.handle${kind === 'score' ? 'Score' : 'Diary'}Upload(${i}, event)">
        <div id="${kind}-upload-box-${i}" class="add" onclick="document.getElementById('upload-${kind === 'score' ? 'scorecard' : 'diary'}-${i}').click()">${label}</div>
        <div id="${kind}-preview-box-${i}" class="pv" style="display:none;">
          <img id="${kind}-preview-img-${i}" src="" alt="">
          <button onclick="Record.remove${kind === 'score' ? 'Score' : 'Diary'}(${i})" aria-label="사진 빼기">✕</button>
        </div>
      </div>`;

    const html = `
      <div id="${modalId}" class="modal-overlay v2-sc-overlay" style="opacity:0;">
        <div class="v2-sc-sheet" style="transform:translateY(100%);">
          <div class="v2-pagehead center" style="position:relative; padding-top:calc(env(safe-area-inset-top, 0px) + 12px);">
            <button class="v2-iconbtn" onclick="Record.closeRecordForm()" aria-label="닫기">${back}</button>
            <h1>${existingRecord ? '라운드 기록 수정' : '스코어 직접 입력'}</h1>
            <span style="width:40px;"></span>
          </div>
          <div class="v2-sc-body">
            <div class="v2-card v2-sc-info">
              <div class="row">
                <div style="flex:1; min-width:0;">
                  <b id="sc-title">${U.esc(defaultCourse || '골프장')} · <span id="sc-holes-lbl">${existingRecord && this.isNine(existingRecord) ? '9홀' : '18홀'}</span></b>
                  <small>${dlabel} ${U.esc(defaultTime)}${comp ? ` · 동반자 ${comp}명` : ''}${fromSched ? ' · 일정에서 가져왔어요' : ''}</small>
                </div>
                <button class="v2-me-edit" onclick="Record.toggleInfo()">변경</button>
              </div>
              <div id="sc-info-edit" style="display:${defaultCourse ? 'none' : 'block'}; margin-top:14px;">
                <div class="v2-field2">
                  <button class="v2-field" onclick="Record.openDatePicker()"><span>날짜</span><b id="record-date-display">${dlabel}</b></button>
                  <button class="v2-field" onclick="Record.openTimePicker()"><span>티업 시간</span><b id="record-time-display">${defaultTime}</b></button>
                </div>
                <input type="hidden" id="record-date" value="${todayStr}">
                <input type="hidden" id="record-time" value="${defaultTime}">
                <div class="v2-search" style="margin-top:8px;"><input type="text" id="record-course" value="${U.esc(defaultCourse)}" placeholder="골프장 이름 (예: 남서울CC)" oninput="Record.syncTitle()"></div>
              </div>
            </div>

            <div class="v2-seg" id="sc-mode">
              <button class="${this._mode === 'holes' ? 'on' : ''}" data-m="holes" onclick="Record.setMode('holes')">홀별 입력</button>
              <button class="${this._mode === 'total' ? 'on' : ''}" data-m="total" onclick="Record.setMode('total')">총 타수만</button>
            </div>

            <div id="sc-holes-wrap" style="display:${this._mode === 'holes' ? 'block' : 'none'};">
              <div class="v2-card" style="padding:14px;">
                <div class="v2-sc-half">
                  <button id="sc-half-0" class="on" onclick="Record.pickHole(0)">전반 1~9</button>
                  <button id="sc-half-1" onclick="Record.pickHole(9)">후반 10~18</button>
                </div>
                <div class="v2-sc-cells" id="sc-cells"></div>
                <div class="v2-sc-legend"><span><i style="background:var(--v2-blue);border-radius:50%;"></i>버디 이하</span><span><i style="border:1.5px solid #94a3b8;"></i>파</span><span><i style="background:#fde68a;"></i>보기</span><span><i style="background:#fca5a5;"></i>더블 이상</span></div>
              </div>
              <div class="v2-sc-pad">
                <div class="hd"><b id="sc-pad-title">1번 홀</b><span id="sc-pad-par">파 4</span></div>
                <div class="step">
                  <button onclick="Record.stepHole(-1)" aria-label="한 타 빼기">−</button>
                  <b id="sc-pad-val">4</b>
                  <button onclick="Record.stepHole(1)" aria-label="한 타 더하기">+</button>
                </div>
                <div class="quick">
                  <button onclick="Record.quickHole(-1)">버디</button><button onclick="Record.quickHole(0)">파</button><button onclick="Record.quickHole(1)">보기</button><button onclick="Record.quickHole(2)">더블</button>
                </div>
                <p>빠른 버튼을 누르면 다음 홀로 넘어가요 · 파는 일반 코스 기준</p>
              </div>
              <div style="display:none;">${Array.from({ length: 18 }, (_, h) => `<input type="number" id="hole-${h}" oninput="Record.onHoleInput()">`).join('')}</div>
            </div>

            <div id="sc-total-wrap" class="v2-card" style="display:${this._mode === 'total' ? 'block' : 'none'};">
              <div class="v2-sc-tot">
                <label><span>전반</span><input type="number" inputmode="numeric" id="manual-score-out" placeholder="—" oninput="Record.calculateTotalScore(); Record.updateFoot()"></label>
                <label><span>후반</span><input type="number" inputmode="numeric" id="manual-score-in" placeholder="—" oninput="Record.calculateTotalScore(); Record.updateFoot()"></label>
                <label class="sum"><span>총 타수</span><input type="number" inputmode="numeric" id="manual-score" placeholder="—" oninput="Record.updateFoot()"></label>
              </div>
              <label class="rec-nine-check"><input type="checkbox" id="record-nine" ${existingRecord && this.isNine(existingRecord) ? 'checked' : ''} onchange="Record.syncTitle()"> 9홀 라운드예요 <span>(평균·베스트 계산에서 빠져요)</span></label>
              <div class="v2-sc-sub">스코어카드 사진</div>
              <div class="v2-sc-photos" style="grid-template-columns:repeat(4,1fr);">${photo('score', 1, '전반')}${photo('score', 2, '후반')}</div>
            </div>

            <div class="v2-card">
              <div class="v2-h2" style="font-size:1.0625rem; margin-bottom:12px;">사진 · 메모 (선택)</div>
              <div class="v2-sc-photos">${[1, 2, 3, 4].map(i => photo('diary', i, '+')).join('')}</div>
              <div class="v2-sc-sub">한 줄 메모</div>
              <textarea id="record-diary" rows="2" placeholder="예: 드라이버가 잘 맞은 날"></textarea>
            </div>
          </div>
          <div class="v2-sc-foot">
            <div class="sum"><span id="sc-foot-l">전반 – · 후반 –</span><span>합계 <b id="sc-foot-t">–</b></span></div>
            <div style="display:flex; gap:8px;">
              ${existingRecord ? `<button class="v2-sc-del" onclick="Record.deleteRecord()">삭제</button>` : ''}
              <button class="v2-btn-navy" id="sc-save" onclick="Record.saveV2()">${existingRecord ? '수정 완료' : '저장하기'}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    modal = U.$(`#${modalId}`);
    if (existingRecord) this._fillForm(existingRecord);
    this.renderCells(); this.updatePad(); this.updateFoot();
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.children[0].style.transform = 'translateY(0)';
    }, 10);
  },

  /* ── 스코어 직접 입력 도우미 ── */
  PARS: [4, 5, 4, 3, 4, 4, 5, 3, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4],
  _holeVal(h) { const el = document.getElementById(`hole-${h}`); const n = el ? parseInt(el.value, 10) : NaN; return isFinite(n) && n > 0 ? n : null; },
  toggleInfo() { const e = U.$('#sc-info-edit'); if (e) e.style.display = e.style.display === 'none' ? 'block' : 'none'; },
  syncTitle() {
    const c = (U.$('#record-course') || {}).value || '골프장';
    const nine = (U.$('#record-nine') || {}).checked;
    const t = U.$('#sc-title'); if (t) t.innerHTML = `${U.esc(c)} · <span id="sc-holes-lbl">${nine ? '9홀' : '18홀'}</span>`;
  },
  setMode(m) {
    this._mode = m;
    U.$$('#sc-mode button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    U.$('#sc-holes-wrap').style.display = m === 'holes' ? 'block' : 'none';
    U.$('#sc-total-wrap').style.display = m === 'total' ? 'block' : 'none';
    this.updateFoot();
  },
  pickHole(h) { this._hole = h; this.renderCells(); this.updatePad(); },
  renderCells() {
    const box = U.$('#sc-cells'); if (!box) return;
    const start = this._hole < 9 ? 0 : 9;
    ['#sc-half-0', '#sc-half-1'].forEach((id, i) => { const b = U.$(id); if (b) b.classList.toggle('on', (start === 9) === (i === 1)); });
    box.innerHTML = Array.from({ length: 9 }, (_, k) => start + k).map(h => {
      const v = this._holeVal(h), par = this.PARS[h];
      const cls = v == null ? '' : v <= par - 1 ? 'bird' : v === par ? 'par' : v === par + 1 ? 'bogey' : 'dbl';
      return `<button class="${h === this._hole ? 'cur ' : ''}${cls}" onclick="Record.pickHole(${h})"><span>${h + 1}</span><small>P${par}</small><b>${v == null ? '–' : v}</b></button>`;
    }).join('');
  },
  updatePad() {
    const h = this._hole, par = this.PARS[h], v = this._holeVal(h);
    const t = U.$('#sc-pad-title'); if (!t) return;
    t.textContent = `${h + 1}번 홀`;
    U.$('#sc-pad-par').textContent = `파 ${par}`;
    const val = U.$('#sc-pad-val'); val.textContent = v == null ? par : v; val.classList.toggle('dim', v == null);
  },
  _setHole(h, n) {
    const el = document.getElementById(`hole-${h}`); if (!el) return;
    el.value = n == null ? '' : Math.max(1, Math.min(15, n));
    this.onHoleInput(); this.renderCells(); this.updatePad(); this.updateFoot();
  },
  stepHole(d) { const h = this._hole; const cur = this._holeVal(h); this._setHole(h, (cur == null ? this.PARS[h] : cur) + (cur == null ? 0 : d)); U.haptic(); },
  quickHole(d) {
    const h = this._hole; this._setHole(h, this.PARS[h] + d); U.haptic();
    if (h < 17) { this._hole = h + 1; this.renderCells(); this.updatePad(); }
  },
  updateFoot() {
    const L = U.$('#sc-foot-l'), T = U.$('#sc-foot-t'), btn = U.$('#sc-save'); if (!L) return;
    const num = id => { const el = document.getElementById(id); const n = el ? parseInt(el.value, 10) : NaN; return isFinite(n) ? n : null; };
    let out, inn, tot, left = 0;
    if (this._mode === 'holes') {
      const { vals, filled } = this.readHoles();
      const sum = a => a.every(v => v != null) ? a.reduce((t, n) => t + n, 0) : null;
      out = sum(vals.slice(0, 9)); inn = sum(vals.slice(9)); tot = filled ? vals.reduce((t, n) => t + (n || 0), 0) : null;
      left = 18 - filled;
    } else { out = num('manual-score-out'); inn = num('manual-score-in'); tot = num('manual-score'); }
    L.innerHTML = `전반 <b>${out == null ? '–' : out}</b> · 후반 <b>${inn == null ? '–' : inn}</b>`;
    T.textContent = tot == null ? '–' : tot;
    const editing = !!this._editingKey;
    const pending = this._mode === 'holes' && left > 0 && left < 18;
    btn.classList.toggle('wait', pending);
    btn.textContent = pending ? `${left}홀 남았어요` : (editing ? '수정 완료' : '저장하기');
  },
  /** 저장: '총 타수만'이면 홀별 칸은 비우고 저장 */
  saveV2() {
    if (this._mode === 'total') { for (let h = 0; h < 18; h++) { const el = document.getElementById(`hole-${h}`); if (el) el.value = ''; } }
    else {
      const { filled } = this.readHoles();
      if (filled > 0 && filled < 18) { U.toast(`${18 - filled}홀이 남았어요. 9홀 라운드면 '총 타수만'에서 9홀로 저장해 주세요.`); return; }
    }
    this.saveRecord();
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

  async deleteRecord() {
    const key = this._editingKey;
    if (!key || !this.records[key]) return;
    if (!(await App.ask('기록을 삭제할까요?', '사진과 메모도 함께 지워져요.', { ok: '삭제' }))) return;
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
    if (display) display.innerText = `${m}월 ${d}일 (${['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]})`;
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
      const nineEl = document.getElementById('record-nine');
      rec.nine = nineEl ? !!nineEl.checked : this.isNine(rec);
      if (holeInput.filled === 18) rec.nine = false;
      if (!rec.nine && score != null && score < 60 && !confirm(`${score}타는 9홀 기록 같아요. 18홀 라운드로 저장할까요?\n(취소하면 9홀로 저장해요)`)) rec.nine = true;
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
      if (rec.score && rec.diary && typeof Points !== 'undefined') setTimeout(() => Points.earnRound(key), 1500);   // 라운딩 후기 포인트
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
                    <span style="font-size:14px; font-weight:700; color:var(--text-300);">${U.ico('pin', 14)} ${U.esc(rec.course || '')} · ${dateStr} ${teeTime ? `· ${U.esc(teeTime)}` : ''}</span>
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
                  #명랑골프 #BuddyPlanner #골프스타그램 #골프일지
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
    const text = `⛳ ${it.dateStr} ${r.course || ''}${typeof r.score === 'number' ? ` · ${r.score}타` : ''}${r.diary ? `\n${r.diary}` : ''}\n\n#BuddyPlanner`;
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

