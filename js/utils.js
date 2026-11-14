/* =========================================
   BuddyPlanner v2 — Utilities
   ========================================= */

const U = {
  /* ── Korean Chosung Search ── */
  CHO: ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'],

  getCho(str) {
    let r='';
    for(let i=0;i<str.length;i++){
      const c=str.charCodeAt(i);
      if(c>=0xAC00&&c<=0xD7A3) r+=this.CHO[Math.floor((c-0xAC00)/588)];
      else r+=str[i];
    }
    return r;
  },
  isCho(c){ return this.CHO.includes(c); },

  matchCho(text,q) {
    if(!q)return false;
    if(text.toLowerCase().includes(q.toLowerCase()))return true;
    const allCho=[...q].every(c=>this.isCho(c));
    if(allCho)return this.getCho(text).includes(q);
    return this.getCho(text).includes(this.getCho(q));
  },

  hlMatch(text,q) {
    // 검색 결과 이름은 외부 서버에서 오므로 글자 그대로 보이게 바꾼 뒤 강조만 붙임
    text=String(text==null?'':text);
    if(!q)return U.esc(text);
    const i=text.toLowerCase().indexOf(String(q).toLowerCase());
    if(i!==-1)return U.esc(text.slice(0,i))+'<span class="hl">'+U.esc(text.slice(i,i+q.length))+'</span>'+U.esc(text.slice(i+q.length));
    return U.esc(text);
  },

  /* ── Date / Time ── */
  DAYS: ['일','월','화','수','목','금','토'],

  fmtDate(d){ return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${this.DAYS[d.getDay()]})`; },
  fmtDateShort(d){ return `${d.getMonth()+1}월 ${d.getDate()}일 (${this.DAYS[d.getDay()]})`; },

  dday(target) {
    const t=new Date();t.setHours(0,0,0,0);
    const tg=new Date(target);tg.setHours(0,0,0,0);
    const diff=Math.ceil((tg-t)/(864e5));
    if(diff===0)return 'D-Day';
    return diff>0?`D-${diff}`:`D+${Math.abs(diff)}`;
  },

  isHoliday(y, m, d) {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const fixedHolidays = ['01-01', '03-01', '05-05', '06-06', '08-15', '10-03', '10-09', '12-25'];
    if (fixedHolidays.includes(`${mm}-${dd}`)) return true;

    const lunarHolidays = [
      '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-02', '2026-05-24', '2026-05-25', '2026-09-24', '2026-09-25', '2026-09-26',
      '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-05-13', '2027-06-07', '2027-08-16', '2027-09-14', '2027-09-15', '2027-09-16', '2027-09-17', '2027-10-04'
    ];
    if (lunarHolidays.includes(`${y}-${mm}-${dd}`)) return true;

    return false;
  },

  fmtTimeKo(s) {
    if (!s || typeof s !== 'string' || !s.includes(':')) return s || '';
    const parts = s.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return s;
    const [h,m] = parts;
    const p = h < 12 ? '오전' : '오후';
    const dh = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `${p} ${String(dh).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  },

  /* ── DOM ── */
  $(sel,p=document){return p.querySelector(sel);},
  $$(sel,p=document){return p.querySelectorAll(sel);},
  /** 사용자 입력·외부 데이터를 HTML에 넣기 전 이스케이프 */
  /** 받침에 맞춰 조사 고르기: U.josa('식당','을/를') → '식당을' */
  josa(word, pair){
    const w=String(word==null?'':word); const [a,b]=pair.split('/');
    const ch=w.trim().replace(/[)\]\s.]+$/,'').slice(-1); const code=ch.charCodeAt(0)-0xAC00;
    let jong;
    if(code>=0&&code<=11171) jong=code%28;
    else if(/[0-9]/.test(ch)) jong=[21,8,0,16,0,0,1,8,8,0][+ch];          // 영 일 이 삼 사 오 육 칠 팔 구
    else if(/[a-z]/i.test(ch)) jong=/[lr]/i.test(ch)?8:(/[mn]/i.test(ch)?4:0); // CC→씨, L→엘, M→엠
    else return w+(pair==='으로/로'?'(으)로':a+'('+b+')');
    if(pair==='으로/로') return w+((jong===0||jong===8)?'로':'으로');   // ㄹ받침도 '로'
    return w+(jong?a:b);
  },
  /** 이름 같은 글자를 onclick 안 JS 문자열로 안전하게 넣기 (작은따옴표가 있어도 깨지지 않게) */
  jsq(v){return U.esc(JSON.stringify(String(v==null?'':v)));},
  esc(v){return String(v==null?'':v).replace(/[&<>"'`]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));},
  el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e;},

  /* ── Toast ── */
  toast(msg,dur=2500) {
    const old=document.querySelector('.toast');if(old)old.remove();
    const t=this.el('div','toast',msg);document.body.appendChild(t);
    requestAnimationFrame(()=>t.classList.add('show'));
    setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400);},dur);
  },

  /* ── Stagger Animate ── */
  stagger(container,sel,delay=80) {
    const items=container.querySelectorAll(sel);
    items.forEach((item,i)=>{
      item.style.opacity='0';item.style.transform='translateY(14px)';
      item.style.transition=`all 0.4s cubic-bezier(0.22,1,0.36,1) ${i*delay}ms`;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{item.style.opacity='1';item.style.transform='translateY(0)';}));
    });
  },

  /** 캘린더 종료 시각: 타임라인의 라운딩 종료(roundEnd)가 있으면 그 시각, 없으면 9홀 2.5시간·18홀 5시간. 자정을 넘기면 다음 날 */
  _roundEndStr(s, d, th, tm) {
    const pad = (n) => String(n).padStart(2,'0');
    const startMin = th * 60 + tm;
    let len = String(s.roundLength || '18') === '9' ? 150 : 300;
    const re = s.timeline && (s.timeline.roundEnd || s.timeline.roundFinish);
    if (re && /^\d{1,2}:\d{2}$/.test(re)) { const [eh, em] = re.split(':').map(Number); let m = eh * 60 + em - startMin; if (m <= 0) m += 1440; if (m > 0 && m < 720) len = m; }
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, startMin + len);
    return `${end.getFullYear()}${pad(end.getMonth()+1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
  },

  /* ── iCalendar (.ics) Generation ── */
  generateICS(schedule) {
    const s = schedule;
    const pad = (n) => String(n).padStart(2,'0');
    const d = s.date;
    const [th,tm] = s.teeOff.split(':').map(Number);

    const dtStart = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(th)}${pad(tm)}00`;
    const dtEnd = this._roundEndStr(s, d, th, tm);

    // 알림: 준비 시작 시간
    const tl = s.timeline;
    const [ah,am] = tl.prepStart.split(':').map(Number);
    let alarmMinutes = (th*60+tm) - (ah*60+am);
    if (alarmMinutes < 0) alarmMinutes += 1440; // 준비 시작이 전날 밤

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BuddyPlanner//KO',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `DTSTART;TZID=Asia/Seoul:${dtStart}`,
      `DTEND;TZID=Asia/Seoul:${dtEnd}`,
      `SUMMARY:⛳ ${s.course.name} 라운딩`,
      `DESCRIPTION:티오프: ${U.fmtTimeKo(s.teeOff)}\\n장소: ${s.course.addr}\\n${tl.hasMeal ? '식사: '+tl.restaurantName+'\\n' : ''}준비 시작: ${U.fmtTimeKo(tl.prepStart)}\\n출발: ${U.fmtTimeKo(tl.homeDepart)}`,
      `LOCATION:${s.course.name}\\, ${s.course.addr}`,
      `GEO:${s.course.lat};${s.course.lng}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT' + alarmMinutes + 'M',
      'ACTION:DISPLAY',
      `DESCRIPTION:⏰ 라운딩 준비를 시작하세요! (${s.course.name})`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    return ics;
  },

  generateGoogleCalendarLink(s) {
    const pad = (n) => String(n).padStart(2,'0');
    const d = s.date;
    const [th,tm] = s.teeOff.split(':').map(Number);
    const startStr = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(th)}${pad(tm)}00`;
    const endStr = this._roundEndStr(s, d, th, tm);
    
    const title = encodeURIComponent(`⛳ ${s.course.name} 라운딩`);
    const tl = s.timeline;
    const startPt = s.startPoint || '집';
    const details = encodeURIComponent(`티오프: ${U.fmtTimeKo(s.teeOff)}\n장소: ${s.course.addr}\n출발지: ${startPt}\n준비 시작: ${U.fmtTimeKo(tl.prepStart)}\n출발: ${U.fmtTimeKo(tl.homeDepart)}`);
    const location = encodeURIComponent(`${s.course.name}, ${s.course.addr}`);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}&sf=true&output=xml`;
  },

  showCalendarSyncModal(schedule) {
    const googleUrl = this.generateGoogleCalendarLink(schedule);
    const idx = State.schedules.indexOf(schedule);
    
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /ipad|iphone|ipod/.test(ua) && !window.MSStream;
    const isAndroid = /android/.test(ua);
    
    let showApple = true;
    let showGoogle = true;
    
    if (isIOS) showGoogle = false;
    if (isAndroid) showApple = false;
    
    const appleBtn = showApple ? `
        <button class="btn" style="margin-bottom:var(--sp-3);width:100%;background:var(--bg-input);border:1px solid var(--border-default);color:var(--text-100);" onclick="U.downloadICSFile(${idx})">
          ${U.ico('cal', 18)} 아이폰 캘린더 연동
        </button>
    ` : '';
    
    const googleBtn = showGoogle ? `
        <a href="${googleUrl}" target="_blank" class="btn" style="margin-bottom:var(--sp-3);display:flex;align-items:center;justify-content:center;width:100%;background:var(--bg-input);border:1px solid var(--border-default);color:var(--text-100);text-decoration:none;font-weight:var(--fw-bold);height:48px;border-radius:var(--r-md);" onclick="App.closeModal()">
          ${U.ico('cal', 18)} 안드로이드 캘린더 연동
        </a>
    ` : '';

    const modalContent = `
      <div class="cal-sync-modal-content" style="padding:var(--sp-2) 0;">
        <div class="u-ico-big">${U.ico('cal', 34)}</div>
        <h3 style="text-align:center; margin-bottom:var(--sp-2);">일정 및 알람 연동</h3>
        <p style="margin-bottom:var(--sp-5);text-align:center;font-size:var(--fs-sm);color:var(--text-400);line-height:var(--lh-relaxed);">
          스마트 플랜을 캘린더와 알람에 연동하여 일정을 놓치지 마세요!
        </p>
        <button class="btn btn-primary" style="margin-bottom:var(--sp-3);width:100%;background:var(--accent);color:#fff;border:none;" onclick="App.closeModal(); setTimeout(()=>U.openNativeAlarm(${idx}), 100)">
          ${U.ico('clock', 18)} 기상 알람 자동 설정
        </button>
        ${appleBtn}
        ${googleBtn}
        <button class="btn" style="margin-top:var(--sp-2); width:100%; background:transparent; border:none; color:var(--text-400);" onclick="App.closeModal()">다음에 할게요</button>
      </div>
    `;
    App.showModal('알람 및 캘린더 연동', modalContent);
  },

  downloadICS(schedule) {
    this.showCalendarSyncModal(schedule);
  },

  downloadICSFile(idx) {
    const schedule = State.schedules[idx];
    if (!schedule) return;
    
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('kakaotalk')) {
      alert('카카오톡에서는 캘린더 저장이 제한됩니다. 사파리(기본 브라우저)로 자동 전환합니다.');
      window.location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(window.location.href);
      return;
    }
    if (ua.includes('naver') || ua.includes('instagram')) {
      alert('현재 앱에서는 캘린더 저장이 제한됩니다. 브라우저 메뉴에서 Safari로 열기를 선택해주세요.');
      return;
    }

    const ics = this.generateICS(schedule);
    const blob = new Blob([ics], { type:'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buddyplanner_${schedule.course.name.replace(/\s/g,'_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.closeModal();
    this.toast('✅ 캘린더 파일이 다운로드되었습니다. 다운로드 항목에서 열어주세요!');
  },

  autoSyncCalendar(schedule, idx) {
    // 1. 정식 앱(Native App) 환경: 네이티브 캘린더에 백그라운드로 자동 등록
    if (window.Android && window.Android.addCalendarEvent) {
      window.Android.addCalendarEvent(JSON.stringify(schedule));
      this.toast('📅 앱 기본 캘린더에 자동 연동되었습니다.');
      return;
    }
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.addCalendarEvent) {
      window.webkit.messageHandlers.addCalendarEvent.postMessage(JSON.stringify(schedule));
      this.toast('📅 앱 기본 캘린더에 자동 연동되었습니다.');
      return;
    }

    // 타임라인 화면 진입 직후 캘린더 동기화 모달을 자동으로 띄워줍니다.
    setTimeout(() => {
      this.showCalendarSyncModal(schedule);
    }, 500);
  },



  openNativeAlarm(idx) {
    const s = State.schedules[idx];
    if (!s || !s.timeline || !s.timeline.prepStart) return;
    
    const [h, m] = s.timeline.prepStart.split(':').map(Number);
    const msg = encodeURIComponent(`BuddyPlanner 기상 (${s.course.name})`);
    
    const isAndroid = /Android/.test(navigator.userAgent);
    // 아이폰 앱: 시계 앱에 알람을 넣을 수 없음 → 앱이 폰 알림으로 단계마다 예약해 둠
    const C = window.Capacitor;
    if (!isAndroid && C && C.getPlatform && C.getPlatform() === 'ios') {
      if (s.alarmOff && typeof Timeline !== 'undefined' && Timeline.alarmOn) { Timeline.schedIdx = idx; try { Timeline.alarmOn(); } catch (e) { } }
      try { if (window.NativeApp && NativeApp.resyncAlarms) NativeApp.resyncAlarms(); } catch (e) { }
      this.toast(`⏰ ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} 준비 시작부터 단계마다 알림으로 깨워 드릴게요.`, 3500);
      return;
    }

    if (isAndroid) {
      // Android Intent for Clock App
      const intentUrl = `intent://#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${h};i.android.intent.extra.alarm.MINUTES=${m};S.android.intent.extra.alarm.MESSAGE=${msg};B.android.intent.extra.alarm.SKIP_UI=false;end`;
      window.location.href = intentUrl;
    } else {
      // iOS / Desktop Fallback
      const modalContent = `
        <div style="padding:var(--sp-2) 0; text-align:center;">
          <div style="font-size:48px; font-weight:800; color:var(--accent); margin-bottom:var(--sp-2);">
            ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}
          </div>
          <p style="color:var(--text-400); line-height:1.5; margin-bottom:var(--sp-4); font-size:15px;">
            아이폰(애플) 정책상 웹 브라우저에서 알람을 자동으로 설정할 수 없습니다.<br><br>
            <strong>번거로우시겠지만 위 시간에 맞춰 직접 알람을 설정해 주세요!</strong><br><br>
            <span style="font-size:13px; color:var(--text-500);">※ 향후 앱스토어에 정식 앱이 출시되면 100% 자동 알람 연동이 지원됩니다.</span>
          </p>
          <button class="btn btn-primary" style="width:100%" onclick="App.closeModal()">확인했습니다</button>
        </div>
      `;
      App.showModal('⏰ 기상 알람 수동 설정 안내', modalContent);
    }
  },

  haptic() { if(navigator.vibrate) navigator.vibrate(10); },

  /** 아이폰·안드로이드 앱 안인지 (카카오 '웹용' 공유는 앱 주소(capacitor://localhost)에서 막혀 무반응) */
  /** 카카오톡 공유 (SDK v1 은 Kakao.Link, v2 는 Kakao.Share) — 보냈으면 true */
  /** 화면용 선 아이콘 (이모지 대신 — 앱 전체가 같은 모양으로 보이게). U.ico('pin') / U.ico('gift', 36) */
  _ICO: {
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10" r="2.3"/>',
    flag: '<path d="M5.5 21V4M5.5 4.5h12l-2.2 4 2.2 4h-12"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M5 4.5 2.8 6.6M19 4.5l2.2 2.1"/>',
    clip: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3.6A1.1 1.1 0 0 1 10.1 2.5h3.8A1.1 1.1 0 0 1 15 3.6v.9M8.5 10.5h7M8.5 14.5h7"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    signal: '<path d="M2.5 9.5a14 14 0 0 1 19 0M5.8 13a9.2 9.2 0 0 1 12.4 0M9 16.4a4.5 4.5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1"/>',
    gift: '<rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v7.5h14V13M12 9v11.5M12 9S9 3.5 7 5.3 9 9 12 9Zm0 0s3-5.5 5-3.7S15 9 12 9Z"/>',
    spark: '<path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7ZM19 16.5l.8 2 2 .7-2 .7-.8 2-.8-2-2-.7 2-.7Z"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    office: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M10.5 20.5V17h3v3.5"/>',
    bulb: '<path d="M9 18h6M10 21h4M8.2 14.5A6 6 0 1 1 15.8 14.5c-.8.7-1.3 1.5-1.3 2.5h-5c0-1-.5-1.8-1.3-2.5Z"/>',
    camera: '<path d="M4 8.5h3l1.5-2.5h7L17 8.5h3a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z"/><circle cx="12" cy="14" r="3.5"/>',
    cloud: '<path d="M7 18.5a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9.6a4.5 4.5 0 0 1 0 8.9Z"/>',
    meal: '<path d="M7 3v8M4.5 3v4.5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 3c-2 1.5-3 4-3 7h3v11"/>',
    car: '<path d="M5 12 6.9 7.3A2 2 0 0 1 8.8 6h6.4a2 2 0 0 1 1.9 1.3L19 12"/><rect x="3.5" y="12" width="17" height="5" rx="1.5"/><path d="M6.5 17v2M17.5 17v2"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5h.01M13 8h.01M14.5 11.5h.01M11 12.5h.01"/>',
    golfer: '<circle cx="14" cy="5" r="2"/><path d="M14 8.5 10.5 12l2.5 3v5.5M10.5 12 7 20.5M14 8.5l3.5 3M6 4l4.5 8"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  },
  ico(name, size) {
    const d = this._ICO[name]; if (!d) return '';
    const z = size || 16;
    return `<svg class="u-ico" viewBox="0 0 24 24" width="${z}" height="${z}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  },

  /** 앱(안드로이드·아이폰)에서 카카오톡 공유 카드 보내기. 카카오 JS 형식(objectType: feed)을 받아 SDK 형식으로 바꿔 넘김.
   *  성공하면 true, 플러그인이 없는 옛 앱·카톡 미설치·오류면 false (→ 휴대폰 공유 창으로 대신) */
  async kakaoNativeShare(feed) {
    const C = window.Capacitor;
    if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return false;
    // 아이폰 앱: 카카오 공유 기능이 앱 안에 없음 → buddyplanner.kr 중계 페이지를 사파리로 열어 카드로 보냄
    //   (그냥 두면 긴 링크 주소가 그대로 찍힌 글로 가 버림)
    if (C.getPlatform && C.getPlatform() === 'ios' && feed && feed.content) {
      try {
        const b = btoa(unescape(encodeURIComponent(JSON.stringify(feed)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        window.location.href = 'https://buddyplanner.kr/kshare.html#' + b;
        return true;
      } catch (e) { console.warn('[KakaoShare] 아이폰 중계 실패', e); return false; }
    }
    C.Plugins = C.Plugins || {};
    const P = C.Plugins.KakaoShare || (typeof C.registerPlugin === 'function' ? (C.Plugins.KakaoShare = C.registerPlugin('KakaoShare')) : null);
    if (!P || !feed || !feed.content) return false;
    const lk = (l) => { l = l || {}; const o = {}; if (l.webUrl) o.web_url = l.webUrl; if (l.mobileWebUrl) o.mobile_web_url = l.mobileWebUrl; return o; };
    const c = feed.content;
    const t = {
      object_type: 'feed',
      content: { title: c.title || '', description: c.description || '', image_url: c.imageUrl || '', image_width: 1200, image_height: 630, link: lk(c.link) },
      buttons: (feed.buttons || []).slice(0, 2).map(b => ({ title: b.title, link: lk(b.link) }))
    };
    try {
      await P.shareFeed({ template: JSON.stringify(t) });
      return true;
    } catch (e) {
      console.warn('[KakaoShare] 앱 공유 실패 → 휴대폰 공유 창', e);
      return false;
    }
  },

  kakaoSend(opts) {
    if (typeof Kakao === 'undefined') return false;
    if (!Kakao.isInitialized() && typeof Login !== 'undefined' && Login.KAKAO_JS_KEY) Kakao.init(Login.KAKAO_JS_KEY);
    const api = Kakao.Share || Kakao.Link;
    if (!api || !api.sendDefault) return false;
    // 그림 크기를 안 알려 주면 카톡이 정사각형으로 잘라서 보여 줌 (캐릭터·글자가 잘림) → 공유 그림 크기(1200×630)를 같이 보냄
    const c = opts && opts.content;
    if (c && c.imageUrl && !c.imageWidth) { c.imageWidth = 1200; c.imageHeight = 630; }
    api.sendDefault(opts);
    return true;
  },
  isNativeApp() { try { return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); } catch (e) { return false; } },
  /** 앱에서 카톡으로 보내기: 휴대폰 공유 창(카카오톡 고르기) → 안 되면 내용 복사 후 카카오톡 열기 */
  async shareOut({ title = '', text = '', url = '' } = {}) {
    const full = url && text.indexOf(url) < 0 ? `${text}\n${url}` : text;
    try {
      const Share = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share;
      if (Share) { await Share.share({ title, text: full }); return true; }
      if (navigator.share) { await navigator.share({ title, text: full }); return true; }
    } catch (e) { if (e && (e.name === 'AbortError' || /cancel/i.test(e.message || ''))) return true; }
    try { await navigator.clipboard.writeText(full); }
    catch (e) { prompt('아래 내용을 복사해 카톡방에 붙여 넣어 주세요', full); return false; }
    U.toast('내용을 복사했어요. 카카오톡 단톡방에 붙여 넣어 주세요', 3200);
    if (this.isNativeApp()) setTimeout(() => { location.href = 'kakaotalk://'; }, 900);
    return true;
  },
};
