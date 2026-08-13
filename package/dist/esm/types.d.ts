export interface KakaoLoginResponse {
    accessToken: string;
    expiredAt: string;
    expiresIn: string;
    refreshToken: string;
    idToken?: string;
    refreshTokenExpiredAt: string;
    refreshTokenExpiresIn: string;
    tokenType: string;
}
