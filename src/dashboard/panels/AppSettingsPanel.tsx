import { useState } from "react";
import SettingsPanel from "../../components/SettingsPanel";

interface AppSettingsPanelProps {
  theme: "vs-dark" | "vs-light";
  setTheme: (theme: "vs-dark" | "vs-light") => void;
}

export default function AppSettingsPanel({
  theme,
  setTheme,
}: AppSettingsPanelProps) {
  const [showTheme, setShowTheme] = useState(false);

  return (
    <div className="h-full p-4 bg-default text-default">
      <h2 className="text-lg font-semibold mb-4">
        Settings
      </h2>

      {/* SETTINGS LIST */}
      <div className="flex flex-col gap-2">
        {/* THEME ENTRY */}
        <button
          onClick={() => setShowTheme(v => !v)}
          className="
            w-full
            flex items-center justify-between
            px-3 py-2
            border border-default
            rounded
            text-sm
            hover:bg-muted
          "
        >
          <span>Theme</span>
          <span className="text-muted">
            {showTheme ? "▲" : "▼"}
          </span>
        </button>

        {/* THEME DETAILS */}
        {showTheme && (
          <div className="border border-default rounded">
            <SettingsPanel
              theme={theme}
              setTheme={setTheme}
            />
          </div>
        )}
      </div>
    </div>
  );
}
