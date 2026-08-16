"""번역 방향별 관용구 지침 로딩.

같은 표현이라도 상황에 따라 다르게 옮겨야 하는 관용구는 고정 사전으로 다루기
어렵다. 활용형이 조금만 달라도 문자열 매칭이 놓치고, 하나로 고정하면 문맥에
맞지 않는 번역이 강제된다. 그래서 지침 형태로 프롬프트에 실어 모델이 상황에
맞게 고르도록 한다.

지침은 코드가 아니라 데이터 파일에 둔다. 번역 표현을 검토하는 사람이 Python을
건드리지 않고 수정할 수 있어야 하기 때문이다.
"""

from pathlib import Path

from .errors import TranslationPipelineError
from .languages import ensure_supported

# 앱 루트의 data/idiom_guidelines/를 기본 위치로 쓴다.
DEFAULT_GUIDELINES_DIR = (
    Path(__file__).resolve().parents[2] / "data" / "idiom_guidelines"
)

# 파일 맨 위의 제목과 파일 자체에 대한 설명은 모델에게 필요 없다. 지침이
# 시작되는 첫 섹션부터 싣는다.
_SECTION_MARKER = "\n## "


class GuidelinesError(TranslationPipelineError):
    """지침 파일을 읽지 못했을 때 발생한다."""


def guidelines_path(source_lang: str, target_lang: str, directory: Path | None = None) -> Path:
    """해당 번역 방향의 지침 파일 경로."""
    ensure_supported(source_lang)
    ensure_supported(target_lang)
    base = directory if directory is not None else DEFAULT_GUIDELINES_DIR
    return base / f"{source_lang}_{target_lang}.md"


def load_guidelines(
    source_lang: str, target_lang: str, directory: Path | None = None
) -> str:
    """번역 방향에 맞는 지침 본문을 반환한다.

    파일이 없으면 빈 문자열을 돌려준다. 지침은 선택 사항이고, 없다고 해서
    번역이 막혀서는 안 된다.

    제목과 파일 설명은 걷어내고 실제 지침 섹션부터 반환한다. 매 호출마다
    프롬프트에 실리므로 불필요한 토큰을 줄인다.
    """
    path = guidelines_path(source_lang, target_lang, directory)
    if not path.is_file():
        return ""

    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as error:
        raise GuidelinesError(f"지침 파일을 읽지 못했습니다: {path}") from error

    marker_index = raw.find(_SECTION_MARKER)
    if marker_index == -1:
        # 섹션이 하나도 없으면 실을 지침이 없는 것으로 본다.
        return ""
    return raw[marker_index:].strip()
