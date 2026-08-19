"""회의 요약 provider 인터페이스.

`Translator`를 억지로 재사용하지 않는다. 번역은 "텍스트 하나 + 목표 언어
하나"지만, 요약은 "전사 전체 + 고정된 두 언어(한/베) 출력"이라 모양이 다르다.
provider 교체 가능·429 대체 원칙은 `translator.py`의 `FallbackTranslator`와
그대로 같다.
"""

import json
from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from .errors import ProviderUnavailableError, TranslationError


@dataclass(frozen=True)
class SummaryRequest:
    """요약 한 건에 필요한 입력."""

    room_name: str
    transcript_text: str

    def __post_init__(self) -> None:
        if not self.transcript_text.strip():
            raise ValueError("요약할 전사가 비어 있습니다.")


@dataclass(frozen=True)
class MeetingSummary:
    """요약 결과. 한국어와 베트남어를 한 번의 호출로 함께 받는다."""

    summary_ko: str
    summary_vi: str


@runtime_checkable
class Summarizer(Protocol):
    """회의 요약 provider가 만족해야 하는 계약."""

    def summarize(self, request: SummaryRequest) -> MeetingSummary: ...


def build_summary_system_prompt(request: SummaryRequest) -> str:
    """회의 전사를 요약하는 시스템 프롬프트를 만든다.

    `translator.py`의 `build_system_prompt`와 같은 구조다 — 규칙만 여기 담고,
    실제 전사 본문은 담지 않는다. 호출부가 ``request.transcript_text``를
    별도의 사용자 턴(``contents``)으로 보낸다.

    입력 전사는 화자별 원문이 한국어와 베트남어가 섞인 채로 온다(번역 안 됨).
    모델이 두 언어를 모두 읽을 수 있다고 가정하고, 출력만 고정된 JSON 형식으로
    강제한다 — 파싱을 문자열 구분자에 의존하지 않기 위해서다.
    """
    del request  # 지금은 규칙이 요청 내용에 따라 달라지지 않는다.
    return (
        "너는 화상회의 내용을 요약하는 도우미다. 사용자가 보내는 내용은 회의에서 "
        "실제로 오간 발화를 시간순으로 받아쓴 전사다. 화자 이름 뒤 대괄호 안 "
        "내용이 그 사람이 실제로 한 말이다. 한국어와 베트남어가 섞여 있을 수 "
        "있다.\n\n"
        "## 요약 규칙\n"
        "- 실제로 언급된 내용만 요약한다. 없는 내용을 지어내지 않는다.\n"
        "- 주요 논의 사항과 결정된 것을 중심으로 간결하게 정리한다.\n"
        "- 발화자 개개인의 사소한 잡담보다 회의의 핵심 흐름을 우선한다.\n\n"
        "## 출력 형식\n"
        "다른 설명 없이 아래 형식의 JSON 객체만 출력한다: "
        '{"summary_ko": "한국어 요약", "summary_vi": "베트남어 요약"}\n'
        "두 필드 모두 반드시 채운다 — 원문이 한쪽 언어로 치우쳐 있어도 "
        "양쪽 언어로 각각 자연스럽게 요약한다."
    )


class FallbackSummarizer:
    """1차 provider가 일시적으로 응답하지 못할 때만 2차로 넘기는 감싸개.

    `translator.py`의 `FallbackTranslator`와 완전히 같은 원칙이다 —
    ``ProviderUnavailableError``(호출 한도, 서버 과부하, 타임아웃)만 대체
    대상이고, 그 외 실패(JSON 파싱 실패 등)는 provider를 바꿔도 다시
    실패할 뿐이므로 그대로 올린다.
    """

    def __init__(self, primary: Summarizer, fallback: Summarizer) -> None:
        self._primary = primary
        self._fallback = fallback

    def summarize(self, request: SummaryRequest) -> MeetingSummary:
        try:
            return self._primary.summarize(request)
        except ProviderUnavailableError as error:
            print(
                "  [대체 provider] 회의 요약 1차 provider 일시 실패, "
                f"대체 provider로 전환합니다: {error}"
            )
            return self._fallback.summarize(request)


def parse_summary_response(text: str | None, provider_name: str) -> MeetingSummary:
    """provider가 돌려준 텍스트를 `MeetingSummary`로 파싱한다.

    두 provider(Gemini, OpenAI) 모두 구조화 JSON 출력을 요청하므로 파싱
    로직을 여기 하나로 둔다. 키가 없거나 JSON이 아니면 ``TranslationError``를
    던진다 — 파싱 실패는 provider를 바꿔도 다시 실패할 뿐이라 대체
    (``ProviderUnavailableError``) 대상이 아니다.
    """
    if not text or not text.strip():
        raise TranslationError(f"{provider_name}가 빈 응답을 반환했습니다.")

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as error:
        raise TranslationError(
            f"{provider_name} 응답을 JSON으로 파싱하지 못했습니다: {error}"
        ) from error

    summary_ko = parsed.get("summary_ko") if isinstance(parsed, dict) else None
    summary_vi = parsed.get("summary_vi") if isinstance(parsed, dict) else None
    if not isinstance(summary_ko, str) or not summary_ko.strip():
        raise TranslationError(
            f"{provider_name} 응답에 summary_ko가 없거나 비어 있습니다."
        )
    if not isinstance(summary_vi, str) or not summary_vi.strip():
        raise TranslationError(
            f"{provider_name} 응답에 summary_vi가 없거나 비어 있습니다."
        )

    return MeetingSummary(summary_ko=summary_ko.strip(), summary_vi=summary_vi.strip())
