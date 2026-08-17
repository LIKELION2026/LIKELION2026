"""LiveKit 참가자 오디오를 인식이 읽을 수 있는 형태로 바꾼다.

LiveKit SDK는 asyncio이고 인식은 블로킹 스레드다. 둘을 큐로 잇는다.
``MicrophoneStream``이 sounddevice 콜백을 큐로 넘기는 것과 같은 모양이라
인식 쪽에서 보면 마이크와 구별되지 않는다.

오디오는 실시간이라 밀리면 버린다. 큐가 차면 가장 오래된 것을 버리고 최신을
넣는다. asyncio 루프를 막으면 방 전체의 오디오 수신이 함께 멈추므로, 여기서
기다리는 선택지는 없다.
"""

import queue
import threading

from .stt import CHANNELS, SAMPLE_RATE

# 큐에 쌓아둘 조각 수의 상한. 16kHz 모노에서 10ms 프레임 기준 약 5초치다.
# 인식이 이만큼 밀렸다면 이미 실시간이 아니므로 버리는 편이 낫다.
DEFAULT_MAX_QUEUED_CHUNKS = 500

# 큐가 빈 동안 닫혔는지 확인하는 주기(초). 종료가 이만큼 늦어질 수 있다.
_CLOSE_POLL_SECONDS = 0.1


class LiveKitAudioSource:
    """참가자 한 명의 오디오를 담아 인식으로 넘기는 큐.

    ``push``는 asyncio 쪽에서, ``chunks``는 인식 스레드에서 호출된다.
    """

    def __init__(self, max_queued_chunks: int = DEFAULT_MAX_QUEUED_CHUNKS) -> None:
        self._queue: queue.Queue = queue.Queue(maxsize=max_queued_chunks)
        self._closed = threading.Event()
        self._dropped = 0

    @property
    def dropped_chunks(self) -> int:
        """버린 조각 수. 인식이 밀리고 있는지 보는 지표다."""
        return self._dropped

    def push(self, chunk: bytes) -> None:
        """오디오 조각을 넣는다. 큐가 차 있으면 가장 오래된 것을 버린다."""
        if self._closed.is_set() or not chunk:
            return
        while True:
            try:
                self._queue.put_nowait(chunk)
                return
            except queue.Full:
                try:
                    self._queue.get_nowait()
                    self._dropped += 1
                except queue.Empty:
                    # 그 사이 소비자가 비웠다. 다시 넣어본다.
                    continue

    def close(self) -> None:
        """더 들어올 오디오가 없음을 알린다. 남은 조각은 마저 내보낸다.

        큐에 종료 표식을 넣지 않는다. 큐가 꽉 찬 상태에서 블로킹 ``put``을
        하면 영원히 멈춘다. 참가자가 나갈 때 오디오가 밀려 있으면 정확히 그
        상황이 된다.
        """
        self._closed.set()

    def __enter__(self) -> "LiveKitAudioSource":
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()

    def chunks(self):
        """넣어준 조각을 순서대로 내보낸다.

        닫히고 남은 것까지 다 나가면 끝난다. 닫힘을 큐가 아니라 플래그로
        보므로 큐가 꽉 차 있어도 종료가 막히지 않는다.
        """
        while True:
            try:
                chunk = self._queue.get(timeout=_CLOSE_POLL_SECONDS)
            except queue.Empty:
                if self._closed.is_set():
                    return
                continue
            if chunk is None:
                return
            yield chunk


def frame_to_pcm(frame) -> bytes:
    """LiveKit 오디오 프레임에서 PCM 바이트만 꺼낸다.

    SDK 버전에 따라 ``data``가 memoryview이거나 배열이다. 둘 다 받는다.
    """
    data = getattr(frame, "data", frame)
    to_bytes = getattr(data, "tobytes", None)
    return to_bytes() if to_bytes is not None else bytes(data)


async def pump_audio(frames, source: LiveKitAudioSource) -> None:
    """비동기 오디오 프레임을 소스로 흘려보낸다.

    ``frames``는 LiveKit ``AudioStream``이거나 같은 모양의 비동기 이터러블이다.
    끝나거나 취소되면 반드시 소스를 닫는다. 닫지 않으면 인식 스레드가 큐에서
    영원히 기다린다.
    """
    try:
        async for event in frames:
            frame = getattr(event, "frame", event)
            source.push(frame_to_pcm(frame))
    finally:
        source.close()


def open_participant_audio(room, participant):
    """참가자의 마이크 오디오 스트림을 연다.

    인식이 기대하는 형식(16kHz 모노)으로 바로 받는다. 여기서 맞추면 중간에
    변환할 일이 없다.
    """
    try:
        from livekit import rtc
    except ImportError as error:
        raise RuntimeError(
            "livekit이 설치되어 있지 않습니다. "
            "pip install -r requirements.txt를 실행하세요."
        ) from error

    return rtc.AudioStream.from_participant(
        participant=participant,
        track_source=rtc.TrackSource.SOURCE_MICROPHONE,
        sample_rate=SAMPLE_RATE,
        num_channels=CHANNELS,
    )
