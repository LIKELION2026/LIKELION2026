import type { ReactNode } from "react";

import type { OfficeCalendarController } from "../model/use-office-calendar";

export interface OfficeCalendarPanelSlotProps {
  children?: (controller: OfficeCalendarController) => ReactNode;
  controller: OfficeCalendarController;
}

/** Figma 캘린더 화면을 주입하는 무스타일 경계다. */
export function OfficeCalendarPanelSlot({ children, controller }: OfficeCalendarPanelSlotProps): ReactNode {
  return children?.(controller) ?? null;
}
