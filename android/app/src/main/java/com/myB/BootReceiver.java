package com.myB;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * 재부팅 또는 앱 업데이트 후, 저장해 둔 미래 알람을 다시 등록합니다.
 * 여기서는 알람을 울리지 않습니다.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            Log.d("BootReceiver", "Restoring alarms for action: " + action);
            AlarmScheduler.rescheduleAll(context);
        }
    }
}
