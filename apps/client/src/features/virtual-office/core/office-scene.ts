import Phaser from "phaser";
import {
  MEMBER_STATUS_LABELS,
  type OfficeMemberPresence,
  type PresenceMovePayload
} from "@likelion2026/shared";

export const OFFICE_SCENE_KEY = "office-scene";

const MOCK_OFFICE_MAP_SCALE = 1.5;
const OFFICE_SIZE = {
  height: 544 * MOCK_OFFICE_MAP_SCALE,
  width: 960 * MOCK_OFFICE_MAP_SCALE
} as const;

const MEETING_ROOM = {
  height: 128 * MOCK_OFFICE_MAP_SCALE,
  width: 128 * MOCK_OFFICE_MAP_SCALE,
  x: 624 * MOCK_OFFICE_MAP_SCALE,
  y: 304 * MOCK_OFFICE_MAP_SCALE
} as const;

const REMOTE_INTERPOLATION_DELAY_MS = 120;
const MAX_REMOTE_POSITION_SAMPLES = 4;
const AVATAR_TEXTURE_KEY = "office-avatar";
const AVATAR_ASSET_PATH = "/assets/image.png";
const MOCK_OFFICE_MAP_TEXTURE_KEY = "mock-office-map";
const MOCK_OFFICE_MAP_ASSET_PATH = "/assets/maps/moyo-lobby.webp";
const AVATAR_FRAME_SIZE = 256;
const AVATAR_FRAME_BORDER_TRIM = 2;
const AVATAR_FRAME_CONTENT_SIZE = AVATAR_FRAME_SIZE - AVATAR_FRAME_BORDER_TRIM * 2;
const AVATAR_SHEET_COLUMNS = 6;
const AVATAR_DISPLAY_SCALE = 0.16;
const CAMERA_VISIBLE_WORLD_RATIO = 0.78;
const CAMERA_MIN_ZOOM = 0.75;
const CAMERA_MAX_ZOOM = 3.2;
const CAMERA_WHEEL_ZOOM_SENSITIVITY = 0.0012;
const AVATAR_IDLE_FRAME_BY_DIRECTION = {
  down: 0,
  left: 2,
  right: 2,
  up: 1
} as const;
const AVATAR_WALK_FRAMES_BY_DIRECTION = {
  down: [6, 7, 8, 9, 10, 11],
  left: [18, 19, 20, 21, 22, 23],
  right: [18, 19, 20, 21, 22, 23],
  up: [12, 13, 14, 15, 16, 17]
} as const;
const AVATAR_DIRECTIONS = ["down", "left", "right", "up"] as const;

interface OfficeSceneCallbacks {
  onLocalMovement: (payload: PresenceMovePayload) => void;
  onMeetingRoomState: (isInside: boolean) => void;
  onReady: () => void;
}

interface RemoteAvatar {
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
  private inMeetingRoom = false;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private readonly remoteAvatars = new Map<string, RemoteAvatar>();
  private wasd!: Record<"down" | "left" | "right" | "up", Phaser.Input.Keyboard.Key>;

  constructor(callbacks: OfficeSceneCallbacks) {
    super(OFFICE_SCENE_KEY);
    this.callbacks = callbacks;
  }

  preload(): void {
    this.load.image(MOCK_OFFICE_MAP_TEXTURE_KEY, MOCK_OFFICE_MAP_ASSET_PATH);
    this.load.image(AVATAR_TEXTURE_KEY, AVATAR_ASSET_PATH);
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
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.handleCameraWheel, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.syncCameraViewport, this);
      this.input.off(Phaser.Input.Events.POINTER_WHEEL, this.handleCameraWheel, this);
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

  syncRemoteMembers(members: OfficeMemberPresence[], selfMemberId: string | undefined): void {
    const desiredMembers = members.filter((member) => member.memberId !== selfMemberId);
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
    this.wasd = keyboard.addKeys({
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W
    }) as Record<"down" | "left" | "right" | "up", Phaser.Input.Keyboard.Key>;
  }

  private createLocalAvatar(): void {
    this.player = this.physics.add.sprite(
      160,
      264,
      AVATAR_TEXTURE_KEY,
      getAvatarIdleFrame("down")
    );
    this.player.setScale(AVATAR_DISPLAY_SCALE).setOrigin(0.5, 0.82).setDepth(3);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(96, 64);
    this.playerBody.setOffset(80, 164);
    this.playAvatarAnimation(this.player, "down", "idle");
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
  }

  private drawOffice(): void {
    this.add
      .image(OFFICE_SIZE.width / 2, OFFICE_SIZE.height / 2, MOCK_OFFICE_MAP_TEXTURE_KEY)
      .setOrigin(0.5)
      .setScale(MOCK_OFFICE_MAP_SCALE)
      .setDepth(0);

    this.add
      .rectangle(MEETING_ROOM.x, MEETING_ROOM.y, MEETING_ROOM.width, MEETING_ROOM.height, 0x315da9, 0.18)
      .setOrigin(0)
      .setStrokeStyle(2, 0x315da9)
      .setDepth(1);
    this.add
      .text(MEETING_ROOM.x + 18, MEETING_ROOM.y + 16, "MEETING ROOM", {
        color: "#315da9",
        fontFamily: "monospace",
        fontSize: "16px",
        fontStyle: "bold"
      })
      .setDepth(2);
  }

  private syncCameraViewport(): void {
    const responsiveZoom = Math.max(
      1.35,
      this.scale.width / (OFFICE_SIZE.width * CAMERA_VISIBLE_WORLD_RATIO),
      this.scale.height / (OFFICE_SIZE.height * CAMERA_VISIBLE_WORLD_RATIO)
    );
    this.cameraZoom ??= responsiveZoom;
    this.cameraZoom = Phaser.Math.Clamp(this.cameraZoom, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
    this.applyCameraZoom();
  }

  private handleCameraWheel(
    _pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number
  ): void {
    const zoomDelta = Phaser.Math.Clamp(
      -deltaY * CAMERA_WHEEL_ZOOM_SENSITIVITY,
      -0.18,
      0.18
    );

    if (zoomDelta === 0) {
      return;
    }

    this.cameraZoom = Phaser.Math.Clamp(
      (this.cameraZoom ?? this.cameras.main.zoom) + zoomDelta,
      CAMERA_MIN_ZOOM,
      CAMERA_MAX_ZOOM
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
    const horizontal = Number(this.cursors.right.isDown || this.wasd.right.isDown) - Number(this.cursors.left.isDown || this.wasd.left.isDown);
    const vertical = Number(this.cursors.down.isDown || this.wasd.down.isDown) - Number(this.cursors.up.isDown || this.wasd.up.isDown);
    const isMoving = horizontal !== 0 || vertical !== 0;

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
    this.playAvatarAnimation(this.player, this.direction, isMoving ? "walk" : "idle");
    this.player.setDepth(this.player.y);

    this.callbacks.onLocalMovement({
      animation: isMoving ? "walk" : "idle",
      direction: this.direction,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y)
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
          1
        );
        avatar.container.setPosition(
          Phaser.Math.Linear(current.x, next.x, progress),
          Phaser.Math.Linear(current.y, next.y, progress)
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
      this.addRemotePositionSample(existing, member.avatar.x, member.avatar.y);
      this.playAvatarAnimation(existing.sprite, member.avatar.direction, member.avatar.animation);
      existing.label.setText(getRemoteLabel(member));
      existing.container.setAlpha(getRemoteAvatarAlpha(member));
      return;
    }

    const sprite = this.add
      .sprite(0, 0, AVATAR_TEXTURE_KEY, getAvatarIdleFrame(member.avatar.direction))
      .setScale(AVATAR_DISPLAY_SCALE)
      .setOrigin(0.5, 0.82)
      .setFlipX(member.avatar.direction === "left");
    const label = this.add
      .text(0, -38, getRemoteLabel(member), {
        align: "center",
        backgroundColor: "#172235cc",
        color: "#ffffff",
        fontFamily: "sans-serif",
        fontSize: "12px",
        padding: { x: 5, y: 3 }
      })
      .setOrigin(0.5, 1);
    const container = this.add.container(member.avatar.x, member.avatar.y, [sprite, label]);
    container.setAlpha(getRemoteAvatarAlpha(member));
    this.playAvatarAnimation(sprite, member.avatar.direction, member.avatar.animation);

    this.remoteAvatars.set(member.memberId, {
      container,
      label,
      positionSamples: [
        {
          receivedAt: this.time.now,
          x: member.avatar.x,
          y: member.avatar.y
        }
      ],
      sprite
    });
  }

  private addRemotePositionSample(avatar: RemoteAvatar, x: number, y: number): void {
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
    const texture = this.textures.get(AVATAR_TEXTURE_KEY);
    const frameCount = AVATAR_SHEET_COLUMNS * 4;

    for (let frame = 0; frame < frameCount; frame += 1) {
      const column = frame % AVATAR_SHEET_COLUMNS;
      const row = Math.floor(frame / AVATAR_SHEET_COLUMNS);
      const frameKey = getAvatarFrameKey(frame);

      if (!texture.has(frameKey)) {
        texture.add(
          frameKey,
          0,
          column * AVATAR_FRAME_SIZE + AVATAR_FRAME_BORDER_TRIM,
          row * AVATAR_FRAME_SIZE + AVATAR_FRAME_BORDER_TRIM,
          AVATAR_FRAME_CONTENT_SIZE,
          AVATAR_FRAME_CONTENT_SIZE
        );
      }
    }
  }

  private createAvatarAnimations(): void {
    for (const direction of AVATAR_DIRECTIONS) {
      const walkKey = getAvatarAnimationKey(direction, "walk");
      if (!this.anims.exists(walkKey)) {
        this.anims.create({
          frameRate: 9,
          frames: AVATAR_WALK_FRAMES_BY_DIRECTION[direction].map((frame) => ({
            frame: getAvatarFrameKey(frame),
            key: AVATAR_TEXTURE_KEY
          })),
          key: walkKey,
          repeat: -1
        });
      }

      const idleKey = getAvatarAnimationKey(direction, "idle");
      if (!this.anims.exists(idleKey)) {
        this.anims.create({
          frameRate: 1,
          frames: [
            {
              frame: getAvatarIdleFrame(direction),
              key: AVATAR_TEXTURE_KEY
            }
          ],
          key: idleKey,
          repeat: -1
        });
      }
    }
  }

  private playAvatarAnimation(
    sprite: Phaser.GameObjects.Sprite,
    direction: PresenceMovePayload["direction"],
    animation: PresenceMovePayload["animation"]
  ): void {
    sprite.setFlipX(shouldFlipAvatarSprite(direction, animation));
    sprite.anims.play(getAvatarAnimationKey(direction, animation), true);
  }
}

function getAvatarIdleFrame(direction: PresenceMovePayload["direction"]): string {
  return getAvatarFrameKey(AVATAR_IDLE_FRAME_BY_DIRECTION[direction]);
}

function getAvatarFrameKey(frame: number): string {
  return `office-avatar-frame-${frame}`;
}

function shouldFlipAvatarSprite(
  direction: PresenceMovePayload["direction"],
  animation: PresenceMovePayload["animation"]
): boolean {
  if (direction !== "left" && direction !== "right") {
    return false;
  }

  // The idle side image faces left while the walk side frames face right.
  return direction === "left" ? animation === "walk" : animation === "idle";
}

function getAvatarAnimationKey(
  direction: PresenceMovePayload["direction"],
  animation: PresenceMovePayload["animation"]
): string {
  return `office-avatar-${animation}-${direction}`;
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
