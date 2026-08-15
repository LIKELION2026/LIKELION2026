import { Module } from "@nestjs/common";

import { PresenceGateway } from "./presence.gateway";
import { PresenceService } from "./presence.service";

@Module({
  providers: [PresenceGateway, PresenceService]
})
export class PresenceModule {}
