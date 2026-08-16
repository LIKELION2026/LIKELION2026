import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../integrations/supabase/supabase.module";
import { OfficeController } from "./office.controller";
import { OfficeService } from "./office.service";

@Module({
  controllers: [OfficeController],
  imports: [SupabaseModule],
  exports: [OfficeService],
  providers: [OfficeService]
})
export class OfficeModule {}
