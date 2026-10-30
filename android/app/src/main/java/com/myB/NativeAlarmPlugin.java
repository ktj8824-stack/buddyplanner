package com.myB;


import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAlarm")
public class NativeAlarmPlugin extends Plugin {

    @PluginMethod
    public void setAlarm(PluginCall call) {
        Double timeDouble = call.getDouble("time"); // timestamp in ms
        if (timeDouble == null) {
            call.reject("Must provide 'time' in milliseconds");
            return;
        }

        long timeInMillis = timeDouble.longValue();
        int requestCode = call.getInt("id", 1); // allow multiple alarms using ID

        if (AlarmScheduler.schedule(getContext(), requestCode, timeInMillis, call.getString("timelineJson"))) {
            call.resolve();
        } else {
            call.reject("Failed to schedule alarm");
        }
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        Integer requestCode = call.getInt("id");
        if (requestCode == null) {
            call.reject("Must provide 'id'");
            return;
        }

        AlarmScheduler.cancel(getContext(), requestCode);
        call.resolve();
    }
}
