import { Module } from "@nestjs/common";

import { LiveKitModule } from "../../integrations/livekit/livekit.module";
import { OfficeModule } from "../office/office.module";
import { PresenceModule } from "../presence/presence.module";
import { MeetingRealtimeGateway } from "./meeting-realtime.gateway";
import { MeetingController } from "./meeting.controller";
import { MeetingService } from "./meeting.service";

@Module({
  controllers: [MeetingController],
  imports: [LiveKitModule, OfficeModule, PresenceModule],
  providers: [MeetingRealtimeGateway, MeetingService]
})
export class MeetingModule {}
