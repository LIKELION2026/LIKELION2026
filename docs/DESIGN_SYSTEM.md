작성자: Project Team
최종 수정자: Codex
작성일: 2026-08-19
마지막 업데이트: 2026-08-19
관련 Issue / PR / Discussion: #132, #136

# Design System

## 인게임 회의 오버레이 레이어

`/office`의 회의 UI는 Phaser canvas를 재생성하지 않고 `.virtual-office` 위에 React 오버레이로 얹는다. 맵 탐색이 제품의 주 화면이지만, 사용자가 Meeting Room 안에 있는 동안에는 오피스 canvas와 HUD를 반투명하게 낮춰 회의에 시선이 먼저 가도록 한다. 오버레이는 필요한 영역만 pointer event를 받고, 나머지는 맵이 계속 보이도록 반투명 표면을 사용한다.

| 레이어 | Selector | z-index | Pointer event 원칙 |
| --- | --- | ---: | --- |
| Phaser canvas | `.office-canvas` | 기본 | 맵 이동, 포인터 휠 줌 담당 |
| Office HUD | `.office-hud` | 1 | 상태, TODO, 캘린더, 피플 패널 진입 |
| 일반 패널 | `.office-people-panel`, `.std-panel` | 2 | 패널 조작 중에는 해당 DOM이 입력을 받음 |
| 온보딩 | `.guest-onboarding-backdrop` | 3 | 오피스 세션 생성 전 맵 입력 차단 |
| 회의 오버레이 | `.meeting-room-overlay` | 4 | root는 `pointer-events: none`, 자식 UI만 `pointer-events: auto` |
| 회의 우측 패널 | `.meeting-room-side-panel` | 4 | 채팅·번역 패널 슬롯과 회의 상태 표시 |
| 모달 | `.office-summon-backdrop`, `.office-calendar-backdrop` | 5 이상 | 결정을 요구하는 동안 배경 입력 차단 |

회의 오버레이 root에는 `data-office-keyboard-scope`를 붙인다. 회의 버튼이나 아이콘 컨트롤에 focus가 있어도 Phaser의 WASD/방향키 이동은 유지한다. 단, 실제 텍스트 입력 요소(`input`, `select`, `textarea`, `contenteditable`)에 focus가 있을 때만 이동 입력을 멈춰 채팅 입력과 맵 이동이 충돌하지 않게 한다.

## 회의 오버레이 반응형 기준

- 1280×720 이상: 상단 참가자 스트립, 오른쪽 패널 슬롯, 하단 컨트롤 바를 동시에 표시한다.
- 상단 참가자 스트립은 참가자 타일 개수만큼만 검은 배경을 가진다. 참가자가 많아져 viewport를 넘을 때만 가로 스크롤한다.
- 960px 이하: 오른쪽 패널 슬롯은 숨기고, 참가자 스트립과 하단 컨트롤을 한 줄 스크롤 중심으로 유지한다.
- 상단 참가자 타일은 데스크톱에서 `250px~360px` 범위로 표시하고, 640px 이하에서는 190px 기준으로 축소한다.
- 화면 키우기 컨트롤은 Browser Fullscreen API를 쓰지 않고, 오버레이 중앙에 모든 참가자를 크게 보여 주는 제한 크기 grid 패널을 띄운다. 이 grid 패널은 화면 전체를 꽉 채우지 않고 세로 스크롤을 만들지 않는다.

## 회의 상태 표현

- 화면에는 ZEP형 미니멀 UI를 위해 Lucide React 아이콘과 dot만 노출한다.
- 색상만으로 상태를 구분하지 않도록, 참가자 타일과 컨트롤 버튼에는 `aria-label`과 `title`에 이름·마이크·카메라·연결 품질 텍스트를 유지한다.
- 연결 품질은 텍스트 대신 초록색/빨간색 dot으로 표시한다.
- active speaker는 테두리와 초록색 dot 아이콘으로 표시한다.
- 카메라 OFF 또는 video track 대기 상태인 참가자는 스트립에서 제거하지 않고 검은 placeholder 타일로 유지한다. 연결 전 빈 타일에는 사용자·마이크·카메라 아이콘을 띄우지 않는다.
- 하단 컨트롤은 텍스트 없는 Lucide 아이콘 버튼이다. 로딩/변경 중 상태는 현재 기능 아이콘을 회색 blocked 톤으로 보여 주고, 꺼짐 상태는 `MicOff`, `VideoOff`, `GlobeOff`를 빨간 톤으로 표현한다.
