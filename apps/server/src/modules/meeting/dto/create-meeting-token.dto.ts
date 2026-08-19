import {
  CreateMeetingTokenRequest,
  LAB_MEETING_ROOM_NAME_PATTERN,
  MEETING_PARTICIPANT_COUNTRIES,
  MEETING_TRANSLATION_LANGUAGE_CODES,
  PARTICIPANT_IDENTITY_PATTERN,
  type MeetingParticipantCountry,
  type MeetingTranslationLanguageCode,
  type MeetingTranslationPreference
} from "@likelion2026/shared";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested
} from "class-validator";

export class MeetingTranslationPreferenceDto
  implements MeetingTranslationPreference
{
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @IsISO8601()
  activatedAt?: string;

  @IsBoolean()
  enabled!: boolean;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsIn([...MEETING_TRANSLATION_LANGUAGE_CODES])
  sourceLanguage!: MeetingTranslationLanguageCode;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsIn([...MEETING_TRANSLATION_LANGUAGE_CODES])
  targetLanguage!: MeetingTranslationLanguageCode;
}

export class CreateMeetingTokenDto implements CreateMeetingTokenRequest {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsIn([...MEETING_PARTICIPANT_COUNTRIES])
  participantCountry!: MeetingParticipantCountry;

  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @Matches(new RegExp(PARTICIPANT_IDENTITY_PATTERN), {
    message:
      "participantIdentity must start with an alphanumeric character and contain only letters, numbers, hyphens, or underscores"
  })
  participantIdentity?: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(1, 64)
  participantName!: string;

  @Type(() => MeetingTranslationPreferenceDto)
  @IsOptional()
  @ValidateNested()
  translationPreference?: MeetingTranslationPreferenceDto;

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

function trimOptionalString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}
