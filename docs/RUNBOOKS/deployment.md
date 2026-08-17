# Deployment Runbook

> 대상: 해커톤 데모용 Production 배포 환경
>
> 관련 Issue / PR / Discussion: [Issue #15](https://github.com/LIKELION2026/LIKELION2026/issues/15)

## 배포 원칙

```text
feature branch -> dev -> main -> Production deployment
```

- `dev`는 팀 통합과 검증을 위한 브랜치다.
- `main`은 외부 사용자가 접속하는 Production 브랜치다.
- `dev -> main` Pull Request의 CI가 성공한 뒤에만 병합한다.
- `main` 병합 커밋을 기준으로 Vercel과 Render가 Production 배포한다.
- CI는 소스 품질을 검증하며, 실제 배포는 각 플랫폼의 Git 연동으로 수행한다.

## GitHub Actions CI

`.github/workflows/ci.yml`은 다음 상황에 실행된다.

| 이벤트 | 목적 |
| --- | --- |
| Pull Request -> `dev` | 기능 브랜치를 통합하기 전 검증 |
| Pull Request -> `main` | 릴리스 전 최종 검증 |
| Push -> `main` | 병합된 Production 커밋 검증 |

검증 항목은 `typecheck`, `build-client`, `build-server`다. 각 job은 독립적으로 실행되어 실패한 패키지를 바로 확인할 수 있다.

GitHub 저장소 설정에서 `main` 브랜치에 아래 상태 검사를 Required check로 지정한다.

- `Typecheck`
- `Build Client`
- `Build Server`

## Vercel: Client

Vercel 프로젝트를 GitHub 저장소와 연결하고 Production Branch를 `main`으로 설정한다.

| 설정 | 값 |
| --- | --- |
| Root Directory | 저장소 루트 |
| Install Command | `corepack pnpm install --frozen-lockfile` |
| Build Command | `corepack pnpm build:client` |
| Output Directory | `apps/client/dist` |
| Production Branch | `main` |

클라이언트 환경 변수는 Vercel Project Settings -> Environment Variables에 등록한다.

```env
VITE_SERVER_URL=https://<render-server-url>
```

`VITE_` 접두사가 붙은 값은 브라우저 번들에 포함된다. 비밀 키를 이 환경 변수에 넣지 않는다.

## Render: Server

Render Web Service를 GitHub 저장소와 연결하고 Production Branch를 `main`으로 설정한다.

| 설정 | 값 |
| --- | --- |
| Root Directory | 저장소 루트 |
| Build Command | `corepack pnpm install --frozen-lockfile && corepack pnpm build:server` |
| Start Command | `corepack pnpm start:server` |
| Production Branch | `main` |
| Health Check Path | `/health` |

서버 환경 변수는 Render Service -> Environment에만 등록한다.

```env
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY`와 LiveKit API Secret은 서버 전용 값이다. Client, GitHub Actions 로그, 저장소에 노출하지 않는다.

## Supabase

Supabase는 Hosted 프로젝트를 사용한다. URL과 키는 환경별로 Vercel과 Render에 분리해 등록한다.

- Client: 공개 가능한 `SUPABASE_URL`, publishable key만 사용한다.
- Server: 필요한 경우 publishable key와 secret key를 사용한다.
- `.env`, `.env.local`은 Git에 커밋하지 않는다.

## 릴리스 확인

1. `dev -> main` Pull Request에서 CI 세 job이 성공했는지 확인한다.
2. PR을 `main`에 병합한다.
3. GitHub Actions의 `main` push 실행이 성공했는지 확인한다.
4. Vercel Production 배포가 성공하고 오피스 화면이 열리는지 확인한다.
5. Render Production 배포가 성공하고 `GET /health`가 성공하는지 확인한다.
6. Vercel 환경의 `VITE_SERVER_URL`로 Socket 연결과 회의 토큰 API를 확인한다.

배포 직후의 구체적인 2인 협업·회의·자막·실패 시나리오와 실행 결과 기록 양식은 [Production Test Scenarios](./production-test-scenarios.md)를 따른다.

## 실패 대응

| 증상 | 확인 위치 | 첫 조치 |
| --- | --- | --- |
| CI typecheck 또는 build 실패 | GitHub Actions job 로그 | 실패한 패키지와 명령을 로컬에서 동일하게 실행 |
| Vercel 배포 실패 | Vercel Deployment 로그 | Build Command, Output Directory, `VITE_SERVER_URL` 확인 |
| Render 배포 실패 | Render Event / Build 로그 | Build / Start Command, Node 버전, 서버 환경 변수 확인 |
| 배포 후 서버 비정상 | Render Health Check | `/health` 응답, 포트, LiveKit 환경 변수 확인 |

## Docker 범위

Dockerfile과 docker-compose는 현재 배포 범위에 포함하지 않는다. Vercel, Render, Supabase Hosted, LiveKit Cloud를 사용하므로 컨테이너를 직접 운영할 필요가 없다.

Render 대신 VM 또는 컨테이너 플랫폼으로 이전하거나, LiveKit을 직접 호스팅하거나, 로컬 통합 환경 표준화가 필요해질 때 별도 Issue로 검토한다.
