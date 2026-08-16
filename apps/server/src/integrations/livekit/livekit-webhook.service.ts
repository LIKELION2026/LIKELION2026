import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  WebhookReceiver,
  type WebhookEvent,
  type WebhookEventNames
} from "livekit-server-sdk";

export interface LiveKitWebhookSummary {
  event: WebhookEventNames;
  id?: string;
  participantIdentity?: string;
  participantName?: string;
  roomName?: string;
  roomSid?: string;
  trackSid?: string;
}

@Injectable()
export class LiveKitWebhookService {
  private readonly receiver: WebhookReceiver;

  constructor(configService: ConfigService) {
    this.receiver = new WebhookReceiver(
      configService.getOrThrow<string>("livekit.apiKey"),
      configService.getOrThrow<string>("livekit.apiSecret")
    );
  }

  async receiveWebhook(
    rawBody: Buffer | undefined,
    authorizationHeader?: string
  ): Promise<LiveKitWebhookSummary> {
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException("LiveKit webhook raw body is required");
    }

    const body = rawBody.toString("utf8");

    try {
      const event = await this.receiver.receive(body, authorizationHeader);

      return summarizeWebhookEvent(event);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException("LiveKit webhook JSON is invalid");
      }

      throw new UnauthorizedException("LiveKit webhook signature is invalid");
    }
  }
}

export function summarizeWebhookEvent(
  event: WebhookEvent
): LiveKitWebhookSummary {
  return {
    event: event.event,
    id: optionalString(event.id),
    participantIdentity: optionalString(event.participant?.identity),
    participantName: optionalString(event.participant?.name),
    roomName: optionalString(event.room?.name),
    roomSid: optionalString(event.room?.sid),
    trackSid: optionalString(event.track?.sid)
  };
}

function optionalString(value: string | undefined): string | undefined {
  if (!value || value.length === 0) {
    return undefined;
  }

  return value;
}
