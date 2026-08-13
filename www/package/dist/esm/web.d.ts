import { WebPlugin } from '@capacitor/core';
import type { CapacitorKakaoLoginPlugin } from './definitions';
import type { KakaoLoginResponse } from './types';
export declare class CapacitorKakaoLoginWeb extends WebPlugin implements CapacitorKakaoLoginPlugin {
    initialize(data: {
        appKey: string;
    }): Promise<void>;
    login(): Promise<KakaoLoginResponse>;
    logout(): Promise<void>;
    unlink(): Promise<void>;
}
