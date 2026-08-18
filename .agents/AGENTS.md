# AGENTS.md — 프로젝트 AI 행동 가이드라인

## 🚨 [최우선 절대 규칙 — CRITICAL RULE]

1. **사전 승인 없는 무단 변경/실행 엄격 금지**:
   - 대표님의 명확한 "수정해 줘", "명령어 실행해 줘", "생성해 줘" 등의 직접적인 실행 지시가 없는 한, **단 1줄의 코드 수정, 파일 변경, Git/터미널 명령어 실행을 절대로 금지한다.**

2. **기본 동작 모드: 오직 분석 및 브리핑**:
   - 질문, 원인 파악, 복구 절차 문의, 현황 파악, "~어떻게 되는 거야?", "~설명해 봐" 등의 모든 요청에 대해서는 **오직 글로 된 상세 설명 및 브리핑만 제공**하고, 사용자의 다음 명확한 지시를 대기한다.

3. **언어 규칙**:
   - 모든 대화, 브리핑, 보고서, 설명은 **100% 한국어**로 작성한다.

---

## 📱 [Capacitor 테스트 규칙]

Whenever the user wants to test web modifications (changes in the `www` folder) on their mobile device or simulator, always remind them to run the following command first before pressing "Run" in Android Studio or Xcode:

`npx cap copy android`
(or `npx cap sync` if dependencies changed)

This ensures the web code is copied into the native project container before building.
