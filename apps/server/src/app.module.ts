import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";

import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { configuration } from "./config/configuration";
import { validateEnvironment } from "./config/environment";
import { HealthController } from "./health.controller";
import { MeetingModule } from "./modules/meeting/meeting.module";
import { PresenceModule } from "./modules/presence/presence.module";

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      envFilePath: ["apps/server/.env.local", "apps/server/.env"],
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment
    }),
    MeetingModule,
    PresenceModule
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    }
  ]
})
export class AppModule {}
