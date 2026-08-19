import {
  LAB_MEETING_ROOM_NAME_PATTERN,
  PARTICIPANT_IDENTITY_PATTERN,
  type SubmitMeetingSummaryRequest
} from "@likelion2026/shared";
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsString,
  Length,
  Matches
} from "class-validator";

export class SubmitMeetingSummaryDto implements SubmitMeetingSummaryRequest {
  @IsISO8601()
  endsAt!: string;

  @ArrayMinSize(1)
  @IsArray()
  @IsString({ each: true })
  @Matches(new RegExp(PARTICIPANT_IDENTITY_PATTERN), {
    each: true,
    message:
      "everParticipantIdentities must contain only letters, numbers, hyphens, or underscores"
  })
  everParticipantIdentities!: string[];

  @IsString()
  @Matches(new RegExp(LAB_MEETING_ROOM_NAME_PATTERN), {
    message:
      "roomName must use lab-<team>-<yyyymmdd>-<slug> and contain only letters, numbers, hyphens, or underscores"
  })
  roomName!: string;

  @IsISO8601()
  startsAt!: string;

  @IsString()
  @Length(1, 20_000)
  summaryKo!: string;

  @IsString()
  @Length(1, 20_000)
  summaryVi!: string;
}
