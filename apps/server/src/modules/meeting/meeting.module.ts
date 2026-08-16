import { Module } from "@nestjs/common";

import { LiveKitModule } from "../../integrations/livekit/livekit.module";
import { MeetingController } from "./meeting.controller";
import { MeetingService } from "./meeting.service";

@Module({
  controllers: [MeetingController],
  imports: [LiveKitModule],
  providers: [MeetingService]
})
export class MeetingModule {}
