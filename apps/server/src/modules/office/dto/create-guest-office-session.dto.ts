import {
  COUNTRY_CODES,
  LANGUAGE_CODES,
  OFFICE_AVATAR_IDS,
  type CreateGuestOfficeSessionRequest
} from "@likelion2026/shared";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateGuestOfficeSessionDto implements CreateGuestOfficeSessionRequest {
  @IsOptional()
  @IsIn([...OFFICE_AVATAR_IDS])
  avatarId?: CreateGuestOfficeSessionRequest["avatarId"];

  @IsIn([...COUNTRY_CODES])
  countryCode!: CreateGuestOfficeSessionRequest["countryCode"];

  @IsString()
  @Length(1, 40)
  displayName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{12,128}$/)
  guestToken?: string;

  @IsIn([...LANGUAGE_CODES])
  language!: CreateGuestOfficeSessionRequest["language"];
}
