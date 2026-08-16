import {
  ATTENDANCE_STATUS_VALUES,
  type UpdateOfficeAttendanceRequest
} from "@likelion2026/shared";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class UpdateOfficeAttendanceDto implements UpdateOfficeAttendanceRequest {
  @IsIn([...ATTENDANCE_STATUS_VALUES])
  attendanceStatus!: UpdateOfficeAttendanceRequest["attendanceStatus"];

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{12,128}$/)
  guestToken!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  statusMessage?: string;
}
