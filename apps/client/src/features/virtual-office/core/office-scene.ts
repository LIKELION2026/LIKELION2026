import Phaser from "phaser";
import {
  MEMBER_STATUS_LABELS,
  type LocalMovementCommand,
  type OfficeMemberPresence,
  type PresenceMovePayload,
} from "@likelion2026/shared";

import {
  DEFAULT_AVATAR_ID,
  getAvatarFrameIndex,
  getAvatarSpriteDefinition,
  getAvatarSpriteDefinitions,
  shouldFlipAvatarSprite,
  type AvatarSpriteDefinition,
} from "./avatar-sprite-definition";
import { isTextEntryFocused } from "../model/keyboard-focus";

export const OFFICE_SCENE_KEY = "office-scene";

const MOCK_OFFICE_MAP_SCALE = 1.5;
const OFFICE_SIZE = {
  height: 544 * MOCK_OFFICE_MAP_SCALE,
  width: 960 * MOCK_OFFICE_MAP_SCALE,
} as const;

const MEETING_ROOM = {
  height: 128 * MOCK_OFFICE_MAP_SCALE,
  width: 128 * MOCK_OFFICE_MAP_SCALE,
  x: 624 * MOCK_OFFICE_MAP_SCALE,
  y: 304 * MOCK_OFFICE_MAP_SCALE,
} as const;

const REMOTE_INTERPOLATION_DELAY_MS = 120;
const MAX_REMOTE_POSITION_SAMPLES = 4;
const MOCK_OFFICE_MAP_TEXTURE_KEY = "mock-office-map";
const MOCK_OFFICE_MAP_ASSET_PATH = "/assets/maps/moyo-lobby.webp";
const CAMERA_VISIBLE_WORLD_RATIO = 0.78;
const CAMERA_MIN_ZOOM = 0.75;
const CAMERA_MAX_ZOOM = 3.2;
const CAMERA_WHEEL_ZOOM_SENSITIVITY = 0.0012;
const AVATAR_DIRECTIONS = ["down", "left", "right", "up"] as const;
const NEARBY_AVATAR_OFFSET = 72;
const AVATAR_POSITION_MARGIN = 48;

interface OfficeSceneCallbacks {
  onLocalMovement: (payload: LocalMovementCommand) => void;
  onMeetingRoomState: (isInside: boolean) => void;
  onReady: () => void;
}

interface RemoteAvatar {
  avatarId: string;
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  positionSamples: RemotePositionSample[];
  sprite: Phaser.GameObjects.Sprite;
}

interface RemotePositionSample {
  receivedAt: number;
  x: number;
  y: number;
}

export class OfficeScene extends Phaser.Scene {
  private readonly callbacks: OfficeSceneCallbacks;
  private cameraZoom: number | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private direction: PresenceMovePayload["direction"] = "down";
  private isFollowingLocalAvatar = true;
  private inMeetingRoom = false;
  private localAvatarId = DEFAULT_AVATAR_ID;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private readonly remoteAvatars = new Map<string, RemoteAvatar>();
  private wasd!: Record<
    "down" | "left" | "right" | "up",
    Phaser.Input.Keyboard.Key
  >;

  constructor(callbacks: OfficeSceneCallbacks) {
    super(OFFICE_SCENE_KEY);
    this.callbacks = callbacks;
  }

  preload(): void {
    this.load.image(MOCK_OFFICE_MAP_TEXTURE_KEY, MOCK_OFFICE_MAP_ASSET_PATH);
    getAvatarSpriteDefinitions().forEach((definition) => {
      this.load.image(definition.textureKey, definition.assetPath);
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#bda79a");
    this.cameras.main.setBounds(0, 0, OFFICE_SIZE.width, OFFICE_SIZE.height);
    this.physics.world.setBounds(0, 0, OFFICE_SIZE.width, OFFICE_SIZE.height);

    this.createAvatarFrames();
    this.createAvatarAnimations();
    this.drawOffice();
    this.createLocalAvatar();
    this.createInput();
    this.syncCameraViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.syncCameraViewport, this);
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      this.handleCameraWheel,
      this,
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.syncCameraViewport, this);
      this.input.off(
        Phaser.Input.Events.POINTER_WHEEL,
        this.handleCameraWheel,
        this,
      );
    });
    this.callbacks.onReady();
  }

  update(): void {
    this.updateLocalMovement();
    this.updateRemoteAvatars();
    this.updateMeetingRoomState();
  }

  setLocalPosition(x: number, y: number): void {
    if (!this.player) {
      return;
    }

    this.player.setPosition(x, y);
    this.playerBody.reset(x, y);
    this.cameras.main.centerOn(x, y);
  }

  setLocalAvatarId(avatarId: string | undefined): void {
    this.localAvatarId = avatarId ?? DEFAULT_AVATAR_ID;
    if (!this.player) {
      return;
    }

    this.player.setTexture(
      getAvatarIdleFrame(this.localAvatarId, this.direction),
    );
    this.playAvatarAnimation(
      this.player,
      this.localAvatarId,
      this.direction,
      "idle",
    );
  }

  focusMember(x: number, y: number): void {
    this.isFollowingLocalAvatar = false;
    this.cameras.main.stopFollow();
    this.cameras.main.pan(x, y, 260, "Quad.easeOut");
  }

  moveLocalAvatarTo(x: number, y: number): void {
    this.isFollowingLocalAvatar = true;
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.player.setPosition(x, y);
    this.playerBody.reset(x, y);
    this.playerBody.setVelocity(0, 0);
    this.playAvatarAnimation(
      this.player,
      this.localAvatarId,
      this.direction,
      "idle",
    );
    this.callbacks.onLocalMovement({
      animation: "idle",
      direction: this.direction,
      x: Math.round(x),
      y: Math.round(y),
    });
  }

  moveLocalAvatarNear(x: number, y: number): void {
    const rightSideX = x + NEARBY_AVATAR_OFFSET;
    const nearbyX =
      rightSideX <= OFFICE_SIZE.width - AVATAR_POSITION_MARGIN
        ? rightSideX
        : x - NEARBY_AVATAR_OFFSET;
    const boundedNearbyX = Phaser.Math.Clamp(
      nearbyX,
      AVATAR_POSITION_MARGIN,
      OFFICE_SIZE.width - AVATAR_POSITION_MARGIN,
    );
    const nearbyY = Phaser.Math.Clamp(
      y,
      AVATAR_POSITION_MARGIN,
      OFFICE_SIZE.height - AVATAR_POSITION_MARGIN,
    );
    this.moveLocalAvatarTo(boundedNearbyX, nearbyY);
  }

  syncRemoteMembers(
    members: OfficeMemberPresence[],
    selfMemberId: string | undefined,
  ): void {
    const desiredMembers = members.filter(
      (member) => member.memberId !== selfMemberId,
    );
    const desiredIds = new Set(desiredMembers.map((member) => member.memberId));

    for (const [memberId, avatar] of this.remoteAvatars) {
      if (!desiredIds.has(memberId)) {
        avatar.container.destroy();
        this.remoteAvatars.delete(memberId);
      }
    }

    desiredMembers.forEach((member) => this.upsertRemoteAvatar(member));
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is unavailable");
    }

    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys(
      {
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        up: Phaser.Input.Keyboard.KeyCodes.W,
      },
      false,
    ) as Record<"down" | "left" | "right" | "up", Phaser.Input.Keyboard.Key>;
    keyboard.disableGlobalCapture();
  }

  private createLocalAvatar(): void {
    this.player = this.physics.add.sprite(
      160,
      264,
      getAvatarIdleFrame(this.localAvatarId, "down"),
    );
    this.player
      .setScale(getAvatarSpriteDefinition(this.localAvatarId).scale)
      .setOrigin(0.5, 0.82)
      .setDepth(3);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(96, 64);
    this.playerBody.setOffset(80, 164);
    this.playAvatarAnimation(this.player, this.localAvatarId, "down", "idle");
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
  }

  private drawOffice(): void {
    this.add
      .image(
        OFFICE_SIZE.width / 2,
        OFFICE_SIZE.height / 2,
        MOCK_OFFICE_MAP_TEXTURE_KEY,
      )
      .setOrigin(0.5)
      .setScale(MOCK_OFFICE_MAP_SCALE)
      .setDepth(0);

    this.add
      .rectangle(
        MEETING_ROOM.x,
        MEETING_ROOM.y,
        MEETING_ROOM.width,
        MEETING_ROOM.height,
        0x315da9,
        0.18,
      )
      .setOrigin(0)
      .setStrokeStyle(2, 0x315da9)
      .setDepth(1);
    this.add
      .text(MEETING_ROOM.x + 18, MEETING_ROOM.y + 16, "MEETING ROOM", {
        color: "#315da9",
        fontFamily: "monospace",
        fontSize: "16px",
        fontStyle: "bold",
      })
      .setDepth(2);
  }

  private syncCameraViewport(): void {
    const responsiveZoom = Math.max(
      2,
      this.scale.width / (OFFICE_SIZE.width * CAMERA_VISIBLE_WORLD_RATIO),
      this.scale.height / (OFFICE_SIZE.height * CAMERA_VISIBLE_WORLD_RATIO),
    );
    this.cameraZoom ??= responsiveZoom;
    this.cameraZoom = Phaser.Math.Clamp(
      this.cameraZoom,
      CAMERA_MIN_ZOOM,
      CAMERA_MAX_ZOOM,
    );
    this.applyCameraZoom();
  }

  private handleCameraWheel(
    _pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void {
    const zoomDelta = Phaser.Math.Clamp(
      -deltaY * CAMERA_WHEEL_ZOOM_SENSITIVITY,
      -0.18,
      0.18,
    );

    if (zoomDelta === 0) {
      return;
    }

    this.cameraZoom = Phaser.Math.Clamp(
      (this.cameraZoom ?? this.cameras.main.zoom) + zoomDelta,
      CAMERA_MIN_ZOOM,
      CAMERA_MAX_ZOOM,
    );
    this.applyCameraZoom();
  }

  private applyCameraZoom(): void {
    this.cameras.main.setZoom(this.cameraZoom ?? this.cameras.main.zoom);

    if (this.player) {
      this.cameras.main.centerOn(this.player.x, this.player.y);
    }
  }

  private updateLocalMovement(): void {
    if (isTextEntryFocused(document.activeElement)) {
      this.playerBody.setVelocity(0, 0);
      this.playAvatarAnimation(
        this.player,
        this.localAvatarId,
        this.direction,
        "idle",
      );
      this.callbacks.onLocalMovement({
        animation: "idle",
        direction: this.direction,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
      });
      return;
    }

    const horizontal =
      Number(this.cursors.right.isDown || this.wasd.right.isDown) -
      Number(this.cursors.left.isDown || this.wasd.left.isDown);
    const vertical =
      Number(this.cursors.down.isDown || this.wasd.down.isDown) -
      Number(this.cursors.up.isDown || this.wasd.up.isDown);
    const isMoving = horizontal !== 0 || vertical !== 0;

    if (isMoving && !this.isFollowingLocalAvatar) {
      this.isFollowingLocalAvatar = true;
      this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    }

    if (horizontal > 0) {
      this.direction = "right";
    } else if (horizontal < 0) {
      this.direction = "left";
    } else if (vertical > 0) {
      this.direction = "down";
    } else if (vertical < 0) {
      this.direction = "up";
    }

    const velocity = new Phaser.Math.Vector2(horizontal, vertical)
      .normalize()
      .scale(190);
    this.playerBody.setVelocity(velocity.x, velocity.y);
    this.playAvatarAnimation(
      this.player,
      this.localAvatarId,
      this.direction,
      isMoving ? "walk" : "idle",
    );
    this.player.setDepth(this.player.y);

    this.callbacks.onLocalMovement({
      animation: isMoving ? "walk" : "idle",
      direction: this.direction,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
    });
  }

  private updateMeetingRoomState(): void {
    const isInside =
      this.player.x >= MEETING_ROOM.x &&
      this.player.x <= MEETING_ROOM.x + MEETING_ROOM.width &&
      this.player.y >= MEETING_ROOM.y &&
      this.player.y <= MEETING_ROOM.y + MEETING_ROOM.height;

    if (isInside === this.inMeetingRoom) {
      return;
    }

    this.inMeetingRoom = isInside;
    this.callbacks.onMeetingRoomState(isInside);
  }

  private updateRemoteAvatars(): void {
    const renderAt = this.time.now - REMOTE_INTERPOLATION_DELAY_MS;

    for (const avatar of this.remoteAvatars.values()) {
      while (
        avatar.positionSamples.length > 1 &&
        avatar.positionSamples[1]!.receivedAt <= renderAt
      ) {
        avatar.positionSamples.shift();
      }

      const current = avatar.positionSamples[0];
      const next = avatar.positionSamples[1];
      if (!current) {
        continue;
      }

      if (next) {
        const elapsed = next.receivedAt - current.receivedAt;
        const progress = Phaser.Math.Clamp(
          (renderAt - current.receivedAt) / Math.max(elapsed, 1),
          0,
          1,
        );
        avatar.container.setPosition(
          Phaser.Math.Linear(current.x, next.x, progress),
          Phaser.Math.Linear(current.y, next.y, progress),
        );
      } else {
        avatar.container.setPosition(current.x, current.y);
      }
      avatar.container.setDepth(avatar.container.y);
    }
  }

  private upsertRemoteAvatar(member: OfficeMemberPresence): void {
    const existing = this.remoteAvatars.get(member.memberId);
    if (existing) {
      if (existing.avatarId !== member.avatarId) {
        existing.container.destroy();
        this.remoteAvatars.delete(member.memberId);
        this.upsertRemoteAvatar(member);
        return;
      }
      this.addRemotePositionSample(existing, member.avatar.x, member.avatar.y);
      this.playAvatarAnimation(
        existing.sprite,
        member.avatarId,
        member.avatar.direction,
        member.avatar.animation,
      );
      existing.label.setText(getRemoteLabel(member));
      existing.container.setAlpha(getRemoteAvatarAlpha(member));
      return;
    }

    const sprite = this.add
      .sprite(
        0,
        0,
        getAvatarIdleFrame(member.avatarId, member.avatar.direction),
      )
      .setScale(getAvatarSpriteDefinition(member.avatarId).scale)
      .setOrigin(0.5, 0.82)
      .setFlipX(
        shouldFlipAvatarSprite(
          member.avatarId,
          member.avatar.direction,
          "idle",
        ),
      );
    const label = this.add
      .text(0, -38, getRemoteLabel(member), {
        align: "center",
        backgroundColor: "#172235cc",
        color: "#ffffff",
        fontFamily: "sans-serif",
        fontSize: "12px",
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5, 1);
    const container = this.add.container(member.avatar.x, member.avatar.y, [
      sprite,
      label,
    ]);
    container.setAlpha(getRemoteAvatarAlpha(member));
    this.playAvatarAnimation(
      sprite,
      member.avatarId,
      member.avatar.direction,
      member.avatar.animation,
    );

    this.remoteAvatars.set(member.memberId, {
      avatarId: member.avatarId,
      container,
      label,
      positionSamples: [
        {
          receivedAt: this.time.now,
          x: member.avatar.x,
          y: member.avatar.y,
        },
      ],
      sprite,
    });
  }

  private addRemotePositionSample(
    avatar: RemoteAvatar,
    x: number,
    y: number,
  ): void {
    const latest = avatar.positionSamples.at(-1);
    if (latest?.x === x && latest.y === y) {
      return;
    }

    avatar.positionSamples.push({ receivedAt: this.time.now, x, y });
    if (avatar.positionSamples.length > MAX_REMOTE_POSITION_SAMPLES) {
      avatar.positionSamples.shift();
    }
  }

  private createAvatarFrames(): void {
    getAvatarSpriteDefinitions().forEach((definition) => {
      const sourceImage = this.textures
        .get(definition.textureKey)
        .getSourceImage() as HTMLCanvasElement | HTMLImageElement;

      definition.frameSources.forEach((source, frame) => {
        const frameKey = getAvatarFrameKey(definition, frame);
        if (this.textures.exists(frameKey)) {
          return;
        }

        const texture = this.textures.createCanvas(
          frameKey,
          source.width,
          source.height,
        );
        if (!texture) {
          throw new Error(`Unable to normalize avatar frame: ${frameKey}`);
        }

        texture.context.drawImage(
          sourceImage,
          source.x,
          source.y,
          source.width,
          source.height,
          0,
          0,
          source.width,
          source.height,
        );

        const bounds = getOpaquePixelBounds(
          texture.context.getImageData(0, 0, source.width, source.height),
        );
        const xOffset = Math.round(
          source.width / 2 - (bounds.left + bounds.width / 2),
        );
        const yOffset = definition.footBaseline - bounds.bottom;

        texture.context.clearRect(0, 0, source.width, source.height);
        texture.context.drawImage(
          sourceImage,
          source.x,
          source.y,
          source.width,
          source.height,
          xOffset,
          yOffset,
          source.width,
          source.height,
        );
        texture.refresh();
      });
    });
  }

  private createAvatarAnimations(): void {
    getAvatarSpriteDefinitions().forEach((definition) => {
      AVATAR_DIRECTIONS.forEach((direction) => {
        const walkKey = getAvatarAnimationKey(definition, direction, "walk");
        if (!this.anims.exists(walkKey)) {
          this.anims.create({
            frameRate: 9,
            frames: definition.walkFramesByDirection[direction].map(
              (frame) => ({
                key: getAvatarFrameKey(definition, frame),
              }),
            ),
            key: walkKey,
            repeat: -1,
          });
        }

        const idleKey = getAvatarAnimationKey(definition, direction, "idle");
        if (!this.anims.exists(idleKey)) {
          this.anims.create({
            frameRate: 1,
            frames: [{ key: getAvatarIdleFrame(definition.id, direction) }],
            key: idleKey,
            repeat: -1,
          });
        }
      });
    });
  }

  private playAvatarAnimation(
    sprite: Phaser.GameObjects.Sprite,
    avatarId: string | undefined,
    direction: PresenceMovePayload["direction"],
    animation: PresenceMovePayload["animation"],
  ): void {
    const definition = getAvatarSpriteDefinition(avatarId);
    sprite.setScale(definition.scale);
    sprite.setFlipX(shouldFlipAvatarSprite(avatarId, direction, animation));
    sprite.anims.play(
      getAvatarAnimationKey(definition, direction, animation),
      true,
    );
  }
}

function getOpaquePixelBounds(imageData: ImageData): {
  bottom: number;
  left: number;
  width: number;
} {
  const { data, height, width } = imageData;
  let left = width;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha === 0) {
        continue;
      }

      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right === -1 || bottom === -1) {
    throw new Error("Avatar frame has no visible pixels.");
  }

  return { bottom, left, width: right - left + 1 };
}

function getAvatarIdleFrame(
  avatarId: string | undefined,
  direction: PresenceMovePayload["direction"],
): string {
  const definition = getAvatarSpriteDefinition(avatarId);
  return getAvatarFrameKey(
    definition,
    getAvatarFrameIndex(definition, direction, "idle"),
  );
}

function getAvatarFrameKey(
  definition: AvatarSpriteDefinition,
  frame: number,
): string {
  return `${definition.id}-frame-${frame}`;
}

function getAvatarAnimationKey(
  definition: AvatarSpriteDefinition,
  direction: PresenceMovePayload["direction"],
  animation: PresenceMovePayload["animation"],
): string {
  return `${definition.id}-${animation}-${direction}`;
}

function getRemoteLabel(member: OfficeMemberPresence): string {
  const displayMode = member.officePresence?.displayMode;
  const detail =
    displayMode === "ghost"
      ? "연결 해제"
      : displayMode === "sleeping"
        ? "퇴근"
        : MEMBER_STATUS_LABELS[member.status];
  return `${member.displayName}\n${detail}`;
}

function getRemoteAvatarAlpha(member: OfficeMemberPresence): number {
  const displayMode = member.officePresence?.displayMode;
  return displayMode === "ghost" || displayMode === "sleeping" ? 0.45 : 1;
}
