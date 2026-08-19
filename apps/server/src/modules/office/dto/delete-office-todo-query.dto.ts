import { IsString, Matches } from "class-validator";

export class DeleteOfficeTodoQueryDto {
  @IsString()
  @Matches(/^guest_[a-zA-Z0-9]{16,64}$/)
  guestToken!: string;
}
