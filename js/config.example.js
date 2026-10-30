/* =========================================
   BuddyPlanner — API 키 설정 (예시)

   1. 이 파일을 같은 폴더에 config.js 이름으로 복사하세요.
   2. 아래 값을 실제 키로 채우세요.
   3. config.js는 .gitignore에 등록되어 깃허브에 올라가지 않습니다.

   ※ 앱 안에 들어가는 키는 APK에서 추출될 수 있으므로,
     각 콘솔에서 반드시 사용처(패키지명/도메인) 제한을 걸어 두세요.
   ========================================= */
window.APP_CONFIG = {
  KAKAO_JS_KEY: '',          // 카카오 JavaScript 키 (웹 로그인, 공유)
  KAKAO_NATIVE_APP_KEY: '',  // 카카오 네이티브 앱 키 (안드로이드 로그인, strings.xml과 동일)
  TMAP_APP_KEY: '',          // SK open API Tmap 앱키 (경로, 장소 검색)
  REVENUECAT_ANDROID_KEY: '', // RevenueCat 공개 SDK 키 (goog_로 시작, 구독 결제)
  GOOGLE_WEB_CLIENT_ID: '',   // 구글 클라우드 '웹 애플리케이션' OAuth 클라이언트 ID (비우면 구글 로그인 버튼 숨김)
  SUPABASE_URL: '',           // Supabase 프로젝트 URL (예: https://abcd1234.supabase.co) — 비우면 기기에만 저장
  SUPABASE_ANON_KEY: '',      // Supabase 공개 키 (Project Settings > API의 anon/publishable 키)

  // ── 빌드 모드 (출시 빌드에서는 둘 다 false) ──
  ADS_TEST_MODE: true,  // true: 테스트 광고 / false: 실제 광고(수익 발생)
  ADMIN_MODE: false     // true: 마이 화면에 마켓 관리자 메뉴 표시
};
