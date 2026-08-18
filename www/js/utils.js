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
    if(!q)return text;
    const i=text.toLowerCase().indexOf(q.toLowerCase());
    if(i!==-1)return text.slice(0,i)+'<span class="hl">'+text.slice(i,i+q.length)+'</span>'+text.slice(i+q.length);
    return text;
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

  /* ── iCalendar (.ics) Generation ── */
  generateICS(schedule) {
    const s = schedule;
    const pad = (n) => String(n).padStart(2,'0');
    const d = s.date;
    const [th,tm] = s.teeOff.split(':').map(Number);

    const dtStart = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(th)}${pad(tm)}00`;
    // 라운딩은 보통 5시간
    const endH = th + 5;
    const dtEnd = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(endH % 24)}${pad(tm)}00`;

    // 알림: 준비 시작 시간
    const tl = s.timeline;
    const [ah,am] = tl.prepStart.split(':').map(Number);
    const alarmMinutes = (th*60+tm) - (ah*60+am);

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
    const endH = th + 5;
    const endStr = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(endH % 24)}${pad(tm)}00`;
    
    const title = encodeURIComponent(`⛳ ${s.course.name} 라운딩`);
    const tl = s.timeline;
    const startPt = s.startPoint || '집';
    const details = encodeURIComponent(`티오프: ${U.fmtTimeKo(s.teeOff)}\n장소: ${s.course.addr}\n출발지: ${startPt}\n준비 시작: ${U.fmtTimeKo(tl.prepStart)}\n출발: ${U.fmtTimeKo(tl.homeDepart)}`);
    const location = encodeURIComponent(`${s.course.name}, ${s.course.addr}`);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}&sf=true&output=xml`;
  },

  saveToNativeCalendar(schedule) {
    if (!schedule) return false;
    const payload = JSON.parse(JSON.stringify(schedule));
    if (schedule.date) {
      const d = new Date(schedule.date);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        payload.date = `${y}-${m}-${day}`;
      }
    }

    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.addCalendarEvent) {
      window.webkit.messageHandlers.addCalendarEvent.postMessage(payload);
      this.toast('📅 아이폰 캘린더에 라운딩 일정이 등록되었습니다!');
      return true;
    }
    if (window.Android && window.Android.addCalendarEvent) {
      window.Android.addCalendarEvent(JSON.stringify(payload));
      this.toast('📅 안드로이드 캘린더에 라운딩 일정이 등록되었습니다!');
      return true;
    }
    return false;
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

    const isNativeApp = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.addCalendarEvent) || !!(window.Android && window.Android.addCalendarEvent);
    
    const appleBtn = isNativeApp ? `
        <button class="btn" style="margin-bottom:var(--sp-3);width:100%;background:var(--accent);border:none;color:#fff;font-weight:700;" onclick="U.saveToNativeCalendar(State.schedules[${idx}]); App.closeModal();">
          🍏 아이폰 캘린더에 바로 등록
        </button>
    ` : (showApple ? `
        <button class="btn" style="margin-bottom:var(--sp-3);width:100%;background:var(--bg-input);border:1px solid var(--border-default);color:var(--text-100);" onclick="U.downloadICSFile(${idx})">
          🍏 아이폰 캘린더 (.ics) 저장
        </button>
    ` : '');
    
    const googleBtn = showGoogle ? `
        <a href="${googleUrl}" target="_blank" class="btn" style="margin-bottom:var(--sp-3);display:flex;align-items:center;justify-content:center;width:100%;background:var(--bg-input);border:1px solid var(--border-default);color:var(--text-100);text-decoration:none;font-weight:var(--fw-bold);height:48px;border-radius:var(--r-md);" onclick="App.closeModal()">
          🤖 구글 캘린더에 등록
        </a>
    ` : '';

    const modalContent = `
      <div class="cal-sync-modal-content" style="padding:var(--sp-2) 0;">
        <div style="font-size:48px; text-align:center; margin-bottom:var(--sp-2);">🗓️</div>
        <h3 style="text-align:center; margin-bottom:var(--sp-2);">캘린더 연동</h3>
        <p style="margin-bottom:var(--sp-5);text-align:center;font-size:var(--fs-sm);color:var(--text-400);line-height:var(--lh-relaxed);">
          스마트 플랜을 캘린더에 연동하여 일정을 놓치지 마세요!
        </p>
        ${appleBtn}
        ${googleBtn}
        <button class="btn" style="margin-top:var(--sp-2); width:100%; background:transparent; border:none; color:var(--text-400);" onclick="App.closeModal()">다음에 할게요</button>
      </div>
    `;
    App.showModal('📅 캘린더 연동', modalContent);
  },

  downloadICS(schedule) {
    if (this.saveToNativeCalendar(schedule)) return;
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
    if (this.saveToNativeCalendar(schedule)) {
      return;
    }
    setTimeout(() => {
      this.showCalendarSyncModal(schedule);
    }, 500);
  },



  openNativeAlarm(idx) {
    const s = State.schedules[idx];
    if (!s || !s.timeline || !s.timeline.prepStart) return;
    
    if (window.NativeApp && window.NativeApp.setAlarm) {
      // 새로운 네이티브 알람 플러그인 호출
      const [h, m] = s.timeline.prepStart.split(':').map(Number);
      const alarmDate = new Date(s.date);
      alarmDate.setHours(h);
      alarmDate.setMinutes(m);
      alarmDate.setSeconds(0);

      if (alarmDate.getTime() > Date.now()) {
        try {
          window.NativeApp.setAlarm(alarmDate.getTime());
          U.toast('⏰ 기상 알람이 네이티브 시계로 자동 설정되었습니다!');
        } catch (e) {
          U.toast('알람 설정에 실패했습니다.');
        }
      } else {
        U.toast('이미 지난 시간입니다.');
      }
    } else {
      U.toast('현재 환경에서는 네이티브 알람을 지원하지 않습니다.');
    }
  },

  haptic() { if(navigator.vibrate) navigator.vibrate(10); }
};
