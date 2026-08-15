import { BadRequestException, Injectable } from "@nestjs/common";
import {
  DEFAULT_LANGUAGE_CODE,
  LAB_MEETING_ROOM_NAME_PATTERN,
  PARTICIPANT_IDENTITY_PATTERN,
  type CreateMeetingTokenRequest,
  type CreateMeetingTokenResponse
} from "@likelion2026/shared";
import { randomUUID } from "node:crypto";

import { LiveKitTokenService } from "../../integrations/livekit/livekit-token.service";

@Injectable()
export class MeetingService {
  constructor(private readonly liveKitTokenService: LiveKitTokenService) {}

  async createToken(
    request: CreateMeetingTokenRequest
  ): Promise<CreateMeetingTokenResponse> {
    const roomName = assertLabRoomName(request.roomName);
    const participantIdentity = resolveParticipantIdentity(
      request.participantIdentity
    );
    const participantName = request.participantName.trim();

    if (participantName.length === 0) {
      throw new BadRequestException("participantName is required");
    }

    const tokenResult = await this.liveKitTokenService.createRoomJoinToken({
      attributes: {
        preferredLanguage: request.preferredLanguage ?? DEFAULT_LANGUAGE_CODE,
        roomName
      },
      participantIdentity,
      participantName,
      roomName
    });

    return {
      expiresAt: tokenResult.expiresAt,
      participantIdentity,
      participantName,
      roomName,
      serverUrl: this.liveKitTokenService.serverUrl,
      token: tokenResult.token
    };
  }
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

function resolveParticipantIdentity(participantIdentity?: string): string {
  const resolvedIdentity =
    participantIdentity?.trim() ?? `guest-${randomUUID()}`;

  if (!new RegExp(PARTICIPANT_IDENTITY_PATTERN).test(resolvedIdentity)) {
    throw new BadRequestException(
      "participantIdentity must contain only letters, numbers, hyphens, or underscores"
    );
  }

  return resolvedIdentity;
}
