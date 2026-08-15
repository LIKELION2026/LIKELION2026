import {
  CreateMeetingTokenRequest,
  LAB_MEETING_ROOM_NAME_PATTERN,
  LANGUAGE_CODES,
  PARTICIPANT_IDENTITY_PATTERN,
  type LanguageCode
} from "@likelion2026/shared";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateMeetingTokenDto implements CreateMeetingTokenRequest {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @Matches(new RegExp(PARTICIPANT_IDENTITY_PATTERN), {
    message:
      "participantIdentity must start with an alphanumeric character and contain only letters, numbers, hyphens, or underscores"
  })
  @IsOptional()
  participantIdentity?: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(1, 64)
  participantName!: string;

  @IsIn([...LANGUAGE_CODES])
  @IsOptional()
  preferredLanguage?: LanguageCode;

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
