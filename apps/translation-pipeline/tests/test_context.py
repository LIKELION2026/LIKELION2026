"""대화 컨텍스트 버퍼 단위 테스트."""

import pytest

from translation_pipeline.context import (
    DEFAULT_MAX_TURNS,
    ConversationContext,
    ConversationTurn,
)


def test_default_buffer_keeps_five_turns():
    assert DEFAULT_MAX_TURNS == 5
    assert ConversationContext().max_turns == 5


def test_new_buffer_is_empty():
    context = ConversationContext()

    assert len(context) == 0
    assert context.recent() == ()


def test_turns_are_returned_oldest_first():
    context = ConversationContext()
    context.add("user_ko", "안녕하세요", "Xin chào")
    context.add("user_vi", "Xin chào", "안녕하세요")

    originals = [turn.original_text for turn in context.recent()]
    assert originals == ["안녕하세요", "Xin chào"]


def test_turn_records_speaker_and_both_texts():
    context = ConversationContext()
    context.add("user_abc123", "고생하셨습니다", "Cảm ơn anh/chị đã vất vả.")

    turn = context.recent()[0]
    assert turn == ConversationTurn(
        speaker_id="user_abc123",
        original_text="고생하셨습니다",
        translated_text="Cảm ơn anh/chị đã vất vả.",
    )


def test_oldest_turn_is_dropped_past_the_limit():
    context = ConversationContext(max_turns=3)
    for index in range(5):
        context.add(f"user_{index}", f"원문{index}", f"번역{index}")

    assert len(context) == 3
    assert [turn.original_text for turn in context.recent()] == ["원문2", "원문3", "원문4"]


@pytest.mark.parametrize("max_turns", [1, 3, 5])
def test_buffer_never_exceeds_its_limit(max_turns):
    context = ConversationContext(max_turns=max_turns)
    for index in range(20):
        context.add("user", f"원문{index}", f"번역{index}")

    assert len(context) == max_turns


def test_clear_empties_the_buffer():
    context = ConversationContext()
    context.add("user", "원문", "번역")

    context.clear()

    assert len(context) == 0
    assert context.recent() == ()


@pytest.mark.parametrize("max_turns", [0, -1])
def test_invalid_limit_is_rejected(max_turns):
    with pytest.raises(ValueError):
        ConversationContext(max_turns=max_turns)


def test_recent_returns_a_snapshot():
    context = ConversationContext()
    context.add("user", "원문", "번역")

    snapshot = context.recent()
    context.add("user2", "원문2", "번역2")

    # 이미 받아간 결과는 이후 추가에 영향받지 않는다.
    assert len(snapshot) == 1
