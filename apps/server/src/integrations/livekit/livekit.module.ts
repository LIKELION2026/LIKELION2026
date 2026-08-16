import { Module } from "@nestjs/common";

import { LiveKitTokenService } from "./livekit-token.service";
import { LiveKitWebhookService } from "./livekit-webhook.service";

@Module({
  exports: [LiveKitTokenService, LiveKitWebhookService],
  providers: [LiveKitTokenService, LiveKitWebhookService]
})
export class LiveKitModule {}
