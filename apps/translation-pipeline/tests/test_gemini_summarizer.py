"""Gemini 요약 provider(GeminiSummarizer) 테스트.

실제 API를 호출하지 않는다. 가짜 클라이언트를 끼워 오류 분류와 응답 파싱만
확인하므로 API 키 없이 돌아간다.
"""

import pytest

from translation_pipeline.errors import ProviderUnavailableError, TranslationError
from translation_pipeline.providers.gemini import DEFAULT_MODEL, GeminiSummarizer
from translation_pipeline.summarizer import MeetingSummary, Summarizer, SummaryRequest

REQUEST = SummaryRequest(
    room_name="lab-likelion-20260820-meeting-room",
    transcript_text="[민수] 오늘 안건은 두 가지입니다.",
)


class FakeResponse:
    def __init__(self, text):
        self.text = text


class FakeModels:
    def __init__(self, results):
        self._results = list(results)
        self.calls = []

    def generate_content(self, model, contents, config):
        self.calls.append({"model": model, "contents": contents, "config": config})
        result = self._results.pop(0)
        if isinstance(result, Exception):
            raise result
        return FakeResponse(result)


class FakeClient:
    def __init__(self, results):
        self.models = FakeModels(results)


def make_summarizer(results, **kwargs) -> GeminiSummarizer:
    return GeminiSummarizer(client=FakeClient(results), **kwargs)


def test_satisfies_the_summarizer_protocol():
    assert isinstance(make_summarizer(["{}"]), Summarizer)


def test_returns_the_parsed_summary():
    summarizer = make_summarizer(
        ['{"summary_ko": "한국어 요약", "summary_vi": "Tom tat"}']
    )

    result = summarizer.summarize(REQUEST)

    assert result == MeetingSummary(summary_ko="한국어 요약", summary_vi="Tom tat")


def test_uses_the_default_model():
    summarizer = make_summarizer(['{"summary_ko": "a", "summary_vi": "b"}'])
    summarizer.summarize(REQUEST)

    assert summarizer._client.models.calls[0]["model"] == DEFAULT_MODEL


def test_transcript_is_sent_as_contents():
    summarizer = make_summarizer(['{"summary_ko": "a", "summary_vi": "b"}'])
    summarizer.summarize(REQUEST)

    assert summarizer._client.models.calls[0]["contents"] == REQUEST.transcript_text


def test_requests_json_output():
    summarizer = make_summarizer(['{"summary_ko": "a", "summary_vi": "b"}'])
    summarizer.summarize(REQUEST)

    config = summarizer._client.models.calls[0]["config"]
    assert config.response_mime_type == "application/json"


@pytest.mark.parametrize(
    "message", ["429 RESOURCE_EXHAUSTED", "503 UNAVAILABLE", "The read operation timed out"]
)
def test_transient_errors_are_classified_as_provider_unavailable(message):
    summarizer = make_summarizer([RuntimeError(message)])

    with pytest.raises(ProviderUnavailableError):
        summarizer.summarize(REQUEST)


def test_non_transient_provider_errors_are_wrapped_as_translation_error():
    summarizer = make_summarizer([RuntimeError("400 INVALID_ARGUMENT")])

    with pytest.raises(TranslationError) as exc_info:
        summarizer.summarize(REQUEST)
    assert not isinstance(exc_info.value, ProviderUnavailableError)


def test_malformed_json_raises_translation_error():
    summarizer = make_summarizer(["이건 JSON이 아니다"])

    with pytest.raises(TranslationError):
        summarizer.summarize(REQUEST)


def test_missing_api_key_raises_translation_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(TranslationError) as exc_info:
        GeminiSummarizer()
    assert "GEMINI_API_KEY" in str(exc_info.value)
