import React, { useEffect, useState } from "react";
import { writeTextFile } from "@tauri-apps/plugin-fs";

import TitleBar from "./Titlebar/TitleBar";
import FileExplorer from "./FileExplorer";
import Editor from "./Editor";
import GitPanel from "./GitPanel";
import GitStatus from "./GitStatus";
import StatusBar from "./StatusBar";
import CollaborationPanel from "./CollaborationPanel";
import DashboardOverlay from "../dashboard/DashboardOverlay";


import { useEditorStore } from "../store";

import { backendFetch } from "../lib/backend";

import TerminalPanel from "./Terminal/TerminalPanel";
interface CanvasProps {
  onSwitchAccount: () => void;
  onLogout: () => void;
  pendingApprovalCount: number;
  refreshPendingApprovals: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  onSwitchAccount,
  onLogout,
  pendingApprovalCount,
  refreshPendingApprovals,
}) => {
    /* ───────────── WORKSPACE BOOTSTRAP (RUN ONCE) ───────────── */
    useEffect(() => {
      useEditorStore.getState().loadWorkspaces();
    }, []);
  const {
    // 🔥 workspace-aware
    focusedWorkspaceId,
    tabsByWorkspace,
    activeTabIndexByWorkspace,

    setActiveTab,
    closeTab,
    updateTab,
    markClean,
    showCollaboration,
  } = useEditorStore();


  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [showDashboard, setShowDashboard] = useState(false);

    /* ───────────── BACKEND CONNECTIVITY TEST ───────────── */
    useEffect(() => {
        backendFetch("/ping")
        .then((res) => {
            console.log("✅ BACKEND SIGNED PING OK", res);
        })
        .catch((err) => {
            console.error("❌ BACKEND SIGNED PING FAILED", err);
        });
    }, []);



  /* 🔥 COLLAB SIDEBAR WIDTH */
  const [collabWidth, setCollabWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  /* 🔥🔥🔥 CHAT MAXIMIZE STATE (THIS WAS MISSING) 🔥🔥🔥 */
  const [isChatMaximized, setIsChatMaximized] = useState(false);

  const [bottomTab, setBottomTab] = useState<"git" | "terminal">("git");



  // 🔥 WORKSPACE-AWARE TAB DERIVATION
  const workspaceTabs =
    focusedWorkspaceId
      ? tabsByWorkspace[focusedWorkspaceId] ?? []
      : [];

  const workspaceActiveIndex =
    focusedWorkspaceId
      ? activeTabIndexByWorkspace[focusedWorkspaceId] ?? 0
      : 0;

  const activeTab = workspaceTabs[workspaceActiveIndex];


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

  /* ───────────── TOGGLE TERMINAL (CTRL+`) ───────────── */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        setBottomTab((t) => (t === "terminal" ? "git" : "terminal"));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ───────────── RESIZE HANDLING ───────────── */
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isResizing || isChatMaximized) return;

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
  }, [isResizing, isChatMaximized]);

  useEffect(() => {
    console.log("showDashboard =", showDashboard);
  }, [showDashboard]);


  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* TITLE BAR */}
      <TitleBar onToggleDashboard={() => setShowDashboard(v => !v)} />

      {/* MAIN AREA */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — FILE EXPLORER */}
        {!isChatMaximized && (
          <div className="w-60 border-r overflow-auto">
            <FileExplorer />
          </div>
        )}

        {/* CENTER — EDITOR */}
        {!isChatMaximized && (
          <div className="flex flex-col flex-1 min-w-0">
            {/* TABS */}
            <div className="h-9 flex border-b shrink-0 overflow-x-auto">
              {workspaceTabs.map((tab, i) => (
                <div
                  key={tab.path}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-3 text-sm cursor-pointer
                    ${
                      i === workspaceActiveIndex
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
                    updateTab(workspaceActiveIndex, { content: val ?? "" });
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* 🔥 RIGHT — COLLABORATION PANEL */}
        {showCollaboration && (
          <div
            className="flex border-l bg-muted overflow-hidden"
            style={{
              width: isChatMaximized ? "100%" : collabWidth,
            }}
          >
            {/* RESIZE HANDLE (DISABLED WHEN MAXIMIZED) */}
            {!isChatMaximized && (
              <div
                className="w-1 cursor-col-resize hover:bg-blue-500/40"
                onMouseDown={() => setIsResizing(true)}
              />
            )}

            {/* PANEL CONTENT */}
            <div className="flex-1 overflow-hidden">
              <CollaborationPanel
                username="local-user"
                roomId="workspace"
                onToggleMaximize={() =>
                  setIsChatMaximized(v => !v)
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM PANEL */}
      {!isChatMaximized && (
        <div className="h-40 border-t flex flex-col">
          <div className="flex border-b text-sm">
            <button onClick={() => setBottomTab("git")}>Git</button>
            <button onClick={() => setBottomTab("terminal")}>Terminal</button>
          </div>

          <div className="flex-1 overflow-hidden">
            {bottomTab === "git" && <GitPanel />}
            {bottomTab === "terminal" && <TerminalPanel />}
          </div>
        </div>
      )}

      {/* STATUS BAR */}
      {!isChatMaximized && (
        <div className="h-6 border-t flex shrink-0">
          <GitStatus />
          <StatusBar />
        </div>
      )}
        <DashboardOverlay
        open={showDashboard}
        onClose={() => setShowDashboard(false)}
        theme={theme}
        setTheme={setTheme}
        onSwitchAccount={onSwitchAccount}
        onLogout={onLogout}
        pendingApprovalCount={pendingApprovalCount}
        refreshPendingApprovals={refreshPendingApprovals}
        />

    </div>
  );
};
