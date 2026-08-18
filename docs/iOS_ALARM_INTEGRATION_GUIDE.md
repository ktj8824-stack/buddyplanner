# 📘 iOS 네이티브 커스텀 알람 연동 마스터 가이드 (보관 및 추후 업데이트용)

> **문서 목적:** 추후 메인 백업 폴더나 신규 프로젝트 업데이트 시, 100% 성공 검증된 아이폰 커스텀 알람 시스템을 복사/붙여넣기하여 단 5분 만에 재구축할 수 있도록 정리한 보관용 가이드 문서입니다.

---

## 1. 🎵 소리 파일 규격 및 Xcode 설정 (`alarm.wav`)

1. **파일 배치 위치:** Xcode 프로젝트의 `App/App/` 폴더 내부.
2. **필수 Target 설정:** Xcode 오른쪽 패널 `Target Membership`에서 **`App` 체크박스(✅)**가 반드시 켜져 있어야 함.
3. **가장 중요한 파일 길이 규격:**
   - **재생 시간:** **무조건 30.00초 미만 (추천: 22초 ~ 28초 연속음)**
   - ⚠️ **주의:** 30초가 0.1초라도 넘어가면 애플 iOS가 규격 위반으로 판단하여 소리를 강제로 **무소음(0)** 처리함.
4. **파일 교체 시 캐시 비우기:** 
   - 동일한 이름(`alarm.wav`)으로 파일을 교체했을 때는 폰에서 앱을 **완전히 삭제 후 재설치**하거나, Xcode에서 **`Clean Build Folder` (`Shift + Cmd + K`)**를 눌러 캐시를 비워야 함.

---

## 2. 🔌 iOS 네이티브 코드 (`AppDelegate.swift`)

Capacitor의 불안정한 플러그인 레이어를 우회하고, 애플 순수 `WKScriptMessageHandler` 직통 통신선과 `UNTimeIntervalNotificationTrigger`를 적용합니다.

### ① ScriptMessageHandler 및 알람 스케줄러 등록
`AppDelegate.swift` 하단에 아래 클래스 복사/붙여넣기:

```swift
import UIKit
import Capacitor
import UserNotifications
import WebKit

class NativeAlarmScriptHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "nativeAlarm", let bodyDict = message.body as? [String: Any] else { return }
        
        let title = bodyDict["title"] as? String ?? "버디플래너"
        let body = bodyDict["body"] as? String ?? "골프 일정 준비 시간입니다!"
        let isoDateStr = bodyDict["scheduleAt"] as? String ?? ""
        
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var dateOpt = formatter.date(from: isoDateStr)
        if dateOpt == nil {
            let fallbackFormatter = ISO8601DateFormatter()
            fallbackFormatter.formatOptions = [.withInternetDateTime]
            dateOpt = fallbackFormatter.date(from: isoDateStr)
        }
        
        guard let date = dateOpt else { return }
        
        // 현재 시각 대비 남은 초 계산 (과거 시각 판정으로 인한 배너 삭제 방지)
        let timeInterval = date.timeIntervalSinceNow
        
        // 사운드 파일 안전 검사
        if let soundUrl = Bundle.main.url(forResource: "alarm", withExtension: "wav") {
            content.sound = UNNotificationSound(named: UNNotificationSoundName("alarm.wav"))
        } else {
            content.sound = UNNotificationSound.default
        }
        
        let trigger: UNNotificationTrigger
        if timeInterval > 0.5 {
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: timeInterval, repeats: false)
        } else {
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1.0, repeats: false)
        }
        
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ 알람 등록 실패: \(error)")
            } else {
                print("✅ 알람 등록 성공! (\(max(timeInterval, 1.0))초 뒤 실행)")
            }
        }
    }
}
```

### ② `AppDelegate` 클래스 내부 연결
```swift
    let alarmHandler = NativeAlarmScriptHandler()

    func applicationDidBecomeActive(_ application: UIApplication) {
        setupScriptHandler()
    }
    
    private func setupScriptHandler() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard let self = self else { return }
            if let bridgeVC = self.window?.rootViewController as? CAPBridgeViewController,
               let webView = bridgeVC.webView {
                webView.configuration.userContentController.removeScriptMessageHandler(forName: "nativeAlarm")
                webView.configuration.userContentController.add(self.alarmHandler, name: "nativeAlarm")
            }
        }
    }
```

---

## 3. 🌐 웹 자바스크립트 연동 (`app.js` & `timeline.js`)

### ① `app.js` 네이티브 알람 발사 함수
```javascript
window.NativeApp = {
    setAlarmWithData: async (timeInMillis, timelineJson, body) => {
        const scheduleAt = new Date(timeInMillis);
        const payload = {
            title: '버디플래너',
            body: body || '골프 일정 준비 시간입니다!',
            scheduleAt: scheduleAt.toISOString()
        };
        
        // 애플 순수 직통 브릿지로 발사
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeAlarm) {
            window.webkit.messageHandlers.nativeAlarm.postMessage(payload);
        }
    }
};
```

### ② `timeline.js` 정시 + 1분 뒤 2차 연달아 알람 발사
```javascript
if (ev.isPrep && window.NativeApp) {
    // 1차 정시 알람
    window.NativeApp.setAlarmWithData(targetTime, timelineJson, '🎒 준비 시작 - 보스턴백과 준비물을 챙겨주세요!');
    
    // 2차 리마인더 알람 (+1분 뒤)
    const secondAlarmTime = targetTime + 60000;
    window.NativeApp.setAlarmWithData(secondAlarmTime, timelineJson, '⏰ [2차 알림] 1분이 지났습니다! 잊지 말고 지금 준비를 시작해 주세요!');
}
```

---

## 4. 📱 아이폰 시스템 알림 설정 가이드 (지속 배너)

유저가 알림 배너를 끄지 않고 계속 켜두게 하려면:
- 아이폰 `설정` -> `BuddyPlanner` -> `알림` -> **`배너 스타일` -> `지속`** 선택!

---

## ⚡ 빌드 시 필수 실행 명령
웹 코드(`www/`) 수정 후 반드시 Shell에서 실행:
```bash
npx cap copy ios
```
