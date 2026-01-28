import React from "react";
import FileExplorer from "./FileExplorer";
import Editor from "./Editor";
import GitPanel from "./GitPanel";
import GitStatus from "./GitStatus";
import StatusBar from "./StatusBar";
import { useEditorStore } from "../store";

export const Canvas: React.FC = () => {
  const {
    tabs,
    activeTabIndex,
    updateTab,
  } = useEditorStore();

  const activeTab = tabs[activeTabIndex];

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 overflow-hidden">
      {/* ================= MAIN WORKSPACE ================= */}
      <div className="flex flex-1 overflow-hidden">
        {/* -------- FILE EXPLORER (LEFT) -------- */}
        <div className="w-60 shrink-0 border-r border-neutral-800 overflow-hidden">
          <FileExplorer />
        </div>

        {/* -------- EDITOR (FILL REST OF WIDTH) -------- */}
        <div className="flex-1 min-w-0 flex overflow-hidden">
          {activeTab ? (
            <Editor
              value={activeTab.content}
              path={activeTab.path}
              theme="vs-dark"
              onChange={(val) => {
                updateTab(activeTabIndex, {
                  content: val ?? "",
                });
              }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-neutral-500">
              No file open
            </div>
          )}
        </div>
      </div>

      {/* ================= GIT PANEL (BOTTOM) ================= */}
      <div className="h-40 shrink-0 border-t border-neutral-800 overflow-hidden">
        <GitPanel />
      </div>

      {/* ================= STATUS BAR ================= */}
      <div className="h-6 shrink-0 flex border-t border-neutral-800">
        <GitStatus />
        <StatusBar />
      </div>
    </div>
  );
};
