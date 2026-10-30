package com.myB;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.provider.Settings;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.app.NotificationManager;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Custom WebViewClient for handling Kakao / external intent schemes
        bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (handleCustomScheme(url, view)) return true;
                return super.shouldOverrideUrlLoading(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (handleCustomScheme(url, view)) return true;
                return super.shouldOverrideUrlLoading(view, url);
            }

            private boolean handleCustomScheme(String url, WebView view) {
                if (url != null && (url.startsWith("kakaolink://") || url.startsWith("kakaotalk://") || url.startsWith("intent:") || url.startsWith("kakaomap://"))) {
                    try {
                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                        if (intent != null) {
                            if (getPackageManager().resolveActivity(intent, 0) != null) {
                                startActivity(intent);
                                return true;
                            }
                            String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                            if (fallbackUrl != null) {
                                view.loadUrl(fallbackUrl);
                                return true;
                            }
                            if (intent.getPackage() != null) {
                                Intent marketIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + intent.getPackage()));
                                if (getPackageManager().resolveActivity(marketIntent, 0) != null) {
                                    startActivity(marketIntent);
                                    return true;
                                }
                            }
                        }
                    } catch (Exception e) {
                        Log.e("NativeApp", "Failed to handle custom intent scheme: " + url, e);
                    }
                }
                return false;
            }
        });

        // 권한은 앱 시작 시 한꺼번에 묻지 않고, 알람을 설정하는 등 필요한 순간에만 요청합니다.
        bridge.getWebView().addJavascriptInterface(new NativeBridge(), "NativeApp");
    }

    private static final String PREFS = "buddyplanner_permissions";
    private static final int REQ_NOTIFICATIONS = 101;

    /** JS(window.NativeApp)에서 호출하는 네이티브 기능 */
    private class NativeBridge {
        @JavascriptInterface
        public void setAlarm(long timeInMillis) {
            scheduleFromJs(timeInMillis, null);
        }

        @JavascriptInterface
        public void setAlarmWithData(long timeInMillis, String timelineJson) {
            scheduleFromJs(timeInMillis, timelineJson);
        }

        @JavascriptInterface
        public void cancelAlarm(long timeInMillis) {
            Log.d("NativeApp", "cancelAlarm called from JS: " + timeInMillis);
            AlarmScheduler.cancel(MainActivity.this, AlarmScheduler.requestCodeFor(timeInMillis));
        }

        /** 출발 알림 팝업(다른 앱 위에 표시) 권한이 있는지 */
        @JavascriptInterface
        public boolean canDrawOverlays() {
            return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(MainActivity.this);
        }

        /** 사용자가 팝업 기능을 켜기로 했을 때만 설정 화면을 엽니다 */
        @JavascriptInterface
        public void openOverlaySettings() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } catch (Exception e) {
                    Log.e("NativeApp", "Failed to open overlay settings", e);
                }
            });
        }
    }

    /**
     * JS에서 알람 예약 요청이 오면 필요한 권한을 안내하되, 권한이 없어도 알람 자체는 예약합니다.
     * (예전에는 권한이 없으면 설정 화면만 열고 알람을 예약하지 않았음)
     */
    private void scheduleFromJs(long timeInMillis, String timelineJson) {
        Log.d("NativeApp", "schedule from JS: " + timeInMillis);
        runOnUiThread(this::requestAlarmPermissionsOnce);
        AlarmScheduler.schedule(this, AlarmScheduler.requestCodeFor(timeInMillis), timeInMillis, timelineJson);
    }

    /** 알림·정확한 알람·전체화면 알림 권한을 각각 최초 1회만 안내 */
    private void requestAlarmPermissionsOnce() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        // Android 13+: 알림 표시 권한 (시스템 팝업)
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                && !prefs.getBoolean("asked_notifications", false)) {
            prefs.edit().putBoolean("asked_notifications", true).apply();
            requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
            return; // 다른 안내는 다음 기회에 (설정 화면이 겹치지 않게)
        }

        // Android 12+: 정확한 알람 (없으면 몇 분 오차가 있는 일반 알람으로 대체 예약됨)
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager != null
                && !alarmManager.canScheduleExactAlarms()
                && !prefs.getBoolean("asked_exact_alarm", false)) {
            prefs.edit().putBoolean("asked_exact_alarm", true).apply();
            openSettings(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            return;
        }

        // Android 14+: 잠금 화면 전체화면 알람 (없으면 일반 알림으로 표시됨)
        if (Build.VERSION.SDK_INT >= 34) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && !nm.canUseFullScreenIntent() && !prefs.getBoolean("asked_full_screen", false)) {
                prefs.edit().putBoolean("asked_full_screen", true).apply();
                openSettings(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
            }
        }
    }

    private void openSettings(String action) {
        try {
            Intent intent = new Intent(action);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } catch (Exception e) {
            Log.e("NativeApp", "Failed to open settings: " + action, e);
        }
    }
}
