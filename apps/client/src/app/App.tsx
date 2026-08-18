import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { JSX } from "react";

import { MeetingLabPage } from "../pages/meeting-lab/MeetingLabPage";
import { OfficePage } from "../pages/office/OfficePage";
import { RequestFeedbackProvider } from "./request-feedback";

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <RequestFeedbackProvider>
        <AppContent />
      </RequestFeedbackProvider>
    </BrowserRouter>
  );
}

function AppContent(): JSX.Element {
  const location = useLocation();
  const isOfficeRoute = location.pathname === "/office";

  return (
    <div className={isOfficeRoute ? "app-shell app-shell-office" : "app-shell"}>
      {isOfficeRoute ? null : (
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
          <Route element={<Navigate replace to="/office" />} path="*" />
        </Routes>
      </main>
    </div>
  );
}
