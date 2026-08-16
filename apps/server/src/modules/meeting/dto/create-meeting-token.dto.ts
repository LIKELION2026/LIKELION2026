import {
  CreateMeetingTokenRequest,
  LAB_MEETING_ROOM_NAME_PATTERN,
  MEETING_PARTICIPANT_COUNTRIES,
  type MeetingParticipantCountry
} from "@likelion2026/shared";
import { Transform } from "class-transformer";
import { IsIn, IsString, Length, Matches } from "class-validator";

export class CreateMeetingTokenDto implements CreateMeetingTokenRequest {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsIn([...MEETING_PARTICIPANT_COUNTRIES])
  participantCountry!: MeetingParticipantCountry;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(1, 64)
  participantName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Matches(new RegExp(LAB_MEETING_ROOM_NAME_PATTERN), {
    message:
      "roomName must use lab-<team>-<yyyymmdd>-<slug> and contain only letters, numbers, hyphens, or underscores"
  })
  roomName!: string;
}

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}
