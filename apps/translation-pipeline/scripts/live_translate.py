"""마이크로 말하면 실시간으로 번역을 보여주고, 자막으로 발행한다.

    마이크 -> Deepgram -> 관용구 사전 -> 번역 -> 자막

말이 멈추기를 기다리지 않는다. Deepgram이 말하는 도중 보내주는 중간 결과를
일정 간격으로 번역해 자막을 먼저 띄우고, 조각이 확정되면 같은 자막을
덮어쓴다. 번역은 워커 스레드에서 돌아 인식을 막지 않는다.

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
    DEFAULT_INTERIM_INTERVAL_MS,
    DEFAULT_SECTION,
    SECTION_SLUGS,
    ParticipantRegistry,
    SessionEvent,
    SubtitlePublisher,
    TranslationPipeline,
    TranslationSession,
    build_lab_room_name,
    get_target_lang,
    language_name,
)
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


class ConsoleReporter:
    """세션 결과를 콘솔에 찍고 실측값을 모은다.

    Issue #76이 요구하는 값은 첫 자막까지 걸린 시간과 분당 호출 수다. 둘 다
    돌려봐야 알 수 있어서 여기서 센다.
    """

    def __init__(self, show_interim_text: bool) -> None:
        self._show_interim_text = show_interim_text
        self._interim_line_shown = False
        self._utterance_started: float | None = None
        self._started_at = time.monotonic()
        self.first_subtitle_ms: list[int] = []
        self.model_calls = 0
        self.stats = {
            "중간번역": 0,
            "확정번역": 0,
            "사전만": 0,
            "재사용": 0,
            "번역실패": 0,
            "늦어서버림": 0,
            "발행실패": 0,
        }

    def on_interim_text(self, text: str) -> None:
        """인식 중간 결과가 도착했을 때. 번역은 세션이 따로 한다."""
        if self._utterance_started is None:
            self._utterance_started = time.monotonic()
        if not self._show_interim_text:
            return
        print(f"\r  ... {text[:70]}", end="", flush=True)
        self._interim_line_shown = True

    def _clear_interim_line(self) -> None:
        if self._interim_line_shown:
            print("\r" + " " * 78, end="\r")
            self._interim_line_shown = False

    def on_event(self, event: SessionEvent) -> None:
        self._clear_interim_line()

        if event.error is not None:
            self.stats["번역실패"] += 1
            print(f"[번역 실패] {event.error[:90]}\n")
            return

        result = event.result
        if result.used_translation_model:
            self.model_calls += 1

        if result.subtitle is None:
            self.stats["늦어서버림"] += 1
            print(f"[건너뜀] {result.skip_reason}\n")
            return

        payload = result.subtitle
        if payload.revision == 1 and self._utterance_started is not None:
            self.first_subtitle_ms.append(
                int((time.monotonic() - self._utterance_started) * 1000)
            )

        if result.reused_translation:
            self.stats["재사용"] += 1
        elif event.confirmed:
            self.stats["확정번역" if result.used_translation_model else "사전만"] += 1
        else:
            self.stats["중간번역"] += 1

        if event.confirmed:
            marker = "" if event.ends_utterance else "  (조각)"
        else:
            marker = "  (중간)"

        if result.reused_translation:
            source = "재사용"
        elif result.used_translation_model:
            source = "모델"
        else:
            source = "사전"
        print(f"[{payload.sourceLanguage}] {payload.sourceText}{marker}")
        print(f"[{payload.translatedLanguage}] {payload.translatedText}")
        print(f"  ({source}, {result.elapsed_ms}ms, rev {payload.revision})")

        if result.unapplied_glossary_count:
            print(f"  사전 미반영 {result.unapplied_glossary_count}건")
        if event.publish_error is not None:
            self.stats["발행실패"] += 1
            print(f"  자막 발행 실패: {event.publish_error[:90]}")
        elif event.published:
            print("  자막 발행 완료")

        if event.ends_utterance:
            # 다음 발화의 첫 자막 시간을 다시 재기 위해 기준을 지운다.
            self._utterance_started = None
        print()

    def summarize(self) -> None:
        elapsed_minutes = (time.monotonic() - self._started_at) / 60
        print("\n" + "=" * 58)
        print(
            f"중간번역 {self.stats['중간번역']}, 확정번역 {self.stats['확정번역']}"
            f", 사전만 {self.stats['사전만']}, 재사용 {self.stats['재사용']}"
        )
        print(
            f"번역실패 {self.stats['번역실패']}, 늦어서버림 {self.stats['늦어서버림']}"
            f", 발행실패 {self.stats['발행실패']}"
        )
        if elapsed_minutes > 0:
            print(
                f"모델 호출 {self.model_calls}회"
                f" / {elapsed_minutes:.1f}분 = 분당 {self.model_calls / elapsed_minutes:.1f}회"
            )
        if self.first_subtitle_ms:
            values = self.first_subtitle_ms
            print(
                f"첫 자막까지 (인식 결과 도착 기준) 평균 {sum(values) / len(values):.0f}ms"
                f" / 최소 {min(values)}ms / 최대 {max(values)}ms"
            )
        else:
            print("첫 자막 측정값 없음")


def main() -> int:
    parser = argparse.ArgumentParser(description="마이크로 실시간 통역을 확인한다.")
    parser.add_argument("--speaker", default="local_mic", help="화자 참가자 ID")
    parser.add_argument("--name", default=None, help="자막에 표시할 이름")
    parser.add_argument("--language", default="ko", help="말할 언어 (ko 또는 vi)")
    parser.add_argument(
        "--room", default=None,
        help="회의방 이름. 생략하면 --section과 오늘 날짜로 만든다",
    )
    parser.add_argument(
        "--section", default=DEFAULT_SECTION, choices=sorted(SECTION_SLUGS),
        help="회의 구역. --room을 줬으면 무시한다",
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
    parser.add_argument(
        "--interim-interval", type=int, default=DEFAULT_INTERIM_INTERVAL_MS,
        help="중간 결과를 번역에 올리는 최소 간격(ms)",
    )
    parser.add_argument(
        "--no-interim-translation", action="store_true",
        help="중간 결과를 번역하지 않는다 (확정 조각만 번역)",
    )
    parser.add_argument("--no-interim", action="store_true", help="인식 중간 결과를 숨긴다")
    parser.add_argument("--timeout", type=int, default=None, help="번역 대기 시간(ms)")
    args = parser.parse_args()

    load_dotenv()
    timeout_ms = resolve_timeout_ms(args.model, args.timeout)

    # Client는 방 이름을 오늘 날짜로 만든다. 손으로 넣으면 날짜가 바뀔 때
    # 조용히 어긋나고, 자막만 안 뜬다.
    room_name = args.room or build_lab_room_name(args.section)

    participants = ParticipantRegistry()
    publisher = None
    try:
        participants.set_language(args.speaker, args.language, display_name=args.name)
        pipeline = TranslationPipeline(
            room_name=room_name,
            participants=participants,
            translator=GeminiTranslator(model=args.model, timeout_ms=timeout_ms),
            max_staleness_ms=args.max_staleness,
        )
        if args.publish:
            publisher = SubtitlePublisher(server_url=args.server)
    except Exception as error:
        print(f"준비 실패: {error}")
        return 1

    reporter = ConsoleReporter(show_interim_text=not args.no_interim)
    session = TranslationSession(
        pipeline=pipeline,
        speaker_id=args.speaker,
        publisher=publisher,
        interim_interval_ms=args.interim_interval,
        on_event=reporter.on_event,
    )

    def on_interim(text: str) -> None:
        reporter.on_interim_text(text)
        if not args.no_interim_translation:
            session.submit_interim(text)

    def on_utterance(utterance: Utterance) -> None:
        session.submit_utterance(utterance.text, ends_utterance=utterance.ends_utterance)

    target_lang = get_target_lang(args.language)
    print(f"{language_name(args.language)} -> {language_name(target_lang)}")
    print(f"화자: {args.speaker} ({args.name or args.speaker})")
    origin = "직접 지정" if args.room else f"{args.section}, 오늘 날짜"
    print(f"회의방: {pipeline.room_name}  ({origin})")
    print(f"번역 모델: {args.model} (timeout {timeout_ms / 1000:.0f}초)")
    print(f"발화 종료 판정: 무음 {args.endpointing}ms")
    print(f"늦은 번역 폐기 기준: {args.max_staleness}ms")
    if args.no_interim_translation:
        print("중간 결과 번역: 안 함")
    else:
        print(f"중간 결과 번역: {args.interim_interval}ms 간격")
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

    session.start()
    try:
        transcriber.run(on_utterance=on_utterance, on_interim=on_interim)
    except KeyboardInterrupt:
        transcriber.stop()
    except SpeechRecognitionError as error:
        print(f"\n음성 인식 실패: {error}")
        return 1
    finally:
        # 남은 확정 조각까지 번역하고 끝낸다.
        session.stop()

    reporter.summarize()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
