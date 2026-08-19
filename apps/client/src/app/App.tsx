import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { JSX } from "react";

import { MeetingLabPage } from "../pages/meeting-lab/MeetingLabPage";
import { OfficePage } from "../pages/office/OfficePage";
import { CollisionEditorPage } from "../pages/collision-editor/CollisionEditorPage";
import { OfficeConnectionProvider } from "../features/virtual-office/model/office-connection-context";
import { RequestFeedbackProvider } from "./request-feedback";

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <RequestFeedbackProvider>
        <AppRouter />
      </RequestFeedbackProvider>
    </BrowserRouter>
  );
}

function AppRouter(): JSX.Element {
  const location = useLocation();

  if (location.pathname === "/collision-editor") {
    return <AppContent />;
  }

  return (
    <OfficeConnectionProvider>
      <AppContent />
    </OfficeConnectionProvider>
  );
}

function AppContent(): JSX.Element {
  const location = useLocation();
  const isOfficeRoute = location.pathname === "/office";
  const isCollisionEditorRoute = location.pathname === "/collision-editor";

  return (
    <div className={isOfficeRoute ? "app-shell app-shell-office" : "app-shell"}>
      {isOfficeRoute || isCollisionEditorRoute ? null : (
        <header className="app-header">
          <NavLink className="brand" to="/office">
            GLOBAL OFFICE
          </NavLink>
          <nav aria-label="주요 메뉴" className="app-navigation">
            <NavLink to="/office">Office</NavLink>
            <NavLink to="/meeting-lab">Meeting Lab</NavLink>
          </nav>
        </header>
      )}
      <main className="app-main">
        <Routes>
          <Route element={<OfficePage />} path="/office" />
          <Route element={<MeetingLabPage />} path="/meeting-lab" />
          <Route element={<CollisionEditorPage />} path="/collision-editor" />
          <Route element={<Navigate replace to="/office" />} path="*" />
        </Routes>
      </main>
    </div>
  );
}
