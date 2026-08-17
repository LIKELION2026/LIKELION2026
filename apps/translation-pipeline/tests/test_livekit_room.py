"""참가자 오디오 태스크 관리 테스트.

LiveKit 없이 돈다. 참가자가 나갈 때 태스크와 워커가 함께 정리되는지가 핵심이다.
안 그러면 회의를 거듭할수록 스레드와 큐가 쌓인다.
"""

import asyncio

import pytest

from translation_pipeline.agent import LANGUAGE_ATTRIBUTE, TranslationAgent
from translation_pipeline.livekit_room import ParticipantAudioRunner

ROOM = "lab-likelion-20260818-meeting-room"


class FakeParticipant:
    def __init__(self, identity, language="ko", name="민수"):
        self.identity = identity
        self.name = name
        self.attributes = {LANGUAGE_ATTRIBUTE: language} if language else {}


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
