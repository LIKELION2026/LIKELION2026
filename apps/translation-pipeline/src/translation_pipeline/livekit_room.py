"""회의방 참가자와 오디오 태스크를 잇는다.

``TranslationAgent``는 참가자별 통역 세션을 관리하고, 여기서는 그 세션에
오디오를 흘려보내는 asyncio 태스크를 관리한다. 둘을 나눈 이유는 통역 쪽은
스레드에서 돌고 오디오 쪽은 asyncio에서 돌기 때문이다.

참가자가 나갈 때 태스크를 취소하고 워커를 정지하는 순서가 중요하다. 워커
정지는 스레드를 join하므로 asyncio 루프에서 그대로 기다리면 방 전체의 오디오
수신이 함께 멈춘다.
"""

import asyncio
import contextlib
from typing import Callable

from .agent import TranslationAgent, participant_receives_translation, read_participant
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

    async def refresh(self, participant) -> bool:
        """참가자 attributes 변경을 반영한다.

        말하는 언어가 바뀌면 STT 언어도 달라져야 하므로 기존 워커와 오디오
        태스크를 닫고 새로 붙인다. 통역 대상이 아니게 바뀌면 떼어낸다.
        """
        identity = (getattr(participant, "identity", "") or "").strip()
        if not identity:
            return False

        next_info = read_participant(participant)
        existing_worker = self._agent.workers().get(identity)

        if next_info is None:
            await self.detach(identity)
            return False

        if existing_worker is not None and existing_worker.info == next_info:
            if identity in self._tasks:
                return True

            return self.attach(participant)

        await self.detach(identity)
        return self.attach(participant)

    async def detach(self, identity: str) -> None:
        """참가자를 떼고 태스크와 스레드를 정리한다."""
        task = self._tasks.pop(identity, None)
        if task is not None:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
        # 스레드 join이라 루프에서 그대로 기다리면 방 전체가 멈춘다.
        await asyncio.to_thread(self._agent.remove_participant, identity)

    async def shutdown(self) -> None:
        for identity in list(self._tasks):
            await self.detach(identity)
        await asyncio.to_thread(self._agent.stop)


def register_participant_events(
    room,
    runner: ParticipantAudioRunner,
    on_attached: Callable | None = None,
    on_skipped: Callable | None = None,
    on_detached: Callable | None = None,
) -> None:
    """방의 참가자 입·퇴장을 러너에 잇는다.

    퇴장 처리는 코루틴이라 태스크로 띄운다. 이 콜백은 이벤트 루프 스레드에서
    불리므로 ``asyncio.create_task``로 충분하다. 여기가 두 번 틀린 자리라
    스크립트에 두지 않고 모듈로 옮겨 테스트한다.
    """

    async def _sync_translation_targets(extra_participant=None) -> None:
        if not room_has_translation_receivers(room, extra_participant):
            for identity in list(runner.tracked()):
                await runner.detach(identity)
            return

        participants = list(room.remote_participants.values())
        if extra_participant is not None and all(
            participant.identity != extra_participant.identity
            for participant in participants
        ):
            participants.append(extra_participant)

        for participant in participants:
            was_tracked = participant.identity in runner.tracked()
            if await runner.refresh(participant):
                if not was_tracked and on_attached is not None:
                    on_attached(participant)
                continue
            if on_skipped is not None:
                on_skipped(participant)

    def _connected(participant) -> None:
        if not room_has_translation_receivers(room, participant):
            if on_skipped is not None:
                on_skipped(participant)
            return

        if runner.attach(participant):
            if on_attached is not None:
                on_attached(participant)
        elif on_skipped is not None:
            on_skipped(participant)

    def _disconnected(participant) -> None:
        identity = participant.identity
        if on_detached is not None:
            on_detached(identity)
        # 이걸 놓치면 워커 스레드와 오디오 태스크가 그대로 남는다.
        asyncio.create_task(_detach_and_sync_translation_targets(identity))

    async def _detach_and_sync_translation_targets(identity: str) -> None:
        await runner.detach(identity)
        await _sync_translation_targets()

    def _attributes_changed(*args) -> None:
        participant = extract_participant_from_attribute_event(*args)
        if participant is None:
            return

        asyncio.create_task(_sync_translation_targets(participant))

    room.on("participant_connected", _connected)
    room.on("participant_disconnected", _disconnected)
    room.on("participant_attributes_changed", _attributes_changed)


def attach_existing_participants(
    room, runner: ParticipantAudioRunner, on_attached=None, on_skipped=None
) -> None:
    """워커가 들어가기 전에 이미 있던 참가자를 받는다."""
    if not room_has_translation_receivers(room):
        if on_skipped is not None:
            for participant in list(room.remote_participants.values()):
                on_skipped(participant)
        return

    for participant in list(room.remote_participants.values()):
        if runner.attach(participant):
            if on_attached is not None:
                on_attached(participant)
        elif on_skipped is not None:
            on_skipped(participant)


def room_has_translation_receivers(room, extra_participant=None) -> bool:
    """방 안에 AI 번역을 켠 참가자가 하나라도 있는지 확인한다."""
    participants = list(room.remote_participants.values())
    if extra_participant is not None:
        participants.append(extra_participant)

    return any(
        participant_receives_translation(participant) for participant in participants
    )


def extract_participant_from_attribute_event(*args):
    """LiveKit SDK 버전별 attributes changed 인자 차이를 흡수한다."""
    for value in reversed(args):
        if hasattr(value, "identity"):
            return value

    return None
