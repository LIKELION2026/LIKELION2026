import { TODO_STATUS_VALUES, type UpdateOfficeTodoRequest } from "@likelion2026/shared";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Min } from "class-validator";

export class UpdateOfficeTodoDto implements UpdateOfficeTodoRequest {
  @IsString()
  @Matches(/^guest_[a-zA-Z0-9]{16,64}$/)
  guestToken!: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;

  @IsIn([...TODO_STATUS_VALUES])
  @IsOptional()
  status?: UpdateOfficeTodoRequest["status"];

  @IsString()
  @IsOptional()
  @Length(1, 160)
  title?: string;
}
