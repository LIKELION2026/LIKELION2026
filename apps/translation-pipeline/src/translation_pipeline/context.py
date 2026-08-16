"""대화 컨텍스트 버퍼.

번역 품질은 앞선 발화에 좌우된다. 지시어나 생략된 주어를 해석하려면 직전
대화가 필요하다. 참가자 수와 무관하게 회의 전체 흐름 기준으로 최근 몇 턴만
메모리에 유지한다.
"""

from collections import deque
from dataclasses import dataclass

# 최근 3~5턴을 유지한다. 너무 길면 프롬프트가 커지고 오래된 맥락이 오히려
# 번역을 흐린다.
DEFAULT_MAX_TURNS = 5


@dataclass(frozen=True)
class ConversationTurn:
    """번역이 끝난 발화 한 건."""

    speaker_id: str
    original_text: str
    translated_text: str


class ConversationContext:
    """최근 발화를 유지하는 고정 길이 버퍼."""

    def __init__(self, max_turns: int = DEFAULT_MAX_TURNS) -> None:
        if max_turns < 1:
            raise ValueError("max_turns는 1 이상이어야 합니다.")
        self._max_turns = max_turns
        self._turns: deque[ConversationTurn] = deque(maxlen=max_turns)

    @property
    def max_turns(self) -> int:
        return self._max_turns

    def __len__(self) -> int:
        return len(self._turns)

    def add(self, speaker_id: str, original_text: str, translated_text: str) -> None:
        """번역이 끝난 발화를 추가한다. 가장 오래된 턴부터 밀려난다."""
        self._turns.append(
            ConversationTurn(
                speaker_id=speaker_id,
                original_text=original_text,
                translated_text=translated_text,
            )
        )

    def recent(self) -> tuple[ConversationTurn, ...]:
        """오래된 순서대로 최근 턴을 반환한다."""
        return tuple(self._turns)

    def clear(self) -> None:
        """회의가 끝났거나 맥락을 끊어야 할 때 버퍼를 비운다."""
        self._turns.clear()
