# Translation Pipeline

> 상태: 1단계 구현 - 참가자-언어 매핑과 타겟 언어 결정
>
> 관련 Issue: [#3](https://github.com/LIKELION2026/LIKELION2026/issues/3)

화상회의의 한국어-베트남어 실시간 통역 파이프라인이다. LiveKit 연동 전에
STT, 관용구 매칭, 번역 로직을 오디오 파일과 마이크 입력만으로 단독 검증한다.

LiveKit 통합과 참가자 언어 선택 UI는 이 파이프라인의 범위가 아니다. 여기서는
선택 결과인 `participant_id -> language` 매핑을 외부에서 주입받는다고 가정한다.

## 전제

- 참가자 수에는 제한이 없다.
- 지원 언어는 `ko`, `vi` 2개로 고정한다.
- 언어가 2개뿐이므로 타겟 언어는 화자 언어만으로 결정되며, 참가자 수와 무관하다.

## 구조

```text
apps/translation-pipeline/
├── src/
│   └── translation_pipeline/
│       ├── errors.py           # 파이프라인 공통 예외
│       ├── languages.py        # SUPPORTED_LANGUAGES, get_target_lang
│       └── participants.py     # ParticipantRegistry
└── tests/
    ├── test_languages.py
    └── test_participants.py
```

`apps/server`의 NestJS 코드와는 별도 실행 단위다. 검증이 끝난 로직은 이후
`apps/server/src/integrations/speech`와 `integrations/llm`으로 옮긴다.

## 준비

```bash
cd apps/translation-pipeline
python -m venv .venv
.venv/Scripts/activate      # macOS, Linux는 source .venv/bin/activate
pip install -r requirements.txt
```

API 키는 2단계부터 필요하다.

```bash
cp .env.example .env
```

## 실행과 테스트

### 1단계: 참가자-언어 매핑과 타겟 언어 결정

```bash
cd apps/translation-pipeline
python -m pytest -v
```

확인하는 내용은 다음과 같다.

- 참가자 2명(ko 1명, vi 1명)에서 서로의 언어로 번역 방향이 결정된다.
- 참가자 5명(ko 2명, vi 3명)에서도 화자 언어만으로 타겟 언어가 정해진다.
- 참가자가 2, 3, 5, 10, 25명일 때 결과가 참가자 수에 영향받지 않는다.
- 참가자를 런타임에 추가하거나 언어를 바꿔도 매핑이 유지된다.
- 지원하지 않는 언어와 등록되지 않은 참가자는 예외로 거부된다.

직접 확인할 때는 다음과 같이 사용한다.

```python
from translation_pipeline import ParticipantRegistry

registry = ParticipantRegistry({"user_abc123": "ko", "user_xyz789": "vi"})
registry.set_language("user_def456", "vi")

registry.resolve_direction("user_abc123")   # ("ko", "vi")
registry.resolve_direction("user_def456")   # ("vi", "ko")
```

## 다음 단계

| 단계 | 내용 |
| --- | --- |
| 2 | Deepgram Nova-3 파일 기반 STT (wav → 텍스트) |
| 3 | 관용구 사전 `glossary.json` 읽기와 매칭 |
| 4 | Claude API 번역과 시스템 프롬프트 동적 생성 |
| 5 | 2~4 연결, wav → JSON 엔드투엔드 |
| 6 | Deepgram 실시간 스트리밍, endpointing으로 발화 종료 감지 |
