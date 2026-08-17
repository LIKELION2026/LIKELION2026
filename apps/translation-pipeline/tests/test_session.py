"""실시간 세션의 스레드 동작 테스트.

번역을 인식 스레드에서 떼어내면서 생긴 규칙들을 고정한다.

- 확정 조각은 밀려도 버리지 않는다
- 중간 결과는 밀리면 최신 하나만 남긴다
- 워커가 하나이므로 revision과 발행 순서가 뒤집히지 않는다
"""

import threading

import pytest

from translation_pipeline import (
    FakeTranslator,
    Glossary,
    ParticipantRegistry,
    SessionEvent,
    TranslationPipeline,
    TranslationSession,
)
from translation_pipeline.errors import TranslationError
from translation_pipeline.publisher import SubtitlePublishError
from translation_pipeline.translator import TranslationRequest

ROOM = "lab-ai-20260816-demo"
SPEAKER = "user_ko"


class BlockingTranslator:
    """게이트를 열어줄 때까지 번역을 붙잡아 두는 provider.

    워커가 일감 하나를 붙들고 있는 동안 뒤에 들어온 것들이 어떻게 처리되는지
    보려면 타이밍을 손으로 잡아야 한다.
    """

    def __init__(self) -> None:
        self.gate = threading.Event()
        self.entered = threading.Event()
        self.requests: list[TranslationRequest] = []

    def translate(self, request: TranslationRequest) -> str:
        self.requests.append(request)
        self.entered.set()
        self.gate.wait(timeout=5)
        return "번역문"


class FailingTranslator:
    def translate(self, request: TranslationRequest) -> str:
        raise TranslationError("모델이 응답하지 않았습니다")


class RecordingPublisher:
    def __init__(self, fail: bool = False) -> None:
        self.published = []
        self._fail = fail

    def publish(self, subtitle) -> None:
        if self._fail:
            raise SubtitlePublishError("서버에 닿지 못했습니다")
        self.published.append(subtitle)


@pytest.fixture
def participants() -> ParticipantRegistry:
    registry = ParticipantRegistry()
    registry.set_language(SPEAKER, "ko", display_name="민수")
    return registry


@pytest.fixture
def empty_glossary(tmp_path) -> Glossary:
    path = tmp_path / "glossary.json"
    path.write_text('{"ko_vi": [], "vi_ko": []}', encoding="utf-8")
    return Glossary.load(path)


def make_session(participants, glossary, translator=None, publisher=None, **kwargs):
    pipeline = TranslationPipeline(
        room_name=ROOM,
        participants=participants,
        translator=translator if translator is not None else FakeTranslator("번역문"),
        glossary=glossary,
    )
    events: list[SessionEvent] = []
    arrived = threading.Semaphore(0)

    def on_event(event: SessionEvent) -> None:
        events.append(event)
        arrived.release()

    session = TranslationSession(
        pipeline=pipeline,
        speaker_id=SPEAKER,
        publisher=publisher,
        on_event=on_event,
        **kwargs,
    )
    return session, events, arrived


def wait_for(arrived: threading.Semaphore, count: int, timeout: float = 5.0) -> None:
    for _ in range(count):
        assert arrived.acquire(timeout=timeout), "이벤트가 제때 오지 않았습니다"


def test_a_confirmed_segment_is_translated(participants, empty_glossary):
    session, events, arrived = make_session(participants, empty_glossary)

    with session:
        session.submit_utterance("안녕하세요")
        wait_for(arrived, 1)

    assert events[0].confirmed is True
    assert events[0].result.subtitle.sourceText == "안녕하세요"


def test_an_interim_result_is_translated(participants, empty_glossary):
    session, events, arrived = make_session(participants, empty_glossary)

    with session:
        session.submit_interim("안녕하")
        wait_for(arrived, 1)

    # 말이 멈추기를 기다리지 않고 번역했다는 뜻이다.
    assert events[0].confirmed is False
    assert events[0].result.subtitle.to_dict()["isFinal"] is False


def test_interim_results_are_throttled(participants, empty_glossary):
    session, events, arrived = make_session(
        participants, empty_glossary, interim_interval_ms=10_000
    )

    with session:
        session.submit_interim("안녕")
        session.submit_interim("안녕하세요")
        wait_for(arrived, 1)

    # 인식 결과는 1초에 한 번 오지만 번역은 그보다 느리다. 오는 대로 다 부르면
    # 밀리기만 한다.
    assert len(events) == 1


def test_every_confirmed_segment_is_processed(participants, empty_glossary):
    translator = BlockingTranslator()
    session, events, arrived = make_session(
        participants, empty_glossary, translator=translator
    )

    with session:
        session.submit_utterance("첫 번째", ends_utterance=False)
        assert translator.entered.wait(timeout=5)
        session.submit_utterance("두 번째", ends_utterance=False)
        session.submit_utterance("세 번째")
        translator.gate.set()
        wait_for(arrived, 3)

    # 확정 조각을 버리면 그 말이 사라진다. 밀려도 전부 처리해야 한다.
    assert [event.source_text for event in events] == ["첫 번째", "두 번째", "세 번째"]


def test_a_waiting_interim_is_dropped_when_a_segment_is_confirmed(
    participants, empty_glossary
):
    translator = BlockingTranslator()
    session, events, arrived = make_session(
        participants, empty_glossary, translator=translator, interim_interval_ms=0
    )

    with session:
        session.submit_utterance("첫 번째", ends_utterance=False)
        assert translator.entered.wait(timeout=5)
        session.submit_interim("버려질 중간 결과")
        session.submit_utterance("두 번째")
        translator.gate.set()
        wait_for(arrived, 2)

    # 확정된 내용이 대기 중이던 중간 결과를 이미 포함한다.
    assert [event.source_text for event in events] == ["첫 번째", "두 번째"]


def test_revisions_do_not_go_backwards(participants, empty_glossary):
    session, events, arrived = make_session(
        participants, empty_glossary, interim_interval_ms=0
    )

    with session:
        session.submit_interim("안녕하")
        wait_for(arrived, 1)
        session.submit_utterance("안녕하세요")
        wait_for(arrived, 1)

    subtitles = [event.result.subtitle for event in events]
    # 워커가 하나이므로 매기는 순서와 발행 순서가 같다.
    assert [s.revision for s in subtitles] == [1, 2]
    assert subtitles[0].subtitleId == subtitles[1].subtitleId


def test_stop_processes_remaining_confirmed_segments(participants, empty_glossary):
    translator = BlockingTranslator()
    session, events, arrived = make_session(
        participants, empty_glossary, translator=translator
    )

    session.start()
    session.submit_utterance("첫 번째", ends_utterance=False)
    assert translator.entered.wait(timeout=5)
    session.submit_utterance("마지막")
    translator.gate.set()
    session.stop()

    # 종료 중이라고 마지막 발화를 버리면 그 말이 자막에 영영 안 뜬다.
    assert [event.source_text for event in events] == ["첫 번째", "마지막"]


def test_a_translation_failure_does_not_stop_the_session(participants, empty_glossary):
    session, events, arrived = make_session(
        participants, empty_glossary, translator=FailingTranslator()
    )

    with session:
        session.submit_utterance("첫 번째")
        wait_for(arrived, 1)
        session.submit_utterance("두 번째")
        wait_for(arrived, 1)

    assert events[0].error is not None
    assert events[0].result is None
    assert len(events) == 2


def test_a_successful_publish_is_recorded(participants, empty_glossary):
    publisher = RecordingPublisher()
    session, events, arrived = make_session(
        participants, empty_glossary, publisher=publisher
    )

    with session:
        session.submit_utterance("안녕하세요")
        wait_for(arrived, 1)

    assert events[0].published is True
    assert len(publisher.published) == 1


def test_a_publish_failure_does_not_stop_the_session(participants, empty_glossary):
    session, events, arrived = make_session(
        participants, empty_glossary, publisher=RecordingPublisher(fail=True)
    )

    with session:
        session.submit_utterance("첫 번째")
        wait_for(arrived, 1)
        session.submit_utterance("두 번째")
        wait_for(arrived, 1)

    assert events[0].published is False
    assert events[0].publish_error is not None
    assert len(events) == 2


def test_blank_input_is_ignored(participants, empty_glossary):
    session, events, arrived = make_session(participants, empty_glossary)

    with session:
        session.submit_interim("   ")
        session.submit_utterance("")

    assert events == []


def test_starting_twice_is_rejected(participants, empty_glossary):
    session, _, _ = make_session(participants, empty_glossary)

    with session:
        with pytest.raises(RuntimeError):
            session.start()
