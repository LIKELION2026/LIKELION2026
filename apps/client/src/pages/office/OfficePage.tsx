import { useNavigate } from "react-router-dom";
import type { JSX } from "react";

import { VirtualOffice } from "../../features/virtual-office/ui/VirtualOffice";

export function OfficePage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="office-page">
      <VirtualOffice
        onOpenMeetingLab={() => navigate("/meeting-lab?section=meeting-room")}
      />
    </div>
  );
}
