"""발화에서 자막까지의 조립 테스트.

번역 provider는 가짜를 끼우므로 API 키 없이 돌아간다.
"""

import json

import pytest

from translation_pipeline import (
    ConversationContext,
    FakeTranslator,
    Glossary,
    ParticipantRegistry,
    TranslationPipeline,
)
from translation_pipeline.errors import UnknownParticipantError
from translation_pipeline.subtitle import SubtitleError

ROOM = "lab-ai-20260816-demo"

GLOSSARY_PAYLOAD = {
    "ko_vi": [{"ko": "고생하셨습니다", "natural_vi": "Cảm ơn anh/chị đã vất vả."}],
    "vi_ko": [],
}


@pytest.fixture
def glossary(tmp_path) -> Glossary:
    path = tmp_path / "glossary.json"
    path.write_text(json.dumps(GLOSSARY_PAYLOAD, ensure_ascii=False), encoding="utf-8")
    return Glossary.load(path)


@pytest.fixture
def participants() -> ParticipantRegistry:
    registry = ParticipantRegistry()
    registry.set_language("user_ko", "ko", display_name="민수")
    registry.set_language("user_vi", "vi", display_name="Linh")
    return registry


def make_pipeline(participants, glossary, translation="번역문", **kwargs):
    return TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=FakeTranslator(translation),
        glossary=glossary,
        **kwargs,
    )


def test_invalid_room_name_is_rejected_at_construction(participants, glossary):
    with pytest.raises(SubtitleError):
        make_pipeline(participants, glossary)  # noqa: F841
        TranslationPipeline(
            room_name="demo",
            participants=participants,
            translator=FakeTranslator(),
            glossary=glossary,
        )


def test_direction_comes_from_the_registry(participants, glossary):
    pipeline = make_pipeline(participants, glossary, translation="Xin chào")

    result = pipeline.handle_utterance("user_ko", "안녕하세요")

    payload = result.subtitle.to_dict()
    assert payload["sourceLanguage"] == "ko"
    assert payload["translatedLanguage"] == "vi"


def test_direction_flips_for_a_vietnamese_speaker(participants, glossary):
    pipeline = make_pipeline(participants, glossary, translation="안녕하세요")

    result = pipeline.handle_utterance("user_vi", "Xin chào")

    payload = result.subtitle.to_dict()
    assert payload["sourceLanguage"] == "vi"
    assert payload["translatedLanguage"] == "ko"


def test_speaker_display_name_is_used(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    result = pipeline.handle_utterance("user_ko", "안녕하세요")

    assert result.subtitle.to_dict()["speaker"]["displayName"] == "민수"


def test_unknown_speaker_is_rejected(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    with pytest.raises(UnknownParticipantError):
        pipeline.handle_utterance("user_never_joined", "안녕하세요")


def test_exact_glossary_match_skips_the_model(participants, glossary):
    translator = FakeTranslator("모델이 부른 결과")
    pipeline = TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=translator,
        glossary=glossary,
    )

    result = pipeline.handle_utterance("user_ko", "고생하셨습니다")

    assert result.used_translation_model is False
    assert translator.requests == []
    assert result.subtitle.to_dict()["translatedText"] == "Cảm ơn anh/chị đã vất vả."


def test_partial_match_still_calls_the_model(participants, glossary):
    translator = FakeTranslator("Cảm ơn anh/chị đã vất vả. Hẹn gặp lại.")
    pipeline = TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=translator,
        glossary=glossary,
    )

    result = pipeline.handle_utterance("user_ko", "다들 고생하셨습니다 내일 봬요")

    assert result.used_translation_model is True
    assert result.used_glossary is True
    assert len(translator.requests) == 1


def test_glossary_entries_are_passed_to_the_model(participants, glossary):
    translator = FakeTranslator("...")
    pipeline = TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=translator,
        glossary=glossary,
    )

    pipeline.handle_utterance("user_ko", "다들 고생하셨습니다 내일 봬요")

    assert translator.requests[0].glossary_entries


def test_unapplied_glossary_entries_are_counted(participants, glossary):
    # 사전값을 무시한 번역을 돌려주는 provider.
    pipeline = make_pipeline(participants, glossary, translation="Hẹn gặp lại.")

    result = pipeline.handle_utterance("user_ko", "다들 고생하셨습니다 내일 봬요")

    assert result.unapplied_glossary_count == 1


def test_context_grows_with_each_utterance(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_utterance("user_ko", "첫 번째")
    pipeline.handle_utterance("user_ko", "두 번째")

    assert len(pipeline.context) == 2


def test_context_is_passed_to_the_model(participants, glossary):
    translator = FakeTranslator("...")
    pipeline = TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=translator,
        glossary=glossary,
        context=ConversationContext(),
    )

    pipeline.handle_utterance("user_ko", "첫 번째")
    pipeline.handle_utterance("user_ko", "두 번째")

    assert len(translator.requests[1].context_turns) == 1


def test_late_translation_is_discarded(participants, glossary):
    import time

    pipeline = make_pipeline(participants, glossary, max_staleness_ms=0)

    # 발화 시각을 과거로 주면 번역이 늦게 끝난 상황이 된다.
    result = pipeline.handle_utterance(
        "user_ko", "안녕하세요", spoken_at=time.monotonic() - 10
    )

    assert result.subtitle is None
    assert result.skip_reason is not None
    assert "기준을 넘겼습니다" in result.skip_reason


def test_discarded_translation_does_not_pollute_context(participants, glossary):
    import time

    pipeline = make_pipeline(participants, glossary, max_staleness_ms=0)

    pipeline.handle_utterance("user_ko", "안녕하세요", spoken_at=time.monotonic() - 10)

    # 화면에 뜨지 않은 문장이 이후 번역의 선례가 되면 안 된다.
    assert len(pipeline.context) == 0


def test_glossary_only_result_is_never_discarded(participants, glossary):
    import time

    # 사전만으로 끝나면 지연이 사실상 없으므로 폐기 대상이 아니다.
    pipeline = make_pipeline(participants, glossary, max_staleness_ms=0)

    result = pipeline.handle_utterance(
        "user_ko", "고생하셨습니다", spoken_at=time.monotonic() - 10
    )

    assert result.subtitle is not None


def test_each_utterance_gets_its_own_subtitle_id(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    first = pipeline.handle_utterance("user_ko", "첫 번째")
    second = pipeline.handle_utterance("user_ko", "두 번째")

    assert first.subtitle.subtitleId != second.subtitle.subtitleId
