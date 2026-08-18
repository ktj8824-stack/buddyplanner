package com.myB;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.provider.Settings;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.app.NotificationManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
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

                Intent intent = new Intent(context, AlarmReceiver.class);
                
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                int reqCode = (int) (timeInMillis % Integer.MAX_VALUE);
                PendingIntent pendingIntent = PendingIntent.getBroadcast(context, reqCode, intent, flags);
                
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(timeInMillis, pendingIntent);
                        alarmManager.setAlarmClock(info, pendingIntent);
                        Log.d("NativeApp", "AlarmClock set successfully via JSInterface");
                    } else {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent);
                        } else {
                            alarmManager.setExact(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent);
                        }
                    }
                } catch (Exception e) {
                    Log.e("NativeApp", "Failed to set alarm", e);
                }
            }

            @JavascriptInterface
            public void cancelAlarm(long timeInMillis) {
                Log.d("NativeApp", "cancelAlarm called from JS: " + timeInMillis);
                Context context = MainActivity.this;
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                Intent intent = new Intent(context, AlarmReceiver.class);
                
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                int reqCode = (int) (timeInMillis % Integer.MAX_VALUE);
                PendingIntent pendingIntent = PendingIntent.getBroadcast(context, reqCode, intent, flags);
                
                try {
                    alarmManager.cancel(pendingIntent);
                    pendingIntent.cancel();
                    Log.d("NativeApp", "Alarm cancelled successfully for reqCode: " + reqCode);
                } catch (Exception e) {
                    Log.e("NativeApp", "Failed to cancel alarm", e);
                }
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

                Intent intent = new Intent(context, AlarmReceiver.class);
                intent.putExtra("timelineJson", timelineJson); // JSON 데이터 추가
                
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                int reqCode = (int) (timeInMillis % Integer.MAX_VALUE);
                PendingIntent pendingIntent = PendingIntent.getBroadcast(context, reqCode, intent, flags);
                
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(timeInMillis, pendingIntent);
                        alarmManager.setAlarmClock(info, pendingIntent);
                        Log.d("NativeApp", "AlarmClock set successfully via JSInterface (with data)");
                    } else {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent);
                        } else {
                            alarmManager.setExact(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent);
                        }
                    }
                } catch (Exception e) {
                    Log.e("NativeApp", "Failed to set alarm", e);
                }
            }

            @JavascriptInterface
            public void startTrackerTest() {
                Log.d("NativeApp", "startTrackerTest called from JS");
                Context context = MainActivity.this;
                Intent serviceIntent = new Intent(context, TrackerTestService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }

            @JavascriptInterface
            public void stopTrackerTest() {
                Log.d("NativeApp", "stopTrackerTest called from JS");
                Context context = MainActivity.this;
                Intent serviceIntent = new Intent(context, TrackerTestService.class);
                serviceIntent.setAction("STOP");
                context.startService(serviceIntent);
            }
        }, "NativeApp");
    }
}
