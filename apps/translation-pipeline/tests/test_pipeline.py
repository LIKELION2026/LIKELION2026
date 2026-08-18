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


# --- 발화 조각 누적 ---
#
# Deepgram은 발화를 겹치지 않는 조각으로 확정한다. 조각이 올 때마다 그때까지
# 쌓인 전체를 번역해 같은 자막을 덮어쓴다.


def test_segments_of_one_utterance_share_a_subtitle_id(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    first = pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    second = pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")

    assert first.subtitle.subtitleId == second.subtitle.subtitleId


def test_revision_rises_with_each_segment(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    first = pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    second = pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")

    # Client는 subtitleId가 같으면 revision이 높은 것으로 교체한다.
    assert (first.subtitle.revision, second.subtitle.revision) == (1, 2)


def test_a_mid_utterance_segment_is_not_final(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    result = pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)

    assert result.subtitle.to_dict()["isFinal"] is False


def test_the_model_receives_the_accumulated_text(participants, glossary):
    translator = FakeTranslator("...")
    pipeline = TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=translator,
        glossary=glossary,
    )

    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")

    # 조각만 따로 번역하면 문맥이 끊긴다. 매번 전체를 다시 번역한다.
    assert translator.requests[1].text == "안건은 이번 분기 계획입니다."


def test_the_final_subtitle_carries_the_whole_utterance(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    result = pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")

    assert result.subtitle.sourceText == "안건은 이번 분기 계획입니다."


def test_a_new_utterance_starts_after_the_previous_one_ends(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    ended = pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")
    fresh = pipeline.handle_utterance("user_ko", "다음 안건입니다.")

    assert fresh.subtitle.subtitleId != ended.subtitle.subtitleId
    assert fresh.subtitle.revision == 1
    assert fresh.subtitle.sourceText == "다음 안건입니다."


def test_mid_utterance_segments_stay_out_of_the_context(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)

    # 곧 전체 문장으로 덮어써질 미완성 번역이 맥락에 끼면 같은 말이 두 번
    # 들어간 것처럼 보인다.
    assert len(pipeline.context) == 0


def test_the_context_gets_the_whole_utterance_once(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")

    assert len(pipeline.context) == 1
    assert pipeline.context.recent()[-1].original_text == "안건은 이번 분기 계획입니다."


def test_speakers_do_not_share_an_open_utterance(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    korean = pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    vietnamese = pipeline.handle_utterance("user_vi", "Xin chào", ends_utterance=False)

    assert korean.subtitle.subtitleId != vietnamese.subtitle.subtitleId
    assert vietnamese.subtitle.sourceText == "Xin chào"


# --- 확정 전 중간 결과 ---
#
# 확정 조각은 이어붙이지만 중간 결과는 같은 조각이 자라는 중이라 매번 통째로
# 다시 온다. 갈아끼우지 않고 쌓으면 같은 말이 반복된다.


def test_an_interim_result_replaces_the_previous_one(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_interim("user_ko", "이번")
    pipeline.handle_interim("user_ko", "이번 회의")
    result = pipeline.handle_interim("user_ko", "이번 회의에서")

    assert result.subtitle.sourceText == "이번 회의에서"


def test_an_interim_result_follows_the_confirmed_segments(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    result = pipeline.handle_interim("user_ko", "이번 분기")

    assert result.subtitle.sourceText == "안건은 이번 분기"


def test_a_confirmed_segment_replaces_the_interim_tail(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_interim("user_ko", "이번 분기")
    result = pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")

    # 확정된 내용이 중간 결과를 이미 포함한다. 둘 다 남기면 말이 두 번 들어간다.
    assert result.subtitle.sourceText == "이번 분기 계획입니다."


def test_an_interim_result_is_never_final(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    result = pipeline.handle_interim("user_ko", "이번 분기")

    assert result.subtitle.to_dict()["isFinal"] is False


def test_an_interim_result_keeps_the_subtitle_id(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    interim = pipeline.handle_interim("user_ko", "이번 분기")
    final = pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")

    assert interim.subtitle.subtitleId == final.subtitle.subtitleId
    assert (interim.subtitle.revision, final.subtitle.revision) == (1, 2)


def test_interim_results_stay_out_of_the_context(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_interim("user_ko", "이번")
    pipeline.handle_interim("user_ko", "이번 분기")

    assert len(pipeline.context) == 0


def test_unchanged_text_reuses_the_previous_translation(participants, glossary):
    translator = FakeTranslator("...")
    pipeline = TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=translator,
        glossary=glossary,
    )

    # 중간 결과가 이미 조각 전체였던 경우다. 확정될 때 원문이 그대로다.
    pipeline.handle_interim("user_ko", "이번 분기 계획입니다.")
    result = pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")

    assert len(translator.requests) == 1
    assert result.reused_translation is True
    assert result.used_translation_model is False


def test_a_reused_translation_is_still_published_as_final(participants, glossary):
    pipeline = make_pipeline(participants, glossary, translation="Kế hoạch quý này.")

    pipeline.handle_interim("user_ko", "이번 분기 계획입니다.")
    result = pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")

    # 발행을 건너뛰면 자막이 미확정으로 남는다.
    payload = result.subtitle.to_dict()
    assert payload["isFinal"] is True
    assert payload["revision"] == 2
    assert payload["translatedText"] == "Kế hoạch quý này."


def test_changed_text_is_translated_again(participants, glossary):
    translator = FakeTranslator("...")
    pipeline = TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=translator,
        glossary=glossary,
    )

    pipeline.handle_interim("user_ko", "이번 분기")
    result = pipeline.handle_utterance("user_ko", "이번 분기 계획입니다.")

    assert len(translator.requests) == 2
    assert result.reused_translation is False


def test_a_new_utterance_does_not_reuse_the_previous_translation(
    participants, glossary
):
    translator = FakeTranslator("...")
    pipeline = TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=translator,
        glossary=glossary,
    )

    pipeline.handle_utterance("user_ko", "같은 말입니다.")
    result = pipeline.handle_utterance("user_ko", "같은 말입니다.")

    # 재사용은 한 발화 안에서만이다. 발화가 다르면 맥락도 다르다.
    assert len(translator.requests) == 2
    assert result.reused_translation is False


def test_an_interim_result_is_not_discarded_when_late(participants, glossary):
    import time

    pipeline = make_pipeline(participants, glossary, max_staleness_ms=0)

    result = pipeline.handle_interim(
        "user_ko", "이번 분기", spoken_at=time.monotonic() - 10
    )

    assert result.subtitle is not None


def test_a_late_mid_utterance_segment_is_kept(participants, glossary):
    import time

    pipeline = make_pipeline(participants, glossary, max_staleness_ms=0)

    result = pipeline.handle_utterance(
        "user_ko", "안건은", spoken_at=time.monotonic() - 10, ends_utterance=False
    )

    # 늦은 중간 조각은 Client가 revision으로 거른다. 여기서 또 버리면 이미 쓴
    # 번역 호출의 결과만 잃는다.
    assert result.subtitle is not None


def test_a_late_final_segment_is_still_discarded(participants, glossary):
    import time

    pipeline = make_pipeline(participants, glossary, max_staleness_ms=0)

    result = pipeline.handle_utterance(
        "user_ko", "이번 분기 계획입니다.", spoken_at=time.monotonic() - 10
    )

    # 안전장치는 살아 있어야 한다. 마지막 조각에서만 발동한다.
    assert result.subtitle is None


def test_a_discarded_segment_does_not_break_the_next_utterance(participants, glossary):
    import time

    pipeline = make_pipeline(participants, glossary, max_staleness_ms=0)

    # 중간 조각이 늦어 버려져도 발화 상태가 남아 다음 발화에 섞이면 안 된다.
    pipeline.handle_utterance(
        "user_ko", "안건은", spoken_at=time.monotonic() - 10, ends_utterance=True
    )
    fresh = pipeline.handle_utterance("user_ko", "다음 안건입니다.")

    assert fresh.subtitle.revision == 1
    assert fresh.subtitle.sourceText == "다음 안건입니다."


# --- 발화 닫기 ---
#
# Deepgram의 speech_final이 끝내 오지 않는 경우가 있다. 참가자가 말을 마치고
# 바로 나가면 무음 판정 전에 연결이 끊긴다. 그러면 자막이 영영 미확정으로 남는다.


def test_finalizing_marks_the_subtitle_final(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    result = pipeline.finalize("user_ko")

    assert result.subtitle.to_dict()["isFinal"] is True


def test_finalizing_keeps_the_text(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    # 중간 결과는 확정 조각 뒤에 붙는 새 조각이다. 누적 전체가 아니다.
    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    pipeline.handle_interim("user_ko", "이번 분기")
    result = pipeline.finalize("user_ko")

    assert result.subtitle.sourceText == "안건은 이번 분기"


def test_finalizing_does_not_call_the_model_again(participants, glossary):
    translator = FakeTranslator("...")
    pipeline = TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=translator,
        glossary=glossary,
    )

    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    result = pipeline.finalize("user_ko")

    # 원문이 그대로라 직전 번역을 재사용한다.
    assert len(translator.requests) == 1
    assert result.reused_translation is True


def test_finalizing_keeps_the_subtitle_id_and_raises_the_revision(
    participants, glossary
):
    pipeline = make_pipeline(participants, glossary)

    opened = pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    result = pipeline.finalize("user_ko")

    assert result.subtitle.subtitleId == opened.subtitle.subtitleId
    assert result.subtitle.revision == 2


def test_finalizing_closes_the_utterance(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    pipeline.finalize("user_ko")
    fresh = pipeline.handle_utterance("user_ko", "다음 안건입니다.")

    assert fresh.subtitle.subtitleId != pipeline._open.get("user_ko")
    assert fresh.subtitle.revision == 1
    assert fresh.subtitle.sourceText == "다음 안건입니다."


def test_finalizing_adds_the_utterance_to_the_context(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    pipeline.finalize("user_ko")

    assert len(pipeline.context) == 1


def test_finalizing_nothing_is_safe(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    assert pipeline.finalize("user_ko") is None


def test_finalizing_after_the_utterance_ended_is_safe(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    pipeline.handle_utterance("user_ko", "끝났습니다.")

    # 이미 확정된 발화를 다시 발행하면 안 된다.
    assert pipeline.finalize("user_ko") is None


def test_an_open_utterance_is_reported(participants, glossary):
    pipeline = make_pipeline(participants, glossary)

    assert pipeline.has_open_utterance("user_ko") is False
    pipeline.handle_utterance("user_ko", "안건은", ends_utterance=False)
    assert pipeline.has_open_utterance("user_ko") is True
    pipeline.finalize("user_ko")
    assert pipeline.has_open_utterance("user_ko") is False
