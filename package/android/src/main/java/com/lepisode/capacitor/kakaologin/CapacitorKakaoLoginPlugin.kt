package com.lepisode.capacitor.kakaologin

import com.getcapacitor.JSObject
import com.getcapacitor.Logger
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.kakao.sdk.auth.model.OAuthToken
import com.kakao.sdk.common.KakaoSdk
import com.kakao.sdk.user.UserApiClient


@CapacitorPlugin(name = "CapacitorKakaoLogin")
class CapacitorKakaoLoginPlugin : Plugin() {

    private val TAG = "CapacitorKakaoLogin"
    private var initialized = false

    /**
     * 카카오 SDK를 초기화
     * @author 최강훈 <ganghun@lepisode.team>
     */
    @PluginMethod
    fun initialize(call: PluginCall) {
        val context = context
        val appKey = call.getString("appKey")

        if (appKey == null) {
            call.reject("appKey is required")
            return
        }

        KakaoSdk.init(context, appKey)
        Logger.debug(TAG, "Kakao SDK initialized.")
        this.initialized = true;
        call.resolve();
    }

    /**
     * Kakao SDK를 이용해 로그인하고, 토큰을 반환합니다.
     * @author 최강훈 <ganghun@lepisode.team>
     */
    @PluginMethod
    fun login(call: PluginCall) {

        /**
         * Kakao SDK가 초기화 되지 않은 경우 오류를 반환함
         */
        if (!this.initialized) {
            Logger.error("Kakao SDK is not initialized. Did you call 'initialize()'?")
            call.reject("Kakao SDK is not initialized. Did you call 'initialize()'?")
            return;
        }

        val context = context;
        val result = JSObject();

        /**
         * 로그인 성공 시 콜백 함수를 정의
         */
        val callback: (OAuthToken?, Throwable?) -> Unit = { token, error ->
            if (error != null) {
                call.reject("카카오 로그인이 실패했습니다. ${error.message}")
            } else if (token != null) {
                result.putSafe("accessToken", token.accessToken);
                result.putSafe("accessTokenExpiresAt", token.accessTokenExpiresAt)
                result.putSafe("refreshToken", token.refreshToken)
                result.putSafe("refreshTokenExpiresAt", token.refreshTokenExpiresAt)
                result.putSafe("idToken", token.idToken)

                call.resolve(result)
            }
        }

        /**
         * 카카오톡을 이용해 로그인이 가능한지 확인하고 불가하면 카카오계정으로, 가능하면 카카오톡으로 로그인.
         */
        val isKakaoTalkLoginAvailable = UserApiClient.instance.isKakaoTalkLoginAvailable(context)

        when (isKakaoTalkLoginAvailable) {
            true -> UserApiClient.instance.loginWithKakaoTalk(context, callback = callback)
            false -> UserApiClient.instance.loginWithKakaoAccount(context, callback = callback)
        }

    }

    /**
     * 로그아웃합니다.
     * @author 최강훈 <ganghun@lepisode.team>
     */
    @PluginMethod
    fun logout(call: PluginCall) {
        UserApiClient.instance.logout { error ->
            when (error) {
                null -> call.resolve()
                else -> call.reject(error.message)
            }
        }
    }

    @PluginMethod
    fun unlink(call: PluginCall) {
        UserApiClient.instance.unlink { error ->
            when (error) {
                null -> call.resolve()
                else -> call.reject(error.message)
            }
        }
    }

}
