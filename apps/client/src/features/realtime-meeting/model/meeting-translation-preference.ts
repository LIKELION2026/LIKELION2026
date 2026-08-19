import {
  MEETING_PARTICIPANT_ATTRIBUTE_KEYS,
  getOppositeMeetingTranslationLanguage,
  isMeetingTranslationLanguageCode,
  toMeetingTranslationLanguageCode,
  type LanguageCode,
  type MeetingTranslationLanguageCode,
  type MeetingTranslationPreference
} from "@likelion2026/shared";

export const MEETING_TRANSLATION_PREFERENCE_STORAGE_KEY =
  "meeting.translation-preference";

export interface MeetingTranslationPreferenceDraft {
  sourceLanguage: MeetingTranslationLanguageCode;
  targetLanguage: MeetingTranslationLanguageCode;
}

export type MeetingTranslationPreferenceValidationResult =
  | {
      ok: true;
    }
  | {
      message: string;
      ok: false;
      reason: "same-language" | "unsupported-language";
    };

export function createDefaultMeetingTranslationPreference(
  defaultSourceLanguage?: LanguageCode | string | null,
  activatedAt = new Date().toISOString()
): MeetingTranslationPreference {
  const storedDraft = readStoredMeetingTranslationPreferenceDraft();
  const sourceLanguage =
    storedDraft?.sourceLanguage ??
    toMeetingTranslationLanguageCode(defaultSourceLanguage);
  const targetLanguage =
    storedDraft && storedDraft.targetLanguage !== sourceLanguage
      ? storedDraft.targetLanguage
      : getOppositeMeetingTranslationLanguage(sourceLanguage);

  return {
    activatedAt,
    enabled: true,
    sourceLanguage,
    targetLanguage
  };
}

export function validateMeetingTranslationPreferenceDraft(
  draft: MeetingTranslationPreferenceDraft
): MeetingTranslationPreferenceValidationResult {
  if (
    !isMeetingTranslationLanguageCode(draft.sourceLanguage) ||
    !isMeetingTranslationLanguageCode(draft.targetLanguage)
  ) {
    return {
      message: "지원하는 번역 언어는 한국어와 베트남어입니다.",
      ok: false,
      reason: "unsupported-language"
    };
  }

  if (draft.sourceLanguage === draft.targetLanguage) {
    return {
      message: "나의 언어와 상대방에게 보여줄 언어는 서로 달라야 합니다.",
      ok: false,
      reason: "same-language"
    };
  }

  return { ok: true };
}

export function activateMeetingTranslationPreference(
  draft: MeetingTranslationPreferenceDraft,
  activatedAt = new Date().toISOString()
): MeetingTranslationPreference {
  const validation = validateMeetingTranslationPreferenceDraft(draft);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  return {
    activatedAt,
    enabled: true,
    sourceLanguage: draft.sourceLanguage,
    targetLanguage: draft.targetLanguage
  };
}

export function deactivateMeetingTranslationPreference(
  preference: MeetingTranslationPreference
): MeetingTranslationPreference {
  return {
    enabled: false,
    sourceLanguage: preference.sourceLanguage,
    targetLanguage: preference.targetLanguage
  };
}

export function createMeetingTranslationParticipantAttributes(
  preference: MeetingTranslationPreference
): Record<string, string> {
  return {
    [MEETING_PARTICIPANT_ATTRIBUTE_KEYS.PREFERRED_LANGUAGE]:
      preference.sourceLanguage,
    [MEETING_PARTICIPANT_ATTRIBUTE_KEYS.TRANSLATION_RECEIVING_ENABLED]:
      preference.enabled ? "true" : "false",
    [MEETING_PARTICIPANT_ATTRIBUTE_KEYS.TRANSLATION_TARGET_LANGUAGE]:
      preference.targetLanguage
  };
}

export function saveMeetingTranslationPreferenceDraft(
  draft: MeetingTranslationPreferenceDraft
): void {
  if (!canUseLocalStorage()) {
    return;
  }

  const validation = validateMeetingTranslationPreferenceDraft(draft);
  if (!validation.ok) {
    return;
  }

  window.localStorage.setItem(
    MEETING_TRANSLATION_PREFERENCE_STORAGE_KEY,
    JSON.stringify(draft)
  );
}

function readStoredMeetingTranslationPreferenceDraft():
  | MeetingTranslationPreferenceDraft
  | undefined {
  if (!canUseLocalStorage()) {
    return undefined;
  }

  const rawValue = window.localStorage.getItem(
    MEETING_TRANSLATION_PREFERENCE_STORAGE_KEY
  );
  if (!rawValue) {
    return undefined;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<
      MeetingTranslationPreferenceDraft
    >;
    const sourceLanguage = toMeetingTranslationLanguageCode(
      parsedValue.sourceLanguage
    );
    const targetLanguage = toMeetingTranslationLanguageCode(
      parsedValue.targetLanguage,
      getOppositeMeetingTranslationLanguage(sourceLanguage)
    );
    const draft = { sourceLanguage, targetLanguage };

    return validateMeetingTranslationPreferenceDraft(draft).ok
      ? draft
      : undefined;
  } catch {
    return undefined;
  }
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
