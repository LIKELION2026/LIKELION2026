# LIKELION2026

글로벌 원격 협업팀을 위한 AI 기반 가상 오피스 프로젝트입니다. 서로 다른 국가와 언어로 일하는 팀원이 같은 공간에 있는 감각으로 업무 가능 상태를 확인하고, 회의 자막과 AI 브리핑으로 협업 맥락을 이어 가도록 돕습니다.

## 핵심 가치

- 팀원의 협업 가능 상태와 현재 업무 맥락을 부담 없이 파악합니다.
- 한국어와 영어 회의 발언을 실시간 자막으로 확인합니다.
- 회의 종료 후 AI가 결정사항, 미해결 항목, 담당자, 다음 행동 초안을 만들고 사용자가 검토·확정합니다.
- 짧은 아이스브레이킹으로 원격 팀원 간 심리적 거리를 줄입니다.

## MVP 범위

- 사용자 입장과 언어 설정
- 다중 사용자 가상 오피스와 실시간 상태 동기화
- 1:1 또는 소규모 LiveKit 화상회의 입장
- 한국어·영어 실시간 번역 자막
- AI 브리핑 생성, 수정, 확정
- 확정 브리핑 피드 확인

## 기술 방향

```text
apps/client/      React + TypeScript + Phaser
apps/server/      NestJS API, Socket, LiveKit, AI 연동
packages/shared/  공통 DTO, 도메인 타입, Socket 이벤트 계약
docs/             제품 요구사항과 협업 기록
```

## 시작하기

```bash
pnpm install
pnpm typecheck
pnpm build
```

백엔드 로컬 실행은 [docs/RUNBOOKS/server-local.md](docs/RUNBOOKS/server-local.md)를 참고합니다.

## 주요 문서

- [PRD](docs/PRD.md)
- [프로젝트 구조](docs/STRUCTURE.md)
- [작업 규칙](docs/CONVENTIONS.md)
- [실시간 회의 계획](docs/FEATURES/realtime-meeting/README.md)
