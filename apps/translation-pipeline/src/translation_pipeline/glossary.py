"""관용구 사전과 매칭 로직.

번역 모델을 호출하기 전에 코드에서 먼저 사전을 조회한다. 원문 전체가 사전
항목과 일치하면 모델을 호출하지 않고 사전값을 그대로 쓰고, 일부만 일치하면
매칭된 항목을 "확정 번역 사전"으로 모델에 넘긴다.
"""

import json
from dataclasses import dataclass
from pathlib import Path

from .errors import GlossaryError
from .languages import ensure_supported

# 앱 루트의 data/glossary.json을 기본 사전으로 사용한다.
DEFAULT_GLOSSARY_PATH = Path(__file__).resolve().parents[2] / "data" / "glossary.json"

# 음성 인식 결과는 문장 끝 구두점이 있을 때와 없을 때가 섞이므로, 비교할 때만
# 떼어내고 원문 자체는 그대로 둔다.
_SENTENCE_PUNCTUATION = ".!?。！？"


def _normalize(text: str) -> str:
    """비교용 정규화. 앞뒤 공백과 문장 끝 구두점을 제거하고 대소문자를 무시한다."""
    return text.strip().rstrip(_SENTENCE_PUNCTUATION).strip().casefold()


@dataclass(frozen=True)
class GlossaryEntry:
    """사전 항목 하나. 원문 표현과 그에 대응하는 자연스러운 번역."""

    source_text: str
    target_text: str


def find_unapplied_entries(
    translated_text: str, entries: tuple[GlossaryEntry, ...]
) -> tuple[GlossaryEntry, ...]:
    """번역 결과에 반영되지 않은 사전 항목을 찾는다.

    프롬프트로 사전 사용을 지시해도 모델이 문맥에 맞춰 표현을 바꾸는 경우가
    있다. 어떤 항목이 지켜지지 않았는지 확인해야 준수율을 측정하고 런타임에
    대응할 수 있다.

    비교는 매칭할 때와 같은 기준으로 정규화한다. 문장 안에 들어가면서 끝
    구두점이 사라지거나 대소문자가 달라지는 것은 위반으로 보지 않는다.
    """
    normalized_result = _normalize(translated_text)
    return tuple(
        entry
        for entry in entries
        if _normalize(entry.target_text) not in normalized_result
    )


@dataclass(frozen=True)
class GlossaryMatch:
    """한 문장에 대한 사전 조회 결과."""

    entries: tuple[GlossaryEntry, ...] = ()
    direct_translation: str | None = None

    @property
    def matched(self) -> bool:
        """사전 항목이 하나라도 걸렸는지."""
        return bool(self.entries)

    @property
    def can_skip_translation_model(self) -> bool:
        """모델 호출 없이 사전값만으로 번역을 끝낼 수 있는지."""
        return self.direct_translation is not None


class Glossary:
    """방향별 관용구 사전.

    조회 키는 ``f"{source_lang}_{target_lang}"``이고, 항목의 원문 필드는
    ``source_lang``, 번역 필드는 ``f"natural_{target_lang}"``이다.
    """

    def __init__(self, entries_by_direction: dict[str, tuple[GlossaryEntry, ...]]) -> None:
        self._entries_by_direction = entries_by_direction

    @classmethod
    def load(cls, path: Path | str | None = None) -> "Glossary":
        """JSON 파일에서 사전을 읽는다."""
        glossary_path = Path(path) if path is not None else DEFAULT_GLOSSARY_PATH
        try:
            raw = json.loads(glossary_path.read_text(encoding="utf-8"))
        except FileNotFoundError as error:
            raise GlossaryError(f"사전 파일을 찾을 수 없습니다: {glossary_path}") from error
        except json.JSONDecodeError as error:
            raise GlossaryError(
                f"사전 파일이 올바른 JSON이 아닙니다: {glossary_path} ({error})"
            ) from error

        if not isinstance(raw, dict):
            raise GlossaryError("사전 최상위는 방향을 키로 갖는 객체여야 합니다.")

        entries_by_direction: dict[str, tuple[GlossaryEntry, ...]] = {}
        for direction, items in raw.items():
            source_lang, target_lang = cls._split_direction(direction)
            entries_by_direction[direction] = cls._parse_entries(
                direction, items, source_lang, target_lang
            )
        return cls(entries_by_direction)

    @staticmethod
    def _split_direction(direction: str) -> tuple[str, str]:
        parts = direction.split("_")
        if len(parts) != 2:
            raise GlossaryError(
                f"사전 방향 키는 '<source>_<target>' 형식이어야 합니다: {direction!r}"
            )
        source_lang, target_lang = parts
        try:
            ensure_supported(source_lang)
            ensure_supported(target_lang)
        except Exception as error:
            raise GlossaryError(f"지원하지 않는 사전 방향입니다: {direction!r}") from error
        if source_lang == target_lang:
            raise GlossaryError(f"원문과 번역 언어가 같습니다: {direction!r}")
        return source_lang, target_lang

    @staticmethod
    def _parse_entries(
        direction: str, items: object, source_lang: str, target_lang: str
    ) -> tuple[GlossaryEntry, ...]:
        if not isinstance(items, list):
            raise GlossaryError(f"사전 방향 {direction!r}의 값은 배열이어야 합니다.")

        target_field = f"natural_{target_lang}"
        entries: list[GlossaryEntry] = []
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                raise GlossaryError(f"{direction}[{index}] 항목은 객체여야 합니다.")
            source_text = item.get(source_lang)
            target_text = item.get(target_field)
            if not isinstance(source_text, str) or not source_text.strip():
                raise GlossaryError(
                    f"{direction}[{index}]에 비어 있지 않은 {source_lang!r} 필드가 필요합니다."
                )
            if not isinstance(target_text, str) or not target_text.strip():
                raise GlossaryError(
                    f"{direction}[{index}]에 비어 있지 않은 {target_field!r} 필드가 필요합니다."
                )
            entries.append(GlossaryEntry(source_text=source_text, target_text=target_text))
        return tuple(entries)

    def entries_for(self, source_lang: str, target_lang: str) -> tuple[GlossaryEntry, ...]:
        """해당 번역 방향의 사전 항목을 반환한다. 없으면 빈 튜플."""
        ensure_supported(source_lang)
        ensure_supported(target_lang)
        return self._entries_by_direction.get(f"{source_lang}_{target_lang}", ())

    def match(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        use_llm_for_glossary_match: bool = False,
    ) -> GlossaryMatch:
        """원문에 걸리는 사전 항목을 찾는다.

        원문 전체가 한 항목과 일치하고 ``use_llm_for_glossary_match``가 False이면
        ``direct_translation``에 사전값을 채워 모델 호출을 건너뛸 수 있게 한다.
        일부만 걸리거나 True이면 항목만 돌려주고 번역은 모델에 맡긴다.

        여러 항목이 걸리면 원문이 긴 항목을 앞에 둔다. 더 구체적인 표현이
        먼저 오도록 하기 위해서다.
        """
        normalized_text = _normalize(text)
        if not normalized_text:
            return GlossaryMatch()

        matched = [
            entry
            for entry in self.entries_for(source_lang, target_lang)
            if _normalize(entry.source_text) in normalized_text
        ]
        if not matched:
            return GlossaryMatch()

        matched.sort(key=lambda entry: len(_normalize(entry.source_text)), reverse=True)

        direct_translation = None
        if not use_llm_for_glossary_match:
            for entry in matched:
                if _normalize(entry.source_text) == normalized_text:
                    direct_translation = entry.target_text
                    break

        return GlossaryMatch(entries=tuple(matched), direct_translation=direct_translation)
