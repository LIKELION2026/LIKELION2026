"""OpenAI provider 테스트.

실제 API를 호출하지 않는다. 가짜 클라이언트를 끼워 오류 변환과 응답 정리
동작만 확인하므로 API 키 없이 돌아간다.
"""

import pytest

from translation_pipeline.errors import TranslationError
from translation_pipeline.providers.openai import DEFAULT_MODEL, OpenAITranslator
from translation_pipeline.translator import TranslationRequest, Translator

REQUEST = TranslationRequest(text="고생하셨습니다", source_lang="ko", target_lang="vi")


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
    """chat.completions.create 호출을 기록하고 미리 정한 결과를 돌려준다."""

    def __init__(self, results):
        self._results = list(results)
        self.calls = []

    def create(self, model, temperature, messages):
        self.calls.append(
            {"model": model, "temperature": temperature, "messages": messages}
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


def make_translator(results, **kwargs) -> OpenAITranslator:
    return OpenAITranslator(client=FakeClient(results), **kwargs)


def test_satisfies_the_translator_protocol():
    assert isinstance(make_translator(["Cảm ơn."]), Translator)


def test_returns_translated_text():
    translator = make_translator(["Cảm ơn anh/chị đã vất vả."])

    assert translator.translate(REQUEST) == "Cảm ơn anh/chị đã vất vả."


def test_trims_surrounding_whitespace():
    translator = make_translator(["  \n Cảm ơn. \n  "])

    assert translator.translate(REQUEST) == "Cảm ơn."


def test_uses_the_default_model():
    translator = make_translator(["Cảm ơn."])
    translator.translate(REQUEST)

    assert translator.model == DEFAULT_MODEL
    assert translator._client.chat.completions.calls[0]["model"] == DEFAULT_MODEL


def test_model_can_be_overridden():
    override = "gpt-5.4"
    assert override != DEFAULT_MODEL

    translator = make_translator(["Cảm ơn."], model=override)
    translator.translate(REQUEST)

    assert translator._client.chat.completions.calls[0]["model"] == override


def test_original_text_is_sent_as_the_user_message():
    translator = make_translator(["Cảm ơn."])
    translator.translate(REQUEST)

    messages = translator._client.chat.completions.calls[0]["messages"]
    assert messages[-1] == {"role": "user", "content": REQUEST.text}


def test_system_prompt_is_passed_as_the_system_message():
    translator = make_translator(["Cảm ơn."])
    translator.translate(REQUEST)

    messages = translator._client.chat.completions.calls[0]["messages"]
    assert messages[0]["role"] == "system"
    assert "번역된 문장만 출력한다" in messages[0]["content"]


def test_provider_error_is_wrapped():
    translator = make_translator([RuntimeError("boom")])

    with pytest.raises(TranslationError) as exc_info:
        translator.translate(REQUEST)
    assert "boom" in str(exc_info.value)


@pytest.mark.parametrize("empty", ["", "   ", None])
def test_empty_response_raises(empty):
    translator = make_translator([empty])

    with pytest.raises(TranslationError):
        translator.translate(REQUEST)


def test_missing_api_key_raises_translation_error(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(TranslationError) as exc_info:
        OpenAITranslator()
    assert "OPENAI_API_KEY" in str(exc_info.value)
