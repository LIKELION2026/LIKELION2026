import { useCallback, useState } from "react";
import type {
  LanguageCode,
  MeetingTranslationPreference
} from "@likelion2026/shared";
import type { Room } from "livekit-client";

import type { LiveKitMeetingSessionStatus } from "./use-livekit-meeting-session";
import {
  activateMeetingTranslationPreference,
  createDefaultMeetingTranslationPreference,
  createMeetingTranslationParticipantAttributes,
  deactivateMeetingTranslationPreference,
  saveMeetingTranslationPreferenceDraft,
  validateMeetingTranslationPreferenceDraft,
  type MeetingTranslationPreferenceDraft
} from "./meeting-translation-preference";

interface UseMeetingTranslationPreferenceOptions {
  defaultSourceLanguage?: LanguageCode;
  room: Room | null;
  sessionStatus: LiveKitMeetingSessionStatus;
}

export interface MeetingTranslationPreferenceController {
  closeModal: () => void;
  errorMessage?: string;
  isModalOpen: boolean;
  isSaving: boolean;
  openModal: () => void;
  preference: MeetingTranslationPreference;
  turnOff: () => Promise<boolean>;
  turnOn: (draft: MeetingTranslationPreferenceDraft) => Promise<boolean>;
}

export function useMeetingTranslationPreference({
  defaultSourceLanguage,
  room,
  sessionStatus
}: UseMeetingTranslationPreferenceOptions): MeetingTranslationPreferenceController {
  const [preference, setPreference] = useState<MeetingTranslationPreference>(() =>
    createDefaultMeetingTranslationPreference(defaultSourceLanguage)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const canUpdateLiveKitAttributes =
    Boolean(room) && sessionStatus === "connected";

  const openModal = useCallback(() => {
    setErrorMessage(undefined);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (!isSaving) {
      setIsModalOpen(false);
      setErrorMessage(undefined);
    }
  }, [isSaving]);

  const turnOn = useCallback(
    async (draft: MeetingTranslationPreferenceDraft) => {
      const validation = validateMeetingTranslationPreferenceDraft(draft);
      if (!validation.ok) {
        setErrorMessage(validation.message);
        return false;
      }

      if (!canUpdateLiveKitAttributes || !room) {
        setErrorMessage("meetingTranslation.errors.unavailableUntilConnected");
        return false;
      }

      const nextPreference = activateMeetingTranslationPreference(draft);
      setIsSaving(true);
      setErrorMessage(undefined);

      try {
        await room.localParticipant.setAttributes(
          createMeetingTranslationParticipantAttributes(nextPreference)
        );
        saveMeetingTranslationPreferenceDraft(draft);
        setPreference(nextPreference);
        setIsModalOpen(false);
        return true;
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "meetingTranslation.errors.saveFailed"
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [canUpdateLiveKitAttributes, room]
  );

  const turnOff = useCallback(async () => {
    const nextPreference = deactivateMeetingTranslationPreference(preference);
    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      if (room && sessionStatus === "connected") {
        await room.localParticipant.setAttributes(
          createMeetingTranslationParticipantAttributes(nextPreference)
        );
      }

      setPreference(nextPreference);
      setIsModalOpen(false);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "meetingTranslation.errors.turnOffFailed"
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [preference, room, sessionStatus]);

  return {
    closeModal,
    errorMessage,
    isModalOpen,
    isSaving,
    openModal,
    preference,
    turnOff,
    turnOn
  };
}
