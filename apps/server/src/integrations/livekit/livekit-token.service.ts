import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccessToken, TrackSource, type VideoGrant } from "livekit-server-sdk";

interface CreateRoomJoinTokenInput {
  attributes?: Record<string, string>;
  participantIdentity: string;
  participantName: string;
  roomName: string;
}

interface RoomJoinTokenResult {
  expiresAt: string;
  token: string;
}

@Injectable()
export class LiveKitTokenService {
  constructor(private readonly configService: ConfigService) {}

  get serverUrl(): string {
    return this.configService.getOrThrow<string>("livekit.url");
  }

  get tokenTtlSeconds(): number {
    return this.configService.getOrThrow<number>("livekit.tokenTtlSeconds");
  }

  async createRoomJoinToken(
    input: CreateRoomJoinTokenInput
  ): Promise<RoomJoinTokenResult> {
    const ttl = this.tokenTtlSeconds;
    const accessToken = new AccessToken(
      this.configService.getOrThrow<string>("livekit.apiKey"),
      this.configService.getOrThrow<string>("livekit.apiSecret"),
      {
        attributes: input.attributes,
        identity: input.participantIdentity,
        name: input.participantName,
        ttl
      }
    );
    const videoGrant: VideoGrant = {
      canPublish: true,
      canPublishData: true,
      canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE],
      canSubscribe: true,
      room: input.roomName,
      roomJoin: true
    };

    accessToken.addGrant(videoGrant);

    return {
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      token: await accessToken.toJwt()
    };
  }
}
