"""실시간 통역 세션. 인식 결과를 받아 번역하고 자막을 발행한다.

번역은 워커 스레드 하나에서 돈다. Deepgram 결과를 읽는 스레드에서 그대로
번역하면 번역이 도는 1~2초 동안 들어오는 인식 결과를 통째로 놓치고, 확정
조각 처리도 그만큼 밀린다.

워커를 하나만 두는 이유는 순서 때문이다. 번역을 병렬로 돌리면 나중에 시작한
것이 먼저 끝나 자막이 뒤로 되돌아갈 수 있다. 워커가 하나면 ``revision``을
매기는 순서와 발행 순서가 같아서 그런 일이 없다.

중간 결과와 확정 조각은 밀릴 때 다르게 다룬다. 중간 결과는 곧 더 긴 것이
오므로 밀린 것을 버리고 최신 하나만 남긴다. 확정 조각은 버리면 그 말이
사라지므로 전부 처리한다.
"""

import threading
import time
from dataclasses import dataclass, field

from .errors import TranslationError
from .pipeline import TranslationPipeline, UtteranceResult
from .publisher import SubtitlePublisher, SubtitlePublishError

# 중간 결과를 번역에 올리는 최소 간격(ms). 인식 결과는 1초에 한 번쯤 오지만
# 번역이 1.4~1.9초 걸린다. 오는 대로 다 부르면 밀리기만 하고, 무료 한도의
# 분당 호출 수에도 걸린다.
DEFAULT_INTERIM_INTERVAL_MS = 2_000

# 새 인식 결과가 이만큼 없으면 열린 발화를 확정으로 닫는다.
# Deepgram의 speech_final이 끝내 오지 않는 경우가 있다. 참가자가 말을 마치고
# 바로 나가면 무음 판정 전에 연결이 끊기고, 배경 소음이 있으면 무음으로 치지
# 않는다. 그러면 자막이 영영 미확정으로 남는다.
#
# 발화 종료 판정(기본 700ms)보다 넉넉히 잡는다. 정상적으로 speech_final이
# 올 상황에서 먼저 끼어들면 안 된다.
DEFAULT_FINALIZE_AFTER_MS = 2_500


@dataclass(frozen=True)
class SessionEvent:
    """번역 한 건의 처리 결과. 화면 출력과 통계에 쓴다."""

    confirmed: bool
    ends_utterance: bool
    source_text: str
    result: UtteranceResult | None = None
    error: str | None = None
    published: bool = False
    publish_error: str | None = None


@dataclass
class _Job:
    text: str
    confirmed: bool
    ends_utterance: bool
    spoken_at: float
    # 새 내용 없이 열린 발화를 닫기만 하는 일감.
    finalize: bool = False


@dataclass
class _Pending:
    """워커가 다음에 집어갈 일감."""

    confirmed: list[_Job] = field(default_factory=list)
    interim: _Job | None = None

    def is_empty(self) -> bool:
        return not self.confirmed and self.interim is None


class TranslationSession:
    """인식 결과를 받아 번역하고 자막을 발행하는 세션.

    ``submit_interim``과 ``submit_utterance``는 인식 스레드에서 호출되며
    바로 반환한다. 실제 번역은 ``start()``가 띄운 워커에서 돈다.
    """

    def __init__(
        self,
        pipeline: TranslationPipeline,
        speaker_id: str,
        publisher: SubtitlePublisher | None = None,
        interim_interval_ms: int = DEFAULT_INTERIM_INTERVAL_MS,
        finalize_after_ms: int = DEFAULT_FINALIZE_AFTER_MS,
        on_event=None,
    ) -> None:
        self._pipeline = pipeline
        self._speaker_id = speaker_id
        self._publisher = publisher
        self._interim_interval = interim_interval_ms / 1000
        self._finalize_after = finalize_after_ms / 1000 if finalize_after_ms > 0 else None
        self._on_event = on_event

        self._pending = _Pending()
        self._condition = threading.Condition()
        self._stop = False
        self._worker: threading.Thread | None = None
        self._last_interim_at = 0.0
        self._last_input_at = 0.0
        # 종료할 때 열린 발화를 한 번 닫고 끝낸다.
        self._closing_finalize = False

    def start(self) -> None:
        if self._worker is not None:
            raise RuntimeError("이미 시작된 세션입니다.")
        self._worker = threading.Thread(target=self._run, daemon=True)
        self._worker.start()

    def stop(self, timeout: float = 30.0) -> None:
        """워커를 멈춘다. 남은 확정 조각은 처리하고 끝낸다.

        중간 결과는 버린다. 어차피 확정 조각이 같은 내용을 포함한다.
        """
        with self._condition:
            self._stop = True
            self._pending.interim = None
            # 말을 마치고 바로 나가면 speech_final이 오지 않는다. 그대로 두면
            # 마지막 자막이 영영 미확정으로 남는다.
            self._closing_finalize = self._finalize_after is not None
            self._condition.notify_all()
        if self._worker is not None:
            self._worker.join(timeout=timeout)
            self._worker = None

    def __enter__(self) -> "TranslationSession":
        self.start()
        return self

    def __exit__(self, *exc_info) -> None:
        self.stop()

    def submit_interim(self, text: str) -> None:
        """확정되지 않은 인식 결과를 넘긴다. 간격 제한에 걸리면 버린다."""
        if not text.strip():
            return
        now = time.monotonic()
        with self._condition:
            if self._stop or now - self._last_interim_at < self._interim_interval:
                return
            self._last_interim_at = now
            self._last_input_at = now
            self._pending.interim = _Job(
                text=text, confirmed=False, ends_utterance=False, spoken_at=now
            )
            self._condition.notify()

    def submit_utterance(self, text: str, ends_utterance: bool = True) -> None:
        """확정된 조각을 넘긴다. 밀려도 버리지 않는다."""
        if not text.strip():
            return
        with self._condition:
            if self._stop:
                return
            self._last_input_at = time.monotonic()
            self._pending.confirmed.append(
                _Job(
                    text=text,
                    confirmed=True,
                    ends_utterance=ends_utterance,
                    spoken_at=time.monotonic(),
                )
            )
            # 확정된 내용이 대기 중인 중간 결과를 포함하므로 그것은 낡았다.
            self._pending.interim = None
            self._condition.notify()

    def _finalize_job(self) -> _Job:
        return _Job(
            text="",
            confirmed=True,
            ends_utterance=True,
            spoken_at=time.monotonic(),
            finalize=True,
        )

    def _silence_passed(self) -> bool:
        """새 인식 결과 없이 확정 대기 시간이 지났는가."""
        if self._finalize_after is None or self._last_input_at == 0.0:
            return False
        return time.monotonic() - self._last_input_at >= self._finalize_after

    def _next_job(self) -> _Job | None:
        with self._condition:
            while not self._stop and self._pending.is_empty():
                if self._finalize_after is None:
                    self._condition.wait()
                    continue
                self._condition.wait(timeout=self._finalize_after)
                if self._pending.is_empty() and self._silence_passed():
                    # 다시 조용해질 때까지 반복해서 닫으려 들지 않도록 기준을 지운다.
                    self._last_input_at = 0.0
                    return self._finalize_job()
            # 멈추는 중이어도 확정 조각은 마저 처리한다.
            if self._pending.confirmed:
                return self._pending.confirmed.pop(0)
            if self._stop:
                if not self._closing_finalize:
                    return None
                # 한 번만 닫는다.
                self._closing_finalize = False
                return self._finalize_job()
            job = self._pending.interim
            self._pending.interim = None
            return job

    def _run(self) -> None:
        while True:
            job = self._next_job()
            if job is None:
                return
            self._translate(job)

    def _translate(self, job: _Job) -> None:
        try:
            if job.finalize:
                result = self._pipeline.finalize(self._speaker_id)
                if result is None:
                    # 닫을 발화가 없었다. 알릴 것도 없다.
                    return
            elif job.confirmed:
                result = self._pipeline.handle_utterance(
                    self._speaker_id,
                    job.text,
                    spoken_at=job.spoken_at,
                    ends_utterance=job.ends_utterance,
                )
            else:
                result = self._pipeline.handle_interim(
                    self._speaker_id, job.text, spoken_at=job.spoken_at
                )
        except TranslationError as error:
            self._emit(
                SessionEvent(
                    confirmed=job.confirmed,
                    ends_utterance=job.ends_utterance,
                    source_text=job.text,
                    error=str(error),
                )
            )
            return

        published = False
        publish_error = None
        if result.subtitle is not None and self._publisher is not None:
            try:
                self._publisher.publish(result.subtitle)
                published = True
            except SubtitlePublishError as error:
                # 발행이 실패해도 다음 번역은 계속한다.
                publish_error = str(error)

        self._emit(
            SessionEvent(
                confirmed=job.confirmed,
                ends_utterance=job.ends_utterance,
                source_text=job.text,
                result=result,
                published=published,
                publish_error=publish_error,
            )
        )

    def _emit(self, event: SessionEvent) -> None:
        if self._on_event is not None:
            self._on_event(event)
