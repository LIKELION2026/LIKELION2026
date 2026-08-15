# Documentation Guide

> 작성자: Project Team
>
> 작성일: 2026-08-15
>
> 마지막 업데이트: 2026-08-15
>
> 관련 Issue / PR / Discussion: 추후 연결

## 목적

문서는 심사를 위한 결과물이 아니라, 팀원과 AI Agent가 다음 작업에서 같은 조사와 시행착오를 반복하지 않도록 만드는 작업 지식이다.

문서를 기술 이름만으로 나누지 않는다. `Phaser`, `LiveKit`처럼 바뀔 수 있는 구현 수단보다, 사용자가 경험하는 기능과 해결하려는 문제를 기준으로 분리한다.

## 기본 구조

```text
docs/
├── PRD.md                       # 문제, 타겟, MVP 우선순위
├── ARCHITECTURE.md               # 전체 시스템과 데이터 흐름
├── DESIGN_SYSTEM.md              # 디자인 토큰과 화면 공통 규칙
├── DOCUMENTATION_GUIDE.md        # 이 문서
├── FEATURES/
│   ├── virtual-office/
│   ├── realtime-meeting/
│   ├── ai-briefing/
│   └── team-icebreaking/
├── ADR/                          # 최종 기술·제품 결정
├── RESEARCH/                     # 확정 전 조사와 실험
├── RUNBOOKS/                     # 실행·배포·운영 절차
└── MEETINGS/                     # 회의 결정과 후속 작업
```

초기에는 실제로 구현하거나 조사한 폴더만 만든다. 빈 폴더와 형식적인 문서를 미리 대량으로 만들지 않는다.

## 분리 기준

### FEATURES - 사용자 기능과 구현 지식

`FEATURES`에는 사용자가 어떤 문제를 해결받는지와 이를 구현하면서 확인한 지식을 둔다. 기능을 수정하는 팀원과 AI Agent가 가장 먼저 읽는 문서다.

기능 이름은 사용자 가치 중심으로 정한다.

| 권장 이름 | 이유 |
| --- | --- |
| `virtual-office` | 팀원 상태 확인과 공간 상호작용이라는 사용자 기능을 나타낸다. |
| `realtime-meeting` | 회의 입장, 자막, 번역이라는 하나의 흐름을 담는다. |
| `ai-briefing` | 회의 요약, 맥락 확인, 브리핑 확정 흐름을 담는다. |
| `team-icebreaking` | 팀원 간 관계 형성 기능을 담는다. |

`2d-avatar`, `phaser`, `livekit`처럼 구현 기술만으로 최상위 기능 폴더를 만들지 않는다. 해당 기술 정보는 관련 기능 문서 또는 ADR에 기록한다.

### ADR - 확정된 선택의 이유

`ADR`에는 대안 비교가 끝나고 팀이 채택한 제품·기술 결정을 기록한다.

예시:

- 가상 오피스 렌더링 라이브러리 선택
- 화상회의 제공자 선택
- 실시간 이벤트를 `packages/shared`에서 관리하는 방식
- AI 출력의 사용자 확정 절차

조사 중인 의견이나 임시 메모는 ADR에 넣지 않는다. 결론이 정해진 뒤 작성한다.

### RESEARCH - 확정 전 조사와 실험

`RESEARCH`에는 외부 API, 라이브러리, UX 사례, PoC 결과처럼 아직 선택되지 않은 자료를 둔다. 실험 결론이 확정되면 핵심 내용은 `FEATURES` 또는 `ADR`로 옮긴다.

### RUNBOOKS - 반복 실행 절차

`RUNBOOKS`에는 로컬 실행, 환경변수 설정, 배포, 오류 대응처럼 반복적으로 따라야 하는 절차를 둔다. 제품 요구사항이나 기술 선택 이유는 이곳에 넣지 않는다.

### MEETINGS - 회의의 결정과 후속 작업

회의록에는 결정사항, 담당자, 마감일, 보류 항목만 남긴다. 회의에서 확정된 장기적인 선택은 ADR 또는 기능 문서에도 반영한다.

## 기능 폴더 구성

기능이 작을 때는 `README.md` 하나만 사용한다. 구현 지식이 늘어나면 아래처럼 나눈다.

```text
FEATURES/realtime-meeting/
├── README.md          # 목적, 사용자 흐름, 완료 기준, 현재 범위
├── contracts.md       # API·Socket 이벤트·공통 타입·권한
└── learning-log.md    # 실험 결과, 제약, 채택한 해결책
```

### README.md에 기록할 내용

- 해결하려는 사용자 문제
- 사용자 흐름
- MVP 범위와 제외 범위
- 완료 기준
- 관련 Issue, PR, Figma, ADR

### contracts.md에 기록할 내용

- API 또는 Socket 이벤트의 이름과 책임
- 입력·출력 타입과 권한
- 오류·지연·빈 상태 처리
- 다른 기능 또는 외부 서비스 의존성

실제 타입 정의는 `packages/shared`가 기준이며, 문서는 그 계약을 이해하기 위한 설명으로 유지한다.

### learning-log.md에 기록할 내용

학습 기록은 원시 로그를 모두 붙여넣는 공간이 아니다. 다음 작업자가 같은 문제를 피할 수 있는 결론 중심 기록만 남긴다.

```md
## YYYY-MM-DD - 발견한 내용

- 상황:
- 시도한 방법:
- 결과:
- 채택한 방식:
- 주의할 점:
- 관련 코드 / Issue / PR:
```

## AI Agent가 문서를 읽는 순서

기능 작업을 시작하는 AI Agent는 아래 순서로 문서를 확인한다.

1. `docs/PRD.md`
2. `docs/ARCHITECTURE.md`가 존재하면 해당 문서
3. 대상 기능의 `FEATURES/<feature>/README.md`
4. 대상 기능의 `contracts.md`, `learning-log.md`
5. 관련 ADR, Issue, Discussion, 인접 코드와 테스트

AI Agent는 조사 초안을 `RESEARCH`에 기록할 수 있지만, 팀원의 검토 없이 이를 확정된 기능 명세나 ADR로 바꾸지 않는다.

## 문서 갱신 기준

- 사용자 흐름, 완료 기준, MVP 범위가 바뀌면 `PRD`와 관련 기능 `README`를 갱신한다.
- API·Socket 이벤트·공통 타입이 바뀌면 `contracts.md`와 `packages/shared`를 함께 갱신한다.
- 선택 이유가 바뀌면 기존 ADR을 수정하는 대신 새 ADR을 만들어 결정 변경을 남긴다.
- 재현 가능한 시행착오와 해결책이 생기면 `learning-log.md`에 기록한다.
- 실행 절차가 달라지면 관련 Runbook을 갱신한다.
