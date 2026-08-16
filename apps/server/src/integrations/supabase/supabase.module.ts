import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_CLIENT } from "./supabase.constants";

@Module({
  exports: [SUPABASE_CLIENT],
  providers: [
    {
      inject: [ConfigService],
      provide: SUPABASE_CLIENT,
      useFactory: (configService: ConfigService) => {
        return createClient(
          configService.getOrThrow<string>("supabase.url"),
          configService.getOrThrow<string>("supabase.secretKey"),
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );
      }
    }
  ]
})
export class SupabaseModule {}
