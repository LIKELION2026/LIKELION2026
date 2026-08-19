import Phaser from "phaser";
import {
  type LocalMovementCommand,
  type OfficeMemberPresence,
  type PresenceMovePayload,
} from "@likelion2026/shared";

import {
  DEFAULT_AVATAR_ID,
  getAvatarFrameIndex,
  getRequiredAvatarFrameIndices,
  getAvatarSpriteDefinition,
  getAvatarSpriteDefinitions,
  shouldFlipAvatarSprite,
  type AvatarSpriteDefinition,
} from "./avatar-sprite-definition";
import { removeNearTransparentPixels } from "./avatar-pixel-normalizer";
import {
  getCalendarPresenceLabel,
  shouldDimCalendarPresence,
} from "../model/calendar-presence";
import {
  getNearestWalkableOfficePosition,
  isOfficeCollisionDebugEnabled,
  OFFICE_COLLISION_AREAS,
  OFFICE_WALKABLE_BOUNDS,
} from "../model/office-collision";
import { OFFICE_MAP, OFFICE_MAP_MEETING_ZONES } from "../model/office-map";
import type { OfficeSceneBootstrap } from "../model/office-scene-bootstrap";
import { isTextEntryFocused } from "../model/keyboard-focus";

export const OFFICE_SCENE_KEY = "office-scene";

const OFFICE_SIZE = {
  height: OFFICE_MAP.height,
  width: OFFICE_MAP.width,
} as const;

const REMOTE_INTERPOLATION_DELAY_MS = 120;
const MAX_REMOTE_POSITION_SAMPLES = 4;
const CAMERA_VISIBLE_WORLD_RATIO = 0.78;
const CAMERA_DEFAULT_ZOOM = 0.6;
const CAMERA_MIN_ZOOM = 0.45;
const CAMERA_MAX_ZOOM = 3.2;
const CAMERA_WHEEL_ZOOM_SENSITIVITY = 0.0012;
const AVATAR_MOVE_SPEED = 460;
const AVATAR_DIRECTIONS = ["down", "left", "right", "up"] as const;
const NEARBY_AVATAR_OFFSET = 72;
const AVATAR_POSITION_MARGIN = 48;

interface OfficeSceneCallbacks {
  initialAvatar: OfficeSceneBootstrap;
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
  private collisionDebugEnabled = false;
  private readonly collisionDebugVisuals: Array<
    Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text
  > = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private direction: PresenceMovePayload["direction"] = "down";
  private isFollowingLocalAvatar = true;
  private inMeetingRoom = false;
  private isSitting = false;
  private localAvatarId: string = DEFAULT_AVATAR_ID;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private readonly remoteAvatars = new Map<string, RemoteAvatar>();
  private wasd!: Record<
    "down" | "left" | "right" | "up",
    Phaser.Input.Keyboard.Key
  >;
  private sitToggle!: Phaser.Input.Keyboard.Key;
  private collisionDebugToggle!: Phaser.Input.Keyboard.Key;

  constructor(callbacks: OfficeSceneCallbacks) {
    super(OFFICE_SCENE_KEY);
    this.callbacks = callbacks;
  }

  preload(): void {
    this.load.image(OFFICE_MAP.textureKey, OFFICE_MAP.assetPath);
    getAvatarSpriteDefinitions().forEach((definition) => {
      this.load.image(definition.textureKey, definition.assetPath);
      this.load.image(definition.sitTextureKey, definition.sitAssetPath);
    });
  }

  create(): void {
    this.collisionDebugEnabled = isOfficeCollisionDebugEnabled(window.location.search);
    this.cameras.main.setBackgroundColor("#111216");
    this.cameras.main.setBounds(0, 0, OFFICE_SIZE.width, OFFICE_SIZE.height);
    this.physics.world.setBounds(
      OFFICE_WALKABLE_BOUNDS.x,
      OFFICE_WALKABLE_BOUNDS.y,
      OFFICE_WALKABLE_BOUNDS.width,
      OFFICE_WALKABLE_BOUNDS.height,
    );

    this.createAvatarFrames();
    this.createAvatarAnimations();
    this.drawOffice();
    this.createLocalAvatar();
    this.createOfficeColliders();
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

    const position = getNearestWalkableOfficePosition({ x, y });
    this.player.setPosition(position.x, position.y);
    this.playerBody.reset(position.x, position.y);
    this.cameras.main.centerOn(position.x, position.y);

    if (position.x !== x || position.y !== y) {
      this.callbacks.onLocalMovement({
        animation: "idle",
        direction: this.direction,
        x: Math.round(position.x),
        y: Math.round(position.y),
      });
    }
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
    const position = getNearestWalkableOfficePosition({ x, y });
    this.player.setPosition(position.x, position.y);
    this.playerBody.reset(position.x, position.y);
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
      x: Math.round(position.x),
      y: Math.round(position.y),
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
    this.sitToggle = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.collisionDebugToggle = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
    keyboard.disableGlobalCapture();
  }

  private createLocalAvatar(): void {
    const initialAvatar = this.callbacks.initialAvatar;
    this.direction = initialAvatar.direction;
    this.player = this.physics.add.sprite(
      initialAvatar.x,
      initialAvatar.y,
      getAvatarIdleFrame(this.localAvatarId, initialAvatar.direction),
    );
    this.player
      .setScale(getAvatarSpriteDefinition(this.localAvatarId).scale)
      .setOrigin(0.5, 0.82)
      .setDepth(3);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(96, 64);
    this.playerBody.setOffset(80, 164);
    this.playAvatarAnimation(
      this.player,
      this.localAvatarId,
      initialAvatar.direction,
      "idle",
    );
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
  }

  private createOfficeColliders(): void {
    const obstacles = OFFICE_COLLISION_AREAS.map((area) => {
      const obstacle = this.add.zone(
        area.x + area.width / 2,
        area.y + area.height / 2,
        area.width,
        area.height,
      );
      this.physics.add.existing(obstacle, true);
      this.createCollisionDebugVisual(area);
      return obstacle;
    });

    this.physics.add.collider(this.player, obstacles);
  }

  private createCollisionDebugVisual(area: {
    height: number;
    id: string;
    width: number;
    x: number;
    y: number;
  }): void {
    const centerX = area.x + area.width / 2;
    const centerY = area.y + area.height / 2;
    const zone = this.add
      .rectangle(centerX, centerY, area.width, area.height, 0xef4444, 0.18)
      .setStrokeStyle(3, 0xef4444, 0.9)
      .setDepth(4)
      .setVisible(this.collisionDebugEnabled);
    const label = this.add
      .text(centerX, centerY, area.id, {
        align: "center",
        backgroundColor: "#7f1d1dcc",
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "15px",
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(this.collisionDebugEnabled);

    this.collisionDebugVisuals.push(zone, label);
  }

  private drawOffice(): void {
    // Keep the detailed Figma map smooth while avatar sheets stay pixel-sharp.
    this.textures
      .get(OFFICE_MAP.textureKey)
      .setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.add
      .image(
        OFFICE_SIZE.width / 2,
        OFFICE_SIZE.height / 2,
        OFFICE_MAP.textureKey,
      )
      .setOrigin(0.5)
      .setDepth(0);
  }

  private syncCameraViewport(): void {
    const responsiveZoom = Math.max(
      CAMERA_DEFAULT_ZOOM,
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
        this.isSitting ? "sit" : "idle",
      );
      this.callbacks.onLocalMovement({
        animation: this.isSitting ? "sit" : "idle",
        direction: this.direction,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
      });
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.collisionDebugToggle)) {
      this.collisionDebugEnabled = !this.collisionDebugEnabled;
      this.collisionDebugVisuals.forEach((visual) => {
        visual.setVisible(this.collisionDebugEnabled);
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.sitToggle)) {
      this.isSitting = !this.isSitting;
      if (this.isSitting) {
        // A movement key can still be held when C is pressed.
        this.resetMovementKeys();
      }
    }

    const horizontal =
      Number(this.cursors.right.isDown || this.wasd.right.isDown) -
      Number(this.cursors.left.isDown || this.wasd.left.isDown);
    const vertical =
      Number(this.cursors.down.isDown || this.wasd.down.isDown) -
      Number(this.cursors.up.isDown || this.wasd.up.isDown);
    const isMoving = horizontal !== 0 || vertical !== 0;

    if (isMoving) {
      this.isSitting = false;
    }

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

    if (this.isSitting) {
      this.playerBody.setVelocity(0, 0);
      this.playAvatarAnimation(
        this.player,
        this.localAvatarId,
        this.direction,
        "sit",
      );
      this.player.setDepth(this.player.y);
      this.callbacks.onLocalMovement({
        animation: "sit",
        direction: this.direction,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
      });
      return;
    }

    const velocity = new Phaser.Math.Vector2(horizontal, vertical)
      .normalize()
      .scale(AVATAR_MOVE_SPEED);
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
    const isInside = OFFICE_MAP_MEETING_ZONES.some(
      (zone) =>
        this.player.x >= zone.x &&
        this.player.x <= zone.x + zone.width &&
        this.player.y >= zone.y &&
        this.player.y <= zone.y + zone.height,
    );

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
      const walkSourceImage = this.textures
        .get(definition.textureKey)
        .getSourceImage() as HTMLCanvasElement | HTMLImageElement;
      const sitSourceImage = this.textures
        .get(definition.sitTextureKey)
        .getSourceImage() as HTMLCanvasElement | HTMLImageElement;

      this.createAvatarFramesFromSource(
        definition,
        definition.textureKey,
        walkSourceImage,
        getRequiredAvatarFrameIndices(definition),
      );
      this.createAvatarFramesFromSource(
        definition,
        definition.sitTextureKey,
        sitSourceImage,
        getRequiredAvatarFrameIndices(definition, "sit"),
      );
    });
  }

  private createAvatarFramesFromSource(
    definition: AvatarSpriteDefinition,
    textureKey: string,
    sourceImage: HTMLCanvasElement | HTMLImageElement,
    requiredFrames: readonly number[],
  ): void {
    requiredFrames.forEach((frame) => {
      const source = definition.frameSources[frame]!;
      const frameKey = getAvatarFrameKey(definition, frame, textureKey);
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

      const imageData = texture.context.getImageData(
        0,
        0,
        source.width,
        source.height,
      );
      const normalizedImageData = new ImageData(
        removeNearTransparentPixels(imageData.data),
        imageData.width,
        imageData.height,
      );
      const bounds = getOpaquePixelBounds(normalizedImageData);
      const xOffset = Math.round(
        source.width / 2 - (bounds.left + bounds.width / 2),
      );
      const yOffset = definition.footBaseline - bounds.bottom;

      texture.context.clearRect(0, 0, source.width, source.height);
      texture.context.putImageData(normalizedImageData, xOffset, yOffset);
      texture.refresh();
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

        const sitKey = getAvatarAnimationKey(definition, direction, "sit");
        if (!this.anims.exists(sitKey)) {
          this.anims.create({
            frameRate: 1,
            frames: [
              {
                key: getAvatarFrameKey(
                  definition,
                  definition.sitFramesByDirection[direction][0]!,
                  definition.sitTextureKey,
                ),
              },
            ],
            key: sitKey,
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

  private resetMovementKeys(): void {
    this.cursors.down.reset();
    this.cursors.left.reset();
    this.cursors.right.reset();
    this.cursors.up.reset();
    this.wasd.down.reset();
    this.wasd.left.reset();
    this.wasd.right.reset();
    this.wasd.up.reset();
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
  textureKey = definition.textureKey,
): string {
  return `${textureKey}-${definition.id}-frame-${frame}`;
}

function getAvatarAnimationKey(
  definition: AvatarSpriteDefinition,
  direction: PresenceMovePayload["direction"],
  animation: PresenceMovePayload["animation"],
): string {
  return `${definition.id}-${animation}-${direction}`;
}

function getRemoteLabel(member: OfficeMemberPresence): string {
  return `${member.displayName}\n${getCalendarPresenceLabel(member)}`;
}

function getRemoteAvatarAlpha(member: OfficeMemberPresence): number {
  return shouldDimCalendarPresence(member) ? 0.45 : 1;
}
