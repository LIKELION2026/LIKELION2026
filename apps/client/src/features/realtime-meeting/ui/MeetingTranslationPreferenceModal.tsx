import {
  useEffect,
  useMemo,
  useState,
  type JSX,
  type KeyboardEvent
} from "react";
import {
  MEETING_TRANSLATION_LANGUAGE_CODES,
  getOppositeMeetingTranslationLanguage,
  type MeetingTranslationLanguageCode,
  type MeetingTranslationPreference
} from "@likelion2026/shared";
import { useTranslation } from "react-i18next";

import {
  validateMeetingTranslationPreferenceDraft,
  type MeetingTranslationPreferenceDraft
} from "../model/meeting-translation-preference";

interface MeetingTranslationPreferenceModalProps {
  errorMessage?: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (draft: MeetingTranslationPreferenceDraft) => Promise<boolean>;
  preference: MeetingTranslationPreference;
}

const MEETING_TRANSLATION_OPTION_LABELS: Record<
  MeetingTranslationLanguageCode,
  string
> = {
  ko: "KR",
  vi: "VI"
};

export function MeetingTranslationPreferenceModal({
  errorMessage,
  isSaving,
  onClose,
  onSave,
  preference
}: MeetingTranslationPreferenceModalProps): JSX.Element {
  const { t } = useTranslation();
  const [sourceLanguage, setSourceLanguage] =
    useState<MeetingTranslationLanguageCode>(preference.sourceLanguage);
  const [targetLanguage, setTargetLanguage] =
    useState<MeetingTranslationLanguageCode>(preference.targetLanguage);
  const draft = useMemo(
    () => ({ sourceLanguage, targetLanguage }),
    [sourceLanguage, targetLanguage]
  );
  const validation = validateMeetingTranslationPreferenceDraft(draft);

  useEffect(() => {
    setSourceLanguage(preference.sourceLanguage);
    setTargetLanguage(preference.targetLanguage);
  }, [preference.sourceLanguage, preference.targetLanguage]);

  return (
    <div className="meeting-translation-modal-backdrop" role="presentation">
      <section
        aria-labelledby="meeting-translation-title"
        aria-modal="true"
        className="meeting-translation-modal"
        onKeyDown={stopKeyboardPropagation}
        role="dialog"
      >
        <header>
          <p>{t("meetingTranslation.eyebrow")}</p>
          <h2 id="meeting-translation-title">{t("meetingTranslation.title")}</h2>
        </header>
        <p className="meeting-translation-modal-description">
          {t("meetingTranslation.description")}
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!validation.ok || isSaving) {
              return;
            }

            void onSave(draft);
          }}
        >
          <label>
            {t("meetingTranslation.sourceLanguage")}
            <select
              disabled={isSaving}
              onChange={(event) => {
                const nextLanguage = event.target
                  .value as MeetingTranslationLanguageCode;
                setSourceLanguage(nextLanguage);
                if (targetLanguage === nextLanguage) {
                  setTargetLanguage(
                    getOppositeMeetingTranslationLanguage(nextLanguage)
                  );
                }
              }}
              value={sourceLanguage}
            >
              {MEETING_TRANSLATION_LANGUAGE_CODES.map((language) => (
                <option key={language} value={language}>
                  {MEETING_TRANSLATION_OPTION_LABELS[language]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("meetingTranslation.targetLanguage")}
            <select
              disabled={isSaving}
              onChange={(event) => {
                const nextLanguage = event.target
                  .value as MeetingTranslationLanguageCode;
                setTargetLanguage(nextLanguage);
                if (sourceLanguage === nextLanguage) {
                  setSourceLanguage(
                    getOppositeMeetingTranslationLanguage(nextLanguage)
                  );
                }
              }}
              value={targetLanguage}
            >
              {MEETING_TRANSLATION_LANGUAGE_CODES.map((language) => (
                <option key={language} value={language}>
                  {MEETING_TRANSLATION_OPTION_LABELS[language]}
                </option>
              ))}
            </select>
          </label>
          {!validation.ok ? (
            <p className="meeting-translation-modal-error">
              {translateMaybeKey(t, validation.message)}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="meeting-translation-modal-error">{translateMaybeKey(t, errorMessage)}</p>
          ) : null}
          <footer>
            <button disabled={isSaving} onClick={onClose} type="button">
              {t("meetingTranslation.cancel")}
            </button>
            <button disabled={!validation.ok || isSaving} type="submit">
              {isSaving ? t("meetingTranslation.saving") : t("meetingTranslation.save")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function stopKeyboardPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

function translateMaybeKey(
  t: (key: string) => string,
  value: string
): string {
  return /^[a-z][\w-]*(?:\.[\w-]+)+$/.test(value) ? t(value) : value;
}
