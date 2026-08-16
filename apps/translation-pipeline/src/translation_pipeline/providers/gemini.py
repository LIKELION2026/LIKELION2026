"""Gemini 번역 provider.

Anthropic API 비용을 집행할 수 없어 무료 티어를 쓸 수 있는 Gemini를 첫 구현으로
선택했다. 배경과 제약은 `docs/ADR/0001-translation-provider-abstraction.md`에 있다.
"""

import os

from ..errors import TranslationError
from ..translator import TranslationRequest, build_system_prompt

# 통역은 지연에 민감해서 flash 계열을 쓴다.
#
# 2026-08-16 재측정. 같은 문장을 3회씩 호출했다.
#   gemini-3.1-flash-lite  성공 3/3, 평균 2.0초, 사전값 그대로 사용
#   gemini-3-flash-preview 성공 3/3, 평균 7.3초
#   gemini-3.5-flash       무료 티어 할당량 소진으로 429
#   gemma-4-31b-it         성공, 13~21초 (할당량은 여유롭지만 실시간에 못 쓴다)
#
# 처음에는 lite의 번역 품질을 걱정해 일반 모델을 기본으로 뒀지만, 실제로는
# 품질 저하가 관측되지 않았고 사전 준수는 오히려 나았다. 속도와 할당량 여유가
# 모두 앞서므로 lite를 기본으로 한다.
DEFAULT_MODEL = "gemini-3.1-flash-lite"

# 통역은 같은 입력에 같은 결과가 나오는 편이 낫다. 창작이 아니므로 낮게 둔다.
DEFAULT_TEMPERATURE = 0.3

# Gemini API는 10초 미만 deadline을 거부한다(400 INVALID_ARGUMENT). 실시간 통역만
# 생각하면 더 짧게 끊고 싶지만 provider가 허용하지 않으므로 하한값을 쓴다.
#
# 그래서 "늦은 번역은 버린다"는 판단은 이 계층에서 할 수 없다. 발화 시각을 아는
# 호출자가 결과가 도착했을 때 아직 쓸모 있는지 보고 버려야 한다. 5단계에서 그
# 처리를 넣는다.
#
# 재시도하지 않는 이유도 같다. 재시도가 성공해도 그 시점에는 이미 늦다.
MIN_TIMEOUT_MS = 10_000
DEFAULT_TIMEOUT_MS = MIN_TIMEOUT_MS

ENV_API_KEY = "GEMINI_API_KEY"


class GeminiTranslator:
    """`Translator` 계약의 Gemini 구현."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = DEFAULT_MODEL,
        temperature: float = DEFAULT_TEMPERATURE,
        timeout_ms: int = DEFAULT_TIMEOUT_MS,
        client: object | None = None,
    ) -> None:
        if timeout_ms < MIN_TIMEOUT_MS:
            # 서버가 400으로 거절하므로 호출 시점이 아니라 여기서 막는다.
            raise ValueError(
                f"Gemini는 {MIN_TIMEOUT_MS}ms 미만 timeout을 허용하지 않습니다."
            )
        self._model = model
        self._temperature = temperature
        self._timeout_ms = timeout_ms

        # 테스트에서 가짜 클라이언트를 끼울 수 있게 열어 둔다.
        if client is not None:
            self._client = client
            self._types = _import_types()
            return

        resolved_key = api_key or os.environ.get(ENV_API_KEY)
        if not resolved_key:
            raise TranslationError(
                f"{ENV_API_KEY}가 없습니다. .env에 키를 채우거나 api_key를 넘기세요."
            )

        genai, types = _import_genai()
        self._client = genai.Client(
            api_key=resolved_key,
            http_options=types.HttpOptions(timeout=timeout_ms),
        )
        self._types = types

    @property
    def model(self) -> str:
        return self._model

    def translate(self, request: TranslationRequest) -> str:
        """원문 하나를 번역하고 번역문만 반환한다."""
        config = self._types.GenerateContentConfig(
            system_instruction=build_system_prompt(request),
            temperature=self._temperature,
            # 도구를 쓰지 않으므로 자동 함수 호출을 끈다. 켜 두면 호출마다
            # 경고가 출력된다.
            automatic_function_calling=self._types.AutomaticFunctionCallingConfig(
                disable=True
            ),
        )

        try:
            response = self._client.models.generate_content(
                model=self._model,
                contents=request.text,
                config=config,
            )
        except Exception as error:  # provider 예외 타입은 SDK마다 다르다
            raise TranslationError(f"Gemini 호출이 실패했습니다: {error}") from error

        text = (response.text or "").strip()
        if not text:
            raise TranslationError("Gemini가 빈 응답을 반환했습니다.")
        return text


def _import_genai():
    try:
        from google import genai
        from google.genai import types
    except ImportError as error:
        raise TranslationError(
            "google-genai가 설치되어 있지 않습니다. "
            "pip install -r requirements.txt를 실행하세요."
        ) from error
    return genai, types


def _import_types():
    _, types = _import_genai()
    return types
