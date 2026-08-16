import {
  LAB_MEETING_ROOM_NAME_PATTERN,
  LANGUAGE_CODES,
  PARTICIPANT_IDENTITY_PATTERN,
  type CreateMockSubtitleRequest,
  type LanguageCode,
  type SubtitleSpeaker
} from "@likelion2026/shared";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested
} from "class-validator";

const SUBTITLE_ID_PATTERN = "^[a-zA-Z0-9][a-zA-Z0-9_-]{1,127}$";

export class MockSubtitleSpeakerDto implements SubtitleSpeaker {
  @IsString()
  @Matches(new RegExp(PARTICIPANT_IDENTITY_PATTERN), {
    message:
      "speaker.participantIdentity must contain only letters, numbers, hyphens, or underscores"
  })
  participantIdentity!: string;

  @IsString()
  @Length(1, 64)
  displayName!: string;
}

export class CreateMockSubtitleDto implements CreateMockSubtitleRequest {
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Max(1)
  @Min(0)
  confidence?: number;

  @IsBoolean()
  @IsOptional()
  isFinal?: boolean;

  @IsISO8601({ strict: true })
  @IsOptional()
  occurredAt?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  revision?: number;

  @IsString()
  @Matches(new RegExp(LAB_MEETING_ROOM_NAME_PATTERN), {
    message:
      "roomName must use lab-<team>-<yyyymmdd>-<slug> and contain only letters, numbers, hyphens, or underscores"
  })
  roomName!: string;

  @ValidateNested()
  @Type(() => MockSubtitleSpeakerDto)
  speaker!: MockSubtitleSpeakerDto;

  @IsIn([...LANGUAGE_CODES])
  sourceLanguage!: LanguageCode;

  @IsString()
  @Length(1, 2_000)
  sourceText!: string;

  @IsString()
  @IsOptional()
  @Matches(new RegExp(SUBTITLE_ID_PATTERN), {
    message:
      "subtitleId must start with an alphanumeric character and contain only letters, numbers, hyphens, or underscores"
  })
  subtitleId?: string;

  @IsIn([...LANGUAGE_CODES])
  translatedLanguage!: LanguageCode;

  @IsString()
  @Length(1, 2_000)
  translatedText!: string;
}
