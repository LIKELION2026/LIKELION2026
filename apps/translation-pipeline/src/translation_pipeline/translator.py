"""번역 provider 인터페이스와 시스템 프롬프트 생성.

파이프라인은 어떤 provider를 쓰는지 알지 못한다. 관용구 매칭, 프롬프트 구성,
컨텍스트 버퍼는 provider와 무관하게 공유하고, provider별로 달라지는 부분은
`Translator` 구현체 안에만 둔다.
"""

import queue
import threading
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

from .context import ConversationTurn
from .errors import TranslationError
from .glossary import GlossaryEntry
from .guidelines import load_guidelines
from .languages import ensure_supported, language_name


@dataclass(frozen=True)
class TranslationRequest:
    """번역 한 건에 필요한 모든 입력.

    provider 구현체는 이 값을 각자의 SDK 형식으로 옮기기만 하면 된다.
    """

    text: str
    source_lang: str
    target_lang: str
    glossary_entries: tuple[GlossaryEntry, ...] = field(default_factory=tuple)
    context_turns: tuple[ConversationTurn, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        ensure_supported(self.source_lang)
        ensure_supported(self.target_lang)
        if self.source_lang == self.target_lang:
            raise ValueError("원문과 번역 언어가 같습니다.")
        if not self.text.strip():
            raise ValueError("번역할 원문이 비어 있습니다.")


@runtime_checkable
class Translator(Protocol):
    """번역 provider가 만족해야 하는 계약."""

    def translate(self, request: TranslationRequest) -> str:
        """번역문만 반환한다. 앞뒤 공백은 제거된 상태여야 한다."""
        ...


# 대기 시간 실측(rev1만, 클라우드 배포 기준)으로 정한 시작값이다. 평균
# 1701ms, 최소 843ms, 최대 3229ms였다. 정식으로 튜닝한 값은 아니다.
DEFAULT_HEDGE_AFTER_MS = 1200


class HedgedTranslator:
    """느리게 응답하는 호출을 다른 시도로 만회하는 감싸개.

    안쪽 번역기를 부르고, ``hedge_after_ms`` 안에 응답이 없으면 같은 요청을
    한 번 더 보낸다. 둘 중 먼저 오는 것을 쓰고 나머지는 버린다.

    실패에는 관여하지 않는다. 빨리 실패하면 그대로 올린다 — 늦게 온 번역은
    보여줄 의미가 없다는 판단으로 재시도 로직 자체를 두지 않기로 했던 결정과
    같은 이유다. 여기서 두 번째 요청을 보내는 건 오직 "너무 느릴 때"뿐이고,
    "실패했을 때"가 아니다.

    완전히 고정된 지연(예: 물리적으로 먼 리전)에는 효과가 없다. 무작위로
    널뛰는 지연에서 최악의 경우를 줄이는 용도다.
    """

    def __init__(
        self, inner: Translator, hedge_after_ms: int = DEFAULT_HEDGE_AFTER_MS
    ) -> None:
        self._inner = inner
        self._hedge_after = hedge_after_ms / 1000

    def translate(self, request: TranslationRequest) -> str:
        results: queue.Queue = queue.Queue()

        def attempt() -> None:
            try:
                results.put(("ok", self._inner.translate(request)))
            except TranslationError as error:
                results.put(("err", error))

        threading.Thread(target=attempt, daemon=True).start()
        pending = 1
        hedged = False
        last_error: TranslationError | None = None

        while pending > 0:
            timeout = None if hedged else self._hedge_after
            try:
                kind, value = results.get(timeout=timeout)
            except queue.Empty:
                # 정해진 시간 안에 아무 응답도 없었다. 한 번만 더 쏜다.
                # 실제로 발동한 빈도를 운영 로그에서 볼 수 있어야 튜닝이
                # 가능하다. 실측(Issue #118)에서 발화 10건 중 6건이 발동했다.
                print(
                    f"  [이중 요청] {self._hedge_after * 1000:.0f}ms 안에 "
                    "응답이 없어 하나 더 보냅니다."
                )
                threading.Thread(target=attempt, daemon=True).start()
                pending += 1
                hedged = True
                continue

            pending -= 1
            if kind == "ok":
                return value
            last_error = value

        assert last_error is not None
        raise last_error


def build_system_prompt(request: TranslationRequest) -> str:
    """번역 방향에 맞춰 시스템 프롬프트를 만든다.

    확정 번역 사전과 최근 대화는 있을 때만 넣는다. 빈 섹션을 넣으면 모델이
    존재하지 않는 제약을 지어내는 경우가 있다.
    """
    source_name = language_name(request.source_lang)
    target_name = language_name(request.target_lang)

    # "베트남어으로"처럼 조사가 어긋나지 않도록 명사를 하나 끼워 둔다.
    sections = [
        f"너는 화상회의 실시간 통역사다. {source_name} 발화를 {target_name} 문장으로 옮긴다."
    ]

    if request.glossary_entries:
        lines = "\n".join(
            f'- "{entry.source_text}" -> "{entry.target_text}"'
            for entry in request.glossary_entries
        )
        sections.append(
            "## 확정 번역 사전\n"
            "아래 표현이 원문에 있으면 반드시 지정된 번역을 그대로 사용한다. "
            "다른 표현으로 바꾸지 않는다.\n"
            "이 규칙은 아래의 모든 규칙보다 우선한다.\n"
            f"{lines}"
        )

    sections.append(
        "## 번역 규칙\n"
        "- 직역하지 않는다. 문맥과 화자 사이의 관계를 고려해 자연스럽게 옮긴다.\n"
        "- 회의에서 실제로 쓰는 말투를 사용한다.\n"
        "- 원문이 유보적이거나 애매하면 그 정도를 그대로 유지한다. 확답이나 "
        "거절 어느 쪽으로도 단정해서 옮기지 않는다.\n"
        "- 음성 인식 결과라 문장이 중간에 끊길 수 있다. 끊긴 자리는 끊긴 채로 "
        "옮긴다. 뒷말을 지어내 완결된 문장으로 만들지 마라.\n"
        "- 특히 끊긴 조각을 요청이나 지시로 바꾸지 마라. 마지막 단어가 그 자체로 "
        "뜻이 통해도 마찬가지다. 그 단어가 문장의 끝이라고 단정할 수 없다."
    )

    guidelines = load_guidelines(request.source_lang, request.target_lang)
    if guidelines:
        sections.append(guidelines)

    if request.context_turns:
        lines = "\n".join(
            f"- [{turn.speaker_id}] {turn.original_text} -> {turn.translated_text}"
            for turn in request.context_turns
        )
        sections.append(
            "## 최근 대화\n"
            "지시어와 생략된 주어를 해석할 때 참고한다. 번역 대상은 아래 대화가 "
            "아니라 사용자가 보내는 문장 하나다.\n"
            f"{lines}"
        )

    sections.append(
        "## 출력 형식\n"
        "번역된 문장만 출력한다. 설명, 이유, 따옴표, 접두어 등 어떤 부가 텍스트도 "
        "포함하지 않는다."
    )

    return "\n\n".join(sections)


class FakeTranslator:
    """테스트용 provider.

    API 키 없이 엔드투엔드 흐름을 검증하기 위해 쓴다. 받은 요청을 그대로
    기록하므로 프롬프트 구성이나 호출 횟수를 확인할 수 있다.
    """

    def __init__(self, translation: str = "[fake] 번역 결과") -> None:
        self._translation = translation
        self.requests: list[TranslationRequest] = []

    def translate(self, request: TranslationRequest) -> str:
        self.requests.append(request)
        return self._translation
