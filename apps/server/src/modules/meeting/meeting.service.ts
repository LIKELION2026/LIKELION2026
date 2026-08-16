import { Injectable } from "@nestjs/common";
import {
  DEFAULT_LANGUAGE_CODE,
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
    const participantIdentity =
      request.participantIdentity ?? `guest-${randomUUID()}`;
    const tokenResult = await this.liveKitTokenService.createRoomJoinToken({
      attributes: {
        preferredLanguage: request.preferredLanguage ?? DEFAULT_LANGUAGE_CODE
      },
      participantIdentity,
      participantName: request.participantName,
      roomName: request.roomName
    });

    return {
      expiresAt: tokenResult.expiresAt,
      participantIdentity,
      participantName: request.participantName,
      roomName: request.roomName,
      serverUrl: this.liveKitTokenService.serverUrl,
      token: tokenResult.token
    };
  }
}
