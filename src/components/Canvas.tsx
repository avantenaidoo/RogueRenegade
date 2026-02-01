// src/components/Canvas.tsx
import React, { useEffect, useState } from "react";
import { writeTextFile } from "@tauri-apps/plugin-fs";

import TitleBar from "./Titlebar/TitleBar";
import FileExplorer from "./FileExplorer";
import Editor from "./Editor";
import GitPanel from "./GitPanel";
import GitStatus from "./GitStatus";
import StatusBar from "./StatusBar";
import SettingsPanel from "./SettingsPanel";
import CollaborationPanel from "./CollaborationPanel";

import { useEditorStore } from "../store";

export const Canvas: React.FC = () => {
  const {
    tabs,
    activeTabIndex,
    setActiveTab,
    closeTab,
    updateTab,
    markClean,
    showCollaboration,
  } = useEditorStore();

  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [showSettings, setShowSettings] = useState(false);

  /* 🔥 COLLAB SIDEBAR WIDTH */
  const [collabWidth, setCollabWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  const activeTab = tabs[activeTabIndex];

  /* ───────────── THEME ───────────── */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "vs-dark");
  }, [theme]);

  /* ───────────── SAVE (CTRL+S) ───────────── */
  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!activeTab) return;

        await writeTextFile(activeTab.path, activeTab.content);
        markClean(activeTab.path);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, markClean]);

  /* ───────────── RESIZE HANDLING ───────────── */
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 240 && newWidth <= 600) {
        setCollabWidth(newWidth);
      }
    }

    function onMouseUp() {
      setIsResizing(false);
    }

    if (isResizing) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* TITLE BAR */}
      <TitleBar />

      {/* MAIN AREA */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — FILE EXPLORER */}
        <div className="w-60 border-r overflow-auto">
          <FileExplorer />
        </div>

        {/* CENTER — EDITOR */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* TABS */}
          <div className="h-9 flex border-b shrink-0 overflow-x-auto">
            {tabs.map((tab, i) => (
              <div
                key={tab.path}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-3 text-sm cursor-pointer
                  ${
                    i === activeTabIndex
                      ? "bg-(--foreground)/65 text-(--background) shadow-inner border-b-2 border-blue-500"
                      : "bg-transparent text-default hover:bg-neutral-500"
                  }`}
              >
                <span className="truncate max-w-40">
                  {tab.path.split(/[\\/]/).pop()}
                </span>

                {tab.dirty && (
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
            ))}
          </div>

          {/* EDITOR */}
          <div className="flex-1 min-h-0">
            {activeTab && (
              <Editor
                value={activeTab.content}
                path={activeTab.path}
                theme={theme}
                onChange={(val) => {
                  updateTab(activeTabIndex, { content: val ?? "" });
                }}
              />
            )}
          </div>
        </div>

        {/* 🔥 RIGHT — COLLABORATION PANEL */}
        {showCollaboration && (
          <div
            className="flex border-l bg-muted overflow-hidden"
            style={{ width: collabWidth }}
          >
            {/* RESIZE HANDLE */}
            <div
              className="w-1 cursor-col-resize hover:bg-blue-500/40"
              onMouseDown={() => setIsResizing(true)}
            />

            {/* PANEL CONTENT */}
            <div className="flex-1 overflow-hidden">
              <CollaborationPanel
                username="local-user"
                roomId="workspace"
              />
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM PANEL */}
      <div className="h-40 border-t flex">
        <div className="flex-1 overflow-auto">
          {showSettings ? (
            <SettingsPanel theme={theme} setTheme={setTheme} />
          ) : (
            <GitPanel />
          )}
        </div>

        <div className="w-32 border-l flex items-center justify-center">
          <button onClick={() => setShowSettings(v => !v)}>
            {showSettings ? "Git" : "Settings"}
          </button>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="h-6 border-t flex shrink-0">
        <GitStatus />
        <StatusBar />
      </div>
    </div>
  );
};
