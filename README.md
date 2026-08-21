# Zooffice

> 한국과 베트남처럼 서로 다른 국가의 팀원이 함께 일할 때 생기는 업무 상태, 일정, 언어 장벽의 불확실성을 줄이는 AI 기반 가상 협업 오피스입니다.

Zooffice는 팀원을 감시하는 도구가 아니라, 팀원이 직접 공유한 상태, 오늘의 TODO, 부재 일정, 회의 맥락을 하나의 가상 오피스에서 확인하게 해 다음 행동을 더 빠르게 결정하도록 돕는 서비스입니다.

## 시연 영상

<p align="center">
  <a href="https://www.youtube.com/watch?v=6OGslOJb0W4">
    <img src="https://img.youtube.com/vi/6OGslOJb0W4/maxresdefault.jpg" alt="Zooffice 시연 영상" width="900">
  </a>
</p>

## 화면 미리보기

### Global Office

<p align="center">
  <img src="docs/assets/readme/main-office.png" alt="Global Office 메인 화면" width="900">
</p>

### 입장 흐름

<table>
  <tr>
    <th>언어 선택</th>
    <th>입장 정보와 아바타 선택</th>
  </tr>
  <tr>
    <td><img src="docs/assets/readme/language-selection-feature.png" alt="언어 선택 화면" width="430"></td>
    <td><img src="docs/assets/readme/guest-onboarding-feature.png" alt="입장 정보와 아바타 선택 화면" width="430"></td>
  </tr>
</table>

### 협업 액션

<table>
  <tr>
    <th>피플 목록과 프로필</th>
    <th>찾아가기와 불러오기</th>
  </tr>
  <tr>
    <td><img src="docs/assets/readme/people-panel-feature.png" alt="피플 목록과 팀원 프로필 화면" width="430"></td>
    <td><img src="docs/assets/readme/summon-actions-feature.png" alt="찾아가기와 불러오기 액션 화면" width="430"></td>
  </tr>
</table>

### 업무와 일정

<table>
  <tr>
    <th>상태 변경과 TODO</th>
    <th>공유 캘린더</th>
  </tr>
  <tr>
    <td><img src="docs/assets/readme/status-todo-feature.png" alt="상태 변경과 TODO 화면" width="430"></td>
    <td><img src="docs/assets/readme/shared-calendar-feature.png" alt="공유 캘린더 화면" width="430"></td>
  </tr>
</table>

### 오피스 대화

<p align="center">
  <img src="docs/assets/readme/office-chat-feature.png" alt="오피스 대화 화면" width="680">
</p>

## 주요 문서

<p align="center">
  <a href="docs/IRDeck/경북대학교_안녕하세요어른사자입니다.pdf">
    <img src="docs/IRDeck/main.png" alt="Zooffice IR Deck 표지" width="760">
  </a>
</p>

| 구분 | 문서 | 읽는 때 |
| --- | --- | --- |
| 발표 자료 | [Zooffice IR Deck](docs/IRDeck/경북대학교_안녕하세요어른사자입니다.pdf) | 서비스 스토리와 발표 흐름을 빠르게 볼 때 |
| 제품 정의 | [PRD](docs/PRD.md) | 문제 정의, MVP 범위, 데모 성공 기준을 확인할 때 |
| 구조 | [프로젝트 구조](docs/STRUCTURE.md), [구조 가이드](docs/PROJECT_STRUCTURE_GUIDE.md) | monorepo 책임과 폴더 경계를 맞출 때 |
| 기능 | [실시간 회의](docs/FEATURES/realtime-meeting/README.md), [가상 오피스 시나리오](docs/FEATURES/virtual-office/user-scenarios.md), [공유 캘린더](docs/FEATURES/virtual-office/shared-calendar.md) | 화면별 사용자 흐름과 구현 범위를 확인할 때 |
| 디자인 | [Figma 디자인 시안](https://www.figma.com/design/XNMBF9IXkhkotGr6EoiW4J/LIKELION2026?node-id=0-1&t=YCqArq9kmUsJeycy-1), [Notion 팀 워크스페이스](https://rainbow-board-5a0.notion.site/3a63fc0908698096be0aca667596e18e) | 디자인 시안과 팀 자료를 함께 볼 때 |
| 협업 | [작업 규칙](docs/CONVENTIONS.md), [AI Agent 작업 기록](docs/AI_AGENT_WORKFLOW.md) | 팀 규칙과 AI 활용 기록을 확인할 때 |

## 팀원

<p align="center">
  <img src="docs/assets/readme/team.jpg" alt="안녕하세요어른사자입니다 팀원 소개" width="900">
</p>

## 핵심 기능

- 아바타 기반 Global Office 입장
- 팀원 상태와 위치 실시간 공유
- 오늘의 TODO 작성 및 공개 TODO 확인
- 휴가, 재택, 회의, 집중 작업을 포함한 팀 공유 캘린더
- 피플 목록, 팀원 검색, 찾아가기, 불러오기
- LiveKit 기반 화상회의
- 한국어·베트남어 회의 자막 표시 흐름
- 오피스 채팅 한국어·베트남어 번역 보조
- 회의 요약 제출 및 캘린더 이벤트 반영

## 현재 구현된 기능

### Virtual Office

- 게스트 이름, 국가, UI 언어, 아바타 선택 후 오피스 입장
- 사용 가능한 아바타 조회와 중복 선택 방지
- Phaser 기반 오피스 맵, 아바타 이동, 충돌 영역 처리
- Socket.IO 기반 접속, 퇴장, 위치, 상태 동기화
- 출근, 퇴근, 협업 가능, 집중 작업, 회의 중, 자리 비움 상태 표시
- 피플 목록에서 팀원 검색, 프로필 확인, 찾아가기, 불러오기 요청
- 오피스 공용 채팅과 한국어·베트남어 번역 fallback

### TODO & Calendar

- 내 TODO 생성, 조회, 수정, 삭제
- 공개 TODO를 통해 팀원의 현재 업무 맥락 확인
- 팀 공유 캘린더 일정 생성, 조회, 수정, 삭제
- 휴가, 부재, 재택, 회의, 집중 작업 일정 유형 지원
- 현재 시간 기준 팀원별 캘린더 상태 조회
- TODO와 캘린더 변경 시 오피스 내 실시간 갱신 이벤트 발행

### Realtime Meeting

- LiveKit 회의 참가 토큰 발급
- 회의실별 LiveKit roomName 분리
- 회의 참가자 비디오·오디오 UI
- 회의 제어 바, 참가자 목록, 회의 채팅
- Socket.IO 기반 회의 자막 구독
- mock subtitle 생성, 목록 조회, 실시간 표시
- LiveKit webhook 수신, 서명 검증, room state 관리
- 회의 요약 제출 후 캘린더 회의 이벤트 생성

### Shared Contract

- Client와 Server가 공유하는 도메인 타입
- HTTP 요청·응답 DTO
- Socket 이벤트 이름과 payload 계약
- 오피스, TODO, 캘린더, 회의, 자막, 채팅 계약 분리

## 데모 시나리오

1. 사용자는 UI 언어를 선택하고 이름, 국가, 아바타를 설정해 Global Office에 입장합니다.
2. 피플 목록에서 팀원을 검색하고 현재 상태와 공개 TODO를 확인합니다.
3. 공유 캘린더에서 휴가, 회의, 재택 등 협업에 영향을 주는 일정을 확인합니다.
4. 찾아가기 또는 불러오기로 팀원과 대화 진입점을 만듭니다.
5. 회의실에 입장해 LiveKit 회의에 연결하고 한국어·베트남어 자막 흐름을 확인합니다.
6. 회의 요약을 제출하면 캘린더의 회의 이벤트로 남습니다.

## 향후 계획

- 실제 STT·번역 파이프라인과 회의 자막 연결 강화
- AI 회의 요약의 사용자 검토·수정 흐름 고도화
- TODO 초안 생성과 일정 충돌 알림
- 한국어·베트남어 문구 원어민 검수
- 파일럿 팀 대상 사용성 검증과 협업 지표 수집

## 기술 스택

### Frontend

<p>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=FFFFFF" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFFFFF" alt="Vite">
  <img src="https://img.shields.io/badge/Phaser-1B1B1B?style=for-the-badge&logo=phaser&logoColor=FFFFFF" alt="Phaser">
  <img src="https://img.shields.io/badge/Zustand-443E38?style=for-the-badge" alt="Zustand">
  <img src="https://img.shields.io/badge/i18next-26A69A?style=for-the-badge&logo=i18next&logoColor=FFFFFF" alt="i18next">
</p>

### Backend & Realtime

<p>
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=FFFFFF" alt="NestJS">
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=FFFFFF" alt="Socket.IO">
  <img src="https://img.shields.io/badge/LiveKit-111827?style=for-the-badge&logo=livekit&logoColor=FFFFFF" alt="LiveKit">
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=0F172A" alt="Supabase">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=FFFFFF" alt="Node.js">
</p>

### AI & Translation

<p>
  <img src="https://img.shields.io/badge/Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=FFFFFF" alt="Gemini">
  <img src="https://img.shields.io/badge/OpenAI-111111?style=for-the-badge&logo=openai&logoColor=FFFFFF" alt="OpenAI">
  <img src="https://img.shields.io/badge/Deepgram-13EF93?style=for-the-badge&logo=deepgram&logoColor=0B1220" alt="Deepgram">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=FFFFFF" alt="Python">
</p>

### Workspace

<p>
  <img src="https://img.shields.io/badge/pnpm_workspace-F69220?style=for-the-badge&logo=pnpm&logoColor=FFFFFF" alt="pnpm workspace">
  <img src="https://img.shields.io/badge/Shared_Package-3178C6?style=for-the-badge&logo=typescript&logoColor=FFFFFF" alt="TypeScript shared package">
  <img src="https://img.shields.io/badge/Monorepo-24292F?style=for-the-badge&logo=git&logoColor=FFFFFF" alt="Monorepo">
</p>

## 프로젝트 구조

```text
apps/client/      React + Phaser 기반 가상 오피스 클라이언트
apps/server/      NestJS API, Socket, LiveKit, Supabase 연동 서버
packages/shared/  공통 타입, DTO, Socket 이벤트 계약
docs/             제품 기획, 기능 문서, 실행 가이드, 협업 기록
```

## 시작하기

```bash
corepack enable
pnpm install
pnpm dev:server
pnpm dev:client
```

Client는 기본적으로 `http://localhost:5173`, Server는 `http://localhost:4000`에서 실행합니다.

## 환경 변수

### Client

```env
VITE_SERVER_URL=http://localhost:4000
```

### Server

```env
NODE_ENV=development
PORT=4000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

LIVEKIT_URL=wss://development-project.livekit.cloud
LIVEKIT_API_KEY=replace-with-development-key
LIVEKIT_API_SECRET=replace-with-development-secret
LIVEKIT_TOKEN_TTL_SECONDS=900

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=replace-with-server-secret-key
OFFICE_WORKSPACE_NAME=LIKELION2026 Global Office
```

오피스 채팅 자동 번역은 선택 기능입니다. 설정하지 않으면 서버는 짧은 데모 phrasebook fallback을 사용합니다.

```env
OFFICE_CHAT_TRANSLATION_PROVIDER=gemini
OFFICE_CHAT_GEMINI_API_KEY=replace-with-gemini-key
OFFICE_CHAT_TRANSLATION_MODEL=gemini-3.1-flash-lite
OFFICE_CHAT_TRANSLATION_TIMEOUT_MS=10000
```

## 주요 명령어

| 명령어 | 용도 |
| --- | --- |
| `pnpm typecheck` | Shared, Client, Server 타입 검증 |
| `pnpm build` | 전체 workspace production build |
| `pnpm test:server` | Server 단위 테스트 실행 |
| `pnpm smoke:meeting-subtitle` | 회의 자막 smoke 검증 |
| `pnpm smoke:livekit-room` | LiveKit room smoke 검증 |
| `pnpm smoke:livekit-webhook` | LiveKit webhook smoke 검증 |
