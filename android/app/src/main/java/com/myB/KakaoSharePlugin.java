package com.myB;

import android.content.Intent;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.kakao.sdk.common.json.KakaoJson;
import com.kakao.sdk.share.ShareClient;
import com.kakao.sdk.template.model.FeedTemplate;

import kotlin.Unit;

/**
 * 앱에서 카카오톡 공유 (웹과 같은 일정 카드 + 버튼 2개).
 * 앱 웹뷰에서는 카카오 JS 공유가 막혀 있어서, 카카오 안드로이드 SDK로 보냅니다.
 * 카카오 SDK 초기화는 로그인 플러그인(CapacitorKakaoLogin.initialize)이 앱 시작 때 해 둡니다.
 * JS에서 카카오 메시지 템플릿 JSON(REST 형식, object_type: feed)을 그대로 넘겨 받습니다.
 */
@CapacitorPlugin(name = "KakaoShare")
public class KakaoSharePlugin extends Plugin {
    private static final String TAG = "KakaoShare";

    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean ok = false;
        try { ok = ShareClient.Companion.getInstance().isKakaoTalkSharingAvailable(getContext()); } catch (Throwable t) { Log.w(TAG, "확인 실패", t); }
        JSObject r = new JSObject();
        r.put("value", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void shareFeed(PluginCall call) {
        String json = call.getString("template");
        if (json == null) { call.reject("template is required"); return; }
        try {
            ShareClient client = ShareClient.Companion.getInstance();
            if (!client.isKakaoTalkSharingAvailable(getContext())) { call.reject("kakaotalk not available"); return; }
            FeedTemplate template = KakaoJson.INSTANCE.fromJson(json, FeedTemplate.class);
            client.shareDefault(getContext(), template, null, (result, error) -> {
                if (error != null || result == null) {
                    Log.w(TAG, "공유 실패", error);
                    call.reject(error != null ? String.valueOf(error.getMessage()) : "share failed");
                } else {
                    try {
                        Intent intent = result.getIntent();
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(intent);
                        call.resolve();
                    } catch (Throwable t) {
                        call.reject(String.valueOf(t.getMessage()));
                    }
                }
                return Unit.INSTANCE;
            });
        } catch (Throwable t) {
            Log.w(TAG, "공유 실패", t);
            call.reject(String.valueOf(t.getMessage()));
        }
    }
}
