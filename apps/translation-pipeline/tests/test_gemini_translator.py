"""Gemini provider 테스트.

실제 API를 호출하지 않는다. 가짜 클라이언트를 끼워 재시도, 오류 변환, 응답
정리 동작만 확인하므로 API 키 없이 돌아간다.
"""

import pytest

from translation_pipeline.errors import TranslationError
from translation_pipeline.providers.gemini import (
    DEFAULT_MODEL,
    DEFAULT_TIMEOUT_MS,
    MIN_TIMEOUT_MS,
    GeminiTranslator,
)
from translation_pipeline.translator import TranslationRequest, Translator

REQUEST = TranslationRequest(text="고생하셨습니다", source_lang="ko", target_lang="vi")


class FakeResponse:
    def __init__(self, text):
        self.text = text


class FakeModels:
    """generate_content 호출을 기록하고 미리 정한 결과를 돌려준다."""

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


def make_translator(results, **kwargs) -> GeminiTranslator:
    return GeminiTranslator(client=FakeClient(results), **kwargs)


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
    assert translator._client.models.calls[0]["model"] == DEFAULT_MODEL


def test_model_can_be_overridden():
    # 할당량이나 품질 문제로 다른 모델로 바꿔 끼울 수 있어야 한다.
    override = "gemini-3-flash-preview"
    assert override != DEFAULT_MODEL

    translator = make_translator(["Cảm ơn."], model=override)
    translator.translate(REQUEST)

    assert translator._client.models.calls[0]["model"] == override


def test_original_text_is_sent_as_contents():
    translator = make_translator(["Cảm ơn."])
    translator.translate(REQUEST)

    assert translator._client.models.calls[0]["contents"] == REQUEST.text


def test_system_prompt_is_passed_as_system_instruction():
    translator = make_translator(["Cảm ơn."])
    translator.translate(REQUEST)

    instruction = translator._client.models.calls[0]["config"].system_instruction
    assert "번역된 문장만 출력한다" in instruction


@pytest.mark.parametrize(
    "message",
    ["503 UNAVAILABLE", "504 DEADLINE_EXCEEDED", "429 RESOURCE_EXHAUSTED"],
)
def test_failure_is_not_retried(message):
    # 재시도가 성공해도 그 시점에는 이미 늦은 번역이라 대화를 방해한다.
    # 한 번만 시도하고 실패를 그대로 알린다.
    translator = make_translator([RuntimeError(message), "Cảm ơn."])

    with pytest.raises(TranslationError):
        translator.translate(REQUEST)
    assert len(translator._client.models.calls) == 1


def test_default_timeout_matches_the_provider_minimum():
    # Gemini는 10초 미만 deadline을 400으로 거절한다. 실시간 통역만 보면 더 짧게
    # 끊고 싶지만 provider가 허용하지 않는다.
    assert DEFAULT_TIMEOUT_MS == MIN_TIMEOUT_MS == 10_000


def test_timeout_below_the_provider_minimum_is_rejected():
    # 서버가 400을 주기 전에 생성 시점에 막는다.
    with pytest.raises(ValueError):
        make_translator(["Cảm ơn."], timeout_ms=5_000)


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
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(TranslationError) as exc_info:
        GeminiTranslator()
    assert "GEMINI_API_KEY" in str(exc_info.value)
