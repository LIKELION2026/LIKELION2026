import { forwardRef, Module } from "@nestjs/common";

import { OfficeModule } from "../office/office.module";
import { OfficeChatTranslationService } from "./office-chat-translation.service";
import { PresenceGateway } from "./presence.gateway";
import { PresenceService } from "./presence.service";

@Module({
  imports: [forwardRef(() => OfficeModule)],
  exports: [PresenceGateway],
  providers: [OfficeChatTranslationService, PresenceGateway, PresenceService]
})
export class PresenceModule {}
