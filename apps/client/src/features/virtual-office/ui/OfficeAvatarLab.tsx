import { OFFICE_AVATAR_IDS, type AvatarAnimation, type AvatarDirection, type OfficeAvatarId } from "@likelion2026/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";

import {
  AVATAR_OVERLAY_OFFSETS,
  type AvatarOverlayOffsets,
  serializeAvatarOverlayOffsets,
} from "../core/avatar-overlay-layout";
import {
  applyAvatarFrameCrop,
  AVATAR_SPRITE_LAYOUTS,
  createAvatarSpriteVariantKey,
  resolveAvatarSpriteLayoutVariant,
  type AvatarSpriteLayout,
  type ResolvedAvatarSpriteLayout,
  serializeAvatarSpriteLayouts,
} from "../core/avatar-sprite-layout";
import {
  getAvatarFrameIndex,
  getAvatarSpriteDefinition,
  shouldFlipAvatarSprite,
} from "../core/avatar-sprite-definition";
import { removeNearTransparentPixels } from "../core/avatar-pixel-normalizer";
import { AvatarFace } from "./AvatarFace";

const FRAME_CELL_SIZE = 256;
const FRAME_BORDER_TRIM = 2;
const SPRITE_SHEET_HEIGHT = 1024;
const SPRITE_SHEET_WIDTH = 1536;
const DIRECTIONS: readonly AvatarDirection[] = ["down", "left", "right", "up"];
const ANIMATIONS: readonly AvatarAnimation[] = ["idle", "walk", "sit"];

const AVATAR_LABELS: Record<OfficeAvatarId, string> = {
  red_panda: "레드판다",
  cat: "고양이",
  dog: "강아지",
  sheep: "양",
  monkey: "원숭이",
  capybara: "카피바라",
  hippo: "하마",
  parrot: "앵무새",
  zebra: "얼룩말",
  wolf: "늑대",
  cow: "소",
  eagle: "독수리",
};

const ANIMATION_LABELS: Record<AvatarAnimation, string> = {
  idle: "기본",
  sit: "앉기",
  walk: "이동",
};

const DIRECTION_LABELS: Record<AvatarDirection, string> = {
  down: "아래",
  left: "왼쪽",
  right: "오른쪽",
  up: "위",
};

export function OfficeAvatarLab(): JSX.Element {
  const [selectedAvatarId, setSelectedAvatarId] = useState<OfficeAvatarId>("red_panda");
  const [animation, setAnimation] = useState<AvatarAnimation>("idle");
  const [direction, setDirection] = useState<AvatarDirection>("down");
  const [showChat, setShowChat] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [layoutCopyState, setLayoutCopyState] = useState<"idle" | "copied">("idle");
  const [offsets, setOffsets] = useState<Record<OfficeAvatarId, AvatarOverlayOffsets>>(() =>
    Object.fromEntries(
      OFFICE_AVATAR_IDS.map((id) => [id, { ...AVATAR_OVERLAY_OFFSETS[id] }]),
    ) as Record<OfficeAvatarId, AvatarOverlayOffsets>,
  );
  const [spriteLayouts, setSpriteLayouts] = useState<Record<OfficeAvatarId, AvatarSpriteLayout>>(() =>
    Object.fromEntries(
      OFFICE_AVATAR_IDS.map((id) => [
        id,
        {
          ...AVATAR_SPRITE_LAYOUTS[id],
          frameCrop: { ...AVATAR_SPRITE_LAYOUTS[id].frameCrop },
          sourceFrame: { ...AVATAR_SPRITE_LAYOUTS[id].sourceFrame },
          variants: { ...AVATAR_SPRITE_LAYOUTS[id].variants },
        },
      ]),
    ) as Record<OfficeAvatarId, AvatarSpriteLayout>,
  );
  const selectedOffsets = offsets[selectedAvatarId];
  const selectedVariantKey = createAvatarSpriteVariantKey(animation, direction);
  const selectedSpriteLayout = resolveAvatarSpriteLayoutVariant(
    spriteLayouts[selectedAvatarId],
    animation,
    direction,
  );

  const updateOffset = (key: keyof AvatarOverlayOffsets, value: number) => {
    if (!Number.isFinite(value)) {
      return;
    }

    setOffsets((current) => ({
      ...current,
      [selectedAvatarId]: {
        ...current[selectedAvatarId],
        [key]: Math.round(value),
      },
    }));
  };

  const resetSelected = () => {
    setSpriteLayouts((current) => {
      const currentLayout = current[selectedAvatarId];
      const { [selectedVariantKey]: _removed, ...variants } = currentLayout.variants;
      return {
        ...current,
        [selectedAvatarId]: { ...currentLayout, variants },
      };
    });
  };

  const updateSelectedVariant = (
    update: (layout: ResolvedAvatarSpriteLayout) => ResolvedAvatarSpriteLayout,
  ) => {
    setSpriteLayouts((current) => {
      const currentLayout = current[selectedAvatarId];
      const resolved = resolveAvatarSpriteLayoutVariant(
        currentLayout,
        animation,
        direction,
      );
      const next = update({
        ...resolved,
        frameCrop: { ...resolved.frameCrop },
        sourceFrame: { ...resolved.sourceFrame },
      });
      return {
        ...current,
        [selectedAvatarId]: {
          ...currentLayout,
          variants: {
            ...currentLayout.variants,
            [selectedVariantKey]: next,
          },
        },
      };
    });
  };

  const updateSpriteLayout = (
    key: "footBaseline" | "scale",
    value: number,
  ) => {
    if (!Number.isFinite(value)) {
      return;
    }

    updateSelectedVariant((layout) => ({
      ...layout,
      [key]: key === "scale" ? Number(value.toFixed(2)) : Math.round(value),
    }));
  };

  const updateFrameCrop = (key: keyof AvatarSpriteLayout["frameCrop"], value: number) => {
    if (!Number.isFinite(value)) {
      return;
    }

    updateSelectedVariant((layout) => ({
      ...layout,
      frameCrop: {
        ...layout.frameCrop,
        [key]: Math.max(0, Math.round(value)),
      },
    }));
  };

  const updateSourceFrame = (
    key: keyof AvatarSpriteLayout["sourceFrame"],
    value: number,
  ) => {
    if (!Number.isFinite(value)) {
      return;
    }

    updateSelectedVariant((layout) => ({
      ...layout,
      sourceFrame: {
        ...layout.sourceFrame,
        [key]: Math.round(value),
      },
    }));
  };

  const copyOffsets = async () => {
    await navigator.clipboard.writeText(serializeAvatarOverlayOffsets(offsets));
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  const copySpriteLayouts = async () => {
    await navigator.clipboard.writeText(serializeAvatarSpriteLayouts(spriteLayouts));
    setLayoutCopyState("copied");
    window.setTimeout(() => setLayoutCopyState("idle"), 1800);
  };

  return (
    <section className="avatar-lab-page">
      <header className="avatar-lab-header">
        <div>
          <p className="avatar-lab-eyebrow">DEVELOPMENT TOOL</p>
          <h1>아바타 규격 및 오버레이 점검 도구</h1>
          <p>
            행동과 방향마다 원본 프레임 추출 범위와 아바타·말풍선 위치를 독립적으로 조정합니다.
          </p>
        </div>
        <div className="avatar-lab-actions">
          <Link className="avatar-lab-link" to="/office">오피스 확인</Link>
          <button className="avatar-lab-button" onClick={resetSelected} type="button">현재 행동·방향 초기화</button>
          <button className="avatar-lab-button avatar-lab-button-primary" onClick={() => void copyOffsets()} type="button">
            {copyState === "copied" ? "복사됨" : "보정값 복사"}
          </button>
          <button className="avatar-lab-button avatar-lab-button-primary" onClick={() => void copySpriteLayouts()} type="button">
            {layoutCopyState === "copied" ? "복사됨" : "규격값 복사"}
          </button>
        </div>
      </header>

      <div className="avatar-lab-layout">
        <aside className="avatar-lab-sidebar">
          <div className="avatar-lab-section-heading">
            <p>아바타 선택</p>
            <strong>{OFFICE_AVATAR_IDS.length}종</strong>
          </div>
          <div className="avatar-lab-avatar-grid">
            {OFFICE_AVATAR_IDS.map((avatarId) => {
              const definition = getAvatarSpriteDefinition(avatarId);
              return (
                <button
                  aria-pressed={selectedAvatarId === avatarId}
                  className="avatar-lab-avatar-button"
                  key={avatarId}
                  onClick={() => setSelectedAvatarId(avatarId)}
                  type="button"
                >
                  <AvatarFace avatarId={avatarId} size={48} />
                  <span>{AVATAR_LABELS[avatarId]}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="avatar-lab-preview-panel">
          <div className="avatar-lab-controls">
            <ControlGroup<AvatarAnimation>
              label="행동"
              options={ANIMATIONS}
              selected={animation}
              labels={ANIMATION_LABELS}
              onSelect={setAnimation}
            />
            <ControlGroup<AvatarDirection>
              label="방향"
              options={DIRECTIONS}
              selected={direction}
              labels={DIRECTION_LABELS}
              onSelect={setDirection}
            />
            <label className="avatar-lab-chat-toggle">
              <input checked={showChat} onChange={(event) => setShowChat(event.target.checked)} type="checkbox" />
              채팅 말풍선 보기
            </label>
          </div>
          <div className="avatar-lab-stage-wrap">
            <AvatarOverlayPreview
              animation={animation}
              avatarId={selectedAvatarId}
              direction={direction}
              offsets={selectedOffsets}
              spriteLayout={selectedSpriteLayout}
              showChat={showChat}
            />
          </div>
          <SpriteSourceFrameEditor
            assetPath={animation === "sit" ? getAvatarSpriteDefinition(selectedAvatarId).sitAssetPath : getAvatarSpriteDefinition(selectedAvatarId).assetPath}
            frameIndex={getAvatarFrameIndex(getAvatarSpriteDefinition(selectedAvatarId), direction, animation)}
            sourceFrame={selectedSpriteLayout.sourceFrame}
            onChange={updateSourceFrame}
          />
          <p className="avatar-lab-hint">
            회색 점선은 스프라이트 프레임 경계입니다. 이름과 상태가 캐릭터 머리 또는 프레임 밖으로 침범하지 않는지 확인하세요.
          </p>
        </main>

        <aside className="avatar-lab-properties">
          <div className="avatar-lab-section-heading">
            <p>{AVATAR_LABELS[selectedAvatarId]} 보정</p>
            <strong>Y 좌표</strong>
          </div>
          <p className="avatar-lab-property-help">음수 값이 작아질수록 요소가 아바타 위쪽으로 이동합니다.</p>
          {([
            ["statusY", "상태 말풍선"],
            ["nameY", "이름"],
            ["chatY", "채팅 말풍선"],
          ] as const).map(([key, label]) => (
            <label className="avatar-lab-number-field" key={key}>
              <span>{label}</span>
              <input
                onChange={(event) => updateOffset(key, Number(event.target.value))}
                step="1"
                type="number"
                value={selectedOffsets[key]}
              />
            </label>
          ))}
          <section className="avatar-lab-sprite-settings">
            <div className="avatar-lab-section-heading">
              <p>스프라이트 규격</p>
              <strong>{`${ANIMATION_LABELS[animation]} · ${DIRECTION_LABELS[direction]}`}</strong>
            </div>
            <p className="avatar-lab-property-help">
              이 값은 현재 행동과 방향에만 적용됩니다. 이동 보정을 바꿔도 앉기 보정에는 영향을 주지 않습니다.
            </p>
            <label className="avatar-lab-number-field">
              <span>크기</span>
              <input max="1" min="0.25" onChange={(event) => updateSpriteLayout("scale", Number(event.target.value))} step="0.01" type="number" value={selectedSpriteLayout.scale} />
            </label>
            <label className="avatar-lab-number-field">
              <span>발 기준선</span>
              <input onChange={(event) => updateSpriteLayout("footBaseline", Number(event.target.value))} step="1" type="number" value={selectedSpriteLayout.footBaseline} />
            </label>
            <div className="avatar-lab-crop-grid">
              {(["top", "right", "bottom", "left"] as const).map((key) => (
                <label className="avatar-lab-number-field" key={key}>
                  <span>{CROP_LABELS[key]}</span>
                  <input min="0" onChange={(event) => updateFrameCrop(key, Number(event.target.value))} step="1" type="number" value={selectedSpriteLayout.frameCrop[key]} />
                </label>
              ))}
            </div>
            <div className="avatar-lab-source-grid">
              {([
                ["offsetX", "원본 X"],
                ["offsetY", "원본 Y"],
                ["width", "원본 가로"],
                ["height", "원본 세로"],
              ] as const).map(([key, label]) => (
                <label className="avatar-lab-number-field" key={key}>
                  <span>{label}</span>
                  <input
                    onChange={(event) => updateSourceFrame(key, Number(event.target.value))}
                    step="1"
                    type="number"
                    value={selectedSpriteLayout.sourceFrame[key]}
                  />
                </label>
              ))}
            </div>
          </section>
          <section className="avatar-lab-checklist">
            <strong>점검 순서</strong>
            <ol>
              <li>기본·이동·앉기와 네 방향을 바꿉니다.</li>
              <li>이름과 상태가 겹치지 않는지 확인합니다.</li>
              <li>채팅을 켜 말풍선 위치를 확인합니다.</li>
              <li>원본 프레임 사각형을 드래그해 잘림과 누수를 점검합니다.</li>
              <li>복사한 값을 아바타 규격·오버레이 정의에 반영합니다.</li>
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}

function ControlGroup<T extends string>({
  label,
  labels,
  onSelect,
  options,
  selected,
}: {
  label: string;
  labels: Record<T, string>;
  onSelect: (value: T) => void;
  options: readonly T[];
  selected: T;
}): JSX.Element {
  return (
    <div className="avatar-lab-control-group">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button
            aria-pressed={selected === option}
            key={option}
            onClick={() => onSelect(option)}
            type="button"
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

function AvatarOverlayPreview({
  animation,
  avatarId,
  direction,
  offsets,
  showChat,
  spriteLayout,
}: {
  animation: AvatarAnimation;
  avatarId: OfficeAvatarId;
  direction: AvatarDirection;
  offsets: AvatarOverlayOffsets;
  showChat: boolean;
  spriteLayout: ResolvedAvatarSpriteLayout;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const definition = useMemo(() => getAvatarSpriteDefinition(avatarId), [avatarId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const render = (image: HTMLImageElement) => {
      const dpr = window.devicePixelRatio || 1;
      const width = 440;
      const height = 440;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = false;
      context.fillStyle = "#fff7e9";
      context.fillRect(0, 0, width, height);
      drawGrid(context, width, height);

      const frameIndex = getAvatarFrameIndex(definition, direction, animation);
      const frame = getSourceFrame(frameIndex, spriteLayout);
      const normalized = document.createElement("canvas");
      normalized.width = frame.width;
      normalized.height = frame.height;
      const normalizedContext = normalized.getContext("2d");
      if (!normalizedContext) {
        return;
      }
      normalizedContext.imageSmoothingEnabled = false;
      normalizedContext.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
      const sourceData = normalizedContext.getImageData(0, 0, frame.width, frame.height);
      const imageData = new ImageData(
        applyAvatarFrameCrop(
          removeNearTransparentPixels(sourceData.data),
          frame.width,
          frame.height,
          spriteLayout.frameCrop,
        ),
        frame.width,
        frame.height,
      );
      const bounds = getOpaqueBounds(imageData);
      const xOffset = Math.round(frame.width / 2 - (bounds.left + bounds.width / 2));
      const yOffset = spriteLayout.footBaseline - bounds.bottom;
      normalizedContext.clearRect(0, 0, frame.width, frame.height);
      normalizedContext.putImageData(imageData, xOffset, yOffset);

      const anchorX = width / 2;
      const anchorY = 316;
      const spriteSize = frame.width * spriteLayout.scale;
      context.save();
      context.translate(anchorX, anchorY);
      if (shouldFlipAvatarSprite(avatarId, direction, animation)) {
        context.scale(-1, 1);
      }
      context.drawImage(normalized, -spriteSize / 2, -spriteSize * 0.82, spriteSize, spriteSize);
      context.restore();

      if (showChat) {
        drawBubble(context, anchorX, anchorY + offsets.chatY, "안녕하세요. 회의 준비됐어요", "chat");
        return;
      }
      drawBubble(context, anchorX, anchorY + offsets.statusY, "● 협업 가능", "status");
      drawName(context, anchorX, anchorY + offsets.nameY, AVATAR_LABELS[avatarId]);
    };

    const image = new Image();
    image.onload = () => render(image);
    image.src = animation === "sit" ? definition.sitAssetPath : definition.assetPath;

    return () => {
      image.onload = null;
    };
  }, [animation, avatarId, definition, direction, offsets, showChat, spriteLayout]);

  return <canvas aria-label={`${AVATAR_LABELS[avatarId]} 오버레이 미리보기`} className="avatar-lab-preview" ref={canvasRef} />;
}

function SpriteSourceFrameEditor({
  assetPath,
  frameIndex,
  onChange,
  sourceFrame,
}: {
  assetPath: string;
  frameIndex: number;
  onChange: (key: keyof ResolvedAvatarSpriteLayout["sourceFrame"], value: number) => void;
  sourceFrame: ResolvedAvatarSpriteLayout["sourceFrame"];
}): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{
    height: number;
    mode: "move" | "resize";
    offsetX: number;
    offsetY: number;
    pointerX: number;
    pointerY: number;
    width: number;
  } | null>(null);
  const base = getFrameCellOrigin(frameIndex);
  const left = base.x + sourceFrame.offsetX;
  const top = base.y + sourceFrame.offsetY;

  const getSheetPoint = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) {
      return { x: 0, y: 0 };
    }
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * SPRITE_SHEET_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * SPRITE_SHEET_HEIGHT,
    };
  };

  const beginInteraction = (
    event: ReactPointerEvent<HTMLElement>,
    mode: "move" | "resize",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const point = getSheetPoint(event);
    interactionRef.current = {
      height: sourceFrame.height,
      mode,
      offsetX: sourceFrame.offsetX,
      offsetY: sourceFrame.offsetY,
      pointerX: point.x,
      pointerY: point.y,
      width: sourceFrame.width,
    };
    stageRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) {
      return;
    }
    const point = getSheetPoint(event);
    if (interaction.mode === "move") {
      onChange("offsetX", clamp(Math.round(interaction.offsetX + point.x - interaction.pointerX), -base.x, SPRITE_SHEET_WIDTH - base.x - 80));
      onChange("offsetY", clamp(Math.round(interaction.offsetY + point.y - interaction.pointerY), -base.y, SPRITE_SHEET_HEIGHT - base.y - 80));
      return;
    }
    onChange("width", clamp(Math.round(interaction.width + point.x - interaction.pointerX), 80, SPRITE_SHEET_WIDTH - left));
    onChange("height", clamp(Math.round(interaction.height + point.y - interaction.pointerY), 80, SPRITE_SHEET_HEIGHT - top));
  };

  const endInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactionRef.current) {
      return;
    }
    interactionRef.current = null;
    stageRef.current?.releasePointerCapture(event.pointerId);
  };

  return (
    <section className="avatar-lab-source-editor">
      <div className="avatar-lab-source-heading">
        <div>
          <strong>원본 프레임 추출 영역</strong>
          <p>사각형을 드래그해 위치를 옮기고, 오른쪽 아래 점을 드래그해 가로·세로를 조정합니다.</p>
        </div>
        <span>{`${left}, ${top} / ${sourceFrame.width} x ${sourceFrame.height}`}</span>
      </div>
      <div
        className="avatar-lab-source-stage"
        onPointerMove={handlePointerMove}
        onPointerUp={endInteraction}
        ref={stageRef}
        style={{ backgroundImage: `url(${assetPath})` }}
      >
        <div
          aria-label="선택한 프레임 추출 영역"
          className="avatar-lab-source-frame"
          onPointerDown={(event) => beginInteraction(event, "move")}
          style={{
            height: `${(sourceFrame.height / SPRITE_SHEET_HEIGHT) * 100}%`,
            left: `${(left / SPRITE_SHEET_WIDTH) * 100}%`,
            top: `${(top / SPRITE_SHEET_HEIGHT) * 100}%`,
            width: `${(sourceFrame.width / SPRITE_SHEET_WIDTH) * 100}%`,
          }}
        >
          <span className="avatar-lab-source-frame-label">선택 프레임</span>
          <span
            aria-label="프레임 크기 조절"
            className="avatar-lab-source-resize-handle"
            onPointerDown={(event) => beginInteraction(event, "resize")}
            role="button"
          />
        </div>
      </div>
    </section>
  );
}

function getSourceFrame(
  frameIndex: number,
  layout: ResolvedAvatarSpriteLayout,
): { height: number; width: number; x: number; y: number } {
  const base = getFrameCellOrigin(frameIndex);
  return {
    height: layout.sourceFrame.height,
    width: layout.sourceFrame.width,
    x: base.x + layout.sourceFrame.offsetX,
    y: base.y + layout.sourceFrame.offsetY,
  };
}

function getFrameCellOrigin(frameIndex: number): { x: number; y: number } {
  return {
    x: (frameIndex % 6) * FRAME_CELL_SIZE + FRAME_BORDER_TRIM,
    y: Math.floor(frameIndex / 6) * FRAME_CELL_SIZE + FRAME_BORDER_TRIM,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const CROP_LABELS = {
  bottom: "아래 잘라내기",
  left: "왼쪽 잘라내기",
  right: "오른쪽 잘라내기",
  top: "위 잘라내기",
} as const;

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.strokeStyle = "#e6d2b8";
  context.lineWidth = 1;
  for (let value = 20; value < width; value += 40) {
    context.beginPath();
    context.moveTo(value, 0);
    context.lineTo(value, height);
    context.stroke();
  }
  for (let value = 20; value < height; value += 40) {
    context.beginPath();
    context.moveTo(0, value);
    context.lineTo(width, value);
    context.stroke();
  }
}

function drawBubble(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  kind: "chat" | "status",
): void {
  context.save();
  context.font = kind === "chat" ? "bold 17px Arial, sans-serif" : "bold 20px Arial, sans-serif";
  const paddingX = kind === "chat" ? 18 : 14;
  const height = kind === "chat" ? 48 : 38;
  const width = Math.max(kind === "chat" ? 170 : 116, Math.ceil(context.measureText(text).width) + paddingX * 2);
  const left = x - width / 2;
  const top = y - height / 2;
  context.fillStyle = kind === "chat" ? "#fff7e9" : "#d7efd3";
  context.strokeStyle = "#6b4a35";
  context.lineWidth = 3;
  context.fillRect(left, top, width, height);
  context.strokeRect(left, top, width, height);
  context.beginPath();
  context.moveTo(x - 8, top + height);
  context.lineTo(x + 8, top + height);
  context.lineTo(x, top + height + 9);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = kind === "chat" ? "#4a2f1e" : "#315e32";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y + 1);
  context.restore();
}

function drawName(context: CanvasRenderingContext2D, x: number, y: number, text: string): void {
  context.save();
  context.font = "bold 16px Arial, sans-serif";
  const width = Math.ceil(context.measureText(text).width) + 14;
  context.fillStyle = "#fff7e9";
  context.fillRect(x - width / 2, y - 20, width, 22);
  context.fillStyle = "#4a2f1e";
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.fillText(text, x, y);
  context.restore();
}

function getOpaqueBounds(imageData: ImageData): { bottom: number; left: number; width: number } {
  const { data, height, width } = imageData;
  let left = width;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) {
        continue;
      }
      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return { bottom, left, width: right - left + 1 };
}
