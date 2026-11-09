/* =========================================
   BuddyPlanner — 아이폰 앱 알람 연결 (마이플래너 방식)
   안드로이드 앱은 MainActivity의 window.NativeApp(자바)으로 알람을 예약합니다.
   아이폰 앱에는 그게 없어서, 같은 이름의 NativeApp을 만들어
   아이폰 기본 알림(@capacitor/local-notifications)으로 예약합니다.

   - 예약은 '저장된 일정 전체'를 기준으로 한 번에 다시 맞춤 (앱을 열 때, 돌아올 때, 일정이 바뀔 때)
     → 지운 일정·바뀐 시각의 알림이 남지 않음
   - 알림 번호는 일정·종류마다 따로 (같은 분에 걸린 안내 알림이 알람 음악을 덮어쓰지 않게)
   - 알람(준비 시작·출발)은 30초 알람 음악 + 1분·2분 뒤 한 번씩 더 울림
   - 아이폰은 앱당 예약 알림 64개까지 → 가까운 것부터 60개
   - 앱을 켜 둔 채 알람 시간이 되면 앱 안 알람 화면, 알림을 누르면 그 일정 타임라인
   → timeline.js 등 기존 코드는 그대로 동작 (안드로이드·웹에는 영향 없음)
   ========================================= */
(function () {
  const C = window.Capacitor;
  if (!C || typeof C.getPlatform !== 'function' || C.getPlatform() !== 'ios') return;
  if (window.NativeApp) return;

  const plugin = () => (C.Plugins && C.Plugins.LocalNotifications)
    || (typeof C.registerPlugin === 'function' ? C.registerPlugin('LocalNotifications') : null);

  // 30초 이하 알람 음악. AppDelegate가 Library/Sounds로 복사해 둠. 없으면 기본 알림음.
  const ALARM_SOUND = 'buddy_alarm.caf';
  const IOS_MAX = 60;          // 예약 알림 최대 개수 (아이폰 한도 64)
  const REPEAT = [1, 2];       // 알람은 1분·2분 뒤 다시 울림
  const LOG = (...a) => console.log('[iOS 알람]', ...a);
  // State·Timeline·App·U는 const로 선언된 전역이라 window.에 붙지 않음 → 이름으로 직접 찾기
  // 알람 화면에서 '확인했어요'·'5분 뒤 다시'를 누르거나 알림을 눌러 연 시각.
  // 이 시각보다 먼저 울린 알람의 1·2분 뒤 다시 울림은 다시 맞출 때 넣지 않음 (확인한 알람이 또 울리지 않게)
  const ACK_KEY = 'bp_ios_ack_at';
  const SNOOZE_KEY = 'bp_ios_snooze';   // '5분 뒤 다시' 예약 (앱을 닫거나 잠가도 울리게 폰 알림으로)
  const ackAt = () => { try { return Number(localStorage.getItem(ACK_KEY)) || 0; } catch (e) { return 0; } };
  const snoozes = () => { try { const a = JSON.parse(localStorage.getItem(SNOOZE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const g = (name) => { try { return (0, eval)(`typeof ${name} !== 'undefined' ? ${name} : null`); } catch (e) { return null; } };

  /** 문자열 → 32비트 양의 정수 (일정·종류마다 고유한 알림 번호) */
  const idOf = (key) => {
    let h = 0;
    const s = String(key);
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return (Math.abs(h) % 2000000000) + 1;
  };

  let permission = null;   // 권한은 처음 한 번만 물어봄
  async function ensurePermission(LN) {
    if (permission) return permission;
    permission = (async () => {
      try {
        let st = await LN.checkPermissions();
        if (st.display !== 'granted') st = await LN.requestPermissions();
        LOG('알림 권한', st.display);
        return st.display === 'granted';
      } catch (e) { console.warn('[iOS 알람] 권한 확인 실패', e); return false; }
    })();
    return permission;
  }

  /** 저장된 일정 전체에서 예약할 알림 목록 만들기 */
  function buildList() {
    const out = [];
    const now = Date.now();
    const S = g('State'), T = g('Timeline'), UU = g('U');
    if (!S || !T || !Array.isArray(S.schedules)) return out;
    const acked = ackAt();
    snoozes().forEach(z => { if (z && z.t > now) out.push({ key: `snooze:${z.t}`, t: z.t, title: z.title || '⏰ 다시 알림', body: z.body || '5분이 지났어요.', alarm: true, aid: z.aid || '' }); });
    S.schedules.forEach((s, idx) => {
      if (!s || !s.date || s.alarmOff) return;
      if (!s.timeline) { try { S.calculateTimeline(idx); } catch (e) { return; } }
      const tl = s.timeline || {};
      const aid = S.aidOf ? S.aidOf(s) : String(idx);
      const name = (s.course && s.course.name) || '라운딩';
      const tee = UU && UU.fmtTimeKo ? UU.fmtTimeKo(s.teeOff || tl.teeOff) : (s.teeOff || '');
      const kinds = [
        ['prep', tl.prepStart, '⏰ 준비 시작 시간이에요', `${name} ${tee} 티오프 · ${tl.homeDepart || ''} 출발`],
        ['depart', tl.homeDepart, '🚗 출발할 시간이에요', `${name} ${tee} 티오프까지 늦지 않게 출발하세요`],
        ['rest', tl.restDepart, '🍽️ 식당에서 출발할 시간이에요', `${name} ${tee} 티오프`]
      ];
      kinds.forEach(([kind, hm, title, body]) => {
        if (!hm) return;
        const at = S.tlAt ? S.tlAt(s, hm) : null;
        if (!at) return;
        const t = at.getTime();
        if (t > now) out.push({ key: `${aid}:${kind}`, t, title, body, alarm: true, aid });
        if (t <= acked) return;   // 이미 확인한 알람 → 다시 울림 없음
        REPEAT.forEach(m => {
          const tr = t + m * 60000;
          if (tr > now) out.push({ key: `${aid}:${kind}:r${m}`, t: tr, title, body: `${m}분 지났어요. ${body}`, alarm: true, repeat: true, aid });
        });
      });
    });
    // 전날 밤 안내·스코어 안내: timeline.js의 기존 규칙을 그대로 쓰고 결과만 받아 옴
    capture = [];
    try { T.scheduleReminders(); } catch (e) {}
    const rem = capture; capture = null;
    rem.forEach(r => { if (r.t > now) out.push({ key: `rem:${r.t}:${r.title}`, t: r.t, title: r.title, body: r.body, alarm: false }); });
    return out.sort((a, b) => a.t - b.t).slice(0, IOS_MAX);
  }

  let capture = null;     // scheduleReminders()가 부르는 setReminder를 모으는 동안만 배열
  let timer = null, running = false, again = false;

  /** 예약된 알림을 모두 지우고 일정 전체 기준으로 다시 예약 */
  async function sync() {
    if (running) { again = true; return; }
    running = true;
    try {
      const LN = plugin();
      if (!LN) return;
      const list = buildList();
      if (list.length && !(await ensurePermission(LN))) return;
      try {
        const pending = await LN.getPending();
        const ids = (pending && pending.notifications || []).map(n => ({ id: n.id }));
        if (ids.length) await LN.cancel({ notifications: ids });
      } catch (e) { console.warn('[iOS 알람] 이전 예약 정리 실패', e); }
      if (list.length) {
        await LN.schedule({
          notifications: list.map(a => ({
            id: idOf(a.key),
            title: a.title,
            body: a.body,
            schedule: { at: new Date(a.t), allowWhileIdle: true },
            ...(a.alarm ? { sound: ALARM_SOUND } : {}),
            extra: { aid: a.aid || '', alarm: !!a.alarm, repeat: !!a.repeat, key: a.key }
          }))
        });
      }
      const first = list[0];
      LOG(`예약 ${list.length}개 (알람 ${list.filter(a => a.alarm).length}개)`, first ? `가장 가까운 것: ${new Date(first.t).toLocaleString()}` : '');
    } catch (e) {
      console.warn('[iOS 알람] 예약 실패', e);
    } finally {
      running = false;
      if (again) { again = false; schedule(); }
    }
  }
  function schedule(delay = 700) {
    clearTimeout(timer);
    timer = setTimeout(sync, delay);
  }

  /** 한 알람의 남은 '다시 울림'을 취소 (알림을 눌렀거나 앱 안에서 껐을 때) */
  function cancelRepeats(key) {
    const LN = plugin();
    if (!LN || !key) return;
    const base = String(key).replace(/:r\d+$/, '');
    LN.cancel({ notifications: REPEAT.map(m => ({ id: idOf(`${base}:r${m}`) })) }).catch(() => { });
  }

  function openSchedule(aid) {
    const S = g('State'), A = g('App');
    if (!S || !aid) return;
    const idx = (S.schedules || []).findIndex(s => s && s.aid === aid);
    if (idx >= 0 && A && A.viewTimeline) A.viewTimeline(idx);
  }

  /** 알람을 확인함 → 지금까지 울린 알람의 다시 울림을 모두 빼고 다시 맞춤 */
  function ack() {
    try { localStorage.setItem(ACK_KEY, String(Date.now())); } catch (e) { }
    schedule(0);
  }

  let lastRing = 0;
  function listen() {
    const LN = plugin();
    if (!LN || !LN.addListener) return;
    try {
      // 앱을 켜 둔 채 알람 시간이 됨 → 앱 안 알람 화면 (앱 안 타이머가 이미 울렸으면 건너뜀)
      LN.addListener('localNotificationReceived', (n) => {
        const ex = (n && n.extra) || {};
        if (!ex.alarm) return;
        const T = g('Timeline');
        const now = Date.now();
        if (ex.repeat && now - lastRing < 4 * 60000) return;      // 이미 본 알람의 다시 울림
        if (T && T._lastRingAt && now - T._lastRingAt < 90000) { lastRing = now; return; }
        lastRing = now;
        try { if (T && T.playAlarmSound) T.playAlarmSound(n.body || '', n.title || '⏰ 타임라인 알람'); } catch (e) { }
        cancelRepeats(ex.key);
      });
      // 알림을 누름 → 다시 울림 취소 + 그 일정 타임라인
      LN.addListener('localNotificationActionPerformed', (ev) => {
        const ex = (ev && ev.notification && ev.notification.extra) || {};
        if (ex.alarm) { ack(); cancelRepeats(ex.key); }
        setTimeout(() => openSchedule(ex.aid), 600);
      });
    } catch (e) { console.warn('[iOS 알람] 알림 연결 실패', e); }
  }

  window.NativeApp = {
    isIOS: true,
    // 아래 호출들은 모두 '일정 전체 다시 맞추기'로 처리 (개별 예약·취소 대신)
    setAlarm() { schedule(); },
    setAlarmWithData() { schedule(); },
    setReminder(t, title, body) {
      if (capture) { capture.push({ t: Number(t), title: String(title || ''), body: String(body || '') }); return; }
      schedule();
    },
    cancelAlarm() { if (!capture) schedule(); },
    resyncAlarms() { schedule(0); },
    // 알람 화면에서 확인·다시 알림을 누름
    ackAlarm() { ack(); },
    // '5분 뒤 다시': 앱 안 타이머만으로는 화면을 잠그면 안 울림 → 폰 알림으로도 예약
    snoozeAlarm(atMs, title, body, aid) {
      const now = Date.now();
      const list = snoozes().filter(z => z && z.t > now);
      list.push({ t: Number(atMs), title: String(title || ''), body: String(body || ''), aid: String(aid || '') });
      try { localStorage.setItem(SNOOZE_KEY, JSON.stringify(list.slice(-5))); } catch (e) { }
      ack();
    },
    // 아이폰에는 '다른 앱 위에 표시' 기능이 없음 → 안내 팝업을 띄우지 않게 true
    canDrawOverlays() { return true; },
    openOverlaySettings() { }
  };

  listen();
  // 앱을 열 때 · 다시 돌아올 때 전체 다시 맞추기
  window.addEventListener('load', () => schedule(2500));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(1500); });
})();
