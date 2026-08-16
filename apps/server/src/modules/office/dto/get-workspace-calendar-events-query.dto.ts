import type { GetWorkspaceCalendarEventsQuery } from "@likelion2026/shared";
import { IsISO8601 } from "class-validator";

export class GetWorkspaceCalendarEventsQueryDto implements GetWorkspaceCalendarEventsQuery {
  @IsISO8601()
  endsAt!: string;

  @IsISO8601()
  startsAt!: string;
}
