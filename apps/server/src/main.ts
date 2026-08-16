import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true
  });
  const configService = app.get(ConfigService);

  app.useBodyParser("json", {
    type: ["application/json", "application/*+json"]
  });
  app.enableCors({
    origin: configService.get<string[] | true>("app.corsOrigins") ?? true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );

  const port = configService.getOrThrow<number>("app.port");
  await app.listen(port);
}

void bootstrap();
