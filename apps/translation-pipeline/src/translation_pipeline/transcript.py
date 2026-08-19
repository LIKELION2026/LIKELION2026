"""회의방 전체 발화를 쌓아 회의 요약의 재료로 쓴다.

`run_agent.py`의 `ConsoleReporter`가 이미 방 전체 이벤트가 모이는 지점이라
(`on_event`가 `TranslationAgent`에 하나만 전달됨) 같은 자리에 병렬로 꽂는다.

참가자별로 별도 스레드에서 번역이 끝나는 대로 이벤트가 온다(`session.py`).
그래서 `record()`에는 락이 필요하고, 호출 순서가 실제 발화 순서와 다를 수 있어
`render()`는 발화 시각(`occurred_at`)으로 정렬한다.
"""

import threading
from dataclasses import dataclass

from .session import SessionEvent


@dataclass(frozen=True)
class TranscriptLine:
    """확정된 발화 한 줄."""

    speaker_display_name: str
    source_language: str
    source_text: str
    occurred_at: str


class TranscriptRecorder:
    """방 전체 발화를 시간순으로 모은다."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._lines: list[TranscriptLine] = []

    def record(self, event: SessionEvent) -> None:
        """확정된 발화(``ends_utterance``)만 기록한다.

        중간 결과나 조각은 최종 텍스트가 아니라 요약에 넣지 않는다. 실패한
        이벤트도 건너뛴다 — 번역이 실패했다는 뜻이지 발화가 없었다는 뜻은
        아니지만, 무엇을 기록해야 할지 알 수 없다.
        """
        if event.error is not None or not event.ends_utterance:
            return
        if event.result is None or event.result.subtitle is None:
            return

        payload = event.result.subtitle
        with self._lock:
            self._lines.append(
                TranscriptLine(
                    speaker_display_name=payload.speakerDisplayName,
                    source_language=payload.sourceLanguage,
                    source_text=payload.sourceText,
                    occurred_at=payload.occurredAt,
                )
            )

    def is_empty(self) -> bool:
        with self._lock:
            return not self._lines

    def render(self) -> str:
        """화자별 원문을 시간순으로 이어붙인다.

        번역문이 아니라 원문(``source_text``)을 쓴다 — 언어가 한/베 2개뿐이라
        LLM이 섞인 언어 입력을 그대로 읽고 양쪽 언어로 요약할 수 있다.
        """
        with self._lock:
            ordered = sorted(self._lines, key=lambda line: line.occurred_at)
        return "\n".join(
            f"[{line.speaker_display_name}] {line.source_text}" for line in ordered
        )
