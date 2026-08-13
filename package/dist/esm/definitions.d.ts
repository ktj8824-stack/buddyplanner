import type { KakaoLoginResponse } from './types';
export interface CapacitorKakaoLoginPlugin {
    /**
     * Kakao SDK를 초기화합니다.
     * @param appKey
     */
    initialize(data: {
        appKey: string;
    }): Promise<void>;
    /**
     * 카카오 로그인을 시도합니다.
     * @returns {Promise<KakaoLoginResponse>} 카카오 로그인 응답
     */
    login(): Promise<KakaoLoginResponse>;
    /**
     * 카카오 로그아웃을 시도합니다.
     */
    logout(): Promise<void>;
    /**
     * 카카오 플랫폼 안에서 앱과 사용자 카카오계정의 연결 상태를 해제합니다.
     */
    unlink(): Promise<void>;
}
