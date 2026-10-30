/* =========================================
   BuddyPlanner v2 — AI Golf Assistant Logic
   ========================================= */

const AI = {
  isInitialized: false,
  recognition: null,
  isListening: false,
  messages: [],

  init() {
    const container = U.$('#screen-ai');
    if (!container) return;

    if (!this.isInitialized) {
      this.renderLayout(container);
      this.initSpeechRecognition();
      this.loadInitialMessages();
      this.isInitialized = true;
    } else {
      this.scrollToBottom();
    }
  },

  renderLayout(container) {
    container.innerHTML = `
      <!-- AI Header -->
      <div class="ai-header">
        <div class="ai-header-left">
          <div class="ai-avatar-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span class="ai-status-dot"></span>
          </div>
          <div>
            <div class="ai-header-title">
              <span>버디 AI 비서</span>
              <span class="ai-pro-badge">PRO</span>
            </div>
            <div class="ai-header-sub">
              <span class="online-indicator"></span>
              <span>스마트 음성 & 골프 일정 비서</span>
            </div>
          </div>
        </div>
        <div class="ai-header-actions">
          <button class="ai-btn-icon" title="대화 비우기" onclick="AI.clearChat()">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
          </button>
        </div>
      </div>

      <!-- AI Chat Body -->
      <div class="ai-chat-body" id="ai-chat-body"></div>

      <!-- Bottom Voice & Text Input Bar -->
      <div class="ai-input-bar-wrap">
        <!-- Voice Listening Status Banner -->
        <div class="ai-listening-overlay" id="ai-listening-banner">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="ai-wave-bars">
              <div class="ai-wave-bar"></div>
              <div class="ai-wave-bar"></div>
              <div class="ai-wave-bar"></div>
              <div class="ai-wave-bar"></div>
              <div class="ai-wave-bar"></div>
            </div>
            <span style="font-size:12.5px;letter-spacing:-0.2px;">음성을 듣고 있습니다... 말씀해 주세요</span>
          </div>
          <button onclick="AI.stopListening()" style="background:none;border:none;color:#94a3b8;font-size:11.5px;cursor:pointer;text-decoration:underline;">취소</button>
        </div>

        <div class="ai-input-bar">
          <button class="ai-mic-btn" id="ai-mic-btn" onclick="AI.toggleListening()" aria-label="음성 인식" title="음성으로 말하기">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
          <input type="text" id="ai-input" class="ai-text-input" placeholder="말씀하시거나 골프 일정을 입력하세요..." onkeydown="AI.handleKeyDown(event)" />
          <button class="ai-send-btn" id="ai-send-btn" onclick="AI.sendFromInput()" aria-label="전송" title="전송">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `;
  },

  loadInitialMessages() {
    const saved = localStorage.getItem('bp_ai_messages_v1');
    if (saved) {
      try {
        this.messages = JSON.parse(saved);
      } catch (e) {
        this.messages = [];
      }
    }

    if (this.messages.length === 0) {
      this.messages = [
        {
          id: 'welcome',
          sender: 'bot',
          time: this.formatCurrentTime(),
          text: `안녕하세요, ${this.userName()}님! 🏌️‍♂️<br>골프 전문 <strong>버디 AI 비서</strong>입니다.<br><br>말씀하시거나 채팅으로 <strong>라운딩 일정 자동 등록</strong>, <strong>골프 룰/에티켓 질문</strong>, <strong>동반자 알림톡 전송</strong>을 편하게 요청해 보세요!`,
          showChips: true
        }
      ];
    }

    this.renderAllMessages();
  },

  saveMessages() {
    localStorage.setItem('bp_ai_messages_v1', JSON.stringify(this.messages.slice(-30)));
  },

  clearChat() {
    if (confirm('대화 내용을 모두 지우시겠습니까?')) {
      this.messages = [];
      localStorage.removeItem('bp_ai_messages_v1');
      this.loadInitialMessages();
    }
  },

  formatCurrentTime() {
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? '오후' : '오전';
    const displayH = h % 12 || 12;
    return `${ampm} ${displayH}:${m}`;
  },

  renderAllMessages() {
    const chatBody = U.$('#ai-chat-body');
    if (!chatBody) return;
    chatBody.innerHTML = '';
    this.messages.forEach(msg => {
      this.appendMessageToDOM(msg, false);
    });
    this.scrollToBottom();
  },

  appendMessageToDOM(msg, scroll = true) {
    const chatBody = U.$('#ai-chat-body');
    if (!chatBody) return;

    const row = document.createElement('div');
    row.className = `ai-msg-row ${msg.sender}`;
    row.id = `ai-msg-${msg.id}`;

    if (msg.sender === 'bot') {
      row.innerHTML = `
        <div class="ai-msg-avatar">⛳</div>
        <div style="display:flex;flex-direction:column;max-width:calc(100% - 44px);width:100%;">
          <div class="ai-msg-bubble">
            ${msg.text}
            ${msg.schedCard ? this.buildScheduleCardHTML(msg.schedCard, msg.id) : ''}
            ${msg.weatherCard ? this.buildWeatherCardHTML(msg.weatherCard) : ''}
            ${msg.ruleCard ? this.buildRuleCardHTML(msg.ruleCard) : ''}
          </div>
          <span class="ai-msg-time">${msg.time}</span>
          ${msg.showChips ? this.buildQuickChipsHTML() : ''}
        </div>
      `;
    } else {
      row.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:flex-end;">
          <div class="ai-msg-bubble">${this.escapeHTML(msg.text)}</div>
          <span class="ai-msg-time">${msg.time}</span>
        </div>
      `;
    }

    chatBody.appendChild(row);
    if (scroll) this.scrollToBottom();
  },

  buildQuickChipsHTML() {
    return `
      <div class="ai-quick-chips-wrap">
        <div class="ai-chips-label">
          <span>💡</span>
          <span>추천 빠른 실행 (탭해서 바로 요청)</span>
        </div>
        <div class="ai-quick-chips">
          <button class="ai-chip-btn" onclick="AI.handleChipClick('이번 주 토요일 7시 남서울CC 4명 일정 잡아줘')">
            ⛳ 이번 주 토요일 7시 남서울CC 일정 등록
          </button>
          <button class="ai-chip-btn" onclick="AI.handleChipClick('내 라운딩 일정 확인하고 날씨 알려줘')">
            🌤️ 다가오는 라운딩 날씨 확인
          </button>
          <button class="ai-chip-btn" onclick="AI.handleChipClick('빨간 말뚝(페널티 구역) 드롭 방법과 벌타 알려줘')">
            🚩 빨간 말뚝 페널티 룰
          </button>
          <button class="ai-chip-btn" onclick="AI.handleChipClick('OB(오비) 났을 때 처리 방법과 벌타')">
            ⚪ OB 벌타 및 특설티 규정
          </button>
          <button class="ai-chip-btn" onclick="AI.handleChipClick('골프 라운딩 필수 에티켓 3가지 알려줘')">
            🏌️ 벙커/디봇 골프 매너
          </button>
          <button class="ai-chip-btn" onclick="AI.handleChipClick('버디플래너는 어떤 기능이 있어?')">
            ❓ 버디플래너 스마트 기능
          </button>
        </div>
      </div>
    `;
  },

  getDDayText(targetDate) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '🔥 오늘 라운딩';
    if (diffDays === 1) return '⚡ 내일 라운딩';
    if (diffDays === 2) return '⛳ 모레 라운딩';
    if (diffDays > 0) return `⛳ D-${diffDays}`;
    return `라운딩 완료`;
  },

  calculateDepartureRecommendation(teeOff) {
    if (!teeOff) return '06:00 집 출발 권장';
    const parts = teeOff.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    // 보통 티오프 1시간 15분 전 출발 권장 (이동 45분 + 환복/준비 30분)
    let totalMin = h * 60 + m - 75;
    if (totalMin < 0) totalMin += 24 * 60;
    const depH = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const depM = (totalMin % 60).toString().padStart(2, '0');
    return `${depH}:${depM} 집 출발 권장 (이동 45분 + 준비 30분)`;
  },

  buildScheduleCardHTML(sched, msgId) {
    const isRegistered = sched.isRegistered;
    const dateObj = new Date(sched.date);
    const dateStr = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${this.getDayOfWeek(dateObj)})`;
    const dday = this.getDDayText(dateObj);
    const depText = this.calculateDepartureRecommendation(sched.teeOff);
    const companionList = sched.companions || [];
    const count = companionList.length || 4;

    const avatarsHTML = companionList.slice(0, 3).map((c, i) => {
      const initial = (c.name || '동')[0];
      return `<div class="ai-avatar-circle" title="${c.name || '동반자'}">${initial}</div>`;
    }).join('') + (count > 3 ? `<div class="ai-avatar-circle" style="background:#475569;">+${count - 3}</div>` : '');

    return `
      <div class="ai-sched-card" id="sched-card-${msgId}">
        <div class="ai-sched-header">
          <div class="ai-sched-title-wrap">
            <div class="ai-sched-title">⛳ ${sched.course.name}</div>
            <div class="ai-sched-subtitle">BURDY PLANNER ROUNDING PASS</div>
          </div>
          <div class="ai-sched-dday-badge">${dday}</div>
        </div>

        <div class="ai-sched-details">
          <div class="ai-sched-row">
            <div class="ai-sched-row-left">
              <span class="ai-sched-icon-pill">⏰</span>
              <span><strong>티오프:</strong></span>
            </div>
            <span class="ai-sched-row-val">${dateStr} ${sched.teeOff}</span>
          </div>

          <div class="ai-sched-row">
            <div class="ai-sched-row-left">
              <span class="ai-sched-icon-pill">📍</span>
              <span><strong>골프장:</strong></span>
            </div>
            <span class="ai-sched-row-val" style="font-size:12.5px;">${sched.course.region} (${sched.course.addr || '경기 성남'})</span>
          </div>

          <div class="ai-sched-row">
            <div class="ai-sched-row-left">
              <span class="ai-sched-icon-pill">👥</span>
              <span><strong>동반자:</strong></span>
            </div>
            <div class="ai-avatar-stack">
              ${avatarsHTML}
              <span class="ai-avatar-count">${count}인 플레이</span>
            </div>
          </div>

          <div class="ai-sched-subbar">
            <div class="ai-subbar-item">
              <span>🚗</span>
              <span>${depText}</span>
            </div>
            <div class="ai-subbar-item" style="color:#059669;">
              <span>🌤️</span>
              <span>22°C 쾌적</span>
            </div>
          </div>
        </div>

        <div class="ai-sched-actions">
          <button class="ai-btn-register ${isRegistered ? 'registered' : ''}" 
                  id="btn-reg-${msgId}" 
                  onclick="AI.confirmRegister('${msgId}')">
            ${isRegistered ? '✓ 캘린더 등록 완료 (타임라인 보기)' : '⛳ 버디플래너 캘린더 & 역산 타임라인에 등록'}
          </button>
          <button class="ai-btn-notify" onclick="AI.notifyCompanions('${msgId}')">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#191919" d="M12 3c-5.523 0-10 3.553-10 7.938 0 2.825 1.83 5.303 4.606 6.744l-1.01 3.7c-.053.195.166.353.332.227l4.316-2.82c.575.08 1.162.124 1.756.124 5.523 0 10-3.553 10-7.938C22 6.553 17.523 3 12 3z"/></svg>
            동반자 카카오 알림톡/일정 공유
          </button>
        </div>
      </div>
    `;
  },

  buildWeatherCardHTML(w) {
    return `
      <div class="ai-weather-card">
        <div class="ai-weather-top">
          <div>
            <div class="ai-weather-course">⛳ ${w.courseName}</div>
            <div style="font-size:11.5px;color:#64748b;margin-top:2px;">${w.dateStr} 예보</div>
          </div>
          <div class="ai-weather-temp">${w.icon || '🌤️'} ${w.temp || '21°C'}</div>
        </div>
        <div class="ai-weather-grid">
          <div>
            <div class="ai-weather-stat-label">강수확률</div>
            <div class="ai-weather-stat-val" style="color:#0284c7;">${w.rain || '10%'}</div>
          </div>
          <div>
            <div class="ai-weather-stat-label">바람/풍속</div>
            <div class="ai-weather-stat-val">${w.wind || '1.8m/s 북서'}</div>
          </div>
          <div>
            <div class="ai-weather-stat-label">라운딩 적합도</div>
            <div class="ai-weather-stat-val" style="color:#059669;">최상 ⛳</div>
          </div>
        </div>
      </div>
    `;
  },

  buildRuleCardHTML(r) {
    return `
      <div class="ai-rule-card ${r.typeClass || ''}">
        <div class="ai-rule-title">
          <span>${r.icon || '🚩'}</span>
          <span>${r.title}</span>
        </div>
        <div class="ai-rule-steps">
          ${r.steps.map(s => `<div>${s}</div>`).join('')}
        </div>
      </div>
    `;
  },

  handleChipClick(text) {
    this.processUserMessage(text);
  },

  handleKeyDown(e) {
    if (e.key === 'Enter') {
      this.sendFromInput();
    }
  },

  sendFromInput() {
    const input = U.$('#ai-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    this.processUserMessage(val);
  },

  // Process user message & intelligent routing
  processUserMessage(text) {
    const userMsgId = 'u_' + Date.now();
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      time: this.formatCurrentTime(),
      text: text
    };
    this.messages.push(userMsg);
    this.appendMessageToDOM(userMsg);
    this.saveMessages();

    // Show typing indicator
    this.showTypingIndicator();

    setTimeout(() => {
      this.hideTypingIndicator();
      this.generateBotResponse(text);
    }, 600);
  },

  showTypingIndicator() {
    const chatBody = U.$('#ai-chat-body');
    if (!chatBody || U.$('#ai-typing-row')) return;
    const row = document.createElement('div');
    row.className = 'ai-msg-row bot';
    row.id = 'ai-typing-row';
    row.innerHTML = `
      <div class="ai-msg-avatar">⛳</div>
      <div class="ai-msg-bubble ai-typing-indicator">
        <span class="ai-typing-dot"></span>
        <span class="ai-typing-dot"></span>
        <span class="ai-typing-dot"></span>
      </div>
    `;
    chatBody.appendChild(row);
    this.scrollToBottom();
  },

  hideTypingIndicator() {
    const row = U.$('#ai-typing-row');
    if (row) row.remove();
  },

  // Natural Language Processor for Golf Intents
  generateBotResponse(text) {
    const botMsgId = 'b_' + Date.now();
    const lower = text.toLowerCase();

    // 1. Check for schedule registration intent
    const scheduleData = this.parseScheduleIntent(text);
    if (scheduleData) {
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        time: this.formatCurrentTime(),
        text: `말씀하신 내용에서 <strong>${U.esc(scheduleData.course.name)}</strong> 라운딩 일정을 감지했습니다! ⛳<br>아래 정보를 확인하시고 <strong>[즉시 등록]</strong> 버튼을 누르면 캘린더와 자동 이동 타임라인에 바로 반영됩니다.`,
        schedCard: scheduleData
      };
      this.messages.push(botMsg);
      this.appendMessageToDOM(botMsg);
      this.saveMessages();
      return;
    }

    // 2. Check for weather / upcoming rounds intent
    if (lower.includes('날씨') || lower.includes('예보') || lower.includes('비 오') || lower.includes('내 라운딩') || lower.includes('일정 확인')) {
      const now = new Date();
      const future = (typeof State !== 'undefined' && State.schedules || [])
        .filter(s => s && s.date && new Date(s.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
        .sort((a,b) => new Date(a.date) - new Date(b.date));

      if (future.length > 0) {
        const next = future[0];
        const d = new Date(next.date);
        const dateStr = `${d.getMonth()+1}월 ${d.getDate()}일 (${this.getDayOfWeek(d)})`;
        const botMsg = {
          id: botMsgId,
          sender: 'bot',
          time: this.formatCurrentTime(),
          text: `${this.userName()}님의 가장 가까운 라운딩은 <strong>${dateStr} ${U.esc(next.teeOff)}</strong>, <strong>${U.esc(next.course.name)}</strong>입니다! ⛳`,
          weatherCard: {
            courseName: next.course.name,
            dateStr: dateStr,
            icon: '🌤️',
            temp: '22°C',
            rain: '10%',
            wind: '1.8m/s (북서풍)'
          }
        };
        this.messages.push(botMsg);
        this.appendMessageToDOM(botMsg);
        this.saveMessages();
        return;
      } else {
        const weatherReply = `현재 등록된 라운딩 일정이 없습니다. "토요일 7시 남서울CC 등록해줘"라고 말씀해 주시면 일정을 바로 등록해 드릴게요! ⛳`;
        this.addSimpleBotReply(botMsgId, weatherReply);
        return;
      }
    }

    // 3. Golf Rules & Q&A knowledge base
    if (lower.includes('말뚝') || lower.includes('페널티') || lower.includes('해저드') || lower.includes('빨간') || lower.includes('노란')) {
      const isRed = lower.includes('빨간') || !lower.includes('노란');
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        time: this.formatCurrentTime(),
        text: `🚩 <strong>골프 페널티 구역(구 해저드) 규정</strong>을 정리해 드립니다.`,
        ruleCard: {
          icon: isRed ? '🔴' : '🟡',
          typeClass: isRed ? 'penalty-red' : 'penalty-yellow',
          title: isRed ? '빨간 말뚝 (측면 페널티 구역) 구제 룰' : '노란 말뚝 페널티 구역 룰',
          steps: [
            '• <strong>기본 벌타:</strong> 1벌타 부여',
            '• <strong>드롭 위치:</strong> 볼이 경계선을 마지막으로 통과한 지점 기준 <strong>2클럽 길이 이내</strong> (홀에 가깝지 않게)',
            '• <strong>대안 선택:</strong> 직전 샷 위치로 복귀 또는 홀과 경계점 통과선을 잇는 후방 선상 드롭',
            '💡 <strong>TIP:</strong> 페널티 구역 내에서도 플레이 가능한 상태라면 벌타 없이 그대로 샷을 진행할 수 있습니다.'
          ]
        }
      };
      this.messages.push(botMsg);
      this.appendMessageToDOM(botMsg);
      this.saveMessages();
      return;
    }

    if (lower.includes('ob') || lower.includes('오비') || lower.includes('벌타')) {
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        time: this.formatCurrentTime(),
        text: `⚪ <strong>OB (Out of Bounds) 처리 및 벌타 규정</strong>입니다.`,
        ruleCard: {
          icon: '⚪',
          typeClass: 'penalty-white',
          title: 'OB 규정 및 한국 골프장 특설티(OB티) 룰',
          steps: [
            '• <strong>기본 규칙:</strong> 1벌타 후 직전 샷을 한 위치에서 다시 플레이 (거리와 타수 손실)',
            '• <strong>국내 특설티(OB티) 운영:</strong> 경기 진행을 위해 보통 <strong>2벌타 가산</strong> 후 특설티에서 4번째 샷 진행',
            '• <strong>판정 기준:</strong> 볼 전체가 흰색 말뚝/흰 선을 완전히 벗어났을 때만 OB (선에 조금이라도 걸치면 인플레이)'
          ]
        }
      };
      this.messages.push(botMsg);
      this.appendMessageToDOM(botMsg);
      this.saveMessages();
      return;
    }

    if (lower.includes('컨시드') || lower.includes('오케이') || lower.includes('ok')) {
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        time: this.formatCurrentTime(),
        text: `🎯 <strong>컨시드 (OK) 기준 및 에티켓</strong>입니다.`,
        ruleCard: {
          icon: '🎯',
          typeClass: '',
          title: '컨시드 (OK) 공식 규정',
          steps: [
            '• 보통 퍼터 그립 끝에서 헤드까지의 거리(약 80~90cm 이내)일 때 선언합니다.',
            '• <strong>중요 에티켓:</strong> 컨시드는 본인이 결정할 수 없으며, <strong>반드시 동반자가 줄 때만 유효</strong>합니다.',
            '• 스코어는 1타를 추가하고 홀아웃한 것으로 공식 인정됩니다.'
          ]
        }
      };
      this.messages.push(botMsg);
      this.appendMessageToDOM(botMsg);
      this.saveMessages();
      return;
    }

    if (lower.includes('벙커') || lower.includes('디봇') || lower.includes('매너')) {
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        time: this.formatCurrentTime(),
        text: `🏌️ <strong>골프 필수 매너 & 에티켓 3가지</strong>입니다.`,
        ruleCard: {
          icon: '🏌️',
          typeClass: '',
          title: '골퍼가 꼭 지켜야 할 플레이 에티켓',
          steps: [
            '1. <strong>벙커 정리:</strong> 샷 후 발자국과 모래 파인 곳을 고무래로 평평하게 정리하고, 고무래는 벙커 턱 밖에 놓습니다.',
            '2. <strong>디봇 수리:</strong> 아이언 샷으로 뜯긴 잔디(디봇)는 주워서 제자리에 덮고 밟아주거나 배토 모래를 채워줍니다.',
            '3. <strong>퍼팅 라인:</strong> 그린 위에서 동반자의 공과 홀컵 사이 가상의 선(퍼팅 라인)을 밟지 않도록 발걸음을 주의합니다.'
          ]
        }
      };
      this.messages.push(botMsg);
      this.appendMessageToDOM(botMsg);
      this.saveMessages();
      return;
    }

    if (lower.includes('알림') || lower.includes('동반자') || lower.includes('카톡') || lower.includes('초대')) {
      const notiReply = `📱 <strong>동반자 알림톡 기능</strong><br><br>
등록된 라운딩 카드에서 <strong>[동반자 카카오 알림톡/공유]</strong> 버튼을 누르면 동반자들에게 다음과 같은 정중한 초대 카톡이 자동 전송됩니다.<br><br>
<em>"⛳ [버디플래너] 라운딩 일정 안내<br>
• 일시: 5월 12일(일) 07:00 티오프<br>
• 골프장: 남서울CC<br>
• 이동 준비 및 타임라인 보기 링크 포함"</em><br><br>
일정을 먼저 말씀해 주시면 알림 카드를 바로 만들어 드립니다!`;
      this.addSimpleBotReply(botMsgId, notiReply);
      return;
    }

    if (lower.includes('버디플래너') || lower.includes('기능') || lower.includes('도움')) {
      const featReply = `💡 <strong>버디플래너 핵심 스마트 기능 안내</strong><br><br>
1. <strong>🎙️ 버디 AI 비서:</strong> 말이나 채팅으로 일정 자동 등록 & 골프 질의응답<br>
2. <strong>🚗 역산 타임라인:</strong> 티오프 시간 기준 집 출발시간, 맛집 경유, 준비시간 자동 계산<br>
3. <strong>🍲 라운딩 맛집 추천:</strong> 골프장 반경 캐디/골퍼 추천 조식 및 뒤풀이 맛집 안내<br>
4. <strong>📱 동반자 알림:</strong> 카카오톡 원클릭으로 티오프 일정 및 네비 링크 공유<br>
5. <strong>📊 라운딩 스코어 기록:</strong> 스코어카드 및 라운딩 분석 관리`;
      this.addSimpleBotReply(botMsgId, featReply);
      return;
    }

    // Default friendly assistant reply
    const defaultReply = `${this.userName()}님, "${U.esc(text)}"에 대해 확인했습니다! 🏌️‍♂️<br><br>
제가 가장 잘하는 일은 <strong>"이번 주 토요일 7시 남서울CC 4명 일정 등록해줘"</strong>처럼 일정을 잡아드리거나, 골프 룰과 동반자 카톡 알림을 챙겨드리는 것입니다.<br><br>
궁금하신 골프 규정이나 등록하고 싶은 라운딩이 있으시면 언제든 편하게 말씀해 주세요!`;
    this.addSimpleBotReply(botMsgId, defaultReply);
  },

  addSimpleBotReply(id, htmlText) {
    const botMsg = {
      id: id,
      sender: 'bot',
      time: this.formatCurrentTime(),
      text: htmlText
    };
    this.messages.push(botMsg);
    this.appendMessageToDOM(botMsg);
    this.saveMessages();
  },

  // Natural Language Schedule Parser
  parseScheduleIntent(text) {
    const lower = text.toLowerCase();
    
    // Check if sentence looks like a schedule registration request
    const registerKeywords = ['등록', '잡아줘', '예약', '일정', '추가', '티오프', '라운딩', '가자', '부킹', 'cc', 'gc'];
    const hasIntent = registerKeywords.some(kw => lower.includes(kw));

    // Try matching course
    let matchedCourse = null;
    if (typeof COURSES !== 'undefined' && Array.isArray(COURSES)) {
      for (const c of COURSES) {
        const baseName = c.name.replace(/cc|gc|골프장/gi, '').trim();
        if (text.includes(baseName) || text.includes(c.name)) {
          matchedCourse = c;
          break;
        }
      }
    }

    if (!matchedCourse) {
      // Check for generic "XX CC" or "XX GC" pattern
      const ccMatch = text.match(/([가-힣a-zA-Z0-9]+)\s*(cc|gc|골프장|컨트리클럽)/i);
      if (ccMatch) {
        const rawName = ccMatch[1] + (ccMatch[2].toUpperCase().includes('C') ? ' ' + ccMatch[2].toUpperCase() : ' CC');
        matchedCourse = {
          id: 9999,
          name: rawName,
          region: '수도권',
          lat: 37.3925,
          lng: 127.0785,
          addr: '경기 성남시 분당구'
        };
      }
    }

    // If no course and no register intent, not a schedule request
    if (!matchedCourse && !hasIntent) return null;

    // Default to 남서울 CC if intent is strong but course not specified
    if (!matchedCourse && hasIntent && (text.includes('티오프') || text.includes('시') || text.includes('요일'))) {
      matchedCourse = (typeof COURSES !== 'undefined' && COURSES[2]) ? COURSES[2] : { id: 3, name: '남서울 CC', region: '경기 성남', lat: 37.3925, lng: 127.0785, addr: '경기 성남시 분당구 궁내동 산 25' };
    }

    if (!matchedCourse) return null;

    // Parse date
    const targetDate = this.parseDateFromText(text);

    // Parse time
    const teeOffTime = this.parseTimeFromText(text);

    // Parse companions
    const companions = this.parseCompanionsFromText(text);

    return {
      course: matchedCourse,
      date: targetDate,
      teeOff: teeOffTime,
      prepTime: 30,
      companions: companions,
      isRegistered: false
    };
  },

  parseDateFromText(text) {
    const now = new Date();
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (text.includes('오늘')) {
      return target;
    }
    if (text.includes('내일')) {
      target.setDate(target.getDate() + 1);
      return target;
    }
    if (text.includes('모레')) {
      target.setDate(target.getDate() + 2);
      return target;
    }

    // "X월 Y일"
    const monthDayMatch = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (monthDayMatch) {
      const m = parseInt(monthDayMatch[1], 10) - 1;
      const d = parseInt(monthDayMatch[2], 10);
      target.setMonth(m, d);
      if (target < now) {
        target.setFullYear(now.getFullYear() + 1);
      }
      return target;
    }

    // Day of week handling: "토요일", "일요일", "다음주 토요일" 등
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const shortDays = ['일', '월', '화', '수', '목', '금', '토'];

    for (let i = 0; i < 7; i++) {
      if (text.includes(days[i]) || text.includes(shortDays[i] + '욜') || (text.includes(shortDays[i]) && text.includes('요일'))) {
        const currentDay = now.getDay();
        let diff = i - currentDay;
        if (text.includes('다음주')) {
          diff += 7;
        } else if (diff <= 0) {
          diff += 7;
        }
        target.setDate(now.getDate() + diff);
        return target;
      }
    }

    // Default to coming Saturday if nothing specified
    const currentDay = now.getDay();
    let diffToSat = 6 - currentDay;
    if (diffToSat <= 0) diffToSat += 7;
    target.setDate(now.getDate() + diffToSat);
    return target;
  },

  parseTimeFromText(text) {
    // "오전 7시 30분", "7시 반", "07:00", "오후 1시"
    let h = 7;
    let m = 0;

    const colonMatch = text.match(/(\d{1,2})\s*:\s*(\d{2})/);
    if (colonMatch) {
      h = parseInt(colonMatch[1], 10);
      m = parseInt(colonMatch[2], 10);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    const hourMatch = text.match(/(오전|오후|새벽|저녁|낮)?\s*(\d{1,2})\s*시\s*(\d{1,2}|반)?\s*분?/);
    if (hourMatch) {
      const ampm = hourMatch[1] || '';
      h = parseInt(hourMatch[2], 10);
      const minPart = hourMatch[3] || '';
      if (minPart === '반') {
        m = 30;
      } else if (minPart) {
        m = parseInt(minPart, 10);
      }

      if ((ampm.includes('오후') || ampm.includes('저녁')) && h < 12) {
        h += 12;
      }
    }

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  },

  parseCompanionsFromText(text) {
    const list = [];
    if (typeof COMPANIONS !== 'undefined' && Array.isArray(COMPANIONS)) {
      COMPANIONS.forEach(c => {
        if (text.includes(c.name)) {
          list.push(c);
        }
      });
      if (list.length === 0) {
        // default 4 people
        return [COMPANIONS[0], COMPANIONS[1], COMPANIONS[2]];
      }
    }
    return list;
  },

  getDayOfWeek(d) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[d.getDay()];
  },

  // Confirm schedule registration into BuddyPlanner State
  confirmRegister(msgId) {
    const msg = this.messages.find(m => m.id === msgId);
    if (!msg || !msg.schedCard) return;

    if (msg.schedCard.isRegistered) {
      App.navigate('timeline');
      return;
    }

    const s = msg.schedCard;
    const newSched = {
      course: s.course,
      date: s.date,
      teeOff: s.teeOff,
      prepTime: s.prepTime || 30,
      companions: s.companions || [],
      startPoint: '집',
      hasMeal: false,
      mealRestaurant: null,
      hasPostMeal: false,
      postMealRestaurant: null,
      hasMeetingPoint: false,
      meetingPointObj: null
    };

    if (typeof Billing !== 'undefined' && !Billing.guardScheduleLimit()) return;

    if (typeof State !== 'undefined' && State.addSchedule) {
      State.addSchedule(newSched);
      msg.schedCard.isRegistered = true;
      this.saveMessages();

      const btn = U.$(`#btn-reg-${msgId}`);
      if (btn) {
        btn.classList.add('registered');
        btn.innerHTML = '✓ 등록 완료 (타임라인 보기)';
      }

      if (typeof U !== 'undefined' && U.toast) {
        U.toast(`⛳ ${s.course.name} 일정이 캘린더에 성공적으로 등록되었습니다!`);
      } else {
        alert(`⛳ ${s.course.name} 일정이 등록되었습니다!`);
      }
    }
  },

  // Notify companions via Kakao
  notifyCompanions(msgId) {
    const msg = this.messages.find(m => m.id === msgId);
    if (!msg || !msg.schedCard) return;

    const s = msg.schedCard;
    const dateStr = `${s.date.getMonth() + 1}월 ${s.date.getDate()}일 (${this.getDayOfWeek(s.date)})`;
    const shareTitle = `[버디플래너] ${s.course.name} 라운딩 일정 안내`;
    const shareDesc = `📅 일시: ${dateStr} ${s.teeOff} 티오프\n📍 장소: ${s.course.name} (${s.course.addr})\n🚗 준비시간 역산 타임라인을 확인해보세요!`;

    if (typeof Kakao !== 'undefined' && Kakao.isInitialized && Kakao.isInitialized()) {
      try {
        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: shareTitle,
            description: shareDesc,
            imageUrl: 'https://images.unsplash.com/photo-1587329310686-91414b8e3cb7?w=600&q=80',
            link: {
              mobileWebUrl: window.location.href,
              webUrl: window.location.href
            }
          },
          buttons: [
            {
              title: '일정 및 타임라인 보기',
              link: {
                mobileWebUrl: window.location.href,
                webUrl: window.location.href
              }
            }
          ]
        });
        return;
      } catch (e) {
        console.warn('Kakao share fallback:', e);
      }
    }

    // Fallback: Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${shareTitle}\n\n${shareDesc}`).then(() => {
        if (typeof U !== 'undefined' && U.toast) {
          U.toast('💬 동반자 알림톡 문구가 클립보드에 복사되었습니다. 카카오톡에 붙여넣어 공유하세요!');
        } else {
          alert('동반자 알림톡 문구가 복사되었습니다.');
        }
      });
    } else {
      alert(`${shareTitle}\n\n${shareDesc}`);
    }
  },

  // Voice Speech Recognition (STT)
  initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('SpeechRecognition API is not supported on this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.lang = 'ko-KR';
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateMicUI(true);
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const input = U.$('#ai-input');
        if (input) input.value = transcript;

        if (event.results[0].isFinal) {
          this.stopListening();
          if (transcript.trim()) {
            this.sendFromInput();
          }
        }
      };

      this.recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e);
        this.stopListening();
        if (e.error === 'not-allowed') {
          if (typeof U !== 'undefined' && U.toast) {
            U.toast('마이크 권한 허용이 필요합니다.');
          }
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateMicUI(false);
      };
    } catch (e) {
      console.error('Failed to init speech recognition:', e);
    }
  },

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  },

  startListening() {
    if (!this.recognition) {
      this.initSpeechRecognition();
    }
    if (!this.recognition) {
      if (typeof U !== 'undefined' && U.toast) {
        U.toast('현재 브라우저에서는 음성 인식을 지원하지 않습니다. 텍스트로 입력해 주세요!');
      } else {
        alert('음성 인식을 지원하지 않는 환경입니다.');
      }
      return;
    }

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition start error:', e);
    }
  },

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
    this.updateMicUI(false);
  },

  updateMicUI(listening) {
    const btn = U.$('#ai-mic-btn');
    const overlay = U.$('#ai-listening-banner');
    if (btn) btn.classList.toggle('listening', listening);
    if (overlay) overlay.classList.toggle('active', listening);
  },

  scrollToBottom() {
    setTimeout(() => {
      const chatBody = U.$('#ai-chat-body');
      if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight;
      }
    }, 50);
  },

  /** 사용자 닉네임 (HTML 이스케이프 처리) */
  userName() {
    return U.esc(localStorage.getItem('bp_user_name') || '회원');
  },

  escapeHTML(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
};
