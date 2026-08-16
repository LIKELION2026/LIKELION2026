"""자막 페이로드.

`packages/shared`의 `SubtitleCreatedPayload` 계약을 그대로 따른다. Client와
Server가 이미 그 형식을 쓰고 있으므로 파이프라인이 별도 형식을 만들지 않는다.

계약 위치: `packages/shared/src/contracts/socket/subtitle.ts`
발행 경로: `POST /meeting/subtitles/mock` -> 소켓 `subtitle.created`
"""

import re
from dataclasses import dataclass
from datetime import datetime, timezone

from .errors import TranslationPipelineError

# `packages/shared/src/contracts/http/meeting.ts`와 같은 규칙이다.
# 서버가 같은 정규식으로 검증하므로 보내기 전에 여기서 먼저 막는다.
ROOM_NAME_PATTERN = re.compile(
    r"^lab-[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}-[0-9]{8}-[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}$"
)
PARTICIPANT_IDENTITY_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$")
SUBTITLE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{1,127}$")

MAX_TEXT_LENGTH = 2_000
MAX_DISPLAY_NAME_LENGTH = 64


class SubtitleError(TranslationPipelineError):
    """자막 페이로드가 계약을 만족하지 못할 때 발생한다."""


def utc_now_iso() -> str:
    """계약이 요구하는 ISO 8601 문자열."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


@dataclass(frozen=True)
class SubtitlePayload:
    """소켓으로 나갈 자막 하나.

    필드 이름은 TypeScript 계약과 맞춘다. 파이썬 쪽 관례와 다르지만, 계약을
    그대로 옮기는 편이 양쪽을 대조하기 쉽다.
    """

    subtitleId: str
    roomName: str
    speakerIdentity: str
    speakerDisplayName: str
    sourceLanguage: str
    sourceText: str
    translatedLanguage: str
    translatedText: str
    occurredAt: str
    isFinal: bool = True
    revision: int = 1
    confidence: float | None = None

    def to_dict(self) -> dict:
        """`POST /meeting/subtitles/mock` 요청 본문."""
        payload = {
            "subtitleId": self.subtitleId,
            "roomName": self.roomName,
            "speaker": {
                "participantIdentity": self.speakerIdentity,
                "displayName": self.speakerDisplayName,
            },
            "sourceLanguage": self.sourceLanguage,
            "sourceText": self.sourceText,
            "translatedLanguage": self.translatedLanguage,
            "translatedText": self.translatedText,
            "occurredAt": self.occurredAt,
            "isFinal": self.isFinal,
            "revision": self.revision,
        }
        if self.confidence is not None:
            payload["confidence"] = self.confidence
        return payload


def validate_room_name(room_name: str) -> str:
    """서버가 거절하기 전에 방 이름 형식을 먼저 확인한다."""
    if not ROOM_NAME_PATTERN.match(room_name):
        raise SubtitleError(
            "roomName은 lab-<team>-<yyyymmdd>-<slug> 형식이어야 합니다: "
            f"{room_name!r}"
        )
    return room_name


def validate_participant_identity(identity: str) -> str:
    if not PARTICIPANT_IDENTITY_PATTERN.match(identity):
        raise SubtitleError(
            "participantIdentity는 영문, 숫자, 하이픈, 밑줄만 쓸 수 있습니다: "
            f"{identity!r}"
        )
    return identity


def build_subtitle(
    subtitle_id: str,
    room_name: str,
    speaker_identity: str,
    speaker_display_name: str,
    source_lang: str,
    source_text: str,
    target_lang: str,
    translated_text: str,
    occurred_at: str | None = None,
    is_final: bool = True,
    revision: int = 1,
    confidence: float | None = None,
) -> SubtitlePayload:
    """계약을 만족하는 자막 페이로드를 만든다.

    서버도 같은 규칙으로 검증하지만, 여기서 먼저 막아야 어느 발화가 문제인지
    알 수 있다. 서버 응답만 보면 원인을 찾기 어렵다.
    """
    if not SUBTITLE_ID_PATTERN.match(subtitle_id):
        raise SubtitleError(f"subtitleId 형식이 올바르지 않습니다: {subtitle_id!r}")
    validate_room_name(room_name)
    validate_participant_identity(speaker_identity)

    display_name = (speaker_display_name or speaker_identity)[:MAX_DISPLAY_NAME_LENGTH]
    if not source_text.strip() or not translated_text.strip():
        raise SubtitleError("원문과 번역문은 비어 있을 수 없습니다.")
    if revision < 1:
        raise SubtitleError("revision은 1 이상이어야 합니다.")

    return SubtitlePayload(
        subtitleId=subtitle_id,
        roomName=room_name,
        speakerIdentity=speaker_identity,
        speakerDisplayName=display_name,
        sourceLanguage=source_lang,
        sourceText=source_text[:MAX_TEXT_LENGTH],
        translatedLanguage=target_lang,
        translatedText=translated_text[:MAX_TEXT_LENGTH],
        occurredAt=occurred_at or utc_now_iso(),
        isFinal=is_final,
        revision=revision,
        confidence=confidence,
    )
