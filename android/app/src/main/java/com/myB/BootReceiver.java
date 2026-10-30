package com.myB;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * 재부팅·앱 업데이트·정확한 알람 권한 변경 후, 저장해 둔 미래 알람을 다시 등록합니다.
 * 여기서는 알람을 울리지 않습니다.
 */
public class BootReceiver extends BroadcastReceiver {
    // 사용자가 '알람 및 리마인더' 권한을 허용/해제했을 때 (Android 12+)
    private static final String ACTION_EXACT_ALARM_PERMISSION_CHANGED =
            "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || ACTION_EXACT_ALARM_PERMISSION_CHANGED.equals(action)) {
            Log.d("BootReceiver", "Restoring alarms for action: " + action);
            AlarmScheduler.rescheduleAll(context);
        }
    }
}
