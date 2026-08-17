import { forwardRef, Module } from "@nestjs/common";

import { SupabaseModule } from "../../integrations/supabase/supabase.module";
import { PresenceModule } from "../presence/presence.module";
import { OfficeController } from "./office.controller";
import { OfficeService } from "./office.service";

@Module({
  controllers: [OfficeController],
  imports: [SupabaseModule, forwardRef(() => PresenceModule)],
  exports: [OfficeService],
  providers: [OfficeService]
})
export class OfficeModule {}
