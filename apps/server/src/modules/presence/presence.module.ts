import { Module } from "@nestjs/common";

import { OfficeModule } from "../office/office.module";
import { PresenceGateway } from "./presence.gateway";
import { PresenceService } from "./presence.service";

@Module({
  imports: [OfficeModule],
  providers: [PresenceGateway, PresenceService]
})
export class PresenceModule {}
