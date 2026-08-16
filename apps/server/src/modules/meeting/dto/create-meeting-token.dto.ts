import {
  CreateMeetingTokenRequest,
  LANGUAGE_CODES,
  MEETING_ROOM_NAME_PATTERN,
  PARTICIPANT_IDENTITY_PATTERN,
  type LanguageCode
} from "@likelion2026/shared";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateMeetingTokenDto implements CreateMeetingTokenRequest {
  @IsString()
  @Matches(new RegExp(PARTICIPANT_IDENTITY_PATTERN), {
    message:
      "participantIdentity must start with an alphanumeric character and contain only letters, numbers, hyphens, or underscores"
  })
  @IsOptional()
  participantIdentity?: string;

  @IsString()
  @Length(1, 64)
  participantName!: string;

  @IsIn([...LANGUAGE_CODES])
  @IsOptional()
  preferredLanguage?: LanguageCode;

  @IsString()
  @Matches(new RegExp(MEETING_ROOM_NAME_PATTERN), {
    message:
      "roomName must start with an alphanumeric character and contain only letters, numbers, hyphens, or underscores"
  })
  roomName!: string;
}
