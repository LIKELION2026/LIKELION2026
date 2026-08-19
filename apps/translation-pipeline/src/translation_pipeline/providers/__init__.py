"""번역 provider 구현체.

각 구현체는 `translation_pipeline.translator.Translator` 계약을 만족한다.
provider를 추가할 때는 이 패키지에 파일을 하나 더 두고, 파이프라인 조립 지점에서
바꿔 끼우면 된다.
"""

from .gemini import GeminiTranslator
from .openai import OpenAITranslator

__all__ = ["GeminiTranslator", "OpenAITranslator"]
