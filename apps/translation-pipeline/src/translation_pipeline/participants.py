"""참가자-언어 매핑 관리.

참가자 수에는 제한이 없다. 각 참가자는 회의 UI에서 자신의 언어를 직접
선택하고, 이 파이프라인은 선택 결과인 ``participant_id -> language`` 매핑을
외부에서 주입받는다. 선택 UI 자체는 이 파이프라인의 범위가 아니다.
"""

from .errors import UnknownParticipantError
from .languages import ensure_supported, get_target_lang


class ParticipantRegistry:
    """런타임에 채워지는 참가자-언어 매핑.

    참가자가 입장할 때마다 ``set_language``로 매핑이 누적되므로 참가자 수가
    2명이든 10명이든 같은 방식으로 동작한다.
    """

    def __init__(self, participant_languages: dict[str, str] | None = None) -> None:
        self._participant_languages: dict[str, str] = {}
        # 자막에 표시할 이름. 언어와 달리 없어도 동작하므로 따로 둔다.
        self._display_names: dict[str, str] = {}
        for participant_id, language in (participant_languages or {}).items():
            self.set_language(participant_id, language)

    @property
    def participant_languages(self) -> dict[str, str]:
        """현재 매핑의 복사본.

        외부에서 검증을 건너뛰고 매핑을 바꾸지 못하도록 복사본을 반환한다.
        """
        return dict(self._participant_languages)

    def __len__(self) -> int:
        return len(self._participant_languages)

    def __contains__(self, participant_id: object) -> bool:
        return participant_id in self._participant_languages

    def set_language(
        self, participant_id: str, language: str, display_name: str | None = None
    ) -> None:
        """참가자가 선택한 언어를 등록하거나 변경한다.

        ``display_name``은 자막에 표시할 이름이다. 생략하면 기존 값을 유지하고,
        한 번도 준 적이 없으면 ``display_name_of``가 참가자 ID를 대신 돌려준다.
        """
        if not participant_id:
            raise ValueError("participant_id는 비어 있을 수 없습니다.")
        ensure_supported(language)
        self._participant_languages[participant_id] = language
        if display_name:
            self._display_names[participant_id] = display_name

    def display_name_of(self, participant_id: str) -> str:
        """자막에 표시할 이름. 등록되지 않았으면 참가자 ID를 그대로 쓴다."""
        if participant_id not in self._participant_languages:
            raise UnknownParticipantError(participant_id)
        return self._display_names.get(participant_id, participant_id)

    def remove(self, participant_id: str) -> None:
        """퇴장한 참가자를 매핑에서 제거한다. 없는 참가자는 무시한다."""
        self._participant_languages.pop(participant_id, None)
        self._display_names.pop(participant_id, None)

    def language_of(self, participant_id: str) -> str:
        """참가자가 선택한 언어를 반환한다."""
        try:
            return self._participant_languages[participant_id]
        except KeyError:
            raise UnknownParticipantError(participant_id) from None

    def resolve_direction(self, speaker_id: str) -> tuple[str, str]:
        """화자 기준 ``(source_lang, target_lang)``을 반환한다.

        화자의 언어는 매핑에서 조회하고, 타겟 언어는 지원 언어가 2개라는
        전제에서 화자 언어만으로 결정한다.
        """
        source_lang = self.language_of(speaker_id)
        return source_lang, get_target_lang(source_lang)
