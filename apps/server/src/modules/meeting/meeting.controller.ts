import { Body, Controller, Post } from "@nestjs/common";
import type { CreateMeetingTokenResponse } from "@likelion2026/shared";

import { CreateMeetingTokenDto } from "./dto/create-meeting-token.dto";
import { MeetingService } from "./meeting.service";

@Controller("meeting")
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post("token")
  createToken(
    @Body() request: CreateMeetingTokenDto
  ): Promise<CreateMeetingTokenResponse> {
    return this.meetingService.createToken(request);
  }
}
