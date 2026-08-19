"""회의방이 열리면 자동으로 들어가 참가자 전원을 통역한다.

    참가자 브라우저 -> LiveKit -> 이 워커 -> Deepgram -> 번역 -> Server
                                                                  |
                                                      모든 참가자 화면

한 번 켜두면 된다. 워커는 LiveKit에 등록만 해두고 방에는 들어가지 않는다.
회의방이 생기면 배정을 받아 그때 참가한다. 그래서 대기 중에는 방 참가자로
잡히지 않는다.

참가자는 브라우저만 열면 된다. 설치도 터미널도 API 키도 필요 없다.

실행:

    cd apps/translation-pipeline
    python scripts/run_agent.py start

Ctrl+C로 종료한다. `dev` 명령도 있지만 deprecated 경고를 낸다.

설정은 `.env`로 준다. 프레임워크가 명령줄을 쓰기 때문에 인자로 받지 않는다.

    PIPELINE_SERVER_URL               자막을 보낼 Server 주소
    TRANSLATION_MODEL                 번역 모델
    OPENAI_API_KEY                    있으면 Gemini가 429에 걸릴 때 OpenAI로 대체한다
    TRANSLATION_FALLBACK_MODEL        대체 provider(OpenAI) 모델
    TRANSLATION_ENDPOINTING_MS        발화 종료로 볼 무음 길이
    TRANSLATION_INTERIM_INTERVAL_MS   중간 결과 번역 간격
    TRANSLATION_FINALIZE_AFTER_MS     이만큼 조용하면 열린 발화를 확정한다
    TRANSLATION_MIN_INTERIM_CHARS     이보다 짧은 중간 결과는 번역하지 않는다
    TRANSLATION_HEDGE_AFTER_MS        발화 첫 호출이 이 시간 안에 안 오면 하나 더 쏜다. 0이면 끈다
    TRANSLATION_LOAD_THRESHOLD        이 CPU 부하를 넘으면 배정을 받지 않는다
"""

import os
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from livekit.agents import (  # noqa: E402
    AutoSubscribe,
    JobContext,
    JobRequest,
    WorkerOptions,
    WorkerPermissions,
    cli,
)

from translation_pipeline import (  # noqa: E402
    DEFAULT_FINALIZE_AFTER_MS,
    DEFAULT_HEDGE_AFTER_MS,
    DEFAULT_INTERIM_INTERVAL_MS,
    DEFAULT_MIN_INTERIM_CHARS,
    FallbackTranslator,
    ParticipantAudioRunner,
    SessionEvent,
    SubtitlePublisher,
    TranslationAgent,
    is_lab_meeting_room,
)
from translation_pipeline.livekit_room import (  # noqa: E402
    attach_existing_participants,
    register_participant_events,
)
from translation_pipeline.providers import GeminiTranslator, OpenAITranslator  # noqa: E402
from translation_pipeline.providers.gemini import DEFAULT_MODEL  # noqa: E402
from translation_pipeline.providers.openai import (  # noqa: E402
    DEFAULT_MODEL as DEFAULT_FALLBACK_MODEL,
    ENV_API_KEY as FALLBACK_API_KEY_ENV,
)
from translation_pipeline.stt import DEFAULT_ENDPOINTING_MS  # noqa: E402

# 방 안에서 이 워커가 쓰는 참가자 ID.
AGENT_IDENTITY = "translation-agent"
AGENT_NAME = "통역"

# 마이크로 돌릴 때보다 길게 잡는다. 회의는 한 문장을 길게 말하는 자리라
# 짧게 끊으면 문맥이 잘린다.
AGENT_ENDPOINTING_MS = 700

# 노트북에서 돌리므로 미리 띄우는 프로세스를 줄인다. 기본값은 운영 4개다.
IDLE_PROCESSES = 1

# CPU 부하가 이 값을 넘으면 프레임워크가 워커를 배정 불가로 표시한다.
# 부하는 2.5초 평균 CPU 사용률이라 편집기 인덱싱이나 브라우저가 잠깐만
# 튀어도 1.0에 닿는다. 실제로 0.7과 0.95 둘 다에서 배정을 한 번도 받지
# 못했다.
#
# 이 장치는 워커가 여러 대일 때 부하 높은 워커를 건너뛰라는 뜻이다. 하나뿐이면
# 거부가 곧 자막 없음이다. 느리게라도 도는 편이 낫다. 프레임워크도 dev 모드
# 기본값을 무제한으로 둔다. 여러 대로 배포할 때 TRANSLATION_LOAD_THRESHOLD로
# 되살린다.
LOAD_THRESHOLD = float("inf")


def env_int(name: str, default: int) -> int:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        print(f"{name} 값을 숫자로 읽지 못했습니다: {raw!r}. 기본값 {default}을 씁니다.")
        return default


def env_float(name: str, default: float) -> float:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        print(f"{name} 값을 숫자로 읽지 못했습니다: {raw!r}. 기본값 {default}을 씁니다.")
        return default


def now() -> str:
    return datetime.now().strftime("%H:%M:%S")


class ConsoleReporter:
    """자막 결과를 콘솔에 찍는다. 화자가 여럿이라 이름을 함께 낸다."""

    def __init__(self) -> None:
        self._started_at = time.monotonic()
        self.model_calls = 0
        self.failures = 0
        self.published = 0

    def on_event(self, event: SessionEvent) -> None:
        if event.error is not None:
            self.failures += 1
            print(f"  [번역 실패] {event.error[:90]}")
            return

        result = event.result
        if result.used_translation_model:
            self.model_calls += 1
        if result.subtitle is None:
            print(f"  [건너뜀] {result.skip_reason}")
            return

        payload = result.subtitle
        if event.published:
            self.published += 1

        if result.reused_translation:
            source = "재사용"
        elif result.used_translation_model:
            source = "모델"
        else:
            source = "사전"

        if event.ends_utterance:
            marker = ""
        elif event.confirmed:
            marker = "  (조각)"
        else:
            marker = "  (중간)"

        print(f"[{payload.speakerDisplayName}] {payload.sourceText}{marker}")
        print(f"  -> {payload.translatedText}")
        print(f"     ({source}, {result.elapsed_ms}ms, rev {payload.revision})")
        if event.publish_error is not None:
            print(f"     자막 발행 실패: {event.publish_error[:80]}")

    def summarize(self) -> None:
        minutes = (time.monotonic() - self._started_at) / 60
        print("=" * 58)
        print(f"자막 발행 {self.published}건, 번역 실패 {self.failures}건")
        if minutes > 0:
            print(
                f"모델 호출 {self.model_calls}회 / {minutes:.1f}분"
                f" = 분당 {self.model_calls / minutes:.1f}회"
            )


async def handle_request(request: JobRequest) -> None:
    """배정 요청을 받을지 정한다.

    워커는 방이 열리는 대로 배정받는다. 가상 오피스처럼 회의가 아닌 방까지
    따라 들어가면 쓸데없이 인식과 번역 호출을 태운다.
    """
    room_name = request.room.name
    if not is_lab_meeting_room(room_name):
        print(f"[{now()}] 배정 거부 (회의방 아님): {room_name}")
        await request.reject()
        return

    print(f"[{now()}] 배정 수락: {room_name}")
    await request.accept(identity=AGENT_IDENTITY, name=AGENT_NAME)


def build_translator_factory(model: str, fallback_model: str):
    """1차(Gemini) provider의 factory를 만든다.

    ``OPENAI_API_KEY``가 있으면 Gemini가 호출 한도(429)에 걸렸을 때만 OpenAI로
    넘기는 `FallbackTranslator`로 감싼다. 키가 없으면 기존과 같이 Gemini만
    쓴다 — 이 환경변수를 안 채운 개발자의 기존 동작은 바뀌지 않는다.

    다음 호출에서는 다시 Gemini부터 시도하므로, 한도가 풀리면 자연히 Gemini로
    돌아간다. 별도로 "복구됐는지" 확인하는 상태를 두지 않는다.
    """
    if not os.environ.get(FALLBACK_API_KEY_ENV):
        return lambda: GeminiTranslator(model=model)

    print(
        f"[{now()}] {FALLBACK_API_KEY_ENV} 설정됨: Gemini가 한도(429)에 걸리면"
        f" OpenAI({fallback_model})로 대체합니다."
    )
    return lambda: FallbackTranslator(
        primary=GeminiTranslator(model=model),
        fallback=OpenAITranslator(model=fallback_model),
    )


async def translate_room(ctx: JobContext) -> None:
    """배정받은 회의방에서 참가자 전원을 통역한다."""
    room_name = ctx.room.name
    server_url = os.environ.get("PIPELINE_SERVER_URL") or None
    model = (os.environ.get("TRANSLATION_MODEL") or "").strip() or DEFAULT_MODEL
    fallback_model = (
        os.environ.get("TRANSLATION_FALLBACK_MODEL") or ""
    ).strip() or DEFAULT_FALLBACK_MODEL
    endpointing_ms = env_int("TRANSLATION_ENDPOINTING_MS", AGENT_ENDPOINTING_MS)
    interim_interval_ms = env_int(
        "TRANSLATION_INTERIM_INTERVAL_MS", DEFAULT_INTERIM_INTERVAL_MS
    )
    finalize_after_ms = env_int(
        "TRANSLATION_FINALIZE_AFTER_MS", DEFAULT_FINALIZE_AFTER_MS
    )
    min_interim_chars = env_int(
        "TRANSLATION_MIN_INTERIM_CHARS", DEFAULT_MIN_INTERIM_CHARS
    )
    hedge_after_ms = env_int("TRANSLATION_HEDGE_AFTER_MS", DEFAULT_HEDGE_AFTER_MS)

    reporter = ConsoleReporter()
    publisher = SubtitlePublisher(server_url=server_url)
    if server_url is None:
        # 이 값을 안 넣으면 자막이 로컬 서버로 간다. 발행은 성공하고 에러도
        # 없는데 배포한 회의 화면에만 아무것도 안 뜬다. 원인을 찾기 어렵다.
        print(
            f"[{now()}] 주의: PIPELINE_SERVER_URL이 없어 {publisher.url}로 보냅니다."
            " 배포한 회의 화면에서 보려면 .env에 배포 서버 주소를 넣으세요."
        )
    agent = TranslationAgent(
        room_name=room_name,
        translator_factory=build_translator_factory(model, fallback_model),
        publisher=publisher,
        endpointing_ms=endpointing_ms,
        interim_interval_ms=interim_interval_ms,
        finalize_after_ms=finalize_after_ms,
        min_interim_chars=min_interim_chars,
        hedge_after_ms=hedge_after_ms,
        on_event=reporter.on_event,
    )
    runner = ParticipantAudioRunner(agent=agent, room=ctx.room)

    def report_attached(participant) -> None:
        info = agent.workers()[participant.identity].info
        print(
            f"[{now()}] 통역 시작: {info.display_name}"
            f" ({info.identity}, {info.language})"
        )

    def report_skipped(participant) -> None:
        print(f"[{now()}] 통역 대상 아님: {participant.identity}")

    def report_detached(identity: str) -> None:
        print(f"[{now()}] 통역 종료: {identity}")

    register_participant_events(
        ctx.room,
        runner,
        on_attached=report_attached,
        on_skipped=report_skipped,
        on_detached=report_detached,
    )

    async def on_shutdown() -> None:
        await runner.shutdown()
        reporter.summarize()

    ctx.add_shutdown_callback(on_shutdown)

    # 영상은 받지 않는다. 통역에는 오디오만 필요하고, 받으면 대역폭만 쓴다.
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    print(f"[{now()}] 회의방 참가: {room_name}")
    print(f"  번역 모델: {model}")
    print(f"  발화 종료 판정: 무음 {endpointing_ms}ms")
    print(f"  중간 결과 번역: {interim_interval_ms}ms 간격")
    print(f"  발화 확정: 조용해진 뒤 {finalize_after_ms}ms")
    print(f"  중간 결과 최소 길이: {min_interim_chars}자")
    print(
        f"  발화 첫 호출 이중 요청: {hedge_after_ms}ms 안에 안 오면 하나 더"
        if hedge_after_ms > 0
        else "  발화 첫 호출 이중 요청: 꺼짐"
    )
    print(f"  자막 발행: {publisher.url}")

    attach_existing_participants(
        ctx.room, runner, on_attached=report_attached, on_skipped=report_skipped
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=translate_room,
            request_fnc=handle_request,
            # 통역은 듣기만 하면 된다. 회의 화면에 정체불명의 참가자가 보이면
            # 안 되므로 참가자 목록에도 뜨지 않는다.
            permissions=WorkerPermissions(
                can_publish=False,
                can_subscribe=True,
                can_publish_data=False,
                hidden=True,
            ),
            num_idle_processes=IDLE_PROCESSES,
            load_threshold=env_float("TRANSLATION_LOAD_THRESHOLD", LOAD_THRESHOLD),
        )
    )
