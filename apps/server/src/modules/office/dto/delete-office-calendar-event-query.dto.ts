import { IsString, Matches } from "class-validator";

export class DeleteOfficeCalendarEventQueryDto {
  @IsString()
  @Matches(/^guest_[a-zA-Z0-9]{16,64}$/)
  guestToken!: string;
}
