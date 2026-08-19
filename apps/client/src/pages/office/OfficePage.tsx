import type { JSX } from "react";

import { VirtualOffice } from "../../features/virtual-office/ui/VirtualOffice";

export function OfficePage(): JSX.Element {
  return (
    <div className="office-page">
      <VirtualOffice />
    </div>
  );
}
