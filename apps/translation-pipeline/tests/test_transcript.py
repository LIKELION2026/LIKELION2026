"""회의 전사 누적(TranscriptRecorder) 테스트."""

from translation_pipeline.pipeline import UtteranceResult
from translation_pipeline.session import SessionEvent
from translation_pipeline.subtitle import SubtitlePayload
from translation_pipeline.transcript import TranscriptRecorder


def make_subtitle(
    speaker_display_name="민수",
    source_language="ko",
    source_text="안녕하세요",
    occurred_at="2026-08-20T00:00:00.000Z",
):
    return SubtitlePayload(
        subtitleId="s1",
        roomName="lab-likelion-20260820-meeting-room",
        speakerIdentity="user_ko",
        speakerDisplayName=speaker_display_name,
        sourceLanguage=source_language,
        sourceText=source_text,
        translatedLanguage="vi",
        translatedText="Xin chao",
        occurredAt=occurred_at,
    )


def make_final_event(subtitle=None, **overrides):
    values = {
        "confirmed": True,
        "ends_utterance": True,
        "source_text": "안녕하세요",
        "result": UtteranceResult(subtitle=subtitle or make_subtitle(), elapsed_ms=100),
        "error": None,
    }
    values.update(overrides)
    return SessionEvent(**values)


def test_records_a_finalized_utterance():
    recorder = TranscriptRecorder()

    recorder.record(make_final_event())

    assert recorder.is_empty() is False
    assert "[민수] 안녕하세요" in recorder.render()


def test_ignores_interim_and_unfinalized_events():
    recorder = TranscriptRecorder()

    recorder.record(make_final_event(confirmed=False, ends_utterance=False))
    recorder.record(make_final_event(ends_utterance=False))

    assert recorder.is_empty() is True


def test_ignores_events_with_an_error():
    recorder = TranscriptRecorder()

    recorder.record(
        SessionEvent(
            confirmed=True,
            ends_utterance=True,
            source_text="안녕하세요",
            result=None,
            error="번역 실패",
        )
    )

    assert recorder.is_empty() is True


def test_ignores_events_with_no_subtitle():
    # skip 처리된 결과(예: 사전만으로 끝나지 않은 아주 짧은 조각)는 subtitle이
    # None일 수 있다.
    recorder = TranscriptRecorder()

    recorder.record(
        make_final_event(result=UtteranceResult(subtitle=None, elapsed_ms=0))
    )

    assert recorder.is_empty() is True


def test_render_orders_lines_by_occurred_at_not_call_order():
    # 참가자별로 다른 스레드에서 확정되므로 호출 순서가 실제 발화 순서와 다를
    # 수 있다.
    recorder = TranscriptRecorder()
    later = make_subtitle(source_text="두 번째", occurred_at="2026-08-20T00:00:05.000Z")
    earlier = make_subtitle(source_text="첫 번째", occurred_at="2026-08-20T00:00:01.000Z")

    recorder.record(make_final_event(subtitle=later))
    recorder.record(make_final_event(subtitle=earlier))

    rendered = recorder.render()
    assert rendered.index("첫 번째") < rendered.index("두 번째")


def test_render_uses_source_text_not_translated_text():
    recorder = TranscriptRecorder()
    recorder.record(make_final_event())

    rendered = recorder.render()

    assert "안녕하세요" in rendered
    assert "Xin chao" not in rendered


def test_empty_recorder_renders_an_empty_string():
    recorder = TranscriptRecorder()

    assert recorder.is_empty() is True
    assert recorder.render() == ""
