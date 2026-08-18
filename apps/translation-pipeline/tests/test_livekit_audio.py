"""LiveKit 오디오를 인식 입력으로 잇는 부분의 테스트.

LiveKit 없이 돈다. asyncio와 스레드를 잇는 지점이라 밀렸을 때와 끝날 때의
동작을 특히 고정한다.
"""

import asyncio
import threading

import pytest

from translation_pipeline.livekit_audio import (
    LiveKitAudioSource,
    frame_to_pcm,
    pump_audio,
)
from translation_pipeline.stt import AudioSource


class FakeFrameData:
    """memoryview 대신 tobytes()를 가진 배열 흉내."""

    def __init__(self, payload: bytes) -> None:
        self._payload = payload

    def tobytes(self) -> bytes:
        return self._payload


class FakeFrame:
    def __init__(self, payload: bytes) -> None:
        self.data = FakeFrameData(payload)


class FakeFrameEvent:
    def __init__(self, payload: bytes) -> None:
        self.frame = FakeFrame(payload)


async def frame_stream(payloads):
    for payload in payloads:
        yield FakeFrameEvent(payload)


def drain(source: LiveKitAudioSource) -> list[bytes]:
    return list(source.chunks())


def test_it_satisfies_the_audio_source_contract():
    # 인식 쪽에서 마이크와 구별되지 않아야 한다.
    assert isinstance(LiveKitAudioSource(), AudioSource)


def test_pushed_chunks_come_out_in_order():
    source = LiveKitAudioSource()
    source.push(b"one")
    source.push(b"two")
    source.close()

    assert drain(source) == [b"one", b"two"]


def test_closing_ends_the_chunk_stream():
    source = LiveKitAudioSource()
    source.close()

    assert drain(source) == []


def test_exiting_the_context_closes_the_source():
    with LiveKitAudioSource() as source:
        source.push(b"one")

    # 닫히지 않으면 인식 스레드가 큐에서 영원히 기다린다.
    assert drain(source) == [b"one"]


def test_pushing_after_close_is_ignored():
    source = LiveKitAudioSource()
    source.close()
    source.push(b"late")

    assert drain(source) == []


def test_empty_chunks_are_ignored():
    source = LiveKitAudioSource()
    source.push(b"")
    source.close()

    assert drain(source) == []


def test_closing_twice_is_safe():
    source = LiveKitAudioSource()
    source.close()
    source.close()

    assert drain(source) == []


def test_the_oldest_chunk_is_dropped_when_the_queue_is_full():
    source = LiveKitAudioSource(max_queued_chunks=2)

    source.push(b"1")
    source.push(b"2")
    source.push(b"3")
    source.close()

    # 실시간이라 밀리면 최신을 남긴다. 기다리면 asyncio 루프가 멈춘다.
    assert drain(source) == [b"2", b"3"]


def test_dropped_chunks_are_counted():
    source = LiveKitAudioSource(max_queued_chunks=1)

    source.push(b"1")
    source.push(b"2")
    source.close()

    assert source.dropped_chunks == 1


def test_nothing_is_dropped_when_the_consumer_keeps_up():
    source = LiveKitAudioSource(max_queued_chunks=2)

    source.push(b"1")
    source.push(b"2")
    source.close()

    assert source.dropped_chunks == 0


def test_chunks_blocks_until_something_arrives():
    source = LiveKitAudioSource()
    received: list[bytes] = []
    started = threading.Event()

    def consume() -> None:
        started.set()
        received.extend(source.chunks())

    reader = threading.Thread(target=consume, daemon=True)
    reader.start()
    assert started.wait(timeout=2)

    source.push(b"late arrival")
    source.close()
    reader.join(timeout=2)

    assert received == [b"late arrival"]


# --- 프레임 변환 ---


def test_pcm_is_taken_from_a_frame_with_tobytes():
    assert frame_to_pcm(FakeFrame(b"pcm")) == b"pcm"


def test_pcm_is_taken_from_raw_bytes():
    # SDK 버전에 따라 data가 memoryview가 아닐 수 있다.
    class RawFrame:
        data = b"pcm"

    assert frame_to_pcm(RawFrame()) == b"pcm"


# --- 프레임 펌프 ---


def test_frames_are_pushed_into_the_source():
    source = LiveKitAudioSource()

    asyncio.run(pump_audio(frame_stream([b"one", b"two"]), source))

    assert drain(source) == [b"one", b"two"]


def test_the_source_is_closed_when_the_stream_ends():
    source = LiveKitAudioSource()

    asyncio.run(pump_audio(frame_stream([b"one"]), source))

    # 스트림이 끝났는데 안 닫으면 인식 스레드가 안 끝난다.
    assert drain(source) == [b"one"]


def test_the_source_is_closed_when_the_stream_fails():
    source = LiveKitAudioSource()

    async def failing_stream():
        yield FakeFrameEvent(b"one")
        raise RuntimeError("연결이 끊겼습니다")

    with pytest.raises(RuntimeError):
        asyncio.run(pump_audio(failing_stream(), source))

    # 참가자 연결이 끊겨도 정리돼야 한다.
    assert drain(source) == [b"one"]


def test_the_source_is_closed_when_the_pump_is_cancelled():
    source = LiveKitAudioSource()

    async def endless_stream():
        while True:
            yield FakeFrameEvent(b"one")
            await asyncio.sleep(0)

    async def run_and_cancel() -> None:
        task = asyncio.create_task(pump_audio(endless_stream(), source))
        await asyncio.sleep(0)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    asyncio.run(run_and_cancel())

    # 참가자가 나가면 태스크를 취소한다. 그때도 소스가 닫혀야 한다.
    assert source.chunks().__next__() == b"one"


def test_closing_a_full_source_does_not_hang():
    # close()가 꽉 찬 큐에 블로킹 put을 하면 영원히 멈춘다. 참가자가 나갈 때
    # 오디오가 밀려 있으면 정확히 그 상황이 된다.
    source = LiveKitAudioSource(max_queued_chunks=2)
    source.push(b"1")
    source.push(b"2")

    done = threading.Event()

    def close_it() -> None:
        source.close()
        done.set()

    threading.Thread(target=close_it, daemon=True).start()

    assert done.wait(timeout=2), "close()가 끝나지 않았습니다"


def test_queued_chunks_survive_a_close():
    source = LiveKitAudioSource(max_queued_chunks=2)
    source.push(b"1")
    source.push(b"2")
    source.close()

    # 닫았다고 이미 받은 오디오를 버리면 마지막 발화가 잘린다.
    assert drain(source) == [b"1", b"2"]
