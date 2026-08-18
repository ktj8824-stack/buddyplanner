package com.myB;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAlarm")
public class NativeAlarmPlugin extends Plugin {

    private static final String TAG = "NativeAlarmPlugin";

    @PluginMethod
    public void setAlarm(PluginCall call) {
        Double timeDouble = call.getDouble("time"); // timestamp in ms
        if (timeDouble == null) {
            call.reject("Must provide 'time' in milliseconds");
            return;
        }

        long timeInMillis = timeDouble.longValue();
        int requestCode = call.getInt("id", 1); // allow multiple alarms using ID

        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        Intent intent = new Intent(context, AlarmReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags);

        try {
            setExactAlarm(alarmManager, timeInMillis, pendingIntent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to schedule alarm", e);
        }
    }

    private void setExactAlarm(AlarmManager alarmManager, long timeInMillis, PendingIntent pendingIntent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(timeInMillis, pendingIntent);
            alarmManager.setAlarmClock(info, pendingIntent);
            Log.d(TAG, "AlarmClock set for: " + timeInMillis);
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent);
            }
        }
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        Integer requestCode = call.getInt("id");
        if (requestCode == null) {
            call.reject("Must provide 'id'");
            return;
        }

        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, AlarmReceiver.class);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags);
        
        try {
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            Log.d(TAG, "Alarm cancelled for id: " + requestCode);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to cancel alarm", e);
        }
    }
}
