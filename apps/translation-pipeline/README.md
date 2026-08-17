# Translation Pipeline

> 상태: 마이크 실시간 통역과 자막 발행 동작
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
│       ├── context.py          # ConversationContext (최근 대화 버퍼)
│       ├── translator.py       # Translator 계약, 시스템 프롬프트, FakeTranslator
│       ├── stt.py              # Deepgram 실시간 인식, 마이크 입력
│       ├── pipeline.py         # 발화 -> 자막 조립, 늦은 번역 폐기
│       ├── subtitle.py         # 자막 페이로드 (shared 계약)
│       ├── publisher.py        # Server로 자막 발행
│       ├── providers/
│       │   └── gemini.py       # GeminiTranslator
│       └── participants.py     # ParticipantRegistry
├── scripts/
│   └── live_translate.py       # 마이크 실시간 통역 실행
└── tests/
    ├── test_languages.py
    ├── test_glossary.py
    ├── test_context.py
    ├── test_translator.py
    ├── test_gemini_translator.py
    ├── test_stt.py
    ├── test_pipeline.py
    ├── test_subtitle.py
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
cp .env.example .env
```

`.env`에 사용할 provider의 키만 채우면 된다. 4단계는 `GEMINI_API_KEY`가 필요하고,
[Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급받을 수 있다.

**테스트는 키 없이 전부 통과한다.** Gemini 호출은 가짜 클라이언트로 검증하므로
API 키와 네트워크가 없어도 된다.

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

### 4단계: 번역 provider

```bash
cd apps/translation-pipeline
python -m pytest -v tests/test_translator.py tests/test_gemini_translator.py tests/test_context.py
```

번역은 `Translator` 계약 뒤에 있고 파이프라인은 provider를 알지 못한다.

```python
class Translator(Protocol):
    def translate(self, request: TranslationRequest) -> str: ...
```

provider와 무관하게 공유하는 것은 관용구 매칭, 시스템 프롬프트 생성, 대화 컨텍스트
버퍼, 출력 조립이다. provider마다 달라지는 것은 SDK 호출, 응답에서 텍스트를 꺼내는
방식, 예외 타입뿐이다.

```python
from translation_pipeline import ConversationContext, Glossary, TranslationRequest
from translation_pipeline.providers import GeminiTranslator

glossary = Glossary.load()
context = ConversationContext()          # 최근 5턴 유지
translator = GeminiTranslator()          # GEMINI_API_KEY 필요

text = "다들 고생하셨습니다 내일 봬요"
match = glossary.match(text, "ko", "vi")

if match.can_skip_translation_model:
    translated = match.direct_translation          # 모델 호출 없음
else:
    translated = translator.translate(
        TranslationRequest(
            text=text,
            source_lang="ko",
            target_lang="vi",
            glossary_entries=match.entries,        # 확정 번역 사전으로 주입
            context_turns=context.recent(),
        )
    )

context.add("user_abc123", text, translated)
```

시스템 프롬프트는 번역 방향에 맞춰 매번 생성되고, 확정 번역 사전과 최근 대화는
있을 때만 들어간다. 사전 규칙이 다른 모든 규칙보다 우선한다고 명시한다.

provider를 바꾸려면 `Translator`를 만족하는 클래스를 `providers/`에 추가하고
조립 지점에서 바꿔 끼우면 된다. 테스트에는 `FakeTranslator`를 쓴다.

### 마이크 실시간 통역과 자막 발행

말하면 번역이 화면에 뜨고, `--publish`를 주면 회의 화면에 자막으로 나간다.

```powershell
cd C:\LIKELION2026\apps\translation-pipeline
.venv\Scripts\python.exe -u scripts\live_translate.py --speaker user_ko --name 민수
.venv\Scripts\python.exe -u scripts\live_translate.py --speaker user_vi --language vi --publish
```

방 이름은 생략하면 오늘 날짜로 만들어지므로 회의 화면과 저절로 맞는다. 다른
구역이면 `--section`을 준다.

`-u`를 빼면 출력이 버퍼링되어 보이지 않을 수 있다. Ctrl+C로 종료하면 통계가 나온다.

```text
마이크 -> Deepgram -> 관용구 사전 -> 번역 -> 자막 페이로드 -> Server
```

발화 종료는 Deepgram의 `speech_final`로 판단한다. 별도 VAD를 만들지 않았다.
번역 방향은 `ParticipantRegistry`에 등록된 화자 언어로 정해진다. 타겟 언어는
`get_target_lang()`이 화자 언어만으로 결정하므로 따로 지정하지 않는다.

| 옵션 | 용도 |
| --- | --- |
| `--speaker` | 화자 참가자 ID. 자막의 `participantIdentity`가 된다 |
| `--name` | 자막에 표시할 이름. 생략하면 참가자 ID를 쓴다 |
| `--language vi` | 베트남어로 말하고 한국어를 받는다 |
| `--room` | 회의방 이름을 직접 지정한다. 생략하면 오늘 날짜로 만든다 |
| `--section korea-team-zone` | 회의 구역을 고른다. `--room`을 줬으면 무시한다 |
| `--publish` | Server로 자막을 발행한다 |
| `--server` | Server 주소. 기본값은 `http://localhost:4000` |
| `--max-staleness` | 이 시간을 넘겨 도착한 번역은 버린다(ms) |
| `--interim-interval` | 중간 결과를 번역에 올리는 최소 간격(ms) |
| `--no-interim-translation` | 중간 결과를 번역하지 않는다. 확정 조각만 번역한다 |
| `--model` | 번역 모델을 바꾼다 |
| `--endpointing 600` | 문장이 잘게 쪼개질 때 무음 판정을 늘린다 |
| `--device 17` | 마이크 장치를 지정한다 (스테레오 믹스로 시스템 소리 입력 가능) |
| `--no-interim` | 인식 중간 결과를 화면에 숨긴다 |
| `--timeout` | 번역 대기 시간(ms). 생략하면 모델에 맞춰 정한다 |

### 회의방 이름

`--room`을 생략하면 Client와 같은 공식으로 오늘 날짜의 이름을 만든다.

```text
lab-likelion-20260817-meeting-room
     ^팀       ^오늘   ^구역
```

Client가 이 이름을 `new Date()`로 만들기 때문에, 손으로 넣으면 날짜가 바뀔 때
어긋난다. **어긋나도 아무 신호가 없다.** 이름 형식은 유효하니 검증을 통과하고
서버 발행도 성공한다. 회의 화면에만 자막이 안 뜬다.

| `--section` | 만들어지는 이름 |
| --- | --- |
| `meeting-room` (기본) | `lab-likelion-<오늘>-meeting-room` |
| `shared-collaboration-zone` | `lab-likelion-<오늘>-shared-collab` |
| `korea-team-zone` | `lab-likelion-<오늘>-korea-team` |
| `vietnam-team-zone` | `lab-likelion-<오늘>-vietnam-team` |

날짜는 로컬 기준이다. Client의 `new Date()`가 로컬이라 UTC로 만들면 자정
부근에 하루가 어긋난다.

구역 표는 Client의 `meeting-room-section.ts`를 옮겨 적은 것이다.
`packages/shared`에 방 이름 규칙이 없어 지금은 공유할 방법이 없다.

대신 테스트가 그 파일을 읽어 팀 slug, 구역 표, 기본 구역, 이름 형식을 대조한다.
Client가 바뀌면 자막이 안 뜬 뒤에 찾는 대신 `pytest`에서 깨진다. 파일이 옮겨진
경우도 실패로 처리한다. 건너뛰면 이 테스트가 아무것도 지키지 않는다.

회의 화면에도 방 이름이 나오므로(`MeetingLabPage`), 확인하고 싶으면 `--room`에
그대로 넣으면 된다.

### 말하는 도중 번역

말이 멈추기를 기다리지 않는다. Deepgram이 말하는 도중 1초에 한 번쯤 보내는
중간 결과를 `--interim-interval` 간격으로 번역해 자막을 먼저 띄우고, 조각이
확정되면 같은 자막을 덮어쓴다.

```text
말하는 중   중간 결과 -> 번역 -> rev 1, isFinal false
            중간 결과 -> 번역 -> rev 2, isFinal false
조각 확정   확정 조각 -> 번역 -> rev 3, isFinal false
말 끝남     마지막 조각 -> 번역 -> rev 4, isFinal true
```

`subtitleId`는 발화 내내 고정이므로 Client에는 자막 한 줄이 자라면서
정확해지는 것으로 보인다.

확정 조각과 중간 결과는 누적 방식이 다르다. 확정 조각은 Deepgram이 다시
보내지 않으므로 이어붙이고, 중간 결과는 같은 조각이 자라는 중이라 매번
통째로 다시 오므로 잠정 꼬리 하나를 갈아끼운다. 섞으면 `이번 이번 회의
이번 회의에서`가 된다.

간격을 두는 이유는 두 가지다. 번역이 1.4~1.9초 걸려 인식 결과가 오는 대로
다 부르면 밀리기만 하고, 무료 한도가 분당 호출 수로 걸린다. `429`가 나오면
간격을 늘린다.

누적 원문이 직전과 같으면 모델을 부르지 않고 이전 번역을 재사용한다. 중간
결과가 이미 조각 전체였던 경우인데, 실측에서 호출 11번 중 2번이 여기 해당했다.
발행은 그대로 한다. `isFinal`이 바뀌어야 자막이 미확정으로 남지 않는다.

`--endpointing`을 낮게 둘 이유가 없어졌다. 예전에는 자막을 빨리 띄우려고
낮췄지만, 이제 중간 결과가 그 역할을 한다. 값을 올리면 문장이 잘게 쪼개지지
않아 번역 품질이 좋아지고, 첫 자막은 늦어지지 않는다.

### 번역 스레드 분리

번역은 워커 스레드 하나에서 돈다(`session.py`). Deepgram 결과를 읽는
스레드에서 그대로 번역하면 번역이 도는 동안 인식 결과를 놓치고, 확정 조각
처리도 그만큼 밀린다.

워커를 하나만 두는 이유는 순서 때문이다. 병렬로 돌리면 나중에 시작한 번역이
먼저 끝나 자막이 뒤로 되돌아갈 수 있다. 워커가 하나면 `revision`을 매기는
순서와 발행 순서가 같다.

밀렸을 때 처리가 다르다.

| | 밀리면 |
| --- | --- |
| 중간 결과 | 최신 하나만 남기고 버린다. 곧 더 긴 것이 온다 |
| 확정 조각 | 전부 처리한다. 버리면 그 말이 사라진다 |

종료할 때도 남은 확정 조각은 마저 번역한다. 중간 결과는 버린다.

### 자막 계약

출력은 `packages/shared`의 `SubtitleCreatedPayload`를 따른다. Client와 Server가
이미 이 형식을 쓰므로 파이프라인이 별도 형식을 만들지 않는다.

```
POST /meeting/subtitles/mock  ->  소켓 이벤트 subtitle.created
```

```json
{
  "subtitleId": "47ebde54865f4deebeea3c23486b9f2b",
  "roomName": "lab-ai-20260816-demo",
  "speaker": { "participantIdentity": "user_ko", "displayName": "민수" },
  "sourceLanguage": "ko",
  "sourceText": "다들 고생하셨습니다",
  "translatedLanguage": "vi",
  "translatedText": "Cảm ơn mọi người.",
  "occurredAt": "2026-08-16T09:12:58.988+00:00",
  "isFinal": true,
  "revision": 1
}
```

`roomName`과 `participantIdentity`는 서버와 같은 정규식으로 보내기 전에 검증한다.
서버 응답만 보면 어느 발화가 문제였는지 알기 어렵기 때문이다.

### 늦은 번역 폐기

번역이 `--max-staleness`(기본 15초)를 넘겨 도착하면 **발화의 마지막 조각에 한해**
자막을 만들지 않는다.

Client는 자막을 도착 순이 아니라 `occurredAt` 순으로 정렬한다. 그래서 늦게 도착한
자막도 제 시간 자리에 들어가고, 순서가 엉키지 않는다. 이 기준은 대화 순서를 지키는
규칙이 아니라 응답이 비정상적으로 늦어질 때를 막는 안전장치다.

중간 조각은 늦어도 버리지 않는다. 늦게 도착하면 Client가 `revision`으로 걸러내고,
버려봐야 다음 조각이 어차피 전체를 다시 번역한다. 이미 쓴 호출의 결과만 잃는다.

버렸을 때 실제로 손해가 나는 쪽은 마지막 조각뿐이다. 미완성 번역이 화면에 남거나,
조각이 하나뿐이었다면 자막이 아예 뜨지 않는다. 그래서 판단을 여기로 한정한다.

버린 번역은 대화 컨텍스트에도 넣지 않는다. 화면에 없는 문장이 이후 번역의 선례가
되면 안 되기 때문이다.

사전만으로 끝난 발화는 지연이 사실상 없으므로 폐기 대상이 아니다.

실제 음성으로 확인한 결과다.

```text
[ko] 다들 고생하셨습니다. 내일 봬요.
[vi] Cảm ơn anh/chị đã vất vả. Hẹn gặp lại mọi người vào ngày mai.
  (모델, 2.1s)

[ko] 고생하셨습니다
[vi] Cảm ơn anh/chị đã vất vả.
  (사전, 0.0s)
```

사전과 완전히 일치하는 발화는 모델을 거치지 않아 즉시 나온다.

## 다음 단계

| 단계 | 내용 |
| --- | --- |
| 2 | Deepgram 파일 기반 STT (wav → 텍스트). 실시간 경로가 먼저 동작해 후순위가 됐다 |
| 5 | 출력 JSON 조립, 늦게 도착한 번역 폐기 처리 |

## 알려진 제한

- **확정 번역 사전이 항상 그대로 적용되지는 않는다.** 프롬프트에 "다른 모든 규칙보다
  우선한다"고 명시했지만, 모델이 문맥에 맞춰 변형하는 경우가 관측됐다. 사전값이
  `Cảm ơn anh/chị đã vất vả.`일 때 `Cảm ơn mọi người đã vất vả.`로 인칭을 바꾼 사례가
  있다. 원문 전체가 일치하는 경우는 모델을 거치지 않으므로 영향이 없고, 부분 일치일
  때만 발생한다. 사전 준수가 반드시 필요하면 반환값에 사전 표현이 있는지 확인하는
  단계가 따로 필요하다.
- Gemini 무료 티어는 서버 과부하로 일시 실패(503, 504)가 난다. **재시도하지 않고
  `TranslationError`를 그대로 올린다.** 실시간 통역에서 늦게 도착한 번역은 이후 발화와
  순서가 엉켜 대화를 방해하므로, 재시도로 살려내는 것보다 그 발화를 버리는 편이 낫다.
  호출자가 건너뛰기를 처리해야 한다.
- timeout은 10초다. 더 짧게 두고 싶지만 Gemini가 10초 미만 deadline을 400으로 거절한다.
  따라서 "늦은 번역은 버린다"는 판단은 이 계층에서 할 수 없고, 발화 시각을 아는 호출자가
  5단계에서 처리해야 한다.
- 지연이 일정하지 않다. 같은 문장이 2.5초에 오기도 하고 8초를 넘기기도 하며, 호출을
  연달아 하면 느려지는 경향이 관측됐다. 실시간 통역에 쓸 수 있는 수준인지는 6단계에서
  실제 발화 간격과 함께 다시 판단해야 한다.
- 기본 모델은 `gemini-3.1-flash-lite`다. 2026-08-16 측정에서 평균 2.0초로 가장 빨랐고
  무료 티어 할당량도 남아 있었다. 같은 시점에 `gemini-3.5-flash`는 429로 막혔고
  `gemini-3-flash-preview`는 7.3초였다. 처음에는 lite의 번역 품질을 걱정해 일반 모델을
  기본으로 뒀지만 품질 저하가 관측되지 않았고 사전 준수는 오히려 나았다.
- `gemma-4-31b-it`, `gemma-4-26b-a4b-it`는 무료 티어 할당량이 훨씬 넉넉하지만 응답이
  13~21초라 실시간 통역에는 쓸 수 없다. 할당량이 많이 필요한 측정 작업에만 쓴다.
- 무료 티어는 입력이 모델 개선에 사용될 수 있다. 개발·데모 검증에만 쓰고 실제 사용자
  회의에는 적용하지 않는다. 자세한 내용은 `docs/ADR/0001-translation-provider-abstraction.md`.
- `data/glossary.json`의 베트남어 표현은 AI 초안이며 베트남어 사용자 검토가 필요하다.

## Windows 콘솔 참고

한국어와 베트남어를 함께 출력하면 기본 코드 페이지(cp949)에서
`UnicodeEncodeError`가 날 수 있다. 출력 단계 문제이므로 실행 시 인코딩을 지정한다.

```bash
PYTHONIOENCODING=utf-8 python -m pytest
```
