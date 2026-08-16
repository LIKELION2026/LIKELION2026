import Phaser from "phaser";
import {
  MEMBER_STATUS_LABELS,
  type OfficeMemberPresence,
  type PresenceMovePayload
} from "@likelion2026/shared";

export const OFFICE_SCENE_KEY = "office-scene";

const OFFICE_SIZE = {
  height: 768,
  width: 1200
} as const;

const MEETING_ROOM = {
  height: 176,
  width: 256,
  x: 864,
  y: 120
} as const;

const REMOTE_INTERPOLATION_DELAY_MS = 120;
const MAX_REMOTE_POSITION_SAMPLES = 4;
const RED_PANDA_TEXTURE_KEY = "red-panda";
const RED_PANDA_ASSET_PATH = "/assets/red_panda.webp";
const RED_PANDA_FRAME_WIDTH = 130;
const RED_PANDA_FRAME_HEIGHT = 165;
const RED_PANDA_FRAME_X_POSITIONS = [0, 140, 280, 420, 560, 700] as const;
const RED_PANDA_SHEET_ROW_BY_DIRECTION = {
  down: 155,
  left: 465,
  right: 465,
  up: 315
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
    this.load.image(RED_PANDA_TEXTURE_KEY, RED_PANDA_ASSET_PATH);
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#dbe5ef");
    this.cameras.main.setBounds(0, 0, OFFICE_SIZE.width, OFFICE_SIZE.height);
    this.physics.world.setBounds(0, 0, OFFICE_SIZE.width, OFFICE_SIZE.height);

    this.createRedPandaFrames();
    this.createRedPandaAnimations();
    this.drawOffice();
    this.createLocalAvatar();
    this.createObstacles();
    this.createInput();
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
      RED_PANDA_TEXTURE_KEY,
      getRedPandaFrame("down")
    );
    this.player.setDisplaySize(40, 52).setOrigin(0.5, 0.72).setDepth(3);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(66, 48);
    this.playerBody.setOffset(32, 106);
    this.playAvatarAnimation(this.player, "down", "idle");
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.1);
  }

  private createObstacle(x: number, y: number, width: number, height: number): void {
    const obstacle = this.add
      .rectangle(x, y, width, height, 0x435466)
      .setStrokeStyle(2, 0x2d3948)
      .setDepth(2);
    this.physics.add.existing(obstacle, true);
    this.physics.add.collider(this.player, obstacle);
  }

  private drawOffice(): void {
    this.add.rectangle(0, 0, OFFICE_SIZE.width, OFFICE_SIZE.height, 0xe9eef3).setOrigin(0);

    const grid = this.add.graphics().setDepth(0);
    grid.lineStyle(1, 0xd2dbe5, 0.8);
    for (let x = 0; x <= OFFICE_SIZE.width; x += 48) {
      grid.lineBetween(x, 0, x, OFFICE_SIZE.height);
    }
    for (let y = 0; y <= OFFICE_SIZE.height; y += 48) {
      grid.lineBetween(0, y, OFFICE_SIZE.width, y);
    }

    this.add
      .rectangle(MEETING_ROOM.x, MEETING_ROOM.y, MEETING_ROOM.width, MEETING_ROOM.height, 0xdde9ff)
      .setOrigin(0)
      .setStrokeStyle(2, 0x5d85cc)
      .setDepth(1);
    this.add
      .text(MEETING_ROOM.x + 16, MEETING_ROOM.y + 16, "MEETING ROOM", {
        color: "#315da9",
        fontFamily: "monospace",
        fontSize: "16px",
        fontStyle: "bold"
      })
      .setDepth(2);

    this.add.text(76, 76, "GLOBAL TEAM OFFICE", {
      color: "#26384c",
      fontFamily: "monospace",
      fontSize: "18px",
      fontStyle: "bold"
    });
    this.add.text(76, 104, "WASD or arrow keys to move", {
      color: "#617386",
      fontFamily: "monospace",
      fontSize: "13px"
    });
  }

  private createObstacles(): void {
    this.createObstacle(600, 24, OFFICE_SIZE.width, 48);
    this.createObstacle(600, OFFICE_SIZE.height - 24, OFFICE_SIZE.width, 48);
    this.createObstacle(24, 384, 48, OFFICE_SIZE.height);
    this.createObstacle(OFFICE_SIZE.width - 24, 384, 48, OFFICE_SIZE.height);
    this.createObstacle(376, 296, 208, 64);
    this.createObstacle(376, 488, 208, 64);
    this.createObstacle(716, 404, 64, 248);
    this.createObstacle(992, 456, 224, 56);
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
      .sprite(0, 0, RED_PANDA_TEXTURE_KEY, getRedPandaFrame(member.avatar.direction))
      .setDisplaySize(40, 52)
      .setOrigin(0.5, 0.72)
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

  private createRedPandaFrames(): void {
    const texture = this.textures.get(RED_PANDA_TEXTURE_KEY);
    for (const direction of AVATAR_DIRECTIONS) {
      const sourceDirection = direction === "left" ? "right" : direction;
      const y = RED_PANDA_SHEET_ROW_BY_DIRECTION[sourceDirection];
      for (const [index, x] of RED_PANDA_FRAME_X_POSITIONS.entries()) {
        const frameName = getRedPandaWalkFrame(direction, index);
        if (!texture.has(frameName)) {
          texture.add(
            frameName,
            0,
            x,
            y,
            RED_PANDA_FRAME_WIDTH,
            RED_PANDA_FRAME_HEIGHT
          );
        }
      }
    }
  }

  private createRedPandaAnimations(): void {
    for (const direction of AVATAR_DIRECTIONS) {
      const walkKey = getRedPandaAnimationKey(direction, "walk");
      if (!this.anims.exists(walkKey)) {
        this.anims.create({
          frameRate: 9,
          frames: RED_PANDA_FRAME_X_POSITIONS.map((_, index) => ({
            frame: getRedPandaWalkFrame(direction, index),
            key: RED_PANDA_TEXTURE_KEY
          })),
          key: walkKey,
          repeat: -1
        });
      }

      const idleKey = getRedPandaAnimationKey(direction, "idle");
      if (!this.anims.exists(idleKey)) {
        this.anims.create({
          frameRate: 1,
          frames: [
            {
              frame: getRedPandaFrame(direction),
              key: RED_PANDA_TEXTURE_KEY
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
    sprite.setFlipX(direction === "left");
    sprite.anims.play(getRedPandaAnimationKey(direction, animation), true);
  }
}

function getRedPandaFrame(direction: PresenceMovePayload["direction"]): string {
  return getRedPandaWalkFrame(direction, 0);
}

function getRedPandaWalkFrame(
  direction: PresenceMovePayload["direction"],
  index: number
): string {
  return `red-panda-walk-${direction}-${index}`;
}

function getRedPandaAnimationKey(
  direction: PresenceMovePayload["direction"],
  animation: PresenceMovePayload["animation"]
): string {
  return `red-panda-${animation}-${direction}`;
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
