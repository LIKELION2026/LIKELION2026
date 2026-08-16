"""파이프라인 공통 예외."""


class TranslationPipelineError(Exception):
    """이 파이프라인에서 발생하는 모든 예외의 기반 클래스."""


class UnsupportedLanguageError(TranslationPipelineError):
    """지원 언어 목록에 없는 언어 코드를 받았을 때 발생한다."""

    def __init__(self, language: str, supported: tuple[str, ...]) -> None:
        self.language = language
        self.supported = tuple(supported)
        super().__init__(
            f"지원하지 않는 언어입니다: {language!r}. "
            f"지원 언어: {', '.join(self.supported)}"
        )


class GlossaryError(TranslationPipelineError):
    """관용구 사전을 읽거나 해석하지 못했을 때 발생한다."""


class TranslationError(TranslationPipelineError):
    """번역 provider 호출이 실패했거나 쓸 수 있는 결과를 못 받았을 때 발생한다."""


class UnknownParticipantError(TranslationPipelineError):
    """언어를 등록하지 않은 참가자를 조회했을 때 발생한다."""

    def __init__(self, participant_id: str) -> None:
        self.participant_id = participant_id
        super().__init__(
            f"언어가 등록되지 않은 참가자입니다: {participant_id!r}"
        )
