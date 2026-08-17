"""회의방에 들어가 참가자 전원을 통역한다.

    참가자 브라우저 -> LiveKit -> 이 프로세스 -> Deepgram -> 번역 -> Server
                                                                      |
                                                          모든 참가자 화면

참가자는 브라우저만 열면 된다. 설치도 터미널도 API 키도 필요 없다. 이 프로세스
하나가 방 전체를 담당한다.

실행:

    cd apps/translation-pipeline
    python scripts/run_agent.py
    python scripts/run_agent.py --server https://<배포 서버> --section korea-team-zone

Ctrl+C로 종료한다.
"""

import argparse
import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from dotenv import load_dotenv  # noqa: E402

from translation_pipeline import (  # noqa: E402
    DEFAULT_INTERIM_INTERVAL_MS,
    DEFAULT_SECTION,
    SECTION_SLUGS,
    SessionEvent,
    SubtitlePublisher,
    TranslationAgent,
    build_lab_room_name,
    is_lab_meeting_room,
)
from translation_pipeline.livekit_room import ParticipantAudioRunner  # noqa: E402
from translation_pipeline.providers import GeminiTranslator  # noqa: E402
from translation_pipeline.providers.gemini import DEFAULT_MODEL  # noqa: E402
from translation_pipeline.stt import DEFAULT_ENDPOINTING_MS  # noqa: E402

# 방 안에서 이 프로세스가 쓰는 참가자 ID. 오디오를 내보내지 않고 목록에도
# 뜨지 않지만, 로그에서 구분하려면 이름이 있어야 한다.
AGENT_IDENTITY = "translation-agent"

# 마이크로 돌릴 때보다 길게 잡는다. 회의는 한 문장을 길게 말하는 자리라
# 짧게 끊으면 문맥이 잘린다.
AGENT_ENDPOINTING_MS = 700


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
        print("\n" + "=" * 58)
        print(f"자막 발행 {self.published}건, 번역 실패 {self.failures}건")
        if minutes > 0:
            print(
                f"모델 호출 {self.model_calls}회 / {minutes:.1f}분"
                f" = 분당 {self.model_calls / minutes:.1f}회"
            )


def build_agent_token(room_name: str, api_key: str, api_secret: str) -> str:
    """구독만 하는 토큰을 만든다.

    오디오를 내보내지 않고 참가자 목록에도 뜨지 않도록 한다. 통역은 듣기만
    하면 되고, 회의 화면에 정체불명의 참가자가 보이면 안 된다.
    """
    from livekit import api

    return (
        api.AccessToken(api_key, api_secret)
        .with_identity(AGENT_IDENTITY)
        .with_name("통역")
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_subscribe=True,
                can_publish=False,
                can_publish_data=False,
                hidden=True,
            )
        )
        .to_jwt()
    )


async def run(args) -> int:
    import os

    from livekit import rtc

    url = os.environ.get("LIVEKIT_URL")
    api_key = os.environ.get("LIVEKIT_API_KEY")
    api_secret = os.environ.get("LIVEKIT_API_SECRET")
    if not (url and api_key and api_secret):
        print("LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET가 필요합니다.")
        print(".env에 채우세요. 배포 환경과 같은 값이어야 합니다.")
        return 1

    room_name = args.room or build_lab_room_name(args.section)
    if not is_lab_meeting_room(room_name):
        print(f"회의방 이름이 아닙니다: {room_name}")
        return 1

    publisher = SubtitlePublisher(server_url=args.server) if args.publish else None
    reporter = ConsoleReporter()
    room = rtc.Room()
    agent = TranslationAgent(
        room_name=room_name,
        translator_factory=lambda: GeminiTranslator(model=args.model),
        publisher=publisher,
        endpointing_ms=args.endpointing,
        interim_interval_ms=args.interim_interval,
        on_event=reporter.on_event,
    )
    runner = ParticipantAudioRunner(agent=agent, room=room)
    stopping = asyncio.Event()

    @room.on("participant_connected")
    def _on_connected(participant) -> None:
        if not runner.attach(participant):
            print(f"  (통역 대상 아님: {getattr(participant, 'identity', '?')})")

    @room.on("participant_disconnected")
    def _on_disconnected(participant) -> None:
        asyncio.create_task(runner.detach(participant.identity))

    @room.on("disconnected")
    def _on_room_disconnected(*_args) -> None:
        stopping.set()

    print(f"회의방: {room_name}")
    print(f"LiveKit: {url}")
    print(f"번역 모델: {args.model}")
    print(f"발화 종료 판정: 무음 {args.endpointing}ms")
    print(f"중간 결과 번역: {args.interim_interval}ms 간격")
    print(f"자막 발행: {publisher.url if publisher else '안 함 (--publish로 켠다)'}")

    await room.connect(url, build_agent_token(room_name, api_key, api_secret))
    print("\n연결됐습니다. 참가자가 말하면 자막이 나갑니다. Ctrl+C로 종료합니다.\n")

    # 에이전트보다 먼저 들어와 있던 참가자도 받는다.
    for participant in room.remote_participants.values():
        runner.attach(participant)

    try:
        await stopping.wait()
    finally:
        await runner.shutdown()
        await room.disconnect()

    reporter.summarize()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="회의방 참가자 전원을 통역한다.")
    parser.add_argument(
        "--room", default=None, help="회의방 이름. 생략하면 --section과 오늘 날짜로 만든다"
    )
    parser.add_argument(
        "--section", default=DEFAULT_SECTION, choices=sorted(SECTION_SLUGS),
        help="회의 구역",
    )
    parser.add_argument(
        "--no-publish", dest="publish", action="store_false",
        help="자막을 Server로 보내지 않고 콘솔에만 찍는다",
    )
    parser.add_argument("--server", default=None, help="Server 주소")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="번역에 쓸 모델")
    parser.add_argument(
        "--endpointing", type=int, default=AGENT_ENDPOINTING_MS,
        help="발화 종료로 볼 무음 길이(ms)",
    )
    parser.add_argument(
        "--interim-interval", type=int, default=DEFAULT_INTERIM_INTERVAL_MS,
        help="중간 결과를 번역에 올리는 최소 간격(ms)",
    )
    args = parser.parse_args()

    load_dotenv()

    try:
        return asyncio.run(run(args))
    except KeyboardInterrupt:
        print("\n종료합니다.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
