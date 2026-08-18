import UIKit
import Capacitor
import UserNotifications
import ActivityKit
import EventKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        UNUserNotificationCenter.current().delegate = self
        
        // 앱이 켜지자마자 강제로 알림 권한을 요청합니다 (브릿지 문제 우회)
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            print("강제 권한 요청 결과: granted=\(granted), error=\(String(describing: error))")
        }
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    private let alarmHandler = NativeAlarmScriptHandler()
    private let calendarHandler = CalendarScriptHandler()

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
                
                webView.configuration.userContentController.removeScriptMessageHandler(forName: "addCalendarEvent")
                webView.configuration.userContentController.add(self.calendarHandler, name: "addCalendarEvent")
                print("✅ nativeAlarm & addCalendarEvent WKScriptMessageHandler 연결 완료!")
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // iOS 14 이상에서는 banner 지원, 이전 버전은 alert
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return true
    }

}

@objc(NativeAlarmPlugin)
public class NativeAlarmPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeAlarmPlugin"
    public let jsName = "NativeAlarm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise)
    ]
    
    @objc func schedule(_ call: CAPPluginCall) {
        let title = call.options["title"] as? String ?? "버디플래너 알림"
        let body = call.options["body"] as? String ?? "예약하신 일정이 시작됩니다."
        
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        // 커스텀 알람 사운드 지정 (Xcode Bundle 내의 alarm.wav)
        content.sound = UNNotificationSound(named: UNNotificationSoundName("alarm.wav"))
        
        // isoDate 문자열 받기 (예: "2026-08-14T07:30:00.000Z")
        guard let isoDateStr = call.options["scheduleAt"] as? String else {
            call.resolve(["success": false, "error": "scheduleAt 값이 없습니다."])
            return
        }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        // 밀리초 없는 포맷을 위한 폴백(Fallback) 처리
        var dateOpt = formatter.date(from: isoDateStr)
        if dateOpt == nil {
            let fallbackFormatter = ISO8601DateFormatter()
            fallbackFormatter.formatOptions = [.withInternetDateTime]
            dateOpt = fallbackFormatter.date(from: isoDateStr)
        }
        
        guard let date = dateOpt else {
            call.resolve(["success": false, "error": "잘못된 날짜 형식입니다: \(isoDateStr)"])
            return
        }
        
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
        
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                call.resolve(["success": false, "error": error.localizedDescription])
            } else {
                call.resolve(["success": true, "message": "알림이 지정된 시각에 등록되었습니다."])
            }
        }
    }
}

class NativeAlarmScriptHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "nativeAlarm", let bodyDict = message.body as? [String: Any] else { return }
        
        let action = bodyDict["action"] as? String ?? "start"
        
        if action == "clearAll" {
            UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
            print("🧹 모든 예약된 알람 완전 초기화 완료")
            return
        }
        
        if action == "cancel" {
            if let id = bodyDict["id"] as? String {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
                print("✅ 알람 취소 완료: \(id)")
            }
            return
        }
        
        let id = bodyDict["id"] as? String ?? UUID().uuidString
        let title = bodyDict["title"] as? String ?? "버디플래너 알림"
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
        
        guard let date = dateOpt else {
            print("❌ 잘못된 날짜 형식: \(isoDateStr)")
            return
        }
        
        let timeInterval = date.timeIntervalSinceNow
        print("⏱️ 남은 시간(초): \(timeInterval)")
        
        // 사운드 파일 존재 여부 안전 검사
        if let soundUrl = Bundle.main.url(forResource: "alarm", withExtension: "wav") {
            print("🔊 alarm.wav 파일 확인 완료: \(soundUrl.lastPathComponent)")
            content.sound = UNNotificationSound(named: UNNotificationSoundName("alarm.wav"))
        } else {
            print("⚠️ alarm.wav 파일이 메인 번들에 없어 기본 알림음으로 대체합니다.")
            content.sound = UNNotificationSound.default
        }
        
        let trigger: UNNotificationTrigger
        if timeInterval > 0.5 {
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: timeInterval, repeats: false)
        } else {
            // 시간이 이미 지났거나 너무 임박한 경우 1초 뒤 강제 실행 (실패 방지)
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1.0, repeats: false)
        }
        
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ WKScriptMessageHandler 알람 등록 실패: \(error)")
            } else {
                print("✅ WKScriptMessageHandler 알람 등록 성공! ID: \(id), (남은 초: \(max(timeInterval, 1.0))초 뒤 실행)")
            }
        }
    }
}

class CalendarScriptHandler: NSObject, WKScriptMessageHandler {
    private let eventStore = EKEventStore()
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "addCalendarEvent" else { return }
        
        var jsonDict: [String: Any]? = nil
        if let dict = message.body as? [String: Any] {
            jsonDict = dict
        } else if let jsonStr = message.body as? String,
                  let data = jsonStr.data(using: .utf8),
                  let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            jsonDict = dict
        }
        
        guard let s = jsonDict else {
            print("❌ Calendar add failed: invalid schedule payload")
            return
        }
        
        let courseDict = s["course"] as? [String: Any]
        let courseName = courseDict?["name"] as? String ?? "골프장"
        let courseAddr = courseDict?["addr"] as? String ?? ""
        let teeOff = s["teeOff"] as? String ?? "09:00"
        var dateStr = s["date"] as? String ?? ""
        
        if dateStr.isEmpty, let dateObj = s["date"] as? [String: Any] {
            print("dateDict: \(dateObj)")
        }
        
        let timelineDict = s["timeline"] as? [String: Any]
        let prepStart = timelineDict?["prepStart"] as? String ?? ""
        let homeDepart = timelineDict?["homeDepart"] as? String ?? ""
        
        let requestPermission: (@escaping (Bool, Error?) -> Void) -> Void = { completion in
            if #available(iOS 17.0, *) {
                self.eventStore.requestFullAccessToEvents(completion: completion)
            } else {
                self.eventStore.requestAccess(to: .event, completion: completion)
            }
        }
        
        requestPermission { granted, error in
            guard granted, error == nil else {
                print("❌ 캘린더 접근 권한 거부됨: \(String(describing: error))")
                return
            }
            
            DispatchQueue.main.async {
                let event = EKEvent(eventStore: self.eventStore)
                event.title = "⛳ \(courseName) 라운딩"
                
                let dateParts = dateStr.prefix(10).components(separatedBy: "-")
                let teeParts = teeOff.components(separatedBy: ":")
                
                var components = DateComponents()
                if dateParts.count >= 3, let y = Int(dateParts[0]), let m = Int(dateParts[1]), let d = Int(dateParts[2]) {
                    components.year = y
                    components.month = m
                    components.day = d
                } else {
                    let now = Date()
                    let cal = Calendar.current
                    components.year = cal.component(.year, from: now)
                    components.month = cal.component(.month, from: now)
                    components.day = cal.component(.day, from: now)
                }
                
                if teeParts.count >= 2 {
                    components.hour = Int(teeParts[0])
                    components.minute = Int(teeParts[1])
                }
                
                let calendar = Calendar.current
                if let startDate = calendar.date(from: components) {
                    event.startDate = startDate
                    event.endDate = startDate.addingTimeInterval(5 * 3600)
                } else {
                    event.startDate = Date()
                    event.endDate = Date().addingTimeInterval(5 * 3600)
                }
                
                event.location = "\(courseName), \(courseAddr)"
                
                var notes = "⛳ 버디플래너 라운딩 일정\n- 티오프: \(teeOff)\n- 장소: \(courseName) (\(courseAddr))"
                if !prepStart.isEmpty {
                    notes += "\n- 준비 시작: \(prepStart)"
                }
                if !homeDepart.isEmpty {
                    notes += "\n- 집 출발: \(homeDepart)"
                }
                event.notes = notes
                
                if !prepStart.isEmpty {
                    let prepParts = prepStart.components(separatedBy: ":")
                    if prepParts.count >= 2, let prepH = Int(prepParts[0]), let prepM = Int(prepParts[1]),
                       let teeH = Int(teeParts.first ?? "0"), let teeM = Int(teeParts.last ?? "0") {
                        let teeMinutes = teeH * 60 + teeM
                        let prepMinutes = prepH * 60 + prepM
                        let offsetMinutes = teeMinutes - prepMinutes
                        if offsetMinutes > 0 {
                            let alarm = EKAlarm(relativeOffset: TimeInterval(-offsetMinutes * 60))
                            event.addAlarm(alarm)
                        }
                    }
                }
                
                event.calendar = self.eventStore.defaultCalendarForNewEvents
                
                do {
                    try self.eventStore.save(event, span: .thisEvent)
                    print("✅ 아이폰 기본 캘린더에 성공적으로 일정이 등록되었습니다: \(event.title ?? "")")
                } catch let e {
                    print("❌ 캘린더 이벤트 저장 실패: \(e.localizedDescription)")
                }
            }
        }
    }
}
