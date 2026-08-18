"""Deepgram 실시간 음성 인식.

마이크 입력을 Deepgram으로 흘려보내고, 발화가 끝났다고 판단되는 시점에
콜백으로 알린다. 발화 종료 감지는 Deepgram의 endpointing을 그대로 쓴다.
별도 VAD를 만들지 않는다.
"""

import queue
import threading
from dataclasses import dataclass
from typing import Callable, Iterator, Protocol, runtime_checkable

from .errors import TranslationPipelineError
from .languages import ensure_supported

# Nova-3는 한국어와 베트남어를 모두 지원한다.
DEFAULT_MODEL = "nova-3"

# Deepgram 실시간 입력 형식. 16kHz 모노 PCM이 표준 조합이다.
SAMPLE_RATE = 16_000
CHANNELS = 1
ENCODING = "linear16"

# 마이크에서 한 번에 읽어 보낼 샘플 수. 너무 크면 지연이 늘고, 너무 작으면
# 전송 횟수가 불필요하게 많아진다.
BLOCK_SIZE = 4_000

# 말이 끝났다고 볼 무음 길이(ms). 값이 작으면 문장이 잘게 쪼개지고,
# 크면 번역이 늦어진다.
DEFAULT_ENDPOINTING_MS = 300


class SpeechRecognitionError(TranslationPipelineError):
    """음성 인식 연결이나 마이크 입력이 실패했을 때 발생한다."""


@dataclass(frozen=True)
class Utterance:
    """Deepgram이 확정한 발화 조각 하나.

    Deepgram은 발화를 겹치지 않는 조각으로 나눠 확정한다. 조각 하나가
    확정되면 ``is_final``이 서고, 그 중 발화의 마지막 조각에만
    ``speech_final``이 선다. 즉 조각을 이어붙인 것이 전체 발화다.

    ``ends_utterance``가 False면 뒤에 조각이 더 온다는 뜻이다. 이 조각만
    보고 발화가 끝났다고 판단하면 안 된다.
    """

    text: str
    language: str
    ends_utterance: bool = True


@runtime_checkable
class AudioSource(Protocol):
    """인식에 넣을 오디오 조각을 순서대로 내주는 것.

    마이크인지 회의방 참가자인지 인식 쪽은 알 필요가 없다. 형식만 맞으면
    된다. 16kHz 모노 PCM(`SAMPLE_RATE`, `CHANNELS`, `ENCODING`)이다.

    컨텍스트 매니저인 이유는 열고 닫는 시점이 분명해야 하기 때문이다.
    ``chunks()``는 소스가 끝나면 반환한다.
    """

    def __enter__(self) -> "AudioSource": ...

    def __exit__(self, *exc_info) -> None: ...

    def chunks(self) -> Iterator[bytes]: ...


class MicrophoneStream:
    """마이크 입력을 큐로 넘기는 얇은 래퍼.

    sounddevice 콜백은 별도 스레드에서 돌기 때문에, 거기서 바로 네트워크를
    건드리지 않고 큐에만 넣는다.
    """

    def __init__(self, device: int | None = None) -> None:
        self._device = device
        self._queue: queue.Queue[bytes | None] = queue.Queue()
        self._stream = None

    def __enter__(self) -> "MicrophoneStream":
        try:
            import sounddevice
        except ImportError as error:
            raise SpeechRecognitionError(
                "sounddevice가 설치되어 있지 않습니다. "
                "pip install -r requirements.txt를 실행하세요."
            ) from error

        def on_audio(indata, frames, time_info, status) -> None:
            self._queue.put(bytes(indata))

        try:
            self._stream = sounddevice.RawInputStream(
                samplerate=SAMPLE_RATE,
                blocksize=BLOCK_SIZE,
                device=self._device,
                channels=CHANNELS,
                dtype="int16",
                callback=on_audio,
            )
            self._stream.start()
        except Exception as error:
            raise SpeechRecognitionError(f"마이크를 열지 못했습니다: {error}") from error
        return self

    def __exit__(self, *exc_info) -> None:
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
        self._queue.put(None)

    def chunks(self):
        """마이크에서 읽은 오디오 조각을 순서대로 내보낸다."""
        while True:
            chunk = self._queue.get()
            if chunk is None:
                return
            yield chunk


class RealtimeTranscriber:
    """Deepgram 실시간 인식 세션.

    ``on_utterance``는 확정된 조각마다 호출된다. 중간 결과(``is_final``이
    아닌 것)는 ``on_interim``으로 따로 넘긴다.

    오디오가 어디서 오는지는 ``audio_source``로 정한다. 넣지 않으면 로컬
    마이크를 연다. 회의방 참가자 오디오를 넣으면 같은 인식 경로를 그대로
    쓴다.
    """

    def __init__(
        self,
        language: str,
        api_key: str | None = None,
        model: str = DEFAULT_MODEL,
        endpointing_ms: int = DEFAULT_ENDPOINTING_MS,
        device: int | None = None,
        audio_source: AudioSource | None = None,
    ) -> None:
        ensure_supported(language)
        self._language = language
        self._model = model
        self._endpointing_ms = endpointing_ms
        self._device = device
        self._api_key = api_key
        self._audio_source = audio_source
        self._stop = threading.Event()

    def stop(self) -> None:
        self._stop.set()

    def _resolve_audio_source(self) -> AudioSource:
        """넣어준 소스를 쓰고, 없으면 마이크를 연다."""
        if self._audio_source is not None:
            return self._audio_source
        return MicrophoneStream(device=self._device)

    def _send_audio(self, socket, source: AudioSource) -> None:
        """오디오 조각을 인식 소켓으로 흘려보낸다."""
        with source as opened:
            for chunk in opened.chunks():
                if self._stop.is_set():
                    break
                socket.send_media(chunk)

    def run(
        self,
        on_utterance: Callable[[Utterance], None],
        on_interim: Callable[[str], None] | None = None,
    ) -> None:
        """오디오 소스를 열고 발화가 끝날 때마다 콜백을 호출한다.

        소스를 넣지 않았으면 마이크를 연다. ``stop()``이 호출되거나 소스가
        끝날 때까지 블로킹된다.
        """
        import os

        api_key = self._api_key or os.environ.get("DEEPGRAM_API_KEY")
        if not api_key:
            raise SpeechRecognitionError(
                "DEEPGRAM_API_KEY가 없습니다. .env에 키를 채우세요."
            )

        try:
            from deepgram import DeepgramClient
        except ImportError as error:
            raise SpeechRecognitionError(
                "deepgram-sdk가 설치되어 있지 않습니다. "
                "pip install -r requirements.txt를 실행하세요."
            ) from error

        client = DeepgramClient(api_key=api_key)

        with client.listen.v1.connect(
            model=self._model,
            language=self._language,
            encoding=ENCODING,
            sample_rate=SAMPLE_RATE,
            channels=CHANNELS,
            interim_results=True,
            punctuate=True,
            endpointing=self._endpointing_ms,
        ) as socket:
            reader = threading.Thread(
                target=self._read_results,
                args=(socket, on_utterance, on_interim),
                daemon=True,
            )
            reader.start()

            self._send_audio(socket, self._resolve_audio_source())

            socket.send_close_stream()
            reader.join(timeout=5)

    def _read_results(self, socket, on_utterance, on_interim) -> None:
        """Deepgram이 보내는 결과를 읽어 콜백으로 넘긴다."""
        try:
            for message in socket:
                if self._stop.is_set():
                    return
                transcript = _extract_transcript(message)
                if not transcript:
                    continue

                # is_final이 선 조각은 Deepgram이 확정한 것이라 다시 오지
                # 않는다. 그래서 speech_final만 처리하면 발화 앞부분이
                # 통째로 사라진다. 확정된 조각은 전부 넘기고, 발화가
                # 끝났는지는 speech_final로 따로 알린다.
                speech_final = bool(getattr(message, "speech_final", False))
                if speech_final or getattr(message, "is_final", False):
                    on_utterance(
                        Utterance(
                            text=transcript,
                            language=self._language,
                            ends_utterance=speech_final,
                        )
                    )
                elif on_interim is not None:
                    on_interim(transcript)
        except Exception:
            # 소켓이 닫히면 반복이 끊긴다. 종료 경로이므로 조용히 빠져나간다.
            return


def _extract_transcript(message) -> str:
    """Deepgram 결과 메시지에서 텍스트만 꺼낸다."""
    channel = getattr(message, "channel", None)
    alternatives = getattr(channel, "alternatives", None) if channel else None
    if not alternatives:
        return ""
    return (getattr(alternatives[0], "transcript", "") or "").strip()
