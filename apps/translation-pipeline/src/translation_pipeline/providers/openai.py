"""OpenAI 번역 provider.

Gemini가 일시적으로 응답하지 못할 때(429 한도 초과, 503/504 과부하, 타임아웃)
대신 쓰는 대체 provider다. `FallbackTranslator`가 `ProviderUnavailableError`를
잡았을 때만 이 provider로 넘긴다.
"""

import os

from ..errors import TranslationError
from ..translator import TranslationRequest, build_system_prompt

# 2026-08-19 조사(OpenAI 공식 deprecations 페이지, Artificial Analysis 벤치마크
# 기준). 대체 provider는 자주 불리지 않는 경로(Gemini가 일시 실패할 때만)라
# 속도보다 검증된 번역 품질과 비용을 우선했다.
#
#   gpt-5.4-mini    처음에 정한 값. TTFT 0.72초로 가장 빠르지만 이미
#                   deprecated(OpenAI가 GPT-5.6 Terra로 이전을 안내).
#   gpt-5.6-terra   deprecated는 아니지만 Intelligence Index 34에 입력
#                   $2~2.5/출력 $12~15(1M 토큰당)로 비싸다.
#   gpt-4o-mini     OpenAI 공식 deprecations 목록에 없어 안정적으로 계속
#                   쓸 수 있다. TTFT 1.07초로 위 둘보다 느리지만, 가끔 호출되는
#                   대체 경로에서는 문제되지 않는 수준이다. 번역/로컬라이제이션
#                   용도로 오래 쓰인 모델이고, 입력 $0.15/출력 $0.60(1M
#                   토큰당)로 gpt-5.6-terra보다 13~20배 싸다.
#
# 번역 품질만 놓고 비교한 벤치마크는 찾지 못했다 — 위 수치는 모두 범용
# Intelligence Index나 코딩 과제 기준이다. 통역 프롬프트로 직접 재보기 전까지는
# 잠정값이니, 실측하면 이 주석을 갱신한다. Gemini의 DEFAULT_MODEL 선택 방식
# (3회 반복 실측)을 그대로 따르지 못한 이유이기도 하다.
DEFAULT_MODEL = "gpt-4o-mini"

# 통역은 같은 입력에 같은 결과가 나오는 편이 낫다. Gemini와 값을 맞춘다.
DEFAULT_TEMPERATURE = 0.3

DEFAULT_TIMEOUT_MS = 10_000

ENV_API_KEY = "OPENAI_API_KEY"


class OpenAITranslator:
    """`Translator` 계약의 OpenAI 구현. Gemini 대체용이다."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = DEFAULT_MODEL,
        temperature: float = DEFAULT_TEMPERATURE,
        timeout_ms: int = DEFAULT_TIMEOUT_MS,
        client: object | None = None,
    ) -> None:
        self._model = model
        self._temperature = temperature
        self._timeout_ms = timeout_ms

        # 테스트에서 가짜 클라이언트를 끼울 수 있게 열어 둔다.
        if client is not None:
            self._client = client
            return

        resolved_key = api_key or os.environ.get(ENV_API_KEY)
        if not resolved_key:
            raise TranslationError(
                f"{ENV_API_KEY}가 없습니다. .env에 키를 채우거나 api_key를 넘기세요."
            )

        openai_module = _import_openai()
        self._client = openai_module.OpenAI(
            api_key=resolved_key, timeout=timeout_ms / 1000
        )

    @property
    def model(self) -> str:
        return self._model

    def translate(self, request: TranslationRequest) -> str:
        """원문 하나를 번역하고 번역문만 반환한다."""
        try:
            response = self._client.chat.completions.create(
                model=self._model,
                temperature=self._temperature,
                messages=[
                    {"role": "system", "content": build_system_prompt(request)},
                    {"role": "user", "content": request.text},
                ],
            )
        except Exception as error:  # provider 예외 타입은 SDK마다 다르다
            raise TranslationError(f"OpenAI 호출이 실패했습니다: {error}") from error

        text = (response.choices[0].message.content or "").strip()
        if not text:
            raise TranslationError("OpenAI가 빈 응답을 반환했습니다.")
        return text


def _import_openai():
    try:
        import openai
    except ImportError as error:
        raise TranslationError(
            "openai가 설치되어 있지 않습니다. pip install -r requirements.txt를 실행하세요."
        ) from error
    return openai
