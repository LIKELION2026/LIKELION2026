"""참가자 오디오 태스크 관리 테스트.

LiveKit 없이 돈다. 참가자가 나갈 때 태스크와 워커가 함께 정리되는지가 핵심이다.
안 그러면 회의를 거듭할수록 스레드와 큐가 쌓인다.
"""

import asyncio

import pytest

from translation_pipeline.agent import (
    LANGUAGE_ATTRIBUTE,
    TRANSLATION_RECEIVING_ENABLED_ATTRIBUTE,
    TranslationAgent,
)
from translation_pipeline.livekit_room import (
    ParticipantAudioRunner,
    attach_existing_participants,
    register_participant_events,
)

ROOM = "lab-likelion-20260818-meeting-room"


class FakeParticipant:
    def __init__(self, identity, language="ko", name="민수", receiving=True):
        self.identity = identity
        self.name = name
        self.attributes = {LANGUAGE_ATTRIBUTE: language} if language else {}
        if receiving is not None:
            self.attributes[TRANSLATION_RECEIVING_ENABLED_ATTRIBUTE] = (
                "true" if receiving else "false"
            )


class FakeWorker:
    def __init__(self, info, room_name, **kwargs):
        self.info = info
        self.room_name = room_name
        self.audio = FakeAudio()
        self.started = False
        self.stopped = False

    def start(self):
        self.started = True

    def stop(self, timeout=10.0):
        self.stopped = True


class FakeAudio:
    def __init__(self):
        self.pushed = []
        self.closed = False

    def push(self, chunk):
        self.pushed.append(chunk)

    def close(self):
        self.closed = True


class FakeFrame:
    def __init__(self, payload):
        self.data = payload


def make_runner(frames=(b"one",)):
    agent = TranslationAgent(
        room_name=ROOM,
        translator_factory=lambda: object(),
        worker_factory=FakeWorker,
    )

    async def open_audio(participant):
        for payload in frames:
            yield FakeFrame(payload)

    return ParticipantAudioRunner(agent=agent, open_audio=open_audio), agent


def test_attaching_starts_an_audio_task():
    async def scenario():
        runner, _ = make_runner()

        assert runner.attach(FakeParticipant("guest-kr-1")) is True
        await asyncio.sleep(0)
        return runner.tracked()

    assert asyncio.run(scenario()) == {"guest-kr-1"}


def test_a_skipped_participant_gets_no_task():
    async def scenario():
        runner, _ = make_runner()

        attached = runner.attach(FakeParticipant("guest-en-1", language=""))
        return attached, runner.tracked()

    attached, tracked = asyncio.run(scenario())
    assert attached is False
    assert tracked == set()


def test_audio_reaches_the_worker():
    async def scenario():
        runner, agent = make_runner(frames=(b"one", b"two"))
        runner.attach(FakeParticipant("guest-kr-1"))
        await asyncio.sleep(0.05)
        return agent.workers()["guest-kr-1"].audio.pushed

    assert asyncio.run(scenario()) == [b"one", b"two"]


def test_attaching_twice_keeps_one_task():
    async def scenario():
        runner, _ = make_runner()
        runner.attach(FakeParticipant("guest-kr-1"))
        runner.attach(FakeParticipant("guest-kr-1"))
        return runner.tracked()

    assert asyncio.run(scenario()) == {"guest-kr-1"}


def test_detaching_stops_the_worker_and_the_task():
    async def scenario():
        runner, agent = make_runner()
        runner.attach(FakeParticipant("guest-kr-1"))
        worker = agent.workers()["guest-kr-1"]

        await runner.detach("guest-kr-1")

        # 정리하지 않으면 회의를 거듭할수록 스레드와 큐가 쌓인다.
        return runner.tracked(), worker.stopped, agent.workers()

    tracked, stopped, workers = asyncio.run(scenario())
    assert tracked == set()
    assert stopped is True
    assert workers == {}


def test_detaching_an_unknown_participant_is_safe():
    async def scenario():
        runner, _ = make_runner()
        await runner.detach("never-joined")
        return runner.tracked()

    assert asyncio.run(scenario()) == set()


def test_shutdown_detaches_everyone():
    async def scenario():
        runner, agent = make_runner()
        runner.attach(FakeParticipant("guest-kr-1"))
        runner.attach(FakeParticipant("guest-vn-1", language="vi", name="Linh"))
        workers = list(agent.workers().values())

        await runner.shutdown()

        return runner.tracked(), [w.stopped for w in workers], agent.workers()

    tracked, stopped, workers = asyncio.run(scenario())
    assert tracked == set()
    assert all(stopped)
    assert workers == {}


def test_two_participants_get_separate_tasks():
    async def scenario():
        runner, _ = make_runner()
        runner.attach(FakeParticipant("guest-kr-1"))
        runner.attach(FakeParticipant("guest-vn-1", language="vi", name="Linh"))
        return runner.tracked()

    assert asyncio.run(scenario()) == {"guest-kr-1", "guest-vn-1"}


def test_the_audio_source_is_closed_when_detached():
    async def scenario():
        # 끝나지 않는 스트림이라 detach가 취소해야만 정리된다.
        async def endless(participant):
            while True:
                yield FakeFrame(b"one")
                await asyncio.sleep(0)

        agent = TranslationAgent(
            room_name=ROOM,
            translator_factory=lambda: object(),
            worker_factory=FakeWorker,
        )
        runner = ParticipantAudioRunner(agent=agent, open_audio=endless)
        runner.attach(FakeParticipant("guest-kr-1"))
        audio = agent.workers()["guest-kr-1"].audio
        await asyncio.sleep(0.01)

        await runner.detach("guest-kr-1")
        await asyncio.sleep(0.01)
        return audio.closed

    assert asyncio.run(scenario()) is True


# --- 방 이벤트 연결 ---
#
# 이 연결이 스크립트에 있을 때 두 번 틀렸다. 두 번째는 ctx.room.loop를 썼는데
# Room에 없는 속성이라 퇴장 처리가 통째로 안 돌았고, 워커 스레드와 오디오
# 태스크가 그대로 남았다.


class FakeRoom:
    """이벤트를 등록하고 직접 쏠 수 있는 방."""

    def __init__(self, participants=()):
        self.handlers = {}
        self.remote_participants = {p.identity: p for p in participants}

    def on(self, event, callback):
        self.handlers[event] = callback

    def emit(self, event, *args):
        self.handlers[event](*args)


def test_a_connecting_participant_is_attached():
    async def scenario():
        runner, _ = make_runner()
        room = FakeRoom()
        attached = []
        register_participant_events(room, runner, on_attached=attached.append)

        room.emit("participant_connected", FakeParticipant("guest-kr-1"))
        await asyncio.sleep(0)
        return runner.tracked(), [p.identity for p in attached]

    tracked, attached = asyncio.run(scenario())
    assert tracked == {"guest-kr-1"}
    assert attached == ["guest-kr-1"]


def test_a_skipped_participant_is_reported():
    async def scenario():
        runner, _ = make_runner()
        room = FakeRoom()
        skipped = []
        register_participant_events(room, runner, on_skipped=skipped.append)

        room.emit("participant_connected", FakeParticipant("guest-en-1", language=""))
        return runner.tracked(), [p.identity for p in skipped]

    tracked, skipped = asyncio.run(scenario())
    assert tracked == set()
    assert skipped == ["guest-en-1"]


def test_a_disconnecting_participant_is_detached():
    async def scenario():
        runner, agent = make_runner()
        room = FakeRoom()
        register_participant_events(room, runner)

        room.emit("participant_connected", FakeParticipant("guest-kr-1"))
        worker = agent.workers()["guest-kr-1"]

        room.emit("participant_disconnected", FakeParticipant("guest-kr-1"))
        # 퇴장 처리는 태스크로 띄우므로 한 번 양보해야 끝난다.
        await asyncio.sleep(0.05)
        return runner.tracked(), worker.stopped, agent.workers()

    tracked, stopped, workers = asyncio.run(scenario())
    assert tracked == set()
    assert stopped is True
    assert workers == {}


def test_the_detach_callback_is_called():
    async def scenario():
        runner, _ = make_runner()
        room = FakeRoom()
        detached = []
        register_participant_events(room, runner, on_detached=detached.append)

        room.emit("participant_connected", FakeParticipant("guest-kr-1"))
        room.emit("participant_disconnected", FakeParticipant("guest-kr-1"))
        await asyncio.sleep(0.05)
        return detached

    assert asyncio.run(scenario()) == ["guest-kr-1"]


def test_existing_participants_are_attached():
    async def scenario():
        runner, _ = make_runner()
        room = FakeRoom(
            participants=[
                FakeParticipant("guest-kr-1"),
                FakeParticipant("guest-vn-1", language="vi", name="Linh"),
            ]
        )
        attached = []

        attach_existing_participants(room, runner, on_attached=attached.append)
        await asyncio.sleep(0)
        return runner.tracked(), [p.identity for p in attached]

    tracked, attached = asyncio.run(scenario())
    # 워커가 들어가기 전에 이미 있던 사람도 통역해야 한다.
    assert tracked == {"guest-kr-1", "guest-vn-1"}
    assert sorted(attached) == ["guest-kr-1", "guest-vn-1"]


def test_existing_participants_wait_until_someone_enables_translation():
    async def scenario():
        minsu = FakeParticipant("guest-kr-1", receiving=False)
        linh = FakeParticipant("guest-vn-1", language="vi", name="Linh", receiving=False)
        runner, _ = make_runner()
        room = FakeRoom(participants=[minsu, linh])
        register_participant_events(room, runner)

        attach_existing_participants(room, runner)
        minsu.attributes[TRANSLATION_RECEIVING_ENABLED_ATTRIBUTE] = "true"
        room.emit("participant_attributes_changed", {"translationReceivingEnabled": "true"}, minsu)
        await asyncio.sleep(0.05)
        return runner.tracked()

    assert asyncio.run(scenario()) == {"guest-kr-1", "guest-vn-1"}


def test_turning_off_the_last_receiver_detaches_everyone():
    async def scenario():
        minsu = FakeParticipant("guest-kr-1")
        linh = FakeParticipant("guest-vn-1", language="vi", name="Linh", receiving=False)
        runner, _ = make_runner()
        room = FakeRoom(participants=[minsu, linh])
        register_participant_events(room, runner)

        attach_existing_participants(room, runner)
        minsu.attributes[TRANSLATION_RECEIVING_ENABLED_ATTRIBUTE] = "false"
        room.emit("participant_attributes_changed", {"translationReceivingEnabled": "false"}, minsu)
        await asyncio.sleep(0.05)
        return runner.tracked()

    assert asyncio.run(scenario()) == set()


def test_language_attribute_change_restarts_the_worker():
    async def scenario():
        participant = FakeParticipant("guest-kr-1")
        runner, agent = make_runner()
        room = FakeRoom(participants=[participant])
        register_participant_events(room, runner)

        attach_existing_participants(room, runner)
        first_worker = agent.workers()["guest-kr-1"]
        participant.attributes[LANGUAGE_ATTRIBUTE] = "vi"
        room.emit("participant_attributes_changed", {LANGUAGE_ATTRIBUTE: "vi"}, participant)
        await asyncio.sleep(0.05)
        second_worker = agent.workers()["guest-kr-1"]

        return first_worker.stopped, second_worker.info.language

    assert asyncio.run(scenario()) == (True, "vi")
