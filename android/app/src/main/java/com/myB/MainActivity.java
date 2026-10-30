package com.myB;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
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

        // Request "Draw over other apps" permission to allow alarm pop-up on home screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, 0);
            }
        }
        
        // Request Notification permission for Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
        
        // Add direct Javascript Interface to bypass missing Capacitor JS Core
        bridge.getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void setAlarm(long timeInMillis) {
                Log.d("NativeApp", "setAlarm called from JS: " + timeInMillis);
                Context context = MainActivity.this;
                
                // 안드로이드 14(API 34) 이상: Full-Screen Intent 권한 체크
                if (Build.VERSION.SDK_INT >= 34) { // Build.VERSION_CODES.UPSIDE_DOWN_CAKE
                    NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (notificationManager != null && !notificationManager.canUseFullScreenIntent()) {
                        Log.d("NativeApp", "Requesting Full Screen Intent permission");
                        Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                        intent.setData(Uri.parse("package:" + context.getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        return; // 권한이 없으면 설정창으로 보내고 알람 설정은 취소
                    }
                }

                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                
                // 안드로이드 12(API 31) 이상: Exact Alarm 권한 체크
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                        Log.d("NativeApp", "Requesting Exact Alarm permission");
                        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                        intent.setData(Uri.parse("package:" + context.getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        return; // 권한이 없으면 설정창으로 보내고 알람 설정은 취소
                    }
                }

                // 예약 + 재부팅 대비 기록을 AlarmScheduler에서 함께 처리
                AlarmScheduler.schedule(context, AlarmScheduler.requestCodeFor(timeInMillis), timeInMillis, null);
            }

            @JavascriptInterface
            public void cancelAlarm(long timeInMillis) {
                Log.d("NativeApp", "cancelAlarm called from JS: " + timeInMillis);
                Context context = MainActivity.this;
                AlarmScheduler.cancel(context, AlarmScheduler.requestCodeFor(timeInMillis));
            }

            @JavascriptInterface
            public void setAlarmWithData(long timeInMillis, String timelineJson) {
                Log.d("NativeApp", "setAlarmWithData called: " + timeInMillis);
                Context context = MainActivity.this;
                
                if (Build.VERSION.SDK_INT >= 34) {
                    NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (notificationManager != null && !notificationManager.canUseFullScreenIntent()) {
                        Log.d("NativeApp", "Requesting Full Screen Intent permission");
                        Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                        intent.setData(Uri.parse("package:" + context.getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        return;
                    }
                }

                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                        Log.d("NativeApp", "Requesting Exact Alarm permission");
                        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                        intent.setData(Uri.parse("package:" + context.getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        return;
                    }
                }

                // 예약 + 재부팅 대비 기록을 AlarmScheduler에서 함께 처리
                AlarmScheduler.schedule(context, AlarmScheduler.requestCodeFor(timeInMillis), timeInMillis, timelineJson);
            }


        }, "NativeApp");
    }
}
