import type { ReactNode } from "react";

import type { OfficeTodoController } from "../model/use-office-todos";

export interface OfficeTodoPanelSlotProps {
  controller: OfficeTodoController;
  children?: (controller: OfficeTodoController) => ReactNode;
}

/**
 * 디자인 확정 후 패널을 주입하는 경계다. 데이터 요청과 시각 표현을 분리한다.
 */
export function OfficeTodoPanelSlot({
  children,
  controller
}: OfficeTodoPanelSlotProps): ReactNode {
  return children?.(controller) ?? null;
}
