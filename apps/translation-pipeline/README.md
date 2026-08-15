# Translation Pipeline

> 상태: 1·3단계 구현 - 참가자-언어 매핑과 관용구 사전 매칭
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
├── data/
│   └── glossary.json           # 관용구 사전 (방향별 원문-번역 쌍)
├── src/
│   └── translation_pipeline/
│       ├── errors.py           # 파이프라인 공통 예외
│       ├── languages.py        # SUPPORTED_LANGUAGES, get_target_lang
│       ├── glossary.py         # Glossary, 매칭 결과 GlossaryMatch
│       └── participants.py     # ParticipantRegistry
└── tests/
    ├── test_languages.py
    ├── test_glossary.py
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

### 3단계: 관용구 사전 매칭

```bash
cd apps/translation-pipeline
python -m pytest -v tests/test_glossary.py
```

사전은 `data/glossary.json`에 있고, 조회 키는 `f"{source_lang}_{target_lang}"`이다.
항목의 원문 필드는 `source_lang`, 번역 필드는 `natural_{target_lang}`이다.

```python
from translation_pipeline import Glossary

glossary = Glossary.load()

# 원문 전체가 사전 항목과 일치하면 번역 모델을 호출하지 않는다.
match = glossary.match("고생하셨습니다", "ko", "vi")
match.can_skip_translation_model   # True
match.direct_translation           # "Cảm ơn anh/chị đã vất vả."

# 일부만 걸리면 항목만 돌려주고 번역은 모델에 맡긴다.
match = glossary.match("다들 고생하셨습니다 내일 봬요", "ko", "vi")
match.can_skip_translation_model   # False
match.entries                      # 확정 번역 사전으로 프롬프트에 주입할 항목
```

`use_llm_for_glossary_match=True`를 주면 완전 일치여도 모델에 넘긴다.

비교할 때만 앞뒤 공백과 문장 끝 구두점을 떼어내므로, 음성 인식 결과에 마침표가
붙어도 완전 일치로 처리된다. 원문 자체는 바꾸지 않는다.

> 사전에 넣은 베트남어 표현은 AI가 초안을 만든 것이다. 실제 사용 전에 베트남어
> 사용자의 검토가 필요하다.

## 다음 단계

| 단계 | 내용 |
| --- | --- |
| 2 | Deepgram Nova-3 파일 기반 STT (wav → 텍스트) |
| 4 | `Translator` 인터페이스와 provider 구현, 시스템 프롬프트 동적 생성 |
| 5 | 2~4 연결, wav → JSON 엔드투엔드 |
| 6 | Deepgram 실시간 스트리밍, endpointing으로 발화 종료 감지 |

4단계는 번역 provider를 교체할 수 있도록 `Translator` 인터페이스 뒤에 둔다.
관용구 매칭, 시스템 프롬프트, 컨텍스트 버퍼는 provider와 무관하게 공유한다.

## Windows 콘솔 참고

한국어와 베트남어를 함께 출력하면 기본 코드 페이지(cp949)에서
`UnicodeEncodeError`가 날 수 있다. 출력 단계 문제이므로 실행 시 인코딩을 지정한다.

```bash
PYTHONIOENCODING=utf-8 python -m pytest
```
