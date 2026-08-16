"""관용구 지침 준수율 측정.

지침 방식에는 정답이 하나로 고정되지 않는다. 같은 표현도 상황에 따라 다르게
옮기는 것이 맞기 때문이다. 그래서 "정답과 같은가"가 아니라 **"하면 안 되는
형태가 나왔는가"**를 본다.

지침을 고친 뒤 실제로 나아졌는지 확인하거나, 베트남어 표현을 바꿨을 때
회귀가 없는지 보는 데 쓴다.

실행 (실제 API를 호출하므로 GEMINI_API_KEY가 필요하다):

    cd apps/translation-pipeline
    python scripts/measure_guideline_adherence.py
    python scripts/measure_guideline_adherence.py --runs 5 --verbose
"""

import argparse
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from dotenv import load_dotenv  # noqa: E402

from translation_pipeline import TranslationRequest  # noqa: E402
from translation_pipeline.errors import TranslationError  # noqa: E402
from translation_pipeline.providers import GeminiTranslator  # noqa: E402
from translation_pipeline.providers.gemini import DEFAULT_MODEL  # noqa: E402


@dataclass(frozen=True)
class Case:
    """지침 항목 하나를 확인하는 발화."""

    text: str
    source_lang: str
    target_lang: str
    checks: str
    # 나오면 지침 위반인 표현. 이것이 판정의 핵심이다.
    forbidden: tuple[str, ...] = ()
    # 하나라도 나오면 지침대로 옮긴 것으로 본다. 참고용이며 없다고 위반은 아니다.
    expected_any: tuple[str, ...] = field(default_factory=tuple)


CASES = [
    Case(
        text="그건 검토해보겠습니다",
        source_lang="ko",
        target_lang="vi",
        checks="유보 표현을 확답으로 만들지 않는가",
        forbidden=("sẽ xem xét", "sẽ kiểm tra"),
        expected_any=("để tôi xem", "để em xem"),
    ),
    Case(
        text="한번 고민해보겠습니다",
        source_lang="ko",
        target_lang="vi",
        checks="유보 표현을 확답으로 만들지 않는가",
        forbidden=("sẽ xem xét", "sẽ suy nghĩ"),
        expected_any=("để tôi xem", "để em xem"),
    ),
    Case(
        text="그건 좀 어려울 것 같은데요",
        source_lang="ko",
        target_lang="vi",
        checks="완곡한 거절의 정도를 유지하는가",
        expected_any=("khó",),
    ),
    Case(
        text="다들 고생하셨습니다",
        source_lang="ko",
        target_lang="vi",
        checks="노고 표현을 고통으로 옮기지 않는가",
        forbidden=("chịu khổ", "đau khổ", "khổ sở"),
        expected_any=("cảm ơn",),
    ),
    Case(
        text="회의 고생했어요",
        source_lang="ko",
        target_lang="vi",
        checks="활용형이 달라도 노고 표현으로 처리하는가",
        forbidden=("chịu khổ", "đau khổ", "khổ sở"),
        expected_any=("cảm ơn", "vất vả"),
    ),
    Case(
        text="앞으로 잘 부탁드립니다",
        source_lang="ko",
        target_lang="vi",
        checks="돌봐달라는 뜻으로 옮기지 않는가",
        forbidden=("chăm sóc tôi", "chăm sóc em"),
        expected_any=("hợp tác",),
    ),
    Case(
        text="팀장님 말씀하세요",
        source_lang="ko",
        target_lang="vi",
        checks="발언권을 넘기는 말로 옮기는가",
        expected_any=("mời",),
    ),
]


def contains_any(text: str, needles: tuple[str, ...]) -> list[str]:
    lowered = text.casefold()
    return [n for n in needles if n.casefold() in lowered]


def measure(runs: int, model: str, verbose: bool) -> int:
    load_dotenv()
    translator = GeminiTranslator(model=model)

    print(f"모델: {translator.model}")
    print(f"케이스 {len(CASES)}개 x {runs}회\n")

    violations: list[tuple[Case, str, list[str]]] = []
    total_ok = total_violation = total_failed = 0
    latencies: list[float] = []

    for case in CASES:
        outputs: list[str] = []
        case_violation = 0
        case_failed = 0

        for _ in range(runs):
            started = time.monotonic()
            try:
                result = translator.translate(
                    TranslationRequest(
                        text=case.text,
                        source_lang=case.source_lang,
                        target_lang=case.target_lang,
                    )
                )
            except TranslationError as error:
                case_failed += 1
                if verbose:
                    print(f"    실패: {str(error)[:70]}")
                continue

            latencies.append(time.monotonic() - started)
            outputs.append(result)

            hit = contains_any(result, case.forbidden)
            if hit:
                case_violation += 1
                violations.append((case, result, hit))
            if verbose:
                mark = "위반" if hit else "통과"
                print(f"    {mark}: {result}")

        case_ok = len(outputs) - case_violation
        total_ok += case_ok
        total_violation += case_violation
        total_failed += case_failed

        unique = len(set(outputs))
        expected_hits = sum(1 for o in outputs if contains_any(o, case.expected_any))

        print(f"[{case.source_lang}->{case.target_lang}] {case.text}")
        print(f"  확인: {case.checks}")
        print(
            f"  통과 {case_ok} / 위반 {case_violation} / 실패 {case_failed}"
            f"  | 서로 다른 출력 {unique}가지"
        )
        if case.expected_any:
            print(f"  기대 표현 등장 {expected_hits}/{len(outputs)}")
        if outputs:
            print(f"  예: {outputs[0]}")
        print()
        time.sleep(1)

    judged = total_ok + total_violation
    print("=" * 60)
    print(f"통과 {total_ok} / 위반 {total_violation} / 실패 {total_failed}")
    if judged:
        print(f"지침 준수율: {total_ok / judged * 100:.1f}% (실패 제외 {judged}건 기준)")
    if latencies:
        print(
            f"지연: 평균 {sum(latencies) / len(latencies):.1f}초"
            f"  최대 {max(latencies):.1f}초"
        )

    if violations and not verbose:
        print("\n위반 사례:")
        for case, result, hit in violations[:5]:
            print(f"  원문: {case.text}")
            print(f"  금지 표현 {hit} 가 결과에 있음")
            print(f"  실제: {result}")

    return 1 if total_violation or not judged else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="관용구 지침 준수율을 측정한다.")
    parser.add_argument("--runs", type=int, default=3, help="케이스당 반복 횟수")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="사용할 모델")
    parser.add_argument("--verbose", action="store_true", help="매 회 결과를 출력")
    args = parser.parse_args()
    return measure(runs=args.runs, model=args.model, verbose=args.verbose)


if __name__ == "__main__":
    raise SystemExit(main())
