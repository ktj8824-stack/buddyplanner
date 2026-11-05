#!/bin/bash
# =====================================================================
# BuddyPlanner 아이폰 앱 준비 (맥 터미널에서 실행)
#   bash ~/Documents/버디플래너_아이폰_준비.sh
# 하는 일: 최신 코드 받기 → 설정 파일 넣기 → 패키지 설치 → 웹 빌드 →
#          아이폰 프로젝트 만들기/갱신 → 알람 음악·안전한 알림창·카카오·광고 설정 → 엑스코드 열기
# 여러 번 실행해도 안전합니다 (두 번째부터는 갱신만 함).
# =====================================================================
set -e
APP_DIR="$HOME/Documents/buddyplanner-app"
CONFIG="$HOME/Documents/buddyplanner-config.js"
BUNDLE_ID="com.buddyplanner.ktj8824"
TEAM_ID="WKR837G6CH"
ADMOB_IOS_APP_ID="ca-app-pub-3940256099942544~1458002511"   # 애드몹 테스트용 (출시 전에 실제 iOS 앱 ID로 교체)

step() { echo; echo "▶ $1"; }

step "1/7 최신 코드 받기"
if [ -d "$APP_DIR/.git" ]; then
  # 지난번 빌드로 바뀐 파일(www/ 등)은 되돌린 뒤 받기 (빌드하면 다시 만들어짐. js/config.js·ios/는 그대로)
  rm -f "$APP_DIR/.git/index.lock"
  git -C "$APP_DIR" checkout -- .
  git -C "$APP_DIR" pull --ff-only
else
  git clone https://github.com/ktj8824-stack/buddyplanner.git "$APP_DIR"
fi
cd "$APP_DIR"

step "2/7 설정 파일(js/config.js) 넣기"
if [ ! -f "$CONFIG" ]; then echo "❌ $CONFIG 파일이 없어요. Claude에게 다시 만들어 달라고 하세요."; exit 1; fi
cp "$CONFIG" js/config.js
# 테스트 빌드는 반드시 테스트 광고 (실제 광고를 누르면 애드몹 정책 위반). 스토어 출시 빌드 때만 false로
sed -i '' "s/ADS_TEST_MODE: *false/ADS_TEST_MODE: true/" js/config.js

step "3/7 패키지 설치 (처음엔 몇 분 걸려요)"
npm install --no-audit --no-fund

step "4/7 웹 화면 빌드 + 알람 음악 넣기"
node build.js
cp native-assets/ios/buddy_alarm.caf www/buddy_alarm.caf

step "5/7 아이폰 프로젝트 만들기/갱신"
if [ ! -d ios ]; then npx cap add ios; fi
npx cap sync ios

step "6/7 아이폰 설정 (앱 ID·팀·알림창·카카오·광고)"
cp native-assets/ios/AppDelegate.swift ios/App/App/AppDelegate.swift
cp native-assets/ios/SceneDelegate.swift ios/App/App/SceneDelegate.swift
cp native-assets/ios/BuddyPlanner-AppIcon.png ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png   # 앱 아이콘 (1024x1024)
PB=ios/App/App.xcodeproj/project.pbxproj
sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = [^;]*;/PRODUCT_BUNDLE_IDENTIFIER = $BUNDLE_ID;/g" "$PB"
if ! grep -q "DEVELOPMENT_TEAM = $TEAM_ID" "$PB"; then
  sed -i '' "s/\(PRODUCT_BUNDLE_IDENTIFIER = $BUNDLE_ID;\)/\1\\
				DEVELOPMENT_TEAM = $TEAM_ID;/g" "$PB"
fi
PL=ios/App/App/Info.plist
PB_="/usr/libexec/PlistBuddy"
KAKAO_KEY=$(node -e "global.window={};eval(require('fs').readFileSync('js/config.js','utf8'));process.stdout.write((window.APP_CONFIG||{}).KAKAO_NATIVE_APP_KEY||'')")
$PB_ -c "Delete :GADApplicationIdentifier" "$PL" 2>/dev/null || true
$PB_ -c "Add :GADApplicationIdentifier string $ADMOB_IOS_APP_ID" "$PL"
$PB_ -c "Delete :LSApplicationQueriesSchemes" "$PL" 2>/dev/null || true
$PB_ -c "Add :LSApplicationQueriesSchemes array" "$PL"
for s in kakaokompassauth kakaolink kakaotalk tmap kakaomap; do $PB_ -c "Add :LSApplicationQueriesSchemes: string $s" "$PL"; done
if [ -n "$KAKAO_KEY" ]; then
  $PB_ -c "Delete :CFBundleURLTypes" "$PL" 2>/dev/null || true
  $PB_ -c "Add :CFBundleURLTypes array" "$PL"
  $PB_ -c "Add :CFBundleURLTypes:0 dict" "$PL"
  $PB_ -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PL"
  $PB_ -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes: string kakao$KAKAO_KEY" "$PL"
fi
$PB_ -c "Delete :NSUserTrackingUsageDescription" "$PL" 2>/dev/null || true
$PB_ -c "Add :NSUserTrackingUsageDescription string 맞춤 광고를 위해 사용돼요. 허용하지 않아도 앱은 그대로 쓸 수 있어요." "$PL"
$PB_ -c "Delete :NSPhotoLibraryUsageDescription" "$PL" 2>/dev/null || true
$PB_ -c "Add :NSPhotoLibraryUsageDescription string 스코어카드 사진을 기록에 붙이거나 AI 비서에게 보내려면 사진 접근이 필요해요." "$PL"
$PB_ -c "Delete :NSCameraUsageDescription" "$PL" 2>/dev/null || true
$PB_ -c "Add :NSCameraUsageDescription string 스코어카드를 바로 찍어 기록하려면 카메라가 필요해요." "$PL"

step "7/7 엑스코드 열기"
open ios/App/App.xcodeproj
echo
echo "✅ 준비 끝! 엑스코드에서 위쪽 기기 목록에서 내 아이폰을 고르고 ▶(실행)을 누르세요."
