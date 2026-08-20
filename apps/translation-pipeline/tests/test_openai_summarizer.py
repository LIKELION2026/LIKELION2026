"""OpenAI 요약 provider(OpenAISummarizer) 테스트.

실제 API를 호출하지 않는다. 가짜 클라이언트를 끼워 응답 파싱만 확인하므로
API 키 없이 돌아간다.
"""

import pytest

from translation_pipeline.errors import TranslationError
from translation_pipeline.providers.openai import DEFAULT_MODEL, OpenAISummarizer
from translation_pipeline.summarizer import MeetingSummary, Summarizer, SummaryRequest

REQUEST = SummaryRequest(
    room_name="lab-likelion-20260820-meeting-room",
    transcript_text="[민수] 오늘 안건은 두 가지입니다.",
)


class FakeMessage:
    def __init__(self, content):
        self.content = content


class FakeChoice:
    def __init__(self, content):
        self.message = FakeMessage(content)


class FakeResponse:
    def __init__(self, content):
        self.choices = [FakeChoice(content)]


class FakeCompletions:
    def __init__(self, results):
        self._results = list(results)
        self.calls = []

    def create(self, model, temperature, response_format, messages):
        self.calls.append(
            {
                "model": model,
                "temperature": temperature,
                "response_format": response_format,
                "messages": messages,
            }
        )
        result = self._results.pop(0)
        if isinstance(result, Exception):
            raise result
        return FakeResponse(result)


class FakeChat:
    def __init__(self, results):
        self.completions = FakeCompletions(results)


class FakeClient:
    def __init__(self, results):
        self.chat = FakeChat(results)


def make_summarizer(results, **kwargs) -> OpenAISummarizer:
    return OpenAISummarizer(client=FakeClient(results), **kwargs)


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

    assert summarizer._client.chat.completions.calls[0]["model"] == DEFAULT_MODEL


def test_transcript_is_sent_as_the_user_message():
    summarizer = make_summarizer(['{"summary_ko": "a", "summary_vi": "b"}'])
    summarizer.summarize(REQUEST)

    messages = summarizer._client.chat.completions.calls[0]["messages"]
    assert messages[-1] == {"role": "user", "content": REQUEST.transcript_text}


def test_requests_json_output():
    summarizer = make_summarizer(['{"summary_ko": "a", "summary_vi": "b"}'])
    summarizer.summarize(REQUEST)

    call = summarizer._client.chat.completions.calls[0]
    assert call["response_format"] == {"type": "json_object"}


def test_provider_error_is_wrapped():
    summarizer = make_summarizer([RuntimeError("boom")])

    with pytest.raises(TranslationError) as exc_info:
        summarizer.summarize(REQUEST)
    assert "boom" in str(exc_info.value)


def test_malformed_json_raises_translation_error():
    summarizer = make_summarizer(["이건 JSON이 아니다"])

    with pytest.raises(TranslationError):
        summarizer.summarize(REQUEST)


def test_missing_api_key_raises_translation_error(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(TranslationError) as exc_info:
        OpenAISummarizer()
    assert "OPENAI_API_KEY" in str(exc_info.value)
