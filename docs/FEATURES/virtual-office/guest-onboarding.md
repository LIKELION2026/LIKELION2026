# Guest Office Onboarding

> 작성일: 2026-08-16
>
> 마지막 업데이트: 2026-08-20
>
> 관련 Issue: #40, #172

## 목표

로그인 없이 데모 사용자가 UI 언어, 이름, 소속 국가, 아바타를 선택하고, 바로 가상 오피스에 입장한다. URL query나 개발자 도구 입력을 요구하지 않는다.

## 사용자 흐름

```mermaid
flowchart LR
    Open["/office 첫 접속"] --> Modal["UI 언어·이름·한국/베트남·아바타 선택"]
    Modal --> API["POST /office/session"]
    API --> Success["guestToken 저장\n아바타·desk 세션 수신"]
    Success --> Socket["/office Socket 입장"]
    API --> Failure["오류 문구 표시\n같은 모달에서 재시도"]
```

## 브라우저 저장 기준

| 항목 | 저장 위치 | 목적 | 외부 전파 |
| --- | --- | --- | --- |
| UI 언어 | localStorage `virtual-office.ui-locale` | 시작 화면과 오피스 시스템 UI 표시 언어 유지 | 전파하지 않음 |
| 이름·국가·언어 | localStorage | 재방문 시 입력 생략 | 세션 API와 Socket 입장 시 전달 |
| guest token | localStorage | 같은 멤버·desk 복구 | Server 소유권 검증에만 전달 |
| 실제 작업 화면·입력 | 저장하지 않음 | 감시 기능 제외 | 전달하지 않음 |

## UI 언어 정책

- 지원 UI 언어는 `ko`, `vi`다.
- 최초 방문 시 브라우저 언어가 한국어 또는 베트남어면 초기 선택값으로만 사용하고, 저장된 값이 있으면 저장값을 우선한다.
- 손상되었거나 지원하지 않는 저장값은 한국어로 fallback한다.
- UI 언어 변경은 `document.documentElement.lang`과 localStorage에 즉시 반영한다.
- UI 언어는 `GuestProfile.countryCode`, `GuestProfile.language`, 회의 `meeting.translation-preference`와 분리한다. 국가 선택이나 회의 번역 언어 변경은 UI 언어를 덮어쓰지 않는다.
- 사용자가 작성한 이름, TODO, 캘린더 제목, 채팅 원문은 UI 언어 변경으로 자동 번역하지 않는다.

## 오류 상태

- 이름이 비어 있으면 브라우저의 required 검증으로 제출하지 않는다.
- 세션 API 실패 시 오피스 Socket을 열지 않고 모달 안에 오류를 보인다.
- 저장된 프로필 자동 복구가 실패해도 사용자는 같은 모달에서 다시 입력할 수 있다.

## 후속 범위

- 아바타 후보를 사용자가 직접 선택하는 기능
- 프로필 수정과 guest token 초기화
- 초대 링크별 workspace 선택
