"""번역 요청 검증과 시스템 프롬프트 생성 테스트."""

import time

import pytest

from translation_pipeline.context import ConversationTurn
from translation_pipeline.errors import (
    ProviderUnavailableError,
    TranslationError,
    UnsupportedLanguageError,
)
from translation_pipeline.glossary import GlossaryEntry
from translation_pipeline.translator import (
    FakeTranslator,
    FallbackTranslator,
    HedgedTranslator,
    TranslationRequest,
    Translator,
    build_system_prompt,
)

ENTRY = GlossaryEntry(
    source_text="고생하셨습니다", target_text="Cảm ơn anh/chị đã vất vả."
)
TURN = ConversationTurn(
    speaker_id="user_ko",
    original_text="내일 회의는 세 시입니다",
    translated_text="Cuộc họp ngày mai lúc 3 giờ.",
)


def make_request(**overrides) -> TranslationRequest:
    values = {"text": "안녕하세요", "source_lang": "ko", "target_lang": "vi"}
    values.update(overrides)
    return TranslationRequest(**values)


def test_request_rejects_unsupported_language():
    with pytest.raises(UnsupportedLanguageError):
        make_request(target_lang="en")


def test_request_rejects_same_source_and_target():
    with pytest.raises(ValueError):
        make_request(source_lang="ko", target_lang="ko")


@pytest.mark.parametrize("text", ["", "   ", "\n"])
def test_request_rejects_blank_text(text):
    with pytest.raises(ValueError):
        make_request(text=text)


def test_prompt_states_the_translation_direction():
    prompt = build_system_prompt(make_request())

    assert "한국어" in prompt
    assert "베트남어" in prompt


def test_prompt_direction_follows_the_request():
    prompt = build_system_prompt(make_request(source_lang="vi", target_lang="ko"))

    # 베트남어 발화를 한국어로 옮긴다는 문장이어야 한다.
    assert prompt.index("베트남어") < prompt.index("한국어")


def test_prompt_always_forbids_extra_text():
    prompt = build_system_prompt(make_request())

    assert "번역된 문장만 출력한다" in prompt
    assert "따옴표" in prompt


def test_prompt_always_forbids_literal_translation():
    prompt = build_system_prompt(make_request())

    assert "직역하지 않는다" in prompt
    assert "문맥" in prompt


def test_glossary_section_is_omitted_when_there_is_no_match():
    prompt = build_system_prompt(make_request())

    assert "확정 번역 사전" not in prompt


def test_glossary_section_lists_matched_entries():
    prompt = build_system_prompt(make_request(glossary_entries=(ENTRY,)))

    assert "확정 번역 사전" in prompt
    assert ENTRY.source_text in prompt
    assert ENTRY.target_text in prompt


def test_glossary_rule_outranks_the_other_rules():
    prompt = build_system_prompt(make_request(glossary_entries=(ENTRY,)))

    assert "모든 규칙보다 우선한다" in prompt
    # 우선 규칙이 일반 번역 규칙보다 먼저 나와야 한다.
    assert prompt.index("확정 번역 사전") < prompt.index("## 번역 규칙")


def test_context_section_is_omitted_when_there_is_no_history():
    prompt = build_system_prompt(make_request())

    assert "최근 대화" not in prompt


def test_context_section_lists_previous_turns():
    prompt = build_system_prompt(make_request(context_turns=(TURN,)))

    assert "최근 대화" in prompt
    assert TURN.speaker_id in prompt
    assert TURN.original_text in prompt
    assert TURN.translated_text in prompt


def test_context_section_says_it_is_only_reference():
    prompt = build_system_prompt(make_request(context_turns=(TURN,)))

    # 최근 대화를 번역 대상으로 착각하지 않도록 명시해야 한다.
    assert "번역 대상은" in prompt


def test_prompt_includes_every_section_together():
    prompt = build_system_prompt(
        make_request(glossary_entries=(ENTRY,), context_turns=(TURN,))
    )

    for section in ["확정 번역 사전", "## 번역 규칙", "최근 대화", "## 출력 형식"]:
        assert section in prompt


def test_fake_translator_satisfies_the_protocol():
    assert isinstance(FakeTranslator(), Translator)


def test_fake_translator_returns_configured_text():
    translator = FakeTranslator("결과")

    assert translator.translate(make_request()) == "결과"


def test_fake_translator_records_requests():
    translator = FakeTranslator()
    request = make_request()

    translator.translate(request)

    assert translator.requests == [request]


# --- 이중 요청(HedgedTranslator) ---
#
# 완전히 고정된 지연에는 효과가 없고, 무작위로 널뛰는 지연에서 최악의 경우를
# 줄이는 용도다. 실패에는 관여하지 않는다 — 늦을 때만 하나 더 쏜다.


class ControllableTranslator:
    """호출마다 얼마나 걸릴지, 성공할지 실패할지 순서대로 미리 정해두는 대역."""

    def __init__(self, plan):
        self._plan = list(plan)
        self.calls = 0
        self.call_times = []

    def translate(self, request: TranslationRequest) -> str:
        self.call_times.append(time.monotonic())
        self.calls += 1
        delay, outcome = self._plan.pop(0)
        time.sleep(delay)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


def test_a_fast_response_is_used_without_hedging():
    inner = ControllableTranslator([(0.0, "빠른 번역")])
    hedged = HedgedTranslator(inner, hedge_after_ms=200)

    result = hedged.translate(make_request())

    assert result == "빠른 번역"
    # 시간 안에 왔으니 두 번째 요청은 나가지 않아야 한다.
    assert inner.calls == 1


def test_a_slow_first_call_triggers_a_second_attempt():
    # 첫 번째는 느리고, 두 번째(이중 요청)는 빠르다.
    inner = ControllableTranslator([(0.3, "늦은 번역"), (0.0, "빠른 번역")])
    hedged = HedgedTranslator(inner, hedge_after_ms=50)

    result = hedged.translate(make_request())

    assert result == "빠른 번역"
    assert inner.calls == 2


def test_the_second_attempt_only_fires_after_the_hedge_delay():
    inner = ControllableTranslator([(0.3, "늦은 번역"), (0.0, "빠른 번역")])
    hedged = HedgedTranslator(inner, hedge_after_ms=100)

    hedged.translate(make_request())

    gap = inner.call_times[1] - inner.call_times[0]
    # 100ms 전에 쐈으면 이중 요청이 아니라 그냥 동시 호출이다.
    assert gap >= 0.09


def test_a_fast_failure_does_not_trigger_a_second_attempt():
    # 빨리 실패하면 그대로 올린다. 늦게 온 번역은 의미가 없다는 것과 같은
    # 이유로, 실패를 재시도하는 로직은 두지 않는다.
    inner = ControllableTranslator([(0.0, TranslationError("바로 실패"))])
    hedged = HedgedTranslator(inner, hedge_after_ms=200)

    with pytest.raises(TranslationError):
        hedged.translate(make_request())

    assert inner.calls == 1


def test_when_both_attempts_fail_the_error_propagates():
    inner = ControllableTranslator(
        [(0.3, TranslationError("첫 시도 실패")), (0.0, TranslationError("두 번째도 실패"))]
    )
    hedged = HedgedTranslator(inner, hedge_after_ms=50)

    with pytest.raises(TranslationError):
        hedged.translate(make_request())

    assert inner.calls == 2


def test_when_the_slow_first_attempt_eventually_succeeds_it_is_used():
    # 이중 요청이 먼저 끝났는데 실패였다. 원래 요청이 늦게라도 성공하면 그걸 쓴다.
    inner = ControllableTranslator(
        [(0.2, "느리지만 성공"), (0.0, TranslationError("이중 요청 실패"))]
    )
    hedged = HedgedTranslator(inner, hedge_after_ms=50)

    result = hedged.translate(make_request())

    assert result == "느리지만 성공"
    assert inner.calls == 2


# --- 대체 provider(FallbackTranslator) ---
#
# 1차 provider가 일시 실패(ProviderUnavailableError — 호출 한도 초과, 서버
# 과부하, 타임아웃)했을 때만 2차로 넘긴다. 그 외 실패는 provider를 바꿔도
# 다시 실패할 뿐이므로 그대로 올린다.


def test_uses_the_primary_result_when_it_succeeds():
    primary = FakeTranslator("1차 번역")
    fallback = FakeTranslator("2차 번역")
    translator = FallbackTranslator(primary, fallback)

    result = translator.translate(make_request())

    assert result == "1차 번역"
    assert len(fallback.requests) == 0


def test_falls_back_when_the_primary_is_temporarily_unavailable():
    primary = ControllableTranslator([(0.0, ProviderUnavailableError("일시 실패"))])
    fallback = FakeTranslator("2차 번역")
    translator = FallbackTranslator(primary, fallback)

    result = translator.translate(make_request())

    assert result == "2차 번역"
    assert primary.calls == 1
    assert len(fallback.requests) == 1


def test_other_failures_are_not_sent_to_the_fallback():
    # 잘못된 요청이나 빈 응답 같은 실패는 provider를 바꿔도 똑같이 실패한다.
    # 대체 없이 그대로 올려야 원인 파악이 쉽다.
    primary = ControllableTranslator([(0.0, TranslationError("일반 실패"))])
    fallback = FakeTranslator("2차 번역")
    translator = FallbackTranslator(primary, fallback)

    with pytest.raises(TranslationError) as exc_info:
        translator.translate(make_request())

    assert not isinstance(exc_info.value, ProviderUnavailableError)
    assert len(fallback.requests) == 0


def test_each_call_retries_the_primary_first():
    # 상태를 따로 기억하지 않는다. 1차가 회복되면 다음 호출에서 자연히
    # 1차로 돌아간다.
    primary = ControllableTranslator(
        [(0.0, ProviderUnavailableError("일시 실패")), (0.0, "복구된 1차 번역")]
    )
    fallback = FakeTranslator("2차 번역")
    translator = FallbackTranslator(primary, fallback)

    first = translator.translate(make_request())
    second = translator.translate(make_request())

    assert first == "2차 번역"
    assert second == "복구된 1차 번역"
    assert primary.calls == 2
    assert len(fallback.requests) == 1
