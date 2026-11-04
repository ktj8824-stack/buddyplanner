/* =========================================
   BuddyPlanner — 아이폰 앱 알람 연결
   안드로이드 앱은 MainActivity의 window.NativeApp(자바)으로 알람을 예약합니다.
   아이폰 앱에는 그게 없어서, 같은 이름의 NativeApp을 만들어
   아이폰 기본 알림(@capacitor/local-notifications)으로 예약합니다.
   → timeline.js 등 기존 코드는 그대로 동작 (안드로이드·웹에는 영향 없음)
   ========================================= */
(function () {
  const C = window.Capacitor;
  if (!C || typeof C.getPlatform !== 'function' || C.getPlatform() !== 'ios') return;
  if (window.NativeApp) return;

  const plugin = () => (C.Plugins && C.Plugins.LocalNotifications)
    || (typeof C.registerPlugin === 'function' ? C.registerPlugin('LocalNotifications') : null);

  // 알림 번호: 분 단위 시각 (예약·취소에 같은 값을 써야 함, 32비트 정수 안)
  const idOf = (t) => Math.floor(Number(t) / 60000) % 2147483647;

  let permission = null;   // 권한은 처음 예약할 때 한 번만 물어봄
  async function ensurePermission(LN) {
    if (permission) return permission;
    permission = (async () => {
      try {
        let st = await LN.checkPermissions();
        if (st.display !== 'granted') st = await LN.requestPermissions();
        return st.display === 'granted';
      } catch (e) { console.warn('[iOS 알림] 권한 확인 실패', e); return false; }
    })();
    return permission;
  }

  // 알람(준비 시작·출발)은 30초 알람 음악으로 울림.
  // 파일은 ios/App/App/buddy_alarm.caf (30초 이하, Xcode 앱 대상에 포함). 없으면 기본 알림음.
  const ALARM_SOUND = 'buddy_alarm.caf';

  async function schedule(t, title, body, sound) {
    const LN = plugin();
    if (!LN || !(Number(t) > Date.now())) return;
    if (!(await ensurePermission(LN))) return;
    try {
      await LN.schedule({
        notifications: [{
          id: idOf(t),
          title: String(title || 'BuddyPlanner'),
          body: String(body || ''),
          schedule: { at: new Date(Number(t)), allowWhileIdle: true },
          ...(sound ? { sound } : {})
        }]
      });
    } catch (e) { console.warn('[iOS 알림] 예약 실패', e); }
  }

  /** setAlarmWithData의 타임라인 목록에서 이 시각에 해당하는 항목 찾기 */
  function pick(t, json) {
    try {
      const d = new Date(Number(t));
      const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const list = JSON.parse(json || '[]');
      return list.find(x => x && x.time === hm) || null;
    } catch (e) { return null; }
  }

  window.NativeApp = {
    isIOS: true,
    setAlarm(t) { schedule(t, '⏰ BuddyPlanner', '타임라인 알람 시간이에요.', ALARM_SOUND); },
    setAlarmWithData(t, json) {
      const ev = pick(t, json);
      schedule(t, ev ? `${ev.emoji || '⏰'} ${ev.title} 시간이에요` : '⏰ BuddyPlanner', ev ? ev.subtitle : '타임라인 알람 시간이에요.', ALARM_SOUND);
    },
    setReminder(t, title, body) { schedule(t, title, body); },
    cancelAlarm(t) {
      const LN = plugin();
      if (!LN) return;
      LN.cancel({ notifications: [{ id: idOf(t) }] }).catch(() => { });
    },
    // 아이폰에는 '다른 앱 위에 표시' 기능이 없음 → 안내 팝업을 띄우지 않게 true
    canDrawOverlays() { return true; },
    openOverlaySettings() { }
  };
})();
