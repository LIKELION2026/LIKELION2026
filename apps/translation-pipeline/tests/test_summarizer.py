"""회의 요약 인터페이스(Summarizer, FallbackSummarizer, 응답 파싱) 테스트."""

import pytest

from translation_pipeline.errors import ProviderUnavailableError, TranslationError
from translation_pipeline.summarizer import (
    FallbackSummarizer,
    MeetingSummary,
    SummaryRequest,
    build_summary_system_prompt,
    parse_summary_response,
)


def make_request(**overrides):
    values = {"room_name": "lab-likelion-20260820-meeting-room", "transcript_text": "[민수] 안녕하세요"}
    values.update(overrides)
    return SummaryRequest(**values)


# --- SummaryRequest ---


def test_request_rejects_blank_transcript():
    with pytest.raises(ValueError):
        make_request(transcript_text="   ")


def test_prompt_requires_both_languages_in_the_output():
    prompt = build_summary_system_prompt(make_request())

    assert "summary_ko" in prompt
    assert "summary_vi" in prompt


def test_prompt_does_not_embed_the_transcript():
    # 전사는 시스템 프롬프트가 아니라 별도 사용자 턴(contents)으로 보낸다 —
    # translator.py의 build_system_prompt와 같은 구조다.
    prompt = build_summary_system_prompt(make_request(transcript_text="[민수] 아주 특이한 발화 내용"))

    assert "아주 특이한 발화 내용" not in prompt


# --- FallbackSummarizer ---


class StubSummarizer:
    def __init__(self, outcome):
        self._outcome = outcome
        self.calls = 0

    def summarize(self, request):
        self.calls += 1
        if isinstance(self._outcome, Exception):
            raise self._outcome
        return self._outcome


def test_uses_the_primary_result_when_it_succeeds():
    primary = StubSummarizer(MeetingSummary(summary_ko="1차 요약", summary_vi="1"))
    fallback = StubSummarizer(MeetingSummary(summary_ko="2차 요약", summary_vi="2"))
    summarizer = FallbackSummarizer(primary, fallback)

    result = summarizer.summarize(make_request())

    assert result.summary_ko == "1차 요약"
    assert fallback.calls == 0


def test_falls_back_when_the_primary_is_temporarily_unavailable():
    primary = StubSummarizer(ProviderUnavailableError("한도 초과"))
    fallback = StubSummarizer(MeetingSummary(summary_ko="2차 요약", summary_vi="2"))
    summarizer = FallbackSummarizer(primary, fallback)

    result = summarizer.summarize(make_request())

    assert result.summary_ko == "2차 요약"
    assert primary.calls == 1
    assert fallback.calls == 1


def test_other_failures_are_not_sent_to_the_fallback():
    primary = StubSummarizer(TranslationError("JSON 파싱 실패"))
    fallback = StubSummarizer(MeetingSummary(summary_ko="2차 요약", summary_vi="2"))
    summarizer = FallbackSummarizer(primary, fallback)

    with pytest.raises(TranslationError) as exc_info:
        summarizer.summarize(make_request())

    assert not isinstance(exc_info.value, ProviderUnavailableError)
    assert fallback.calls == 0


# --- parse_summary_response ---


def test_parses_a_well_formed_response():
    summary = parse_summary_response(
        '{"summary_ko": "한국어 요약", "summary_vi": "Tom tat"}', provider_name="Gemini"
    )

    assert summary == MeetingSummary(summary_ko="한국어 요약", summary_vi="Tom tat")


def test_trims_surrounding_whitespace_in_each_field():
    summary = parse_summary_response(
        '{"summary_ko": "  한국어 요약  ", "summary_vi": "  Tom tat  "}',
        provider_name="Gemini",
    )

    assert summary == MeetingSummary(summary_ko="한국어 요약", summary_vi="Tom tat")


@pytest.mark.parametrize("text", [None, "", "   "])
def test_empty_response_raises(text):
    with pytest.raises(TranslationError):
        parse_summary_response(text, provider_name="Gemini")


def test_invalid_json_raises():
    with pytest.raises(TranslationError):
        parse_summary_response("이건 JSON이 아니다", provider_name="Gemini")


def test_missing_summary_ko_raises():
    with pytest.raises(TranslationError):
        parse_summary_response('{"summary_vi": "Tom tat"}', provider_name="Gemini")


def test_missing_summary_vi_raises():
    with pytest.raises(TranslationError):
        parse_summary_response('{"summary_ko": "한국어 요약"}', provider_name="Gemini")


def test_blank_summary_field_raises():
    with pytest.raises(TranslationError):
        parse_summary_response(
            '{"summary_ko": "   ", "summary_vi": "Tom tat"}', provider_name="Gemini"
        )


def test_non_object_json_raises():
    with pytest.raises(TranslationError):
        parse_summary_response('["summary_ko", "summary_vi"]', provider_name="Gemini")
