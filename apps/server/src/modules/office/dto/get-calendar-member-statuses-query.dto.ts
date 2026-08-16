import { IsISO8601, IsOptional } from "class-validator";

export class GetCalendarMemberStatusesQueryDto {
  @IsISO8601()
  @IsOptional()
  at?: string;
}
