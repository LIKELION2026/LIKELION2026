import { OFFICE_WORLD_SIZE } from "@likelion2026/shared";

import type { OfficeCollisionArea } from "./office-collision";

export type CollisionResizeHandle = "north-east" | "north-west" | "south-east" | "south-west";

export interface CollisionPoint {
  x: number;
  y: number;
}

export interface OfficeDeskConfiguration {
  label: string;
  positionX: number;
  positionY: number;
  zone: string;
}

export interface OfficeMeetingZoneConfiguration {
  height: number;
  id: string;
  labelKey: string;
  width: number;
  x: number;
  y: number;
}

const MIN_COLLISION_SIZE = 40;

export function createCollisionArea(index: number): OfficeCollisionArea {
  const offset = index * 24;

  return {
    height: 160,
    id: `custom-collision-${index + 1}`,
    width: 200,
    x: 360 + offset,
    y: 760 + offset,
  };
}

export function createMeetingZone(index: number): OfficeMeetingZoneConfiguration {
  const offset = index * 56;

  return {
    height: 360,
    id: `meeting-zone-${index + 1}`,
    labelKey: `officeMap.meetingZones.meetingRoom${index + 1}`,
    width: 560,
    x: 1760 + offset,
    y: 1980 + offset,
  };
}

export function constrainCollisionArea(area: OfficeCollisionArea): OfficeCollisionArea {
  const width = clamp(Math.round(area.width), MIN_COLLISION_SIZE, OFFICE_WORLD_SIZE.width);
  const height = clamp(Math.round(area.height), MIN_COLLISION_SIZE, OFFICE_WORLD_SIZE.height);

  return {
    ...area,
    height,
    width,
    x: clamp(Math.round(area.x), 0, OFFICE_WORLD_SIZE.width - width),
    y: clamp(Math.round(area.y), 0, OFFICE_WORLD_SIZE.height - height),
  };
}

export function constrainMeetingZone(
  zone: OfficeMeetingZoneConfiguration,
): OfficeMeetingZoneConfiguration {
  const width = clamp(Math.round(zone.width), MIN_COLLISION_SIZE, OFFICE_WORLD_SIZE.width);
  const height = clamp(Math.round(zone.height), MIN_COLLISION_SIZE, OFFICE_WORLD_SIZE.height);

  return {
    ...zone,
    height,
    width,
    x: clamp(Math.round(zone.x), 0, OFFICE_WORLD_SIZE.width - width),
    y: clamp(Math.round(zone.y), 0, OFFICE_WORLD_SIZE.height - height),
  };
}

export function moveMeetingZone(
  zone: OfficeMeetingZoneConfiguration,
  point: CollisionPoint,
  grabOffset: CollisionPoint,
): OfficeMeetingZoneConfiguration {
  return constrainMeetingZone({
    ...zone,
    x: clamp(point.x - grabOffset.x, 0, OFFICE_WORLD_SIZE.width - zone.width),
    y: clamp(point.y - grabOffset.y, 0, OFFICE_WORLD_SIZE.height - zone.height),
  });
}

export function resizeMeetingZone(
  zone: OfficeMeetingZoneConfiguration,
  handle: CollisionResizeHandle,
  point: CollisionPoint,
): OfficeMeetingZoneConfiguration {
  return {
    ...zone,
    ...resizeCollisionArea(zone, handle, point),
  };
}

export function constrainDeskPosition(
  desk: OfficeDeskConfiguration,
): OfficeDeskConfiguration {
  return {
    ...desk,
    positionX: clamp(Math.round(desk.positionX), 0, OFFICE_WORLD_SIZE.width),
    positionY: clamp(Math.round(desk.positionY), 0, OFFICE_WORLD_SIZE.height),
  };
}

export function moveCollisionArea(
  area: OfficeCollisionArea,
  point: CollisionPoint,
  grabOffset: CollisionPoint,
): OfficeCollisionArea {
  return constrainCollisionArea({
    ...area,
    x: clamp(point.x - grabOffset.x, 0, OFFICE_WORLD_SIZE.width - area.width),
    y: clamp(point.y - grabOffset.y, 0, OFFICE_WORLD_SIZE.height - area.height),
  });
}

export function resizeCollisionArea(
  area: OfficeCollisionArea,
  handle: CollisionResizeHandle,
  point: CollisionPoint,
): OfficeCollisionArea {
  const left = area.x;
  const top = area.y;
  const right = area.x + area.width;
  const bottom = area.y + area.height;

  switch (handle) {
    case "north-west":
      return fromEdges(
        clamp(point.x, 0, right - MIN_COLLISION_SIZE),
        clamp(point.y, 0, bottom - MIN_COLLISION_SIZE),
        right,
        bottom,
        area,
      );
    case "north-east":
      return fromEdges(
        left,
        clamp(point.y, 0, bottom - MIN_COLLISION_SIZE),
        clamp(point.x, left + MIN_COLLISION_SIZE, OFFICE_WORLD_SIZE.width),
        bottom,
        area,
      );
    case "south-west":
      return fromEdges(
        clamp(point.x, 0, right - MIN_COLLISION_SIZE),
        top,
        right,
        clamp(point.y, top + MIN_COLLISION_SIZE, OFFICE_WORLD_SIZE.height),
        area,
      );
    case "south-east":
      return fromEdges(
        left,
        top,
        clamp(point.x, left + MIN_COLLISION_SIZE, OFFICE_WORLD_SIZE.width),
        clamp(point.y, top + MIN_COLLISION_SIZE, OFFICE_WORLD_SIZE.height),
        area,
      );
  }
}

export function serializeCollisionAreas(areas: readonly OfficeCollisionArea[]): string {
  const rows = areas.map(
    (area) =>
      `  { height: ${area.height}, id: "${area.id}", width: ${area.width}, x: ${area.x}, y: ${area.y} },`,
  );

  return [
    "export const OFFICE_COLLISION_AREAS: readonly OfficeCollisionArea[] = [",
    ...rows,
    "] as const;",
  ].join("\n");
}

export function serializeOfficeConfiguration({
  areas,
  desks,
  meetingZones,
}: {
  areas: readonly OfficeCollisionArea[];
  desks: readonly OfficeDeskConfiguration[];
  meetingZones: readonly OfficeMeetingZoneConfiguration[];
}): string {
  const deskRows = desks.map(
    (desk) =>
      `  { label: "${desk.label}", positionX: ${desk.positionX}, positionY: ${desk.positionY}, zone: "${desk.zone}" },`,
  );

  return [
    "// packages/shared/src/domain/office-map.ts",
    "export const OFFICE_DEFAULT_DESKS = [",
    ...deskRows,
    "] as const;",
    "",
    "export const OFFICE_MEETING_ZONES = [",
    ...meetingZones.map(
      (zone) =>
        `  { height: ${zone.height}, id: "${zone.id}", labelKey: "${zone.labelKey}", width: ${zone.width}, x: ${zone.x}, y: ${zone.y} },`,
    ),
    "] as const;",
    "",
    "// apps/client/src/features/virtual-office/model/office-collision.ts",
    serializeCollisionAreas(areas),
  ].join("\n");
}

function fromEdges(
  left: number,
  top: number,
  right: number,
  bottom: number,
  area: OfficeCollisionArea,
): OfficeCollisionArea {
  return constrainCollisionArea({
    ...area,
    height: bottom - top,
    width: right - left,
    x: left,
    y: top,
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
