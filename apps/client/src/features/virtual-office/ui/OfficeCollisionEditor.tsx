import { useMemo, useRef, useState } from "react";
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  OFFICE_DEFAULT_DESKS,
  OFFICE_MEETING_ZONES,
  OFFICE_WORLD_SIZE,
} from "@likelion2026/shared";

import {
  OFFICE_COLLISION_AREAS,
  type OfficeCollisionArea,
} from "../model/office-collision";
import {
  createCollisionArea,
  createMeetingZone,
  constrainCollisionArea,
  constrainDeskPosition,
  constrainMeetingZone,
  moveCollisionArea,
  moveMeetingZone,
  resizeCollisionArea,
  resizeMeetingZone,
  serializeOfficeConfiguration,
  type CollisionPoint,
  type CollisionResizeHandle,
  type OfficeDeskConfiguration,
  type OfficeMeetingZoneConfiguration,
} from "../model/office-collision-editor";
import { OFFICE_MAP } from "../model/office-map";

interface ActiveInteraction {
  areaId: string;
  grabOffset?: CollisionPoint;
  kind: "collision" | "meeting";
  type: "move" | CollisionResizeHandle;
}

const MAP_DISPLAY_WIDTH = 2048;
const MAP_DISPLAY_HEIGHT = Math.round(
  (MAP_DISPLAY_WIDTH / OFFICE_WORLD_SIZE.width) * OFFICE_WORLD_SIZE.height,
);
const HANDLE_SIZE = 24;

export function OfficeCollisionEditor(): JSX.Element {
  const { t } = useTranslation();
  const [areas, setAreas] = useState<OfficeCollisionArea[]>(() =>
    OFFICE_COLLISION_AREAS.map((area) => ({ ...area })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    OFFICE_COLLISION_AREAS[0]?.id ?? null,
  );
  const [meetingZones, setMeetingZones] = useState<OfficeMeetingZoneConfiguration[]>(() =>
    OFFICE_MEETING_ZONES.map((zone) => ({ ...zone })),
  );
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    OFFICE_MEETING_ZONES[0]?.id ?? null,
  );
  const [desks, setDesks] = useState<OfficeDeskConfiguration[]>(() =>
    OFFICE_DEFAULT_DESKS.map((desk) => ({ ...desk })),
  );
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const interactionRef = useRef<ActiveInteraction | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const selectedArea = useMemo(
    () => areas.find((area) => area.id === selectedId) ?? null,
    [areas, selectedId],
  );
  const selectedMeetingZone = useMemo(
    () => meetingZones.find((zone) => zone.id === selectedMeetingId) ?? null,
    [meetingZones, selectedMeetingId],
  );

  const updateArea = (id: string, nextArea: OfficeCollisionArea) => {
    setAreas((current) => current.map((area) => (area.id === id ? nextArea : area)));
  };
  const updateMeetingZone = (id: string, nextZone: OfficeMeetingZoneConfiguration) => {
    setMeetingZones((current) => current.map((zone) => (zone.id === id ? nextZone : zone)));
  };

  const getWorldPoint = (event: ReactPointerEvent<SVGElement>): CollisionPoint => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) {
      return { x: 0, y: 0 };
    }

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * OFFICE_WORLD_SIZE.width,
      y: ((event.clientY - bounds.top) / bounds.height) * OFFICE_WORLD_SIZE.height,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) {
      return;
    }

    const point = getWorldPoint(event);
    if (interaction.kind === "meeting") {
      const zone = meetingZones.find((item) => item.id === interaction.areaId);
      if (!zone) {
        return;
      }

      if (interaction.type === "move" && interaction.grabOffset) {
        updateMeetingZone(zone.id, moveMeetingZone(zone, point, interaction.grabOffset));
        return;
      }

      if (interaction.type !== "move") {
        updateMeetingZone(zone.id, resizeMeetingZone(zone, interaction.type, point));
      }
      return;
    }

    const area = areas.find((item) => item.id === interaction.areaId);
    if (!area) {
      return;
    }

    if (interaction.type === "move" && interaction.grabOffset) {
      updateArea(area.id, moveCollisionArea(area, point, interaction.grabOffset));
      return;
    }

    const handle = interaction.type;
    if (handle !== "move") {
      updateArea(area.id, resizeCollisionArea(area, handle, point));
    }
  };

  const endPointerInteraction = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactionRef.current) {
      return;
    }

    interactionRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const beginMove = (event: ReactPointerEvent<SVGRectElement>, area: OfficeCollisionArea) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(area.id);
    setSelectedMeetingId(null);
    const point = getWorldPoint(event);
    interactionRef.current = {
      areaId: area.id,
      grabOffset: { x: point.x - area.x, y: point.y - area.y },
      kind: "collision",
      type: "move",
    };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const beginResize = (
    event: ReactPointerEvent<SVGCircleElement>,
    areaId: string,
    handle: CollisionResizeHandle,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(areaId);
    setSelectedMeetingId(null);
    interactionRef.current = { areaId, kind: "collision", type: handle };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const beginMeetingMove = (
    event: ReactPointerEvent<SVGRectElement>,
    zone: OfficeMeetingZoneConfiguration,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(null);
    setSelectedMeetingId(zone.id);
    const point = getWorldPoint(event);
    interactionRef.current = {
      areaId: zone.id,
      grabOffset: { x: point.x - zone.x, y: point.y - zone.y },
      kind: "meeting",
      type: "move",
    };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const beginMeetingResize = (
    event: ReactPointerEvent<SVGCircleElement>,
    zoneId: string,
    handle: CollisionResizeHandle,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(null);
    setSelectedMeetingId(zoneId);
    interactionRef.current = { areaId: zoneId, kind: "meeting", type: handle };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const addArea = () => {
    const area = createCollisionArea(areas.filter((item) => item.id.startsWith("custom-collision-")).length);
    setAreas((current) => [...current, area]);
    setSelectedId(area.id);
    setSelectedMeetingId(null);
  };

  const addMeetingZone = () => {
    let nextIndex = 0;
    while (meetingZones.some((zone) => zone.id === `meeting-zone-${nextIndex + 1}`)) {
      nextIndex += 1;
    }
    const zone = createMeetingZone(nextIndex);
    setMeetingZones((current) => [...current, zone]);
    setSelectedId(null);
    setSelectedMeetingId(zone.id);
  };

  const deleteSelectedArea = () => {
    if (!selectedArea) {
      return;
    }

    setAreas((current) => current.filter((area) => area.id !== selectedArea.id));
    setSelectedId((current) => areas.find((area) => area.id !== current)?.id ?? null);
  };

  const resetAreas = () => {
    setAreas(OFFICE_COLLISION_AREAS.map((area) => ({ ...area })));
    setSelectedId(OFFICE_COLLISION_AREAS[0]?.id ?? null);
    setMeetingZones(OFFICE_MEETING_ZONES.map((zone) => ({ ...zone })));
    setSelectedMeetingId(OFFICE_MEETING_ZONES[0]?.id ?? null);
    setDesks(OFFICE_DEFAULT_DESKS.map((desk) => ({ ...desk })));
    setCopyState("idle");
  };

  const copyAreas = async () => {
    await navigator.clipboard.writeText(
      serializeOfficeConfiguration({ areas, desks, meetingZones }),
    );
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  const updateDesk = (label: string, nextDesk: OfficeDeskConfiguration) => {
    setDesks((current) => current.map((desk) => (desk.label === label ? nextDesk : desk)));
  };

  const deleteSelectedMeetingZone = () => {
    if (!selectedMeetingZone) {
      return;
    }

    setMeetingZones((current) => current.filter((zone) => zone.id !== selectedMeetingZone.id));
    setSelectedMeetingId((current) =>
      meetingZones.find((zone) => zone.id !== current)?.id ?? null,
    );
  };

  return (
    <section className="collision-editor-page">
      <header className="collision-editor-header">
        <div>
          <p className="collision-editor-eyebrow">{t("officeCollisionEditor.developmentTool")}</p>
          <h1>{t("officeCollisionEditor.title")}</h1>
          <p>{t("officeCollisionEditor.description")}</p>
        </div>
        <div className="collision-editor-actions">
          <Link className="collision-editor-link" to="/office?debugCollisions=1">
            {t("officeCollisionEditor.checkInOffice")}
          </Link>
          <button className="collision-editor-button" onClick={resetAreas} type="button">
            {t("officeCollisionEditor.reset")}
          </button>
          <button className="collision-editor-button collision-editor-button-primary" onClick={() => void copyAreas()} type="button">
            {copyState === "copied"
              ? t("officeCollisionEditor.copied")
              : t("officeCollisionEditor.copyJson")}
          </button>
        </div>
      </header>

      <div className="collision-editor-layout">
        <aside className="collision-editor-sidebar" aria-label={t("officeCollisionEditor.areaListAriaLabel")}>
          <div className="collision-editor-sidebar-heading">
            <div>
              <p>{t("officeCollisionEditor.areaList")}</p>
              <strong>{t("officeCollisionEditor.areaCount", { count: areas.length })}</strong>
            </div>
            <button className="collision-editor-add-button" onClick={addArea} type="button">
              {t("officeCollisionEditor.addArea")}
            </button>
          </div>

          <div className="collision-editor-area-list">
            {areas.map((area) => (
              <button
                aria-pressed={area.id === selectedId}
                className="collision-editor-area-item"
                key={area.id}
                onClick={() => setSelectedId(area.id)}
                type="button"
              >
                <strong>{area.id}</strong>
                <span>{`${area.x}, ${area.y} / ${area.width} x ${area.height}`}</span>
              </button>
            ))}
          </div>

          {selectedArea ? (
            <section className="collision-editor-properties" aria-label={t("officeCollisionEditor.selectedAreaAriaLabel")}>
              <div className="collision-editor-properties-heading">
                <h2>{t("officeCollisionEditor.selectedArea")}</h2>
                <button className="collision-editor-delete-button" onClick={deleteSelectedArea} type="button">
                  {t("officeCollisionEditor.delete")}
                </button>
              </div>
              <label>
                {t("officeCollisionEditor.id")}
                <input
                  onChange={(event) => {
                    const nextId = event.target.value.trim().replaceAll(/\s+/g, "-");
                    const isDuplicated = areas.some(
                      (area) => area.id !== selectedArea.id && area.id === nextId,
                    );

                    if (!nextId || isDuplicated) {
                      return;
                    }

                    updateArea(selectedArea.id, { ...selectedArea, id: nextId });
                    setSelectedId(nextId);
                  }}
                  value={selectedArea.id}
                />
              </label>
              <div className="collision-editor-number-grid">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <label key={key}>
                    {key}
                    <input
                      min="0"
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) {
                          updateArea(
                            selectedArea.id,
                            constrainCollisionArea({ ...selectedArea, [key]: value }),
                          );
                        }
                      }}
                      type="number"
                      value={selectedArea[key]}
                    />
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          <section className="collision-editor-configuration" aria-label={t("officeCollisionEditor.meetingZoneSettingsAriaLabel")}>
            <div className="collision-editor-properties-heading">
              <div>
                <p>{t("officeCollisionEditor.meetingZoneSettings")}</p>
                <strong>{t("officeCollisionEditor.areaCount", { count: meetingZones.length })}</strong>
              </div>
              <button className="collision-editor-add-button" onClick={addMeetingZone} type="button">
                {t("officeCollisionEditor.addZone")}
              </button>
            </div>
            <div className="collision-editor-area-list collision-editor-meeting-list">
              {meetingZones.map((zone) => (
                <button
                  aria-pressed={zone.id === selectedMeetingId}
                  className="collision-editor-area-item collision-editor-meeting-item"
                  key={zone.id}
                  onClick={() => {
                    setSelectedId(null);
                    setSelectedMeetingId(zone.id);
                  }}
                  type="button"
                >
                  <strong>{t(zone.labelKey)}</strong>
                  <span>{`${zone.x}, ${zone.y} / ${zone.width} x ${zone.height}`}</span>
                </button>
              ))}
            </div>
            {selectedMeetingZone ? (
              <div className="collision-editor-meeting-properties">
                <div className="collision-editor-properties-heading">
                  <strong>{t("officeCollisionEditor.selectedMeetingZone")}</strong>
                  <button
                    className="collision-editor-delete-button"
                    onClick={deleteSelectedMeetingZone}
                    type="button"
                  >
                    {t("officeCollisionEditor.delete")}
                  </button>
                </div>
                <label>
                  {t("officeCollisionEditor.label")}
                  <input
                    onChange={(event) =>
                      updateMeetingZone(selectedMeetingZone.id, {
                        ...selectedMeetingZone,
                        labelKey: event.target.value,
                      })
                    }
                    value={selectedMeetingZone.labelKey}
                  />
                </label>
                <div className="collision-editor-number-grid">
                  {(["x", "y", "width", "height"] as const).map((key) => (
                    <label key={key}>
                      {key}
                      <input
                        min="0"
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (Number.isFinite(value)) {
                            updateMeetingZone(
                              selectedMeetingZone.id,
                              constrainMeetingZone({ ...selectedMeetingZone, [key]: value }),
                            );
                          }
                        }}
                        type="number"
                        value={selectedMeetingZone[key]}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <small>{t("officeCollisionEditor.blueZoneHelp")}</small>
          </section>

          <section className="collision-editor-configuration" aria-label={t("officeCollisionEditor.deskSettings")}>
            <div className="collision-editor-properties-heading">
              <div>
                <p>{t("officeCollisionEditor.deskSettings")}</p>
                <strong>{t("officeCollisionEditor.areaCount", { count: desks.length })}</strong>
              </div>
              <span className="collision-editor-tone-badge collision-editor-tone-badge-desk">
                {t("officeCollisionEditor.startBadge")}
              </span>
            </div>
            <div className="collision-editor-desk-list">
              {desks.map((desk) => (
                <fieldset className="collision-editor-desk" key={desk.label}>
                  <legend>{desk.label}</legend>
                  <label>
                    {`${desk.label} x`}
                    <input
                      min="0"
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) {
                          updateDesk(
                            desk.label,
                            constrainDeskPosition({ ...desk, positionX: value }),
                          );
                        }
                      }}
                      type="number"
                      value={desk.positionX}
                    />
                  </label>
                  <label>
                    {`${desk.label} y`}
                    <input
                      min="0"
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) {
                          updateDesk(
                            desk.label,
                            constrainDeskPosition({ ...desk, positionY: value }),
                          );
                        }
                      }}
                      type="number"
                      value={desk.positionY}
                    />
                  </label>
                </fieldset>
              ))}
            </div>
            <small>{t("officeCollisionEditor.deskMarkerHelp")}</small>
          </section>
        </aside>

        <div className="collision-editor-canvas-panel">
          <div className="collision-editor-legend">
            <span><i className="collision-editor-legend-area" /> {t("officeCollisionEditor.legend.area")}</span>
            <span><i className="collision-editor-legend-selected" /> {t("officeCollisionEditor.legend.selected")}</span>
            <span><i className="collision-editor-legend-meeting" /> {t("officeCollisionEditor.legend.meeting")}</span>
            <span><i className="collision-editor-legend-desk" /> {t("officeCollisionEditor.legend.desk")}</span>
            <span>{t("officeCollisionEditor.legend.help")}</span>
          </div>
          <div className="collision-editor-map-viewport">
            <div
              className="collision-editor-map-stage"
              style={{ height: MAP_DISPLAY_HEIGHT, width: MAP_DISPLAY_WIDTH }}
            >
              <img alt={t("officeCollisionEditor.mapAlt")} draggable={false} src={OFFICE_MAP.assetPath} />
              <svg
                aria-label={t("officeCollisionEditor.canvasAriaLabel")}
                className="collision-editor-map-overlay"
                onPointerCancel={endPointerInteraction}
                onPointerMove={handlePointerMove}
                onPointerUp={endPointerInteraction}
                ref={svgRef}
                viewBox={`0 0 ${OFFICE_WORLD_SIZE.width} ${OFFICE_WORLD_SIZE.height}`}
              >
                {meetingZones.map((zone) => {
                  const isSelected = zone.id === selectedMeetingId;
                  return (
                    <g className={isSelected ? "is-selected-meeting" : undefined} key={zone.id}>
                      <rect
                        className="collision-editor-meeting-zone"
                        height={zone.height}
                        onPointerDown={(event) => beginMeetingMove(event, zone)}
                        width={zone.width}
                        x={zone.x}
                        y={zone.y}
                      />
                      <text
                        className="collision-editor-meeting-zone-label"
                        x={zone.x + 18}
                        y={zone.y + 42}
                      >
                        {t(zone.labelKey)}
                      </text>
                      {isSelected
                        ? getResizeHandlePositions(zone).map(({ handle, x, y }) => (
                            <circle
                              className="collision-editor-meeting-resize-handle"
                              cx={x}
                              cy={y}
                              key={handle}
                              onPointerDown={(event) => beginMeetingResize(event, zone.id, handle)}
                              r={HANDLE_SIZE}
                            />
                          ))
                        : null}
                    </g>
                  );
                })}
                {areas.map((area) => {
                  const isSelected = area.id === selectedId;
                  return (
                    <g className={isSelected ? "is-selected" : undefined} key={area.id}>
                      <rect
                        className="collision-editor-area-rect"
                        height={area.height}
                        onPointerDown={(event) => beginMove(event, area)}
                        width={area.width}
                        x={area.x}
                        y={area.y}
                      />
                      <text className="collision-editor-area-label" x={area.x + 10} y={area.y + 28}>
                        {area.id}
                      </text>
                      {isSelected
                        ? getResizeHandlePositions(area).map(({ handle, x, y }) => (
                            <circle
                              className="collision-editor-resize-handle"
                              cx={x}
                              cy={y}
                              key={handle}
                              onPointerDown={(event) => beginResize(event, area.id, handle)}
                              r={HANDLE_SIZE}
                            />
                          ))
                        : null}
                    </g>
                  );
                })}
                {desks.map((desk) => (
                  <g className="collision-editor-desk-marker" key={desk.label}>
                    <circle cx={desk.positionX} cy={desk.positionY} r={18} />
                    <text x={desk.positionX + 26} y={desk.positionY + 8}>
                      {desk.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function getResizeHandlePositions(area: Pick<OfficeCollisionArea, "height" | "width" | "x" | "y">): Array<{
  handle: CollisionResizeHandle;
  x: number;
  y: number;
}> {
  return [
    { handle: "north-west", x: area.x, y: area.y },
    { handle: "north-east", x: area.x + area.width, y: area.y },
    { handle: "south-west", x: area.x, y: area.y + area.height },
    { handle: "south-east", x: area.x + area.width, y: area.y + area.height },
  ];
}
