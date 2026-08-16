import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import type { JSX } from "react";

import { MeetingLabPage } from "../pages/meeting-lab/MeetingLabPage";
import { OfficePage } from "../pages/office/OfficePage";

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <NavLink className="brand" to="/office">
            GLOBAL OFFICE
          </NavLink>
          <nav aria-label="주요 메뉴" className="app-navigation">
            <NavLink to="/office">Office</NavLink>
            <NavLink to="/meeting-lab">Meeting Lab</NavLink>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route element={<OfficePage />} path="/office" />
            <Route element={<MeetingLabPage />} path="/meeting-lab" />
            <Route element={<Navigate replace to="/office" />} path="*" />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
