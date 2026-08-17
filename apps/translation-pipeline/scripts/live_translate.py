"""마이크로 말하면 실시간으로 번역을 보여주고, 자막으로 발행한다.

    마이크 -> Deepgram(endpointing) -> 관용구 사전 -> 번역 -> 자막

`--publish`를 주면 Server로 POST해서 회의 화면에 자막이 뜬다. 주지 않으면
콘솔에만 출력하므로 Server 없이도 확인할 수 있다.

실행:

    cd apps/translation-pipeline
    python scripts/live_translate.py --speaker user_ko --language ko
    python scripts/live_translate.py --speaker user_vi --language vi --publish

Ctrl+C로 종료한다.
"""

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from dotenv import load_dotenv  # noqa: E402

from translation_pipeline import (  # noqa: E402
    ParticipantRegistry,
    SubtitlePublisher,
    SubtitlePublishError,
    TranslationPipeline,
    get_target_lang,
    language_name,
)
from translation_pipeline.errors import TranslationError  # noqa: E402
from translation_pipeline.pipeline import DEFAULT_MAX_STALENESS_MS  # noqa: E402
from translation_pipeline.providers import GeminiTranslator  # noqa: E402
from translation_pipeline.providers.gemini import (  # noqa: E402
    DEFAULT_MODEL,
    DEFAULT_TIMEOUT_MS,
)
from translation_pipeline.stt import (  # noqa: E402
    DEFAULT_ENDPOINTING_MS,
    RealtimeTranscriber,
    SpeechRecognitionError,
    Utterance,
)

# Gemma는 측정에서 13~21초가 걸렸다. 기본 timeout으로는 모든 호출이 끊긴다.
GEMMA_TIMEOUT_MS = 40_000


def resolve_timeout_ms(model: str, explicit: int | None) -> int:
    if explicit is not None:
        return explicit
    if "gemma" in model.lower():
        return GEMMA_TIMEOUT_MS
    return DEFAULT_TIMEOUT_MS


class LiveSession:
    """한 번의 실시간 통역 세션."""

    def __init__(
        self,
        pipeline: TranslationPipeline,
        speaker_id: str,
        publisher: SubtitlePublisher | None,
        show_interim: bool,
    ) -> None:
        self._pipeline = pipeline
        self._speaker_id = speaker_id
        self._publisher = publisher
        self._show_interim = show_interim
        self._interim_shown = False
        self._stats = {"발화": 0, "사전만": 0, "번역": 0, "실패": 0, "버림": 0, "발행실패": 0}

    @property
    def stats(self) -> dict[str, int]:
        return dict(self._stats)

    def on_interim(self, text: str) -> None:
        if not self._show_interim:
            return
        print(f"\r  ... {text[:70]}", end="", flush=True)
        self._interim_shown = True

    def on_utterance(self, utterance: Utterance) -> None:
        if self._interim_shown:
            print("\r" + " " * 78, end="\r")
            self._interim_shown = False

        self._stats["발화"] += 1
        spoken_at = time.monotonic()
        # 발화 중간 조각인지 마지막인지 보여야 revision이 왜 올라가는지 읽힌다.
        marker = "" if utterance.ends_utterance else "  (조각)"
        print(f"[{utterance.language}] {utterance.text}{marker}")

        try:
            result = self._pipeline.handle_utterance(
                self._speaker_id,
                utterance.text,
                spoken_at=spoken_at,
                ends_utterance=utterance.ends_utterance,
            )
        except TranslationError as error:
            self._stats["실패"] += 1
            print(f"  [번역 실패] {str(error)[:90]}\n")
            return

        if result.used_translation_model:
            self._stats["번역"] += 1
        else:
            self._stats["사전만"] += 1

        if result.subtitle is None:
            self._stats["버림"] += 1
            print(f"  [건너뜀] {result.skip_reason}\n")
            return

        payload = result.subtitle
        source = "모델" if result.used_translation_model else "사전"
        print(f"[{payload.translatedLanguage}] {payload.translatedText}")
        print(f"  ({source}, {result.elapsed_ms}ms, rev {payload.revision})")

        if result.unapplied_glossary_count:
            print(f"  사전 미반영 {result.unapplied_glossary_count}건")

        if self._publisher is not None:
            try:
                self._publisher.publish(payload)
                print("  자막 발행 완료")
            except SubtitlePublishError as error:
                # 발행이 실패해도 다음 발화 처리는 계속한다.
                self._stats["발행실패"] += 1
                print(f"  자막 발행 실패: {str(error)[:90]}")
        print()


def main() -> int:
    parser = argparse.ArgumentParser(description="마이크로 실시간 통역을 확인한다.")
    parser.add_argument("--speaker", default="local_mic", help="화자 참가자 ID")
    parser.add_argument("--name", default=None, help="자막에 표시할 이름")
    parser.add_argument("--language", default="ko", help="말할 언어 (ko 또는 vi)")
    parser.add_argument(
        "--room", default="lab-ai-20260816-demo", help="회의방 이름 (lab-<team>-<yyyymmdd>-<slug>)"
    )
    parser.add_argument("--publish", action="store_true", help="Server로 자막을 발행한다")
    parser.add_argument("--server", default=None, help="Server 주소")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="번역에 쓸 모델")
    parser.add_argument("--device", type=int, default=None, help="마이크 장치 번호")
    parser.add_argument(
        "--endpointing", type=int, default=DEFAULT_ENDPOINTING_MS,
        help="발화 종료로 볼 무음 길이(ms)",
    )
    parser.add_argument(
        "--max-staleness", type=int, default=DEFAULT_MAX_STALENESS_MS,
        help="이 시간을 넘겨 도착한 번역은 버린다(ms)",
    )
    parser.add_argument("--no-interim", action="store_true", help="인식 중간 결과를 숨긴다")
    parser.add_argument("--timeout", type=int, default=None, help="번역 대기 시간(ms)")
    args = parser.parse_args()

    load_dotenv()
    timeout_ms = resolve_timeout_ms(args.model, args.timeout)

    participants = ParticipantRegistry()
    publisher = None
    try:
        participants.set_language(args.speaker, args.language, display_name=args.name)
        pipeline = TranslationPipeline(
            room_name=args.room,
            participants=participants,
            translator=GeminiTranslator(model=args.model, timeout_ms=timeout_ms),
            max_staleness_ms=args.max_staleness,
        )
        if args.publish:
            publisher = SubtitlePublisher(server_url=args.server)
    except Exception as error:
        print(f"준비 실패: {error}")
        return 1

    session = LiveSession(
        pipeline=pipeline,
        speaker_id=args.speaker,
        publisher=publisher,
        show_interim=not args.no_interim,
    )

    target_lang = get_target_lang(args.language)
    print(f"{language_name(args.language)} -> {language_name(target_lang)}")
    print(f"화자: {args.speaker} ({args.name or args.speaker})")
    print(f"회의방: {pipeline.room_name}")
    print(f"번역 모델: {args.model} (timeout {timeout_ms / 1000:.0f}초)")
    print(f"발화 종료 판정: 무음 {args.endpointing}ms")
    print(f"늦은 번역 폐기 기준: {args.max_staleness}ms")
    if publisher is not None:
        print(f"자막 발행: {publisher.url}")
    else:
        print("자막 발행: 안 함 (--publish로 켠다)")
    print("\n말씀하세요. Ctrl+C로 종료합니다.\n")

    transcriber = RealtimeTranscriber(
        language=args.language,
        endpointing_ms=args.endpointing,
        device=args.device,
    )

    try:
        transcriber.run(
            on_utterance=session.on_utterance, on_interim=session.on_interim
        )
    except KeyboardInterrupt:
        transcriber.stop()
    except SpeechRecognitionError as error:
        print(f"\n음성 인식 실패: {error}")
        return 1

    stats = session.stats
    print("\n" + "=" * 50)
    print(
        f"발화 {stats['발화']}건 | 사전만 {stats['사전만']}, 모델 {stats['번역']}"
        f" | 번역실패 {stats['실패']}, 늦어서 버림 {stats['버림']}"
        f", 발행실패 {stats['발행실패']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
