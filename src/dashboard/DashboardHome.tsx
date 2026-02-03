import { useState } from "react";

import DashboardHeader from "./DashboardHeader";
import DashboardGrid, { type DashboardPanel } from "./DashboardGrid";

import GeneralPanel from "./panels/GeneralPanel";
import AccountPanel from "./panels/AccountPanel";
import AppSettingsPanel from "./panels/AppSettingsPanel";
import AdminPanel from "./panels/AdminPanel";

interface DashboardHomeProps {
  theme: "vs-dark" | "vs-light";
  setTheme: (theme: "vs-dark" | "vs-light") => void;
  onSwitchAccount: () => void;
  onLogout: () => void;
}

export default function DashboardHome({
  theme,
  setTheme,
  onSwitchAccount,
  onLogout,
}: DashboardHomeProps) {
  const [activePanel, setActivePanel] =
    useState<DashboardPanel>("general");

  const renderPanel = () => {
    switch (activePanel) {
      case "account":
        return <AccountPanel
                 onSwitchAccount={onSwitchAccount}
                 onLogout={onLogout}
                />;

      case "settings":
        return (
          <AppSettingsPanel
            theme={theme}
            setTheme={setTheme}
          />
        );

      case "admin":
        return <AdminPanel />;

      case "general":
      default:
        return <GeneralPanel />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-default text-default">
      {/* HEADER NAV */}
      <DashboardHeader
        active={activePanel}
        onSelect={setActivePanel}
      />

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: ICON GRID */}
        <DashboardGrid
          active={activePanel}
          onSelect={setActivePanel}
        />

        {/* RIGHT: PANEL CONTENT */}
        <div className="flex-1 overflow-auto p-4">
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}
