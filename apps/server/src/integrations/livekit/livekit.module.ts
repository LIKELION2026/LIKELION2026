import { Module } from "@nestjs/common";

import { LiveKitTokenService } from "./livekit-token.service";

@Module({
  exports: [LiveKitTokenService],
  providers: [LiveKitTokenService]
})
export class LiveKitModule {}
