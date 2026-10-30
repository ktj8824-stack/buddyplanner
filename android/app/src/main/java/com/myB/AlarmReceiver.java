package com.myB;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";

    private static final String CHANNEL_ID = "buddyplanner_alarm_channel_v2";

    @Override
    public void onReceive(Context context, Intent intent) {
        // 부팅 이벤트 등 알람 예약이 아닌 브로드캐스트는 무시합니다. (재등록은 BootReceiver 담당)
        if (intent == null || intent.getAction() != null) {
            Log.w(TAG, "Ignoring non-alarm broadcast: " + (intent == null ? "null" : intent.getAction()));
            return;
        }

        // 울린 알람은 재부팅 시 재등록 대상에서 제외
        int requestCode = intent.getIntExtra("requestCode", -1);
        if (requestCode != -1) {
            AlarmScheduler.forget(context, requestCode);
        }

        Log.d(TAG, "Alarm triggered! Launching AlarmActivity via Full-Screen Intent...");
        
        android.app.NotificationManager notificationManager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                CHANNEL_ID,
                "골프 일정 알람",
                android.app.NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("버디플래너 골프 라운딩 알람입니다.");
            notificationManager.createNotificationChannel(channel);
        }

        Intent alarmIntent = new Intent(context, AlarmActivity.class);
        alarmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        int flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= android.app.PendingIntent.FLAG_IMMUTABLE;
        }
        android.app.PendingIntent fullScreenPendingIntent = android.app.PendingIntent.getActivity(context, 0, alarmIntent, flags);

        androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("버디플래너 알람")
                .setContentText("골프 일정 준비 시간입니다!")
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(fullScreenPendingIntent)
                .setAutoCancel(true);

        // 안드로이드 10+에서 화면이 켜져있을 때(앱 사용중) FullScreenIntent가 Heads-up 알림으로 강등되는 것을 방지하기 위해,
        // 앱이 포그라운드 상태일 수 있으므로 직접 startActivity를 시도합니다.
        try {
            context.startActivity(alarmIntent);
            Log.d(TAG, "Tried startActivity directly to bypass Heads-up downgrade");
        } catch (Exception e) {
            Log.e(TAG, "Direct startActivity blocked by Android background restrictions, relying on FullScreenIntent", e);
        }

        // 플로팅 팝업창 서비스 실행 — 사용자가 '다른 앱 위에 표시'를 허용한 경우에만
        boolean canOverlay = android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M
                || android.provider.Settings.canDrawOverlays(context);
        if (canOverlay) try {
            String timelineJson = intent.getStringExtra("timelineJson");
            Intent floatingIntent = new Intent(context, FloatingTrackerService.class);
            if (timelineJson != null) {
                floatingIntent.putExtra("timelineJson", timelineJson);
            }
            context.startService(floatingIntent);
            Log.d(TAG, "Started FloatingTrackerService");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start FloatingTrackerService", e);
        }

        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, builder.build());
    }
}
