package com.myB;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

public class TrackerTestService extends Service {

    private static final String CHANNEL_ID = "tracker_channel_v2";
    private static final int NOTIFICATION_ID = 2002;
    private NotificationManager notificationManager;
    private Handler handler;
    private Runnable runnable;
    private int step = 0;

    private String[] states = {
            "준비중: 짐을 챙기고 있습니다",
            "이동중: 목적지로 향하고 있습니다 🚗",
            "식사중: 든든하게 식사 중입니다 🍽️",
            "도착: 클럽하우스에 도착했습니다 ⛳"
    };

    private int[] progresses = { 10, 40, 70, 100 };

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        // 포그라운드 서비스 시작 시 첫 알림 띄우기 (API 34+ 대응)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, buildNotification(0), 1073741824 /* FOREGROUND_SERVICE_TYPE_SPECIAL_USE */);
        } else {
            startForeground(NOTIFICATION_ID, buildNotification(0));
        }

        // 10초마다 상태 업데이트 루프
        handler = new Handler(Looper.getMainLooper());
        runnable = new Runnable() {
            @Override
            public void run() {
                step++;
                if (step >= states.length) {
                    stopSelf(); // 모두 완료되면 종료
                    return;
                }
                notificationManager.notify(NOTIFICATION_ID, buildNotification(step));
                handler.postDelayed(this, 10000); // 10초
            }
        };
        handler.postDelayed(runnable, 10000);

        return START_NOT_STICKY;
    }

    private Notification buildNotification(int currentStep) {
        RemoteViews customView = new RemoteViews(getPackageName(), R.layout.notification_tracker);
        
        customView.setTextViewText(R.id.tracker_title, "타임라인 진행상황");
        customView.setTextViewText(R.id.tracker_status, states[currentStep]);
        customView.setProgressBar(R.id.tracker_progress, 100, progresses[currentStep], false);

        // 앱 클릭 시 메인으로 이동
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
                .setCustomContentView(customView)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // 잠금화면에 무조건 표시
                .setPriority(NotificationCompat.PRIORITY_DEFAULT) // 기본 중요도 (잠금화면 노출 위해 필요)
                .setSilent(true); 

        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "타임라인 트래커",
                    NotificationManager.IMPORTANCE_DEFAULT // 잠금화면 노출을 위해 기본 중요도로 격상
            );
            channel.setDescription("진행 상황 실시간 추적");
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
