/* =========================================
   BuddyPlanner v2 — Chat Interface Logic
   ========================================= */

const Chat = {
  state: 'IDLE',
  roundData: {},
  
  init() {
    this.render();
    this.bind();
    this.startConversation();
  },

  render() {
    const el = U.$('#screen-chat');
    el.innerHTML = `
      <div class="chat-header">
        <button class="chat-header-btn" onclick="App.navigate('home')">
          <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 class="chat-title">버디플래너 AI</h1>
        <div class="chat-header-btn" style="visibility:hidden"></div>
      </div>
      
      <div class="chat-body" id="chat-body">
        <!-- Messages will be injected here -->
      </div>
      
      <div class="chat-input-area" id="chat-input-area">
        <div class="chat-input-wrap">
          <input type="text" id="chat-input" class="chat-input" placeholder="메시지를 입력하세요..." autocomplete="off"/>
        </div>
        <button class="chat-send-btn" id="chat-send-btn">
          <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    `;
  },

  bind() {
    this.inputEl = U.$('#chat-input');
    this.bodyEl = U.$('#chat-body');
    const sendBtn = U.$('#chat-send-btn');
    
    sendBtn.onclick = () => this.handleUserInput(this.inputEl.value);
    this.inputEl.onkeypress = (e) => {
      if (e.key === 'Enter') this.handleUserInput(this.inputEl.value);
    };
  },

  startConversation() {
    this.bodyEl.innerHTML = '';
    this.state = 'ASK_COURSE';
    this.roundData = {
      course: null,
      date: new Date(),
      teeOff: '07:00',
      prepTime: 30,
      hasMeal: false,
      travelTime: 60 // Mock travel time
    };
    
    this.addBotMessage('안녕하세요! 버디플래너입니다. ⛳<br>새 라운딩 일정을 등록하시겠어요?<br>어느 골프장으로 가시나요?');
    this.addQuickReplies(['남서울 CC', '아난티남해 CC', '잭니클라우스 GC', '파인크리크 CC']);
  },

  handleUserInput(text) {
    if (!text.trim()) return;
    this.addUserMessage(text);
    this.inputEl.value = '';
    
    // Process input based on current state
    this.showTyping();
    setTimeout(() => {
      this.removeTyping();
      this.processState(text);
    }, 600); // Fake typing delay
  },

  processState(text) {
    switch(this.state) {
      case 'ASK_COURSE':
        const course = COURSES.find(c => text.includes(c.name) || text.includes(c.name.split(' ')[0]));
        if (course) {
          this.roundData.course = course;
          this.state = 'ASK_DATE';
          this.addBotMessage(`좋습니다! <b>${course.name}</b> 라운딩이시군요.<br>날짜는 언제인가요?`);
          
          const today = new Date();
          const t1 = new Date(today); t1.setDate(today.getDate() + 1);
          const t2 = new Date(today); t2.setDate(today.getDate() + 2);
          this.addQuickReplies(['내일', '모레', `${today.getMonth()+1}월 ${today.getDate()+3}일`]);
        } else {
          this.addBotMessage('등록되지 않은 골프장 이름입니다. 정확한 골프장 이름을 입력해주세요. (예: 남서울 CC)');
        }
        break;

      case 'ASK_DATE':
        let targetDate = new Date();
        if (text.includes('내일')) {
          targetDate.setDate(targetDate.getDate() + 1);
        } else if (text.includes('모레')) {
          targetDate.setDate(targetDate.getDate() + 2);
        } else {
          // simple fallback, assume next week
          targetDate.setDate(targetDate.getDate() + 7);
        }
        this.roundData.date = targetDate;
        this.state = 'ASK_TIME';
        this.addBotMessage(`날짜를 <b>${targetDate.getMonth()+1}월 ${targetDate.getDate()}일</b>로 설정했습니다.<br>티오프 시간은 몇 시인가요?`);
        this.addQuickReplies(['오전 7:00', '오전 8:30', '오후 1:00']);
        break;

      case 'ASK_TIME':
        const timeMatch = text.match(/(\d{1,2})[시:]\s*(\d{1,2})?/);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2] || '0', 10);
          if (text.includes('오후') && h < 12) h += 12;
          
          this.roundData.teeOff = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          this.state = 'ASK_PREP';
          this.addBotMessage(`티오프 시간은 <b>${this.roundData.teeOff}</b> 이네요.<br>외출 준비(샤워, 짐 챙기기) 시간은 얼마나 필요하신가요?`);
          this.addQuickReplies(['30분', '40분', '1시간']);
        } else {
          this.addBotMessage('시간을 정확히 입력해주세요. (예: 오전 7시 30분)');
        }
        break;

      case 'ASK_PREP':
        const prepMatch = text.match(/(\d+)분/) || (text.includes('1시간') ? [0, 60] : null);
        if (prepMatch) {
          this.roundData.prepTime = parseInt(prepMatch[1], 10);
          this.state = 'ASK_MEAL';
          this.addBotMessage(`준비 시간 <b>${this.roundData.prepTime}분</b>으로 등록했습니다.<br>라운딩 전 근처에서 식사를 하실 예정인가요?`);
          this.addQuickReplies(['네, 식사 할게요', '아니요, 식사 안해요']);
        } else {
          this.addBotMessage('시간을 "30분" 처럼 숫자로 입력해주세요.');
        }
        break;

      case 'ASK_MEAL':
        if (text.includes('네') || text.includes('할')) {
          this.roundData.hasMeal = true;
          this.roundData.mealDuration = 50;
          const rList = RESTAURANTS[this.roundData.course.id]?.before || [];
          if(rList.length > 0) {
            this.roundData.mealRestaurant = rList[0];
            this.roundData.travelToRestaurant = 30; // mock travel time from home to rest
          }
          this.addBotMessage('식사 일정을 포함하여 타임라인을 계산하겠습니다. 🍲');
        } else {
          this.roundData.hasMeal = false;
          this.addBotMessage('식사 일정 없이 바로 골프장으로 가는 일정으로 계산하겠습니다. 🚗');
        }
        
        this.state = 'COMPLETE';
        this.completeRoundRegistration();
        break;
    }
  },

  completeRoundRegistration() {
    // Add round to State
    State.addSchedule(this.roundData);
    
    // Ask to view timeline
    setTimeout(() => {
      this.addBotMessage('🎉 <b>일정 등록이 완료되었습니다!</b><br>출발부터 티오프까지 완벽한 타임라인을 확인해보세요.');
      this.addActionBtn('타임라인 보기', () => {
        State.currentScheduleIdx = State.schedules.length - 1;
        App.navigate('timeline');
      });
    }, 800);
  },

  // UI Helpers
  addUserMessage(html) {
    this.removeQuickReplies();
    const msg = document.createElement('div');
    msg.className = 'chat-msg user';
    msg.innerHTML = `
      <div class="chat-bubble">${html}</div>
      <div class="chat-time">${this.getTimeStr()}</div>
    `;
    this.bodyEl.appendChild(msg);
    this.scrollToBottom();
  },

  addBotMessage(html) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg bot';
    msg.innerHTML = `
      <div class="chat-bubble">${html}</div>
      <div class="chat-time">${this.getTimeStr()}</div>
    `;
    this.bodyEl.appendChild(msg);
    this.scrollToBottom();
  },
  
  addActionBtn(label, callback) {
    const btn = document.createElement('button');
    btn.className = 'chat-action-btn';
    btn.innerHTML = label;
    btn.onclick = callback;
    
    const wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    wrap.style.marginTop = '8px';
    wrap.appendChild(btn);
    
    this.bodyEl.appendChild(wrap);
    this.scrollToBottom();
  },

  addQuickReplies(options) {
    const container = document.createElement('div');
    container.className = 'quick-replies';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quick-reply-btn';
      btn.innerText = opt;
      btn.onclick = () => this.handleUserInput(opt);
      container.appendChild(btn);
    });
    this.bodyEl.appendChild(container);
    this.scrollToBottom();
  },
  
  removeQuickReplies() {
    const qr = this.bodyEl.querySelectorAll('.quick-replies');
    qr.forEach(q => q.remove());
  },

  showTyping() {
    const msg = document.createElement('div');
    msg.className = 'chat-msg bot typing-msg';
    msg.innerHTML = `
      <div class="chat-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    this.bodyEl.appendChild(msg);
    this.scrollToBottom();
  },

  removeTyping() {
    const el = this.bodyEl.querySelector('.typing-msg');
    if (el) el.remove();
  },

  getTimeStr() {
    const d = new Date();
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h > 12 ? '오후' : '오전'} ${h % 12 || 12}:${m}`;
  },

  scrollToBottom() {
    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
  }
};
