import {
  AVAILABILITY_STATUS_VALUES,
  type UpdateOfficePresenceRequest
} from "@likelion2026/shared";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min
} from "class-validator";

export class UpdateOfficePresenceDto implements UpdateOfficePresenceRequest {
  @IsOptional()
  @IsIn([...AVAILABILITY_STATUS_VALUES])
  availabilityStatus?: UpdateOfficePresenceRequest["availabilityStatus"];

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{12,128}$/)
  guestToken!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4096)
  positionX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4096)
  positionY?: number;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  statusMessage?: string;
}
