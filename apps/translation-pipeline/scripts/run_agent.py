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
    TRANSLATION_ENDPOINTING_MS        발화 종료로 볼 무음 길이
    TRANSLATION_INTERIM_INTERVAL_MS   중간 결과 번역 간격
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
    DEFAULT_INTERIM_INTERVAL_MS,
    ParticipantAudioRunner,
    SessionEvent,
    SubtitlePublisher,
    TranslationAgent,
    is_lab_meeting_room,
)
from translation_pipeline.providers import GeminiTranslator  # noqa: E402
from translation_pipeline.providers.gemini import DEFAULT_MODEL  # noqa: E402
from translation_pipeline.stt import DEFAULT_ENDPOINTING_MS  # noqa: E402

# 방 안에서 이 워커가 쓰는 참가자 ID.
AGENT_IDENTITY = "translation-agent"
AGENT_NAME = "통역"

# 마이크로 돌릴 때보다 길게 잡는다. 회의는 한 문장을 길게 말하는 자리라
# 짧게 끊으면 문맥이 잘린다.
AGENT_ENDPOINTING_MS = 700

# 노트북에서 돌리므로 미리 띄우는 프로세스를 줄인다. 기본값은 운영 4개다.
IDLE_PROCESSES = 1


def env_int(name: str, default: int) -> int:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
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


async def translate_room(ctx: JobContext) -> None:
    """배정받은 회의방에서 참가자 전원을 통역한다."""
    room_name = ctx.room.name
    server_url = os.environ.get("PIPELINE_SERVER_URL") or None
    model = (os.environ.get("TRANSLATION_MODEL") or "").strip() or DEFAULT_MODEL
    endpointing_ms = env_int("TRANSLATION_ENDPOINTING_MS", AGENT_ENDPOINTING_MS)
    interim_interval_ms = env_int(
        "TRANSLATION_INTERIM_INTERVAL_MS", DEFAULT_INTERIM_INTERVAL_MS
    )

    reporter = ConsoleReporter()
    publisher = SubtitlePublisher(server_url=server_url)
    agent = TranslationAgent(
        room_name=room_name,
        translator_factory=lambda: GeminiTranslator(model=model),
        publisher=publisher,
        endpointing_ms=endpointing_ms,
        interim_interval_ms=interim_interval_ms,
        on_event=reporter.on_event,
    )
    runner = ParticipantAudioRunner(agent=agent, room=ctx.room)

    def attach(participant) -> None:
        if runner.attach(participant):
            info = agent.workers()[participant.identity].info
            print(
                f"[{now()}] 통역 시작: {info.display_name}"
                f" ({info.identity}, {info.language})"
            )
        else:
            print(f"[{now()}] 통역 대상 아님: {participant.identity}")

    @ctx.room.on("participant_connected")
    def _on_connected(participant) -> None:
        attach(participant)

    @ctx.room.on("participant_disconnected")
    def _on_disconnected(participant) -> None:
        identity = participant.identity
        print(f"[{now()}] 통역 종료: {identity}")
        ctx.room.loop.create_task(runner.detach(identity))

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
    print(f"  자막 발행: {publisher.url}")

    # 워커가 들어가기 전에 이미 있던 참가자도 받는다.
    for participant in ctx.room.remote_participants.values():
        attach(participant)


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
        )
    )
