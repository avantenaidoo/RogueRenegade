// src/components/Canvas.tsx
import React, { useState, useEffect } from "react";

import TitleBar from "./TitleBar";
import FileExplorer from "./FileExplorer";
import Editor from "./Editor";
import GitPanel from "./GitPanel";
import GitStatus from "./GitStatus";
import StatusBar from "./StatusBar";
import SettingsPanel from "./SettingsPanel";

import { useEditorStore } from "../store";

export const Canvas: React.FC = () => {
  const {
    tabs,
    activeTabIndex,
    setActiveTab,
    closeTab,
    updateTab,
  } = useEditorStore();

  // 🔴 RED DOT SOURCE (as you wanted)
  const [dirtyFiles, setDirtyFiles] = useState<string[]>([]);

  // 🔑 SINGLE SOURCE OF TRUTH FOR THEME
  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [showSettings, setShowSettings] = useState(false);

  const activeTab = tabs[activeTabIndex];

  // 🔑 KEEP EXISTING THEME SYSTEM
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "vs-dark");
  }, [theme]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* ───────────── TITLE BAR ───────────── */}
      <TitleBar />

      {/* ───────────── MAIN AREA ───────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* FILE EXPLORER */}
        <div className="w-60 border-r overflow-auto">
          <FileExplorer />
        </div>

        {/* EDITOR COLUMN */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* TABS */}
          <div className="h-9 flex border-b shrink-0 overflow-x-auto">
            {tabs.map((tab, i) => {
              const isDirty = dirtyFiles.includes(tab.path);

              return (
                <div
                  key={tab.path}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-3 text-sm cursor-pointer ${
                    i === activeTabIndex ? "bg-muted" : ""
                  }`}
                >
                  <span className="truncate max-w-40">
                    {tab.path.split("/").pop()}
                  </span>

                  {/* 🔴 VS CODE STYLE RED DOT */}
                  {isDirty && (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(i);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* EDITOR */}
          <div className="flex-1 min-h-0">
            {activeTab && (
              <Editor
                value={activeTab.content}
                path={activeTab.path}
                theme={theme}
                onChange={(val) =>
                  updateTab(activeTabIndex, { content: val ?? "" })
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* ───────────── BOTTOM PANEL ───────────── */}
      <div className="h-40 border-t flex">
        <div className="flex-1 overflow-auto">
          {showSettings ? (
            <SettingsPanel theme={theme} setTheme={setTheme} />
          ) : (
            <GitPanel />
          )}
        </div>

        {/* PANEL TOGGLE */}
        <div className="w-32 border-l flex items-center justify-center">
          <button onClick={() => setShowSettings(v => !v)}>
            {showSettings ? "Git" : "Settings"}
          </button>
        </div>
      </div>

      {/* ───────────── STATUS BAR ───────────── */}
      <div className="h-6 border-t flex shrink-0">
        <GitStatus onDirtyFilesChange={setDirtyFiles} />
        <StatusBar />
      </div>
    </div>
  );
};
