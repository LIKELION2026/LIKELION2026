import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  RawBody
} from "@nestjs/common";
import type {
  CreateMeetingTokenResponse,
  CreateMockSubtitleResponse,
  ListMockSubtitlesResponse,
  MeetingRoomStateResponse
} from "@likelion2026/shared";

import { LiveKitWebhookService } from "../../integrations/livekit/livekit-webhook.service";
import { CreateMeetingTokenDto } from "./dto/create-meeting-token.dto";
import { CreateMockSubtitleDto } from "./dto/create-mock-subtitle.dto";
import { MeetingRealtimeGateway } from "./meeting-realtime.gateway";
import {
  type LiveKitWebhookHandledResponse,
  MeetingService
} from "./meeting.service";

@Controller("meeting")
export class MeetingController {
  constructor(
    private readonly liveKitWebhookService: LiveKitWebhookService,
    private readonly meetingRealtimeGateway: MeetingRealtimeGateway,
    private readonly meetingService: MeetingService
  ) {}

  @Post("token")
  createToken(
    @Body() request: CreateMeetingTokenDto
  ): Promise<CreateMeetingTokenResponse> {
    return this.meetingService.createToken(request);
  }

  @Post("subtitles/mock")
  createMockSubtitle(
    @Body() request: CreateMockSubtitleDto
  ): CreateMockSubtitleResponse {
    const response = this.meetingService.createMockSubtitle(request);

    this.meetingRealtimeGateway.publishSubtitle(response.payload);

    return response;
  }

  @Post("livekit/webhook")
  async handleLiveKitWebhook(
    @Headers("authorization") authorizationHeader: string | undefined,
    @Headers("authorize") authorizeHeader: string | undefined,
    @RawBody() rawBody: Buffer | undefined
  ): Promise<LiveKitWebhookHandledResponse> {
    const webhook = await this.liveKitWebhookService.receiveWebhook(
      rawBody,
      authorizationHeader ?? authorizeHeader
    );

    return this.meetingService.handleLiveKitWebhook(webhook);
  }

  @Get("rooms/:roomName/state")
  getRoomState(
    @Param("roomName") roomName: string
  ): MeetingRoomStateResponse {
    return this.meetingService.getExistingRoomState(roomName);
  }

  @Get("rooms/:roomName/subtitles")
  getMockSubtitles(
    @Param("roomName") roomName: string
  ): ListMockSubtitlesResponse {
    return this.meetingService.getMockSubtitles(roomName);
  }
}
