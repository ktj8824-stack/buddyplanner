#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(NativeAlarmPlugin, "NativeAlarm",
    CAP_PLUGIN_METHOD(schedule, CAPPluginReturnPromise);
)

