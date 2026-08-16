import {
  CALENDAR_EVENT_TYPE_VALUES,
  type UpdateOfficeCalendarEventRequest
} from "@likelion2026/shared";
import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, Length, Matches } from "class-validator";

export class UpdateOfficeCalendarEventDto implements UpdateOfficeCalendarEventRequest {
  @IsISO8601()
  @IsOptional()
  endsAt?: string;

  @IsIn([...CALENDAR_EVENT_TYPE_VALUES])
  @IsOptional()
  eventType?: UpdateOfficeCalendarEventRequest["eventType"];

  @IsString()
  @Matches(/^guest_[a-zA-Z0-9]{16,64}$/)
  guestToken!: string;

  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;

  @IsISO8601()
  @IsOptional()
  startsAt?: string;

  @IsString()
  @IsOptional()
  @Length(1, 160)
  title?: string;
}
