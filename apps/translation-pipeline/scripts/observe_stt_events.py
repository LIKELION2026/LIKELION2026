"""Deepgram 인식 이벤트의 타이밍을 관측한다.

중간 번역을 넣을지 판단하려면 `is_final`이 `speech_final`보다 얼마나 먼저
오는지를 알아야 한다. 그 간격이 번역을 미리 시작할 수 있는 시간이다.
간격이 짧으면 중간 번역을 넣어도 이득이 없다.

번역을 호출하지 않으므로 Gemini 할당량을 쓰지 않는다.

실행:

    cd apps/translation-pipeline
    python scripts/observe_stt_events.py
    python scripts/observe_stt_events.py --language vi --endpointing 700

한 문장을 길게 말한 뒤 Ctrl+C로 종료하면 요약이 나온다.
"""

import argparse
import sys
import time
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from dotenv import load_dotenv  # noqa: E402

from translation_pipeline.stt import (  # noqa: E402
    DEFAULT_ENDPOINTING_MS,
    DEFAULT_MODEL,
    ENCODING,
    SAMPLE_RATE,
    CHANNELS,
    MicrophoneStream,
    SpeechRecognitionError,
    _extract_transcript,
)


@dataclass
class Event:
    at: float
    kind: str
    text: str


def observe(language: str, endpointing_ms: int, device: int | None) -> int:
    import os
    import threading

    load_dotenv()
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    if not api_key:
        print("DEEPGRAM_API_KEY가 없습니다.")
        return 1

    try:
        from deepgram import DeepgramClient
    except ImportError:
        print("deepgram-sdk가 설치되어 있지 않습니다.")
        return 1

    client = DeepgramClient(api_key=api_key)
    events: list[Event] = []
    started = time.monotonic()
    stop = threading.Event()

    print(f"언어: {language} / 모델: {DEFAULT_MODEL}")
    print(f"발화 종료 판정: 무음 {endpointing_ms}ms")
    print("\n한 문장을 길게 말한 뒤 Ctrl+C로 종료하세요.")
    print("(번역은 호출하지 않습니다)\n")

    with client.listen.v1.connect(
        model=DEFAULT_MODEL,
        language=language,
        encoding=ENCODING,
        sample_rate=SAMPLE_RATE,
        channels=CHANNELS,
        interim_results=True,
        punctuate=True,
        endpointing=endpointing_ms,
    ) as socket:

        def read_results() -> None:
            try:
                for message in socket:
                    if stop.is_set():
                        return
                    text = _extract_transcript(message)
                    if not text:
                        continue
                    is_final = bool(getattr(message, "is_final", False))
                    speech_final = bool(getattr(message, "speech_final", False))

                    if speech_final:
                        kind = "SPEECH_FINAL"
                    elif is_final:
                        kind = "IS_FINAL"
                    else:
                        kind = "interim"

                    at = time.monotonic() - started
                    events.append(Event(at=at, kind=kind, text=text))
                    marker = "  <<<" if kind != "interim" else ""
                    print(f"{at:6.2f}s  {kind:<12} {text[:56]}{marker}")
            except Exception:
                return

        reader = threading.Thread(target=read_results, daemon=True)
        reader.start()

        try:
            with MicrophoneStream(device=device) as microphone:
                for chunk in microphone.chunks():
                    if stop.is_set():
                        break
                    socket.send_media(chunk)
        except KeyboardInterrupt:
            pass
        except SpeechRecognitionError as error:
            print(f"\n마이크 실패: {error}")
            return 1
        finally:
            stop.set()
            try:
                socket.send_close_stream()
            except Exception:
                pass
            reader.join(timeout=3)

    summarize(events)
    return 0


def summarize(events: list[Event]) -> None:
    print("\n" + "=" * 62)
    finals = [e for e in events if e.kind != "interim"]
    if not finals:
        print("확정 이벤트가 없습니다. 더 길게 말해보세요.")
        return

    print(f"전체 이벤트 {len(events)}건 (확정 {len(finals)}건)\n")

    # IS_FINAL 뒤에 오는 SPEECH_FINAL까지의 간격이 중간 번역에 쓸 수 있는 시간이다.
    gaps: list[float] = []
    pending: Event | None = None
    for event in finals:
        if event.kind == "IS_FINAL":
            pending = event
        elif event.kind == "SPEECH_FINAL":
            if pending is not None:
                gap = event.at - pending.at
                gaps.append(gap)
                print(f"  IS_FINAL({pending.at:.2f}s) -> SPEECH_FINAL({event.at:.2f}s)")
                print(f"    간격 {gap:.2f}초")
                print(f"    조각: {pending.text[:50]}")
                print(f"    전체: {event.text[:50]}")
                print(f"    내용 같음: {pending.text.strip() == event.text.strip()}")
                print()
            else:
                print(f"  SPEECH_FINAL({event.at:.2f}s)  선행 IS_FINAL 없음")
                print(f"    {event.text[:50]}\n")
            pending = None

    print("-" * 62)
    if gaps:
        print(f"중간 번역에 쓸 수 있는 시간: 평균 {sum(gaps) / len(gaps):.2f}초"
              f" / 최대 {max(gaps):.2f}초 / 최소 {min(gaps):.2f}초")
        print()
        if max(gaps) < 0.5:
            print("판정: 간격이 너무 짧다. 중간 번역을 넣어도 이득이 거의 없다.")
        elif sum(gaps) / len(gaps) >= 1.0:
            print("판정: 간격이 충분하다. 중간 번역이 체감 지연을 줄일 수 있다.")
        else:
            print("판정: 애매하다. 발화 길이에 따라 이득이 갈린다.")
    else:
        print("IS_FINAL이 SPEECH_FINAL보다 먼저 온 경우가 없다.")
        print("판정: 중간 번역을 미리 시작할 여지가 없다.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Deepgram 인식 이벤트 타이밍을 관측한다.")
    parser.add_argument("--language", default="ko", help="말할 언어 (ko 또는 vi)")
    parser.add_argument(
        "--endpointing", type=int, default=DEFAULT_ENDPOINTING_MS,
        help="발화 종료로 볼 무음 길이(ms)",
    )
    parser.add_argument("--device", type=int, default=None, help="마이크 장치 번호")
    args = parser.parse_args()
    return observe(args.language, args.endpointing, args.device)


if __name__ == "__main__":
    raise SystemExit(main())
