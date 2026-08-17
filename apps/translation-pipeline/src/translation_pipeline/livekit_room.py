"""회의방 참가자와 오디오 태스크를 잇는다.

``TranslationAgent``는 참가자별 통역 세션을 관리하고, 여기서는 그 세션에
오디오를 흘려보내는 asyncio 태스크를 관리한다. 둘을 나눈 이유는 통역 쪽은
스레드에서 돌고 오디오 쪽은 asyncio에서 돌기 때문이다.

참가자가 나갈 때 태스크를 취소하고 워커를 정지하는 순서가 중요하다. 워커
정지는 스레드를 join하므로 asyncio 루프에서 그대로 기다리면 방 전체의 오디오
수신이 함께 멈춘다.
"""

import asyncio
from typing import Callable

from .agent import TranslationAgent
from .livekit_audio import open_participant_audio, pump_audio


class ParticipantAudioRunner:
    """참가자 오디오 태스크의 수명을 관리한다.

    ``open_audio``는 참가자에게서 비동기 오디오 프레임을 내주는 것이면 된다.
    실제로는 LiveKit ``AudioStream``이고, 테스트에서는 가짜를 넣는다.
    """

    def __init__(
        self,
        agent: TranslationAgent,
        open_audio: Callable | None = None,
        room=None,
    ) -> None:
        self._agent = agent
        self._room = room
        self._open_audio = open_audio or (
            lambda participant: open_participant_audio(self._room, participant)
        )
        self._tasks: dict[str, asyncio.Task] = {}

    def tracked(self) -> set[str]:
        return set(self._tasks)

    def attach(self, participant) -> bool:
        """참가자를 통역에 붙인다. 대상이 아니면 ``False``."""
        worker = self._agent.add_participant(participant)
        if worker is None:
            return False

        identity = worker.info.identity
        if identity in self._tasks:
            return True

        stream = self._open_audio(participant)
        self._tasks[identity] = asyncio.ensure_future(pump_audio(stream, worker.audio))
        return True

    async def detach(self, identity: str) -> None:
        """참가자를 떼고 태스크와 스레드를 정리한다."""
        task = self._tasks.pop(identity, None)
        if task is not None:
            task.cancel()
        # 스레드 join이라 루프에서 그대로 기다리면 방 전체가 멈춘다.
        await asyncio.to_thread(self._agent.remove_participant, identity)

    async def shutdown(self) -> None:
        for identity in list(self._tasks):
            await self.detach(identity)
        await asyncio.to_thread(self._agent.stop)
