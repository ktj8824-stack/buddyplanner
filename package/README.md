# @team-lepisode/capacitor-kakao-login

Capacitor Plugin for Kakao Login

## Install

### Android
Add Kakao Maven Repository to `build.gradle`.
```gradle
  repositories {
    maven {
        url "https://devrepo.kakao.com/nexus/content/groups/public/"
    }
  }
```

```bash
npm install @team-lepisode/capacitor-kakao-login
npx cap sync
```

## API

<docgen-index>

* [`initialize(...)`](#initialize)
* [`login()`](#login)
* [`logout()`](#logout)
* [`unlink()`](#unlink)
* [Interfaces](#interfaces)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### initialize(...)

```typescript
initialize(data: { appKey: string; }) => Promise<void>
```

Kakao SDK를 초기화합니다.

| Param      | Type                             |
| ---------- | -------------------------------- |
| **`data`** | <code>{ appKey: string; }</code> |

--------------------


### login()

```typescript
login() => Promise<KakaoLoginResponse>
```

카카오 로그인을 시도합니다.

**Returns:** <code>Promise&lt;<a href="#kakaologinresponse">KakaoLoginResponse</a>&gt;</code>

--------------------


### logout()

```typescript
logout() => Promise<void>
```

카카오 로그아웃을 시도합니다.

--------------------


### unlink()

```typescript
unlink() => Promise<void>
```

카카오 플랫폼 안에서 앱과 사용자 카카오계정의 연결 상태를 해제합니다.

--------------------


### Interfaces


#### KakaoLoginResponse

| Prop                        | Type                |
| --------------------------- | ------------------- |
| **`accessToken`**           | <code>string</code> |
| **`expiredAt`**             | <code>string</code> |
| **`expiresIn`**             | <code>string</code> |
| **`refreshToken`**          | <code>string</code> |
| **`idToken`**               | <code>string</code> |
| **`refreshTokenExpiredAt`** | <code>string</code> |
| **`refreshTokenExpiresIn`** | <code>string</code> |
| **`tokenType`**             | <code>string</code> |

</docgen-api>
