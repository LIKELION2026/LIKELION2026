import { Body, Controller, Param, Patch, Post } from "@nestjs/common";
import type {
  GuestOfficeSessionResponse,
  OfficeCollaborationPresence
} from "@likelion2026/shared";

import { CreateGuestOfficeSessionDto } from "./dto/create-guest-office-session.dto";
import { UpdateOfficeAttendanceDto } from "./dto/update-office-attendance.dto";
import { UpdateOfficePresenceDto } from "./dto/update-office-presence.dto";
import { OfficeService } from "./office.service";

@Controller("office")
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Post("session")
  createOrRestoreSession(
    @Body() request: CreateGuestOfficeSessionDto
  ): Promise<GuestOfficeSessionResponse> {
    return this.officeService.createOrRestoreSession(request);
  }

  @Patch("members/:memberId/attendance")
  updateAttendance(
    @Param("memberId") memberId: string,
    @Body() request: UpdateOfficeAttendanceDto
  ): Promise<OfficeCollaborationPresence> {
    return this.officeService.updateAttendance(memberId, request);
  }

  @Patch("members/:memberId/presence")
  updatePresence(
    @Param("memberId") memberId: string,
    @Body() request: UpdateOfficePresenceDto
  ): Promise<OfficeCollaborationPresence> {
    return this.officeService.updatePresence(memberId, request);
  }
}
