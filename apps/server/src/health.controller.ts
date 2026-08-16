import { Controller, Get } from "@nestjs/common";

interface HealthResponse {
  service: "likelion2026-server";
  status: "ok";
  timestamp: string;
}

@Controller("health")
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      service: "likelion2026-server",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }
}
