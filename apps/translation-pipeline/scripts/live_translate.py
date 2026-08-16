"""마이크로 말하면 실시간으로 번역을 보여준다.

파이프라인 전체를 처음으로 연결해 실제로 쓸 만한지 확인하는 것이 목적이다.

    마이크 -> Deepgram(endpointing) -> 관용구 사전 -> 번역 -> 화면

실행:

    cd apps/translation-pipeline
    python scripts/live_translate.py                 # 한국어로 말하면 베트남어로
    python scripts/live_translate.py --source vi     # 베트남어로 말하면 한국어로
    python scripts/live_translate.py --model gemma-4-31b-it

Ctrl+C로 종료한다.
"""

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from dotenv import load_dotenv  # noqa: E402

from translation_pipeline import (  # noqa: E402
    ConversationContext,
    Glossary,
    TranslationRequest,
    get_target_lang,
    language_name,
)
from translation_pipeline.errors import TranslationError  # noqa: E402
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

SPEAKER_ID = "local_mic"

# Gemma는 측정에서 13~21초가 걸렸다. 기본 timeout(10초)으로는 모든 호출이
# 끊기므로 여유를 준다. 실시간에 쓸 수 있다는 뜻이 아니라, 파이프라인이
# 이어지는지 확인할 수 있게 하려는 값이다.
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
        self, source_lang: str, model: str, show_interim: bool, timeout_ms: int
    ) -> None:
        self._source_lang = source_lang
        self._target_lang = get_target_lang(source_lang)
        self._show_interim = show_interim
        self._glossary = Glossary.load()
        self._context = ConversationContext()
        self._translator = GeminiTranslator(model=model, timeout_ms=timeout_ms)
        self._interim_shown = False
        self._stats = {"발화": 0, "사전만": 0, "번역": 0, "실패": 0}

    @property
    def stats(self) -> dict[str, int]:
        return dict(self._stats)

    def on_interim(self, text: str) -> None:
        if not self._show_interim:
            return
        # 같은 줄을 덮어써서 인식 중인 내용을 보여준다.
        print(f"\r  ... {text[:70]}", end="", flush=True)
        self._interim_shown = True

    def on_utterance(self, utterance: Utterance) -> None:
        if self._interim_shown:
            print("\r" + " " * 78, end="\r")
            self._interim_shown = False

        self._stats["발화"] += 1
        heard_at = time.monotonic()
        print(f"[{self._source_lang}] {utterance.text}")

        match = self._glossary.match(
            utterance.text, self._source_lang, self._target_lang
        )

        if match.can_skip_translation_model:
            translated = match.direct_translation
            self._stats["사전만"] += 1
            source = "사전"
        else:
            try:
                translated = self._translator.translate(
                    TranslationRequest(
                        text=utterance.text,
                        source_lang=self._source_lang,
                        target_lang=self._target_lang,
                        glossary_entries=match.entries,
                        context_turns=self._context.recent(),
                    )
                )
                self._stats["번역"] += 1
                source = "모델"
            except TranslationError as error:
                self._stats["실패"] += 1
                print(f"  [번역 실패 {time.monotonic() - heard_at:.1f}s] {str(error)[:90]}\n")
                return

        elapsed = time.monotonic() - heard_at
        print(f"[{self._target_lang}] {translated}")
        print(f"  ({source}, {elapsed:.1f}s)\n")

        self._context.add(SPEAKER_ID, utterance.text, translated)


def main() -> int:
    parser = argparse.ArgumentParser(description="마이크로 실시간 통역을 확인한다.")
    parser.add_argument("--source", default="ko", help="말할 언어 (ko 또는 vi)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="번역에 쓸 모델")
    parser.add_argument("--device", type=int, default=None, help="마이크 장치 번호")
    parser.add_argument(
        "--endpointing",
        type=int,
        default=DEFAULT_ENDPOINTING_MS,
        help="발화 종료로 볼 무음 길이(ms)",
    )
    parser.add_argument(
        "--no-interim", action="store_true", help="인식 중간 결과를 숨긴다"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=None,
        help="번역 응답을 기다릴 시간(ms). 생략하면 모델에 맞춰 정한다",
    )
    args = parser.parse_args()

    load_dotenv()

    timeout_ms = resolve_timeout_ms(args.model, args.timeout)

    try:
        session = LiveSession(
            source_lang=args.source,
            model=args.model,
            show_interim=not args.no_interim,
            timeout_ms=timeout_ms,
        )
    except Exception as error:
        print(f"준비 실패: {error}")
        return 1

    target_lang = get_target_lang(args.source)
    print(f"{language_name(args.source)} -> {language_name(target_lang)}")
    print(f"번역 모델: {args.model} (timeout {timeout_ms / 1000:.0f}초)")
    print(f"발화 종료 판정: 무음 {args.endpointing}ms")
    print("\n말씀하세요. Ctrl+C로 종료합니다.\n")

    transcriber = RealtimeTranscriber(
        language=args.source,
        endpointing_ms=args.endpointing,
        device=args.device,
    )

    try:
        transcriber.run(
            on_utterance=session.on_utterance,
            on_interim=session.on_interim,
        )
    except KeyboardInterrupt:
        transcriber.stop()
    except SpeechRecognitionError as error:
        print(f"\n음성 인식 실패: {error}")
        return 1

    stats = session.stats
    print("\n" + "=" * 50)
    print(
        f"발화 {stats['발화']}건 "
        f"(사전만 {stats['사전만']}, 모델 번역 {stats['번역']}, 실패 {stats['실패']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
