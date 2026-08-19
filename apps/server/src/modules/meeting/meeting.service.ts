import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  LAB_MEETING_ROOM_NAME_PATTERN,
  MEETING_PARTICIPANT_ATTRIBUTE_KEYS,
  MEETING_PARTICIPANT_COUNTRIES,
  MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY,
  PARTICIPANT_IDENTITY_PATTERN,
  SOCKET_EVENT_NAMES,
  SUBTITLE_UPDATE_STRATEGY,
  getOppositeMeetingTranslationLanguage,
  type CreateMeetingTokenRequest,
  type CreateMeetingTokenResponse,
  type CreateMockSubtitleRequest,
  type CreateMockSubtitleResponse,
  isMeetingTranslationLanguageCode,
  isLanguageCode,
  type LanguageCode,
  type ListMockSubtitlesResponse,
  type MeetingParticipantCountry,
  type MeetingRoomStateResponse,
  type MeetingRoomStatus,
  type MeetingTranslationLanguageCode,
  type MeetingTranslationPreference,
  type OfficeCalendarEvent,
  type SubmitMeetingSummaryRequest,
  type SubtitleCreatedPayload
} from "@likelion2026/shared";
import { randomUUID } from "node:crypto";

import { LiveKitTokenService } from "../../integrations/livekit/livekit-token.service";
import type { LiveKitWebhookSummary } from "../../integrations/livekit/livekit-webhook.service";
import { OfficeService } from "../office/office.service";

export interface LiveKitWebhookHandledResponse {
  duplicate: boolean;
  event: string;
  participantIdentity?: string;
  received: true;
  roomName?: string;
  roomState?: MeetingRoomStateResponse;
}

interface MeetingRoomStateRecord {
  lastEvent: string;
  lastEventId?: string;
  participants: Map<string, MeetingParticipantRecord>;
  roomName: string;
  roomSid?: string;
  status: MeetingRoomStatus;
  updatedAt: string;
}

interface MeetingParticipantRecord {
  participantIdentity: string;
  participantName?: string;
  publishedTrackSids: Set<string>;
}

const WEBHOOK_EVENT_ID_CACHE_LIMIT = 1_000;
const MOCK_SUBTITLE_ROOM_BUFFER_LIMIT = 100;
const SUBTITLE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,127}$/;

@Injectable()
export class MeetingService {
  private readonly processedWebhookEventIdQueue: string[] = [];
  private readonly processedWebhookEventIds = new Set<string>();
  private readonly mockSubtitlesByRoomName = new Map<
    string,
    Map<string, SubtitleCreatedPayload>
  >();
  private readonly roomStates = new Map<string, MeetingRoomStateRecord>();

  constructor(
    private readonly liveKitTokenService: LiveKitTokenService,
    private readonly officeService: OfficeService
  ) {}

  async createToken(
    request: CreateMeetingTokenRequest
  ): Promise<CreateMeetingTokenResponse> {
    const roomName = assertLabRoomName(request.roomName);
    const participantCountry = assertParticipantCountry(
      request.participantCountry
    );
    const preferredLanguage =
      MEETING_PARTICIPANT_LANGUAGE_BY_COUNTRY[participantCountry];
    const translationPreference = resolveMeetingTranslationPreference(
      request.translationPreference,
      preferredLanguage
    );
    const participantIdentity = resolveParticipantIdentity(
      request.participantIdentity,
      participantCountry
    );
    const participantName =
      typeof request.participantName === "string"
        ? request.participantName.trim()
        : "";

    if (participantName.length === 0) {
      throw new BadRequestException("participantName is required");
    }

    const tokenResult = await this.liveKitTokenService.createRoomJoinToken({
      attributes: {
        [MEETING_PARTICIPANT_ATTRIBUTE_KEYS.PARTICIPANT_COUNTRY]:
          participantCountry,
        [MEETING_PARTICIPANT_ATTRIBUTE_KEYS.PREFERRED_LANGUAGE]:
          translationPreference.sourceLanguage,
        [MEETING_PARTICIPANT_ATTRIBUTE_KEYS.ROOM_NAME]: roomName,
        [MEETING_PARTICIPANT_ATTRIBUTE_KEYS.TRANSLATION_RECEIVING_ENABLED]:
          translationPreference.enabled ? "true" : "false",
        [MEETING_PARTICIPANT_ATTRIBUTE_KEYS.TRANSLATION_TARGET_LANGUAGE]:
          translationPreference.targetLanguage
      },
      participantIdentity,
      participantName,
      roomName
    });

    return {
      expiresAt: tokenResult.expiresAt,
      participantIdentity,
      participantName,
      participantCountry,
      preferredLanguage: translationPreference.sourceLanguage,
      roomName,
      serverUrl: this.liveKitTokenService.serverUrl,
      token: tokenResult.token,
      translationPreference
    };
  }

  createMockSubtitle(
    request: CreateMockSubtitleRequest
  ): CreateMockSubtitleResponse {
    const roomName = assertLabRoomName(request.roomName);
    const speaker = resolveSubtitleSpeaker(request);
    const sourceLanguage = assertLanguageCode(
      request.sourceLanguage,
      "sourceLanguage"
    );
    const translatedLanguage = assertLanguageCode(
      request.translatedLanguage,
      "translatedLanguage"
    );

    const response = {
      eventName: SOCKET_EVENT_NAMES.SUBTITLE_CREATED,
      payload: {
        confidence: resolveOptionalConfidence(request.confidence),
        isFinal: request.isFinal ?? false,
        occurredAt: resolveOccurredAt(request.occurredAt),
        revision: resolveSubtitleRevision(request.revision),
        roomName,
        sourceLanguage,
        sourceText: resolveRequiredText(request.sourceText, "sourceText"),
        speaker,
        subtitleId: resolveSubtitleId(request.subtitleId),
        translatedLanguage,
        translatedText: resolveRequiredText(
          request.translatedText,
          "translatedText"
        )
      }
    };

    this.rememberMockSubtitle(response.payload);

    return response;
  }

  getMockSubtitles(roomName: string): ListMockSubtitlesResponse {
    const normalizedRoomName = assertLabRoomName(roomName);
    const payloads = [
      ...(this.mockSubtitlesByRoomName.get(normalizedRoomName)?.values() ?? [])
    ].sort(compareSubtitlePayloads);

    return {
      eventName: SOCKET_EVENT_NAMES.SUBTITLE_CREATED,
      payloads,
      roomName: normalizedRoomName,
      updateStrategy: SUBTITLE_UPDATE_STRATEGY
    };
  }

  async submitSummary(
    request: SubmitMeetingSummaryRequest
  ): Promise<OfficeCalendarEvent | null> {
    assertLabRoomName(request.roomName);

    return this.officeService.createMeetingSummaryEvent({
      candidateMemberIds: request.everParticipantIdentities,
      endsAt: request.endsAt,
      startsAt: request.startsAt,
      summaryKo: request.summaryKo,
      summaryVi: request.summaryVi
    });
  }

  handleLiveKitWebhook(
    webhook: LiveKitWebhookSummary
  ): LiveKitWebhookHandledResponse {
    if (this.hasProcessedWebhookEvent(webhook.id)) {
      return {
        duplicate: true,
        event: webhook.event,
        participantIdentity: webhook.participantIdentity,
        received: true,
        roomName: webhook.roomName,
        roomState: webhook.roomName
          ? this.getRoomState(webhook.roomName)
          : undefined
      };
    }

    this.rememberWebhookEvent(webhook.id);
    const roomState = this.applyLiveKitWebhook(webhook);

    return {
      duplicate: false,
      event: webhook.event,
      participantIdentity: webhook.participantIdentity,
      received: true,
      roomName: webhook.roomName,
      roomState
    };
  }

  getRoomState(roomName: string): MeetingRoomStateResponse | undefined {
    const state = this.roomStates.get(roomName);

    if (!state) {
      return undefined;
    }

    return snapshotRoomState(state);
  }

  getExistingRoomState(roomName: string): MeetingRoomStateResponse {
    const normalizedRoomName = assertLabRoomName(roomName);
    const state = this.getRoomState(normalizedRoomName);

    if (!state) {
      throw new NotFoundException("meeting room state not found");
    }

    return state;
  }

  private hasProcessedWebhookEvent(eventId: string | undefined): boolean {
    if (!eventId) {
      return false;
    }

    return this.processedWebhookEventIds.has(eventId);
  }

  private rememberWebhookEvent(eventId: string | undefined): void {
    if (!eventId) {
      return;
    }

    this.processedWebhookEventIds.add(eventId);
    this.processedWebhookEventIdQueue.push(eventId);

    while (
      this.processedWebhookEventIdQueue.length >
      WEBHOOK_EVENT_ID_CACHE_LIMIT
    ) {
      const staleEventId = this.processedWebhookEventIdQueue.shift();

      if (staleEventId) {
        this.processedWebhookEventIds.delete(staleEventId);
      }
    }
  }

  private applyLiveKitWebhook(
    webhook: LiveKitWebhookSummary
  ): MeetingRoomStateResponse | undefined {
    if (!webhook.roomName) {
      return undefined;
    }

    const roomName = webhook.roomName;
    const state = this.getOrCreateRoomState(webhook, roomName);
    state.lastEvent = webhook.event;
    state.lastEventId = webhook.id;
    state.updatedAt = new Date().toISOString();

    switch (webhook.event) {
      case "room_started":
        state.status = "active";
        break;
      case "room_finished":
        state.status = "finished";
        state.participants.clear();
        this.mockSubtitlesByRoomName.delete(roomName);
        break;
      case "participant_joined":
        upsertParticipant(state, webhook);
        break;
      case "participant_left":
      case "participant_connection_aborted":
        if (webhook.participantIdentity) {
          state.participants.delete(webhook.participantIdentity);
        }
        break;
      case "track_published":
        addPublishedTrack(state, webhook);
        break;
      case "track_unpublished":
        removePublishedTrack(state, webhook);
        break;
      default:
        break;
    }

    return snapshotRoomState(state);
  }

  private getOrCreateRoomState(
    webhook: LiveKitWebhookSummary,
    roomName: string
  ): MeetingRoomStateRecord {
    const existingState = this.roomStates.get(roomName);

    if (existingState) {
      existingState.roomSid = existingState.roomSid ?? webhook.roomSid;

      return existingState;
    }

    const state: MeetingRoomStateRecord = {
      lastEvent: webhook.event,
      lastEventId: webhook.id,
      participants: new Map<string, MeetingParticipantRecord>(),
      roomName,
      roomSid: webhook.roomSid,
      status: "active",
      updatedAt: new Date().toISOString()
    };

    this.roomStates.set(roomName, state);

    return state;
  }

  private rememberMockSubtitle(payload: SubtitleCreatedPayload): void {
    const roomSubtitles =
      this.mockSubtitlesByRoomName.get(payload.roomName) ??
      new Map<string, SubtitleCreatedPayload>();
    const existingPayload = roomSubtitles.get(payload.subtitleId);

    if (existingPayload && existingPayload.revision > payload.revision) {
      return;
    }

    roomSubtitles.set(payload.subtitleId, payload);
    this.mockSubtitlesByRoomName.set(payload.roomName, roomSubtitles);

    while (roomSubtitles.size > MOCK_SUBTITLE_ROOM_BUFFER_LIMIT) {
      const oldestSubtitleId = roomSubtitles.keys().next().value;

      if (!oldestSubtitleId) {
        break;
      }

      roomSubtitles.delete(oldestSubtitleId);
    }
  }
}

function upsertParticipant(
  state: MeetingRoomStateRecord,
  webhook: LiveKitWebhookSummary
): MeetingParticipantRecord | undefined {
  const participantIdentity = webhook.participantIdentity;

  if (!participantIdentity) {
    return undefined;
  }

  const participant =
    state.participants.get(participantIdentity) ??
    createParticipant(participantIdentity, webhook);

  if (webhook.participantName) {
    participant.participantName = webhook.participantName;
  }

  state.participants.set(participantIdentity, participant);

  return participant;
}

function addPublishedTrack(
  state: MeetingRoomStateRecord,
  webhook: LiveKitWebhookSummary
): void {
  if (!webhook.trackSid) {
    return;
  }

  const participant = upsertParticipant(state, webhook);
  participant?.publishedTrackSids.add(webhook.trackSid);
}

function removePublishedTrack(
  state: MeetingRoomStateRecord,
  webhook: LiveKitWebhookSummary
): void {
  if (!webhook.participantIdentity || !webhook.trackSid) {
    return;
  }

  state.participants
    .get(webhook.participantIdentity)
    ?.publishedTrackSids.delete(webhook.trackSid);
}

function createParticipant(
  participantIdentity: string,
  webhook: LiveKitWebhookSummary
): MeetingParticipantRecord {
  return {
    participantIdentity,
    participantName: webhook.participantName,
    publishedTrackSids: new Set<string>()
  };
}

function snapshotRoomState(
  state: MeetingRoomStateRecord
): MeetingRoomStateResponse {
  const participants = [...state.participants.values()]
    .map((participant) => ({
      participantIdentity: participant.participantIdentity,
      participantName: participant.participantName,
      publishedTrackSids: [...participant.publishedTrackSids].sort()
    }))
    .sort((left, right) =>
      left.participantIdentity.localeCompare(right.participantIdentity)
    );

  return {
    lastEvent: state.lastEvent,
    lastEventId: state.lastEventId,
    participantCount: participants.length,
    participants,
    roomName: state.roomName,
    roomSid: state.roomSid,
    status: state.status,
    trackCount: participants.reduce(
      (count, participant) => count + participant.publishedTrackSids.length,
      0
    ),
    updatedAt: state.updatedAt
  };
}

function compareSubtitlePayloads(
  left: SubtitleCreatedPayload,
  right: SubtitleCreatedPayload
): number {
  const occurredAtDiff =
    Date.parse(left.occurredAt) - Date.parse(right.occurredAt);

  if (occurredAtDiff !== 0) {
    return occurredAtDiff;
  }

  return left.subtitleId.localeCompare(right.subtitleId);
}

function resolveSubtitleSpeaker(request: CreateMockSubtitleRequest): {
  displayName: string;
  participantIdentity: string;
} {
  const participantIdentity = request.speaker?.participantIdentity?.trim();
  const displayName = request.speaker?.displayName?.trim();

  if (!participantIdentity) {
    throw new BadRequestException("speaker.participantIdentity is required");
  }

  if (!new RegExp(PARTICIPANT_IDENTITY_PATTERN).test(participantIdentity)) {
    throw new BadRequestException(
      "speaker.participantIdentity must contain only letters, numbers, hyphens, or underscores"
    );
  }

  if (!displayName) {
    throw new BadRequestException("speaker.displayName is required");
  }

  return {
    displayName,
    participantIdentity
  };
}

function assertLanguageCode(value: string, fieldName: string): LanguageCode {
  const normalizedValue = typeof value === "string" ? value.trim() : "";

  if (!isLanguageCode(normalizedValue)) {
    throw new BadRequestException(`${fieldName} must be a supported language`);
  }

  return normalizedValue;
}

function resolveMeetingTranslationPreference(
  preference: MeetingTranslationPreference | undefined,
  preferredLanguage: LanguageCode
): MeetingTranslationPreference {
  const defaultSourceLanguage = assertMeetingTranslationLanguageCode(
    preferredLanguage,
    "preferredLanguage"
  );

  if (!preference) {
    return {
      activatedAt: new Date().toISOString(),
      enabled: true,
      sourceLanguage: defaultSourceLanguage,
      targetLanguage: getOppositeMeetingTranslationLanguage(
        defaultSourceLanguage
      )
    };
  }

  const sourceLanguage = assertMeetingTranslationLanguageCode(
    preference.sourceLanguage,
    "translationPreference.sourceLanguage"
  );
  const targetLanguage = assertMeetingTranslationLanguageCode(
    preference.targetLanguage,
    "translationPreference.targetLanguage"
  );

  if (sourceLanguage === targetLanguage) {
    throw new BadRequestException(
      "translationPreference sourceLanguage and targetLanguage must be different"
    );
  }

  const enabled = preference.enabled === true;
  const activatedAt = enabled
    ? resolveTranslationActivatedAt(preference.activatedAt)
    : undefined;

  return {
    ...(activatedAt ? { activatedAt } : {}),
    enabled,
    sourceLanguage,
    targetLanguage
  };
}

function assertMeetingTranslationLanguageCode(
  value: string,
  fieldName: string
): MeetingTranslationLanguageCode {
  const normalizedValue = typeof value === "string" ? value.trim() : "";

  if (!isMeetingTranslationLanguageCode(normalizedValue)) {
    throw new BadRequestException(
      `${fieldName} must be ko or vi for meeting translation`
    );
  }

  return normalizedValue;
}

function resolveTranslationActivatedAt(
  activatedAt: string | undefined
): string {
  if (!activatedAt) {
    return new Date().toISOString();
  }

  const timestamp = Date.parse(activatedAt);

  if (Number.isNaN(timestamp)) {
    throw new BadRequestException(
      "translationPreference.activatedAt must be an ISO timestamp"
    );
  }

  return new Date(timestamp).toISOString();
}

function resolveRequiredText(value: string, fieldName: string): string {
  const normalizedValue = typeof value === "string" ? value.trim() : "";

  if (!normalizedValue) {
    throw new BadRequestException(`${fieldName} is required`);
  }

  return normalizedValue;
}

function resolveSubtitleId(subtitleId: string | undefined): string {
  const resolvedSubtitleId = subtitleId?.trim() || `mock-${randomUUID()}`;

  if (!SUBTITLE_ID_PATTERN.test(resolvedSubtitleId)) {
    throw new BadRequestException(
      "subtitleId must start with an alphanumeric character and contain only letters, numbers, hyphens, or underscores"
    );
  }

  return resolvedSubtitleId;
}

function resolveSubtitleRevision(revision: number | undefined): number {
  const resolvedRevision = revision ?? 1;

  if (!Number.isInteger(resolvedRevision) || resolvedRevision < 1) {
    throw new BadRequestException(
      "revision must be an integer greater than or equal to 1"
    );
  }

  return resolvedRevision;
}

function resolveOptionalConfidence(
  confidence: number | undefined
): number | undefined {
  if (confidence === undefined) {
    return undefined;
  }

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new BadRequestException("confidence must be between 0 and 1");
  }

  return confidence;
}

function resolveOccurredAt(occurredAt: string | undefined): string {
  if (!occurredAt) {
    return new Date().toISOString();
  }

  const timestamp = Date.parse(occurredAt);

  if (Number.isNaN(timestamp)) {
    throw new BadRequestException("occurredAt must be an ISO timestamp");
  }

  return new Date(timestamp).toISOString();
}

function assertLabRoomName(roomName: string): string {
  const normalizedRoomName = roomName.trim();

  if (!new RegExp(LAB_MEETING_ROOM_NAME_PATTERN).test(normalizedRoomName)) {
    throw new BadRequestException(
      "roomName must use lab-<team>-<yyyymmdd>-<slug>"
    );
  }

  return normalizedRoomName;
}

function assertParticipantCountry(
  participantCountry: string | undefined
): MeetingParticipantCountry {
  const normalizedCountry =
    typeof participantCountry === "string" ? participantCountry.trim() : "";

  if (
    !MEETING_PARTICIPANT_COUNTRIES.includes(
      normalizedCountry as MeetingParticipantCountry
    )
  ) {
    throw new BadRequestException("participantCountry must be kr or vn");
  }

  return normalizedCountry as MeetingParticipantCountry;
}

function createGuestParticipantIdentity(
  participantCountry: MeetingParticipantCountry
): string {
  return `${participantCountry}-guest-${randomUUID()}`;
}

function resolveParticipantIdentity(
  participantIdentity: string | undefined,
  participantCountry: MeetingParticipantCountry
): string {
  const normalizedIdentity =
    typeof participantIdentity === "string" ? participantIdentity.trim() : "";

  if (!normalizedIdentity) {
    return createGuestParticipantIdentity(participantCountry);
  }

  if (!new RegExp(PARTICIPANT_IDENTITY_PATTERN).test(normalizedIdentity)) {
    throw new BadRequestException(
      "participantIdentity must start with an alphanumeric character and contain only letters, numbers, hyphens, or underscores"
    );
  }

  return normalizedIdentity;
}
