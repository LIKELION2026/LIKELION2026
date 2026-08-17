"""음성 인식 모듈 단위 테스트.

마이크와 Deepgram 연결이 필요한 부분은 여기서 검증하지 않는다. 결과 메시지
해석과 입력 검증처럼 외부 의존 없이 확인할 수 있는 부분만 다룬다.
"""

import pytest

from translation_pipeline.errors import UnsupportedLanguageError
from translation_pipeline.stt import (
    CHANNELS,
    DEFAULT_MODEL,
    ENCODING,
    SAMPLE_RATE,
    RealtimeTranscriber,
    SpeechRecognitionError,
    Utterance,
    _extract_transcript,
)


class FakeAlternative:
    def __init__(self, transcript):
        self.transcript = transcript


class FakeChannel:
    def __init__(self, transcripts):
        self.alternatives = [FakeAlternative(t) for t in transcripts]


class FakeMessage:
    """Deepgram 결과 메시지 모양만 흉내 낸다."""

    def __init__(self, transcripts=None, is_final=False, speech_final=False):
        self.channel = FakeChannel(transcripts) if transcripts is not None else None
        self.is_final = is_final
        self.speech_final = speech_final


def test_uses_nova_3_by_default():
    # Nova-3만 한국어와 베트남어를 함께 지원한다.
    assert DEFAULT_MODEL == "nova-3"


def test_audio_format_matches_deepgram_expectations():
    assert (SAMPLE_RATE, CHANNELS, ENCODING) == (16_000, 1, "linear16")


def test_transcript_is_taken_from_the_first_alternative():
    message = FakeMessage(["첫 번째 후보", "두 번째 후보"])

    assert _extract_transcript(message) == "첫 번째 후보"


def test_transcript_is_trimmed():
    assert _extract_transcript(FakeMessage(["  고생하셨습니다  "])) == "고생하셨습니다"


def test_message_without_channel_yields_no_transcript():
    # 메타데이터 메시지에는 channel이 없다.
    assert _extract_transcript(FakeMessage()) == ""


def test_message_without_alternatives_yields_no_transcript():
    assert _extract_transcript(FakeMessage([])) == ""


def test_empty_transcript_yields_empty_string():
    assert _extract_transcript(FakeMessage([""])) == ""


@pytest.mark.parametrize("language", ["ko", "vi"])
def test_supported_languages_are_accepted(language):
    RealtimeTranscriber(language=language)


@pytest.mark.parametrize("language", ["en", "ja", "KO", ""])
def test_unsupported_language_is_rejected(language):
    with pytest.raises(UnsupportedLanguageError):
        RealtimeTranscriber(language=language)


def test_missing_api_key_raises_before_connecting(monkeypatch):
    monkeypatch.delenv("DEEPGRAM_API_KEY", raising=False)
    transcriber = RealtimeTranscriber(language="ko")

    with pytest.raises(SpeechRecognitionError) as exc_info:
        transcriber.run(on_utterance=lambda utterance: None)
    assert "DEEPGRAM_API_KEY" in str(exc_info.value)


def test_utterance_carries_text_and_language():
    utterance = Utterance(text="고생하셨습니다", language="ko")

    assert utterance.text == "고생하셨습니다"
    assert utterance.language == "ko"


def test_utterance_is_immutable():
    utterance = Utterance(text="고생하셨습니다", language="ko")

    with pytest.raises(Exception):
        utterance.text = "바꿔치기"  # type: ignore[misc]


def read_all(messages):
    """`_read_results`를 가짜 소켓으로 돌리고 콜백이 받은 것을 돌려준다."""
    transcriber = RealtimeTranscriber(language="ko")
    utterances: list[Utterance] = []
    interims: list[str] = []
    transcriber._read_results(messages, utterances.append, interims.append)
    return utterances, interims


def test_confirmed_segment_is_delivered_even_without_speech_final():
    # Deepgram은 is_final이 선 조각을 다시 보내지 않는다. 여기서 흘리면
    # 발화 앞부분이 통째로 사라진다.
    utterances, interims = read_all([FakeMessage(["안건은"], is_final=True)])

    assert [u.text for u in utterances] == ["안건은"]
    assert interims == []


def test_segment_without_speech_final_does_not_end_the_utterance():
    utterances, _ = read_all([FakeMessage(["안건은"], is_final=True)])

    assert utterances[0].ends_utterance is False


def test_speech_final_ends_the_utterance():
    utterances, _ = read_all(
        [FakeMessage(["끝입니다."], is_final=True, speech_final=True)]
    )

    assert utterances[0].ends_utterance is True


def test_unconfirmed_result_goes_to_interim_only():
    utterances, interims = read_all([FakeMessage(["안건"])])

    assert utterances == []
    assert interims == ["안건"]


def test_a_two_segment_utterance_is_delivered_in_order():
    # 관측한 실제 순서: is_final 조각 하나 뒤에 speech_final 조각이 온다.
    utterances, _ = read_all(
        [
            FakeMessage(["이번 회의에서 말씀드릴 안건은"], is_final=True),
            FakeMessage(["이번 분기 계획입니다."], is_final=True, speech_final=True),
        ]
    )

    assert [(u.text, u.ends_utterance) for u in utterances] == [
        ("이번 회의에서 말씀드릴 안건은", False),
        ("이번 분기 계획입니다.", True),
    ]


def test_stop_is_recorded():
    transcriber = RealtimeTranscriber(language="ko")

    transcriber.stop()

    assert transcriber._stop.is_set()
