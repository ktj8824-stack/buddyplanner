package com.myB;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import java.util.Map;

/**
 * 알람 예약/취소/재등록을 한곳에서 처리합니다.
 *
 * AlarmManager에 등록한 알람은 기기를 재부팅하면 모두 사라지기 때문에,
 * 예약한 알람을 SharedPreferences에 기록해 두었다가 부팅 후 BootReceiver가
 * 아직 지나지 않은 알람만 다시 등록합니다.
 */
public final class AlarmScheduler {

    private static final String TAG = "AlarmScheduler";
    private static final String PREFS = "buddyplanner_alarms";
    // 저장 형식: key = requestCode, value = "시각(ms)\n타임라인JSON(없으면 빈 문자열)"
    private static final String SEP = "\n";

    private AlarmScheduler() {}

    /** 시각(ms)으로부터 기존 코드와 동일한 방식으로 requestCode를 만듭니다. */
    public static int requestCodeFor(long timeInMillis) {
        return (int) (timeInMillis % Integer.MAX_VALUE);
    }

    /** 알람을 예약하고 재부팅 대비용으로 기록합니다. 성공하면 true. */
    public static boolean schedule(Context context, int requestCode, long timeInMillis, String timelineJson) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return false;

        PendingIntent pendingIntent = buildPendingIntent(context, requestCode, timeInMillis, timelineJson);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(timeInMillis, pendingIntent);
                alarmManager.setAlarmClock(info, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent);
            }
        } catch (Exception e) {
            // Android 12+에서 정확한 알람 권한이 없으면 SecurityException이 발생할 수 있습니다.
            Log.e(TAG, "Failed to schedule alarm " + requestCode, e);
            return false;
        }

        String json = timelineJson == null ? "" : timelineJson;
        prefs(context).edit().putString(String.valueOf(requestCode), timeInMillis + SEP + json).apply();
        Log.d(TAG, "Scheduled alarm " + requestCode + " at " + timeInMillis);
        return true;
    }

    /** 알람을 취소하고 기록에서도 지웁니다. */
    public static void cancel(Context context, int requestCode) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pendingIntent = buildPendingIntent(context, requestCode, 0, null);
        try {
            if (alarmManager != null) alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        } catch (Exception e) {
            Log.e(TAG, "Failed to cancel alarm " + requestCode, e);
        }
        forget(context, requestCode);
        Log.d(TAG, "Cancelled alarm " + requestCode);
    }

    /** 알람이 울린 뒤 기록에서 지웁니다. */
    public static void forget(Context context, int requestCode) {
        prefs(context).edit().remove(String.valueOf(requestCode)).apply();
    }

    /**
     * 부팅/앱 업데이트 후 호출됩니다. 아직 지나지 않은 알람만 다시 등록하고,
     * 기기가 꺼져 있는 동안 지나간 알람은 울리지 않고 기록에서 지웁니다.
     */
    public static void rescheduleAll(Context context) {
        SharedPreferences prefs = prefs(context);
        long now = System.currentTimeMillis();
        int restored = 0;

        for (Map.Entry<String, ?> entry : prefs.getAll().entrySet()) {
            int requestCode;
            long timeInMillis;
            String json = null;
            try {
                requestCode = Integer.parseInt(entry.getKey());
                String value = String.valueOf(entry.getValue());
                int idx = value.indexOf(SEP);
                timeInMillis = Long.parseLong(idx >= 0 ? value.substring(0, idx) : value);
                if (idx >= 0 && idx + 1 < value.length()) json = value.substring(idx + 1);
            } catch (Exception e) {
                prefs.edit().remove(entry.getKey()).apply();
                continue;
            }

            if (timeInMillis <= now) {
                forget(context, requestCode);
            } else if (schedule(context, requestCode, timeInMillis, json)) {
                restored++;
            }
        }
        Log.d(TAG, "Rescheduled " + restored + " alarm(s) after boot/update");
    }

    private static PendingIntent buildPendingIntent(Context context, int requestCode, long timeInMillis, String timelineJson) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("requestCode", requestCode);
        if (timelineJson != null) intent.putExtra("timelineJson", timelineJson);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, flags);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
