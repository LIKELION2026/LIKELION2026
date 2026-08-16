"""번역 요청 검증과 시스템 프롬프트 생성 테스트."""

import pytest

from translation_pipeline.context import ConversationTurn
from translation_pipeline.errors import UnsupportedLanguageError
from translation_pipeline.glossary import GlossaryEntry
from translation_pipeline.translator import (
    FakeTranslator,
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
