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
          <p>AI TRANSLATION</p>
          <h2 id="meeting-translation-title">번역 언어 설정</h2>
        </header>
        <p className="meeting-translation-modal-description">
          저장한 이후부터 생성되는 AI 번역만 채팅과 하단 자막에 표시됩니다.
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
            나의 언어
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
            상대방에게 보여줄 언어
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
              {validation.message}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="meeting-translation-modal-error">{errorMessage}</p>
          ) : null}
          <footer>
            <button disabled={isSaving} onClick={onClose} type="button">
              취소
            </button>
            <button disabled={!validation.ok || isSaving} type="submit">
              {isSaving ? "저장 중" : "AI 번역 켜기"}
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
