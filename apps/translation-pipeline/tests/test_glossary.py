"""관용구 사전 로딩과 매칭 단위 테스트."""

import json

import pytest

from translation_pipeline.errors import GlossaryError, UnsupportedLanguageError
from translation_pipeline.glossary import Glossary, GlossaryEntry, GlossaryMatch


@pytest.fixture
def glossary() -> Glossary:
    """저장소에 커밋된 기본 사전."""
    return Glossary.load()


def write_glossary(tmp_path, payload) -> str:
    path = tmp_path / "glossary.json"
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return str(path)


def test_default_glossary_loads_both_directions(glossary):
    assert glossary.entries_for("ko", "vi")
    assert glossary.entries_for("vi", "ko")


def test_entries_are_looked_up_by_direction(glossary):
    ko_vi = glossary.entries_for("ko", "vi")
    vi_ko = glossary.entries_for("vi", "ko")

    # 방향이 다르면 원문도 다른 언어여야 한다.
    assert any(entry.source_text == "고생하셨습니다" for entry in ko_vi)
    assert all(entry.source_text != "고생하셨습니다" for entry in vi_ko)


def test_entries_for_rejects_unsupported_language(glossary):
    with pytest.raises(UnsupportedLanguageError):
        glossary.entries_for("ko", "en")


def test_exact_match_returns_direct_translation(glossary):
    match = glossary.match("고생하셨습니다", "ko", "vi")

    assert match.matched is True
    assert match.can_skip_translation_model is True
    assert match.direct_translation == "Cảm ơn anh/chị đã vất vả."


def test_exact_match_works_in_the_other_direction(glossary):
    match = glossary.match("Anh/chị đã vất vả rồi", "vi", "ko")

    assert match.can_skip_translation_model is True
    assert match.direct_translation == "고생하셨습니다"


def test_trailing_punctuation_still_counts_as_exact_match(glossary):
    # 음성 인식 결과에는 마침표가 붙을 때와 안 붙을 때가 섞인다.
    match = glossary.match("고생하셨습니다.", "ko", "vi")

    assert match.can_skip_translation_model is True
    assert match.direct_translation == "Cảm ơn anh/chị đã vất vả."


def test_surrounding_whitespace_still_counts_as_exact_match(glossary):
    match = glossary.match("  고생하셨습니다  ", "ko", "vi")

    assert match.can_skip_translation_model is True


def test_partial_match_does_not_return_direct_translation(glossary):
    match = glossary.match("다들 고생하셨습니다 내일 봬요", "ko", "vi")

    assert match.matched is True
    assert match.can_skip_translation_model is False
    assert match.direct_translation is None
    assert any(entry.source_text == "고생하셨습니다" for entry in match.entries)


def test_use_llm_flag_suppresses_direct_translation(glossary):
    match = glossary.match(
        "고생하셨습니다", "ko", "vi", use_llm_for_glossary_match=True
    )

    assert match.matched is True
    assert match.can_skip_translation_model is False
    assert match.direct_translation is None
    # 항목 자체는 확정 번역 사전으로 넘길 수 있도록 남아 있어야 한다.
    assert any(entry.source_text == "고생하셨습니다" for entry in match.entries)


def test_longer_entries_are_listed_first(glossary):
    # "오늘도 고생하셨습니다"는 "고생하셨습니다"도 함께 포함한다.
    match = glossary.match("오늘도 고생하셨습니다", "ko", "vi")

    sources = [entry.source_text for entry in match.entries]
    assert "오늘도 고생하셨습니다" in sources
    assert "고생하셨습니다" in sources
    assert sources.index("오늘도 고생하셨습니다") < sources.index("고생하셨습니다")
    # 더 구체적인 항목이 사전값으로 선택된다.
    assert match.direct_translation == "Hôm nay anh/chị đã vất vả rồi."


def test_unmatched_text_returns_empty_match(glossary):
    match = glossary.match("내일 회의는 세 시에 시작합니다", "ko", "vi")

    assert match.matched is False
    assert match.can_skip_translation_model is False
    assert match.entries == ()


@pytest.mark.parametrize("text", ["", "   ", "."])
def test_blank_text_returns_empty_match(glossary, text):
    assert glossary.match(text, "ko", "vi").matched is False


def test_empty_match_is_the_default_state():
    match = GlossaryMatch()

    assert match.matched is False
    assert match.can_skip_translation_model is False


def test_entry_is_immutable():
    entry = GlossaryEntry(source_text="고생하셨습니다", target_text="...")

    with pytest.raises(Exception):
        entry.source_text = "바꿔치기"  # type: ignore[misc]


def test_missing_file_raises_glossary_error(tmp_path):
    with pytest.raises(GlossaryError):
        Glossary.load(tmp_path / "does_not_exist.json")


def test_invalid_json_raises_glossary_error(tmp_path):
    path = tmp_path / "glossary.json"
    path.write_text("{ not json", encoding="utf-8")

    with pytest.raises(GlossaryError):
        Glossary.load(path)


def test_non_object_root_raises_glossary_error(tmp_path):
    with pytest.raises(GlossaryError):
        Glossary.load(write_glossary(tmp_path, ["ko_vi"]))


@pytest.mark.parametrize("direction", ["kovi", "ko_en", "ko_ko", "ko_vi_extra"])
def test_invalid_direction_key_raises_glossary_error(tmp_path, direction):
    with pytest.raises(GlossaryError):
        Glossary.load(write_glossary(tmp_path, {direction: []}))


def test_non_list_direction_value_raises_glossary_error(tmp_path):
    with pytest.raises(GlossaryError):
        Glossary.load(write_glossary(tmp_path, {"ko_vi": {"ko": "x"}}))


@pytest.mark.parametrize(
    "item",
    [
        {"ko": "고생하셨습니다"},
        {"natural_vi": "Cảm ơn."},
        {"ko": "", "natural_vi": "Cảm ơn."},
        {"ko": "고생하셨습니다", "natural_vi": "   "},
        {"ko": 1, "natural_vi": "Cảm ơn."},
        "고생하셨습니다",
    ],
)
def test_malformed_entry_raises_glossary_error(tmp_path, item):
    with pytest.raises(GlossaryError):
        Glossary.load(write_glossary(tmp_path, {"ko_vi": [item]}))


def test_direction_without_entries_is_allowed(tmp_path):
    loaded = Glossary.load(write_glossary(tmp_path, {"ko_vi": []}))

    assert loaded.entries_for("ko", "vi") == ()
    assert loaded.match("고생하셨습니다", "ko", "vi").matched is False


def test_missing_direction_returns_no_entries(tmp_path):
    loaded = Glossary.load(
        write_glossary(
            tmp_path, {"ko_vi": [{"ko": "고생하셨습니다", "natural_vi": "Cảm ơn."}]}
        )
    )

    assert loaded.entries_for("vi", "ko") == ()
