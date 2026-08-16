import type { CreateOfficeTodoRequest } from "@likelion2026/shared";
import { IsBoolean, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateOfficeTodoDto implements CreateOfficeTodoRequest {
  @IsString()
  @Matches(/^guest_[a-zA-Z0-9]{16,64}$/)
  guestToken!: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @Length(1, 160)
  title!: string;
}
