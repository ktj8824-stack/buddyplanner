import Capacitor
import Foundation
import KakaoSDKAuth
import KakaoSDKCommon
import KakaoSDKUser

/// Please read the Capacitor iOS Plugin Development Guide
/// here: https://capacitorjs.com/docs/plugins/ios
@objc(CapacitorKakaoLoginPlugin)
public class CapacitorKakaoLoginPlugin: CAPPlugin, CAPBridgedPlugin {
    public var identifier = "CapacitorKakaoLoginPlugin"
    public var jsName = "CapacitorKakaoLogin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "login", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlink", returnType: CAPPluginReturnPromise)
    ]
    private var initialized = false;

    @objc func initialize(_ call: CAPPluginCall) {
        if let appKey = call.getString("appKey") {
            KakaoSDK.initSDK(appKey: appKey)
            self.initialized = true;
            call.resolve()
        } else {
            call.reject("appKey is not provided.")
        }
    }

    @objc func login(_ call: CAPPluginCall) {
        let isKakaoTalkLoginAvailable = UserApi.isKakaoTalkLoginAvailable()

        if isKakaoTalkLoginAvailable {
            UserApi.shared.loginWithKakaoAccount {(oAuthToken, error) in
                if  error != nil {
                    call.reject("로그인 하는 도중 오류가 발생했습니다.")
                } else {
                    if let oAuthToken = oAuthToken {
                        var result = self.parseToken(oAuthToken: oAuthToken)
                        call.resolve(result)
                    }
                }
            }
        } else {
            UserApi.shared.loginWithKakaoAccount {(oAuthToken, error) in
                if error != nil {
                    call.reject("로그인 하는 도중 오류가 발생했습니다.")
                } else {
                    if let oAuthToken = oAuthToken {
                        var result = self.parseToken(oAuthToken: oAuthToken)
                        call.resolve(result)
                    }
                }
            }
        }
    }
    
    private func parseToken(oAuthToken: OAuthToken)->[String: Any] {
        var result: [String: Any] = [
            "accessToken": oAuthToken.accessToken,
            "expiresAt": oAuthToken.expiredAt,
            "expiresIn": oAuthToken.expiresIn,
            "refreshToken":oAuthToken.refreshToken,
            "refreshTokenExpiresAt":oAuthToken.refreshTokenExpiredAt,
            "tokenType": oAuthToken.tokenType
        ]
        
        if let idToken = oAuthToken.idToken {
            result["idToken"] = idToken
        }
        
        if let scope = oAuthToken.scope {
            result["scope"] = scope
        }
        
        if let scopes = oAuthToken.scopes {
            result["scopes"] = scopes
        }
        
        return result;
    }
}
