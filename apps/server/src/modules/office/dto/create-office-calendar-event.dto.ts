import {
  CALENDAR_EVENT_TYPE_VALUES,
  type CreateOfficeCalendarEventRequest
} from "@likelion2026/shared";
import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateOfficeCalendarEventDto implements CreateOfficeCalendarEventRequest {
  @IsISO8601()
  endsAt!: string;

  @IsIn([...CALENDAR_EVENT_TYPE_VALUES])
  eventType!: CreateOfficeCalendarEventRequest["eventType"];

  @IsString()
  @Matches(/^guest_[a-zA-Z0-9]{16,64}$/)
  guestToken!: string;

  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  location?: string;

  @IsISO8601()
  startsAt!: string;

  @IsString()
  @Length(1, 160)
  title!: string;
}
