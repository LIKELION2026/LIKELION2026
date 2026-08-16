"""관용구 지침 로딩 테스트."""

import pytest

from translation_pipeline.errors import UnsupportedLanguageError
from translation_pipeline.guidelines import (
    guidelines_path,
    load_guidelines,
)


def write_guidelines(tmp_path, source_lang, target_lang, body) -> None:
    (tmp_path / f"{source_lang}_{target_lang}.md").write_text(body, encoding="utf-8")


def test_path_follows_the_direction_naming():
    assert guidelines_path("ko", "vi").name == "ko_vi.md"
    assert guidelines_path("vi", "ko").name == "vi_ko.md"


@pytest.mark.parametrize(
    ("source_lang", "target_lang"), [("ko", "en"), ("en", "vi"), ("", "vi")]
)
def test_unsupported_direction_is_rejected(source_lang, target_lang):
    with pytest.raises(UnsupportedLanguageError):
        guidelines_path(source_lang, target_lang)


def test_missing_file_is_not_an_error(tmp_path):
    # 지침은 선택 사항이다. 없다고 번역이 막혀서는 안 된다.
    assert load_guidelines("ko", "vi", directory=tmp_path) == ""


def test_title_and_preamble_are_dropped(tmp_path):
    write_guidelines(
        tmp_path,
        "ko",
        "vi",
        "# 제목\n\n파일 자체에 대한 설명이라 모델에게 필요 없다.\n\n## 노고 표현\n- 규칙\n",
    )

    loaded = load_guidelines("ko", "vi", directory=tmp_path)

    assert loaded.startswith("## 노고 표현")
    assert "제목" not in loaded
    assert "파일 자체에 대한 설명" not in loaded


def test_all_sections_are_kept(tmp_path):
    write_guidelines(
        tmp_path, "ko", "vi", "# 제목\n\n## 첫 섹션\n- 가\n\n## 둘째 섹션\n- 나\n"
    )

    loaded = load_guidelines("ko", "vi", directory=tmp_path)

    assert "## 첫 섹션" in loaded
    assert "## 둘째 섹션" in loaded


def test_file_without_sections_yields_nothing(tmp_path):
    write_guidelines(tmp_path, "ko", "vi", "# 제목만 있고 지침이 없다\n\n설명뿐이다.\n")

    assert load_guidelines("ko", "vi", directory=tmp_path) == ""


def test_directions_are_loaded_separately(tmp_path):
    write_guidelines(tmp_path, "ko", "vi", "# t\n\n## 한국어 원문 규칙\n- 가\n")
    write_guidelines(tmp_path, "vi", "ko", "# t\n\n## 베트남어 원문 규칙\n- 나\n")

    ko_vi = load_guidelines("ko", "vi", directory=tmp_path)
    vi_ko = load_guidelines("vi", "ko", directory=tmp_path)

    assert "한국어 원문 규칙" in ko_vi
    assert "한국어 원문 규칙" not in vi_ko


def test_committed_guidelines_load_for_both_directions():
    """저장소에 커밋된 지침이 실제로 읽히는지 확인한다."""
    assert load_guidelines("ko", "vi").startswith("## ")
    assert load_guidelines("vi", "ko").startswith("## ")
