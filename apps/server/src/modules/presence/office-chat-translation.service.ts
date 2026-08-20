import { Injectable } from "@nestjs/common";
import {
  getOppositeMeetingTranslationLanguage,
  isMeetingTranslationLanguageCode,
  type LanguageCode,
  type MeetingTranslationLanguageCode,
  type OfficeChatTranslations
} from "@likelion2026/shared";

interface GeminiTranslationResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

const DEFAULT_OFFICE_CHAT_TRANSLATION_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_OFFICE_CHAT_TRANSLATION_TIMEOUT_MS = 10_000;
const GEMINI_OFFICE_CHAT_TRANSLATION_PROVIDER = "gemini";
const HANGUL_PATTERN = /[\u3131-\u318e\uac00-\ud7a3]/;
const VIETNAMESE_MARK_PATTERN =
  /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const VIETNAMESE_WORD_PATTERN =
  /\b(xin|chao|chào|cam|cảm|on|ơn|hop|họp|duoc|được|khong|không|hom|hôm|nay|mai|toi|tôi|ban|bạn|kiem|kiểm|tra|viec|việc|loi|lỗi)\b/i;

const OFFICE_CHAT_TRANSLATION_MEMORY: Record<
  string,
  Partial<Record<MeetingTranslationLanguageCode, string>>
> = {
  "ko:감사합니다": { vi: "Cảm ơn." },
  "ko:고마워요": { vi: "Cảm ơn bạn." },
  "ko:내일 확인할게요": { vi: "Ngày mai tôi sẽ kiểm tra." },
  "ko:회의 시작할까요": { vi: "Bắt đầu cuộc họp nhé?" },
  "ko:안녕하세요": { vi: "Xin chào." },
  "ko:오늘 회의 가능하세요": { vi: "Hôm nay bạn có thể họp không?" },
  "ko:지금 가능하세요": { vi: "Bây giờ bạn có rảnh không?" },
  "ko:확인했습니다": { vi: "Tôi đã kiểm tra." },
  "ko:확인해주세요": { vi: "Vui lòng kiểm tra giúp tôi." },
  "ko:api 확인해주세요": { vi: "Vui lòng kiểm tra API giúp tôi." },
  "vi:ban co ranh khong": { ko: "지금 가능하세요?" },
  "vi:bat dau hop nhe": { ko: "회의 시작할까요?" },
  "vi:cam on": { ko: "감사합니다." },
  "vi:hom nay ban co the hop khong": { ko: "오늘 회의 가능하세요?" },
  "vi:toi da kiem tra": { ko: "확인했습니다." },
  "vi:vui long kiem tra api giup toi": { ko: "API 확인해 주세요." },
  "vi:vui long kiem tra giup toi": { ko: "확인해 주세요." },
  "vi:xin chao": { ko: "안녕하세요." }
};

@Injectable()
export class OfficeChatTranslationService {
  async createTranslations(
    text: string,
    fallbackSourceLanguage: LanguageCode
  ): Promise<{
    sourceLanguage: LanguageCode;
    translations?: OfficeChatTranslations;
  }> {
    const sourceLanguage = inferOfficeChatSourceLanguage(
      text,
      fallbackSourceLanguage
    );

    if (!isMeetingTranslationLanguageCode(sourceLanguage)) {
      return { sourceLanguage };
    }

    const targetLanguage = getOppositeMeetingTranslationLanguage(sourceLanguage);
    const translatedText =
      (await this.translateWithGemini(text, sourceLanguage, targetLanguage)) ??
      translateWithMemory(text, sourceLanguage, targetLanguage);

    if (!translatedText || translatedText.trim() === text.trim()) {
      return { sourceLanguage };
    }

    return {
      sourceLanguage,
      translations: {
        [targetLanguage]: translatedText.trim()
      }
    };
  }

  private async translateWithGemini(
    text: string,
    sourceLanguage: MeetingTranslationLanguageCode,
    targetLanguage: MeetingTranslationLanguageCode
  ): Promise<string | null> {
    const provider = process.env.OFFICE_CHAT_TRANSLATION_PROVIDER?.trim().toLowerCase();
    if (provider !== GEMINI_OFFICE_CHAT_TRANSLATION_PROVIDER) {
      return null;
    }

    const apiKey =
      process.env.OFFICE_CHAT_GEMINI_API_KEY?.trim() ??
      process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return null;
    }

    const model =
      process.env.OFFICE_CHAT_TRANSLATION_MODEL?.trim() ||
      DEFAULT_OFFICE_CHAT_TRANSLATION_MODEL;
    const timeoutMs = resolveOfficeChatTranslationTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text }]
              }
            ],
            generationConfig: {
              temperature: 0.2
            },
            systemInstruction: {
              parts: [
                {
                  text: createOfficeChatTranslationPrompt(
                    sourceLanguage,
                    targetLanguage
                  )
                }
              ]
            }
          }),
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST",
          signal: controller.signal
        }
      );

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as GeminiTranslationResponse;
      const translatedText =
        body.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? "")
          .join("")
          .trim() ?? "";

      return translatedText || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function inferOfficeChatSourceLanguage(
  text: string,
  fallbackSourceLanguage: LanguageCode
): LanguageCode {
  if (HANGUL_PATTERN.test(text)) {
    return "ko";
  }

  if (
    VIETNAMESE_MARK_PATTERN.test(text) ||
    VIETNAMESE_WORD_PATTERN.test(removeVietnameseMarks(text))
  ) {
    return "vi";
  }

  return fallbackSourceLanguage;
}

function translateWithMemory(
  text: string,
  sourceLanguage: MeetingTranslationLanguageCode,
  targetLanguage: MeetingTranslationLanguageCode
): string | null {
  return (
    OFFICE_CHAT_TRANSLATION_MEMORY[
      `${sourceLanguage}:${normalizeTranslationMemoryKey(text)}`
    ]?.[targetLanguage] ?? null
  );
}

function normalizeTranslationMemoryKey(text: string): string {
  return removeVietnameseMarks(text)
    .toLowerCase()
    .replace(/[?!.,~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeVietnameseMarks(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFC");
}

function resolveOfficeChatTranslationTimeoutMs(): number {
  const value = Number(process.env.OFFICE_CHAT_TRANSLATION_TIMEOUT_MS);

  return Number.isInteger(value) && value >= 1_000
    ? value
    : DEFAULT_OFFICE_CHAT_TRANSLATION_TIMEOUT_MS;
}

function createOfficeChatTranslationPrompt(
  sourceLanguage: MeetingTranslationLanguageCode,
  targetLanguage: MeetingTranslationLanguageCode
): string {
  const sourceName = sourceLanguage === "ko" ? "Korean" : "Vietnamese";
  const targetName = targetLanguage === "ko" ? "Korean" : "Vietnamese";

  return [
    `Translate a short virtual office chat message from ${sourceName} to ${targetName}.`,
    "Return only the translated message.",
    "Keep names, @mentions, URLs, issue numbers, and code terms unchanged.",
    "Do not add explanations or quotation marks."
  ].join(" ");
}
