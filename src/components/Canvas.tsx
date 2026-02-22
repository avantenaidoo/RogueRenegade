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
import SidebarPanel from "./SidebarPanel";

import { useEditorStore } from "../store";

import TerminalPanel from "./Terminal/TerminalPanel";

import SourceControl from "./SourceControl";

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

  /* 🔥 LOAD FILE EXPLORER WIDTH */
  useEffect(() => {
    const saved = localStorage.getItem("explorerWidth");
    if (saved) {
      setExplorerWidth(Number(saved));
    }
  }, []);

  const {
    focusedWorkspaceId,
    repoPath,
    tabsByWorkspace,
    activeTabIndexByWorkspace,
    setActiveTab,
    closeTab,
    updateTab,
    markClean,
    showCollaboration,
    bottomTab,
    setBottomTab,
    toggleTerminalPanel,
  } = useEditorStore();

  const [showDashboard, setShowDashboard] = useState(false);

  /* 🔥 COLLAB SIDEBAR WIDTH */
  const [collabWidth, setCollabWidth] = useState(320);

  /* 🔥 FILE EXPLORER WIDTH */
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [isExplorerResizing, setIsExplorerResizing] = useState(false);

  const [isResizing, setIsResizing] = useState(false);

  /* 🔥 CHAT MAXIMIZE STATE */
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(260);
  const terminalDragging = React.useRef(false);

  // Sidebar panel state
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<string | null>("explorer");

  // Workspace tabs
  const workspaceTabs =
    focusedWorkspaceId ? tabsByWorkspace[focusedWorkspaceId] ?? [] : [];

  const workspaceActiveIndex =
    focusedWorkspaceId ? activeTabIndexByWorkspace[focusedWorkspaceId] ?? 0 : 0;

  const activeTab = workspaceTabs[workspaceActiveIndex];

  // Restore terminals
  useEffect(() => {
    useEditorStore.getState().loadWorkspaces();
    useEditorStore.getState().restoreTerminals();
  }, []);

  // Auto-save terminals
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state) => {
      const terminals = state.terminals;
      sessionStorage.setItem("rride:terminals", JSON.stringify(terminals));
    });
    return () => unsubscribe();
  }, []);

  // Theme
  const THEME_KEY = "rride:theme-preference-session";
  const getSystemTheme = (): "vs-dark" | "vs-light" =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "vs-light";

  const saved = sessionStorage.getItem(THEME_KEY);
  const initialTheme: "vs-dark" | "vs-light" =
    saved === "vs-dark" || saved === "vs-light" ? saved : getSystemTheme();

  document.documentElement.classList.toggle("dark", initialTheme === "vs-dark");

  const [theme, setTheme] = useState<"vs-dark" | "vs-light">(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "vs-dark");
  }, [theme]);

  useEffect(() => {
    sessionStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Save (CTRL+S)
  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!activeTab) return;
        await writeTextFile(activeTab.path, activeTab.content);
        updateTab(workspaceActiveIndex, { savedContent: activeTab.content });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, markClean]);

  // Toggle terminal (CTRL+`)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        toggleTerminalPanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTerminalPanel]);

  /* ───────────── RESIZE HANDLERS ───────────── */
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isResizing || isChatMaximized) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 240 && newWidth <= 600) setCollabWidth(newWidth);
    }
    function onMouseUp() {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
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
    function onMouseMove(e: MouseEvent) {
      if (!terminalDragging.current) return;
      setTerminalHeight((h) => Math.min(600, Math.max(120, h - e.movementY)));
    }
    function onMouseUp() {
      terminalDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isExplorerResizing || isChatMaximized) return;
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 420) setExplorerWidth(newWidth);
    }
    function onMouseUp() {
      setIsExplorerResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    if (isExplorerResizing) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isExplorerResizing, isChatMaximized]);

  const currentUser = useEditorStore((state) => state.currentUser);

  /* ───────────── RENDER ───────────── */
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TitleBar onToggleDashboard={() => setShowDashboard((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — SIDEBAR PANEL */}
        <SidebarPanel
          activePanel={activeSidebarPanel || ""}
          onSelectPanel={(panel) =>
            setActiveSidebarPanel((prev) => (prev === panel ? null : panel))
          }
        />

        {/* LEFT — FILE EXPLORER WITH TRANSITION */}
        <div
          className={`flex border-r overflow-hidden transition-all duration-300 ease-in-out ${
            isExplorerResizing ? "transition-none" : ""
          }`}
            style={{
              width:
                activeSidebarPanel === "explorer" || activeSidebarPanel === "sourceControl"
                  ? `${explorerWidth}px`
                  : "0px",
            }}

        >
        <div
          className={`flex-1 overflow-auto transition-opacity duration-300 ease-in-out ${
            activeSidebarPanel === "explorer" || activeSidebarPanel === "sourceControl"
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {activeSidebarPanel === "explorer" && <FileExplorer />}
          {activeSidebarPanel === "sourceControl" && <SourceControl />}
        </div>


            {(activeSidebarPanel === "explorer" ||
              activeSidebarPanel === "sourceControl") && (
              <div
                className="w-1 hover:bg-blue-500/40"
                style={{ cursor: "ew-resize" }}
                onMouseDown={() => {
                  setIsExplorerResizing(true);
                  document.body.style.cursor = "ew-resize";
                  document.body.style.userSelect = "none";
                }}
              />
            )}

        </div>

        {/* CENTER — EDITOR */}
        <div className="flex flex-col flex-1 min-w-0">
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
                <span className="truncate max-w-40">{tab.path.split(/[\\/]/).pop()}</span>
                {tab.dirty && <span className="w-2 h-2 rounded-full bg-red-500" />}
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

          <div className="flex-1 min-h-0">
            {activeTab && (
              <Editor
                value={activeTab.content}
                path={activeTab.path}
                theme={theme}
                onChange={(val) => {
                  if (!activeTab) return;
                  updateTab(workspaceActiveIndex, { content: val ?? "" });
                }}
              />
            )}
          </div>
        </div>

        {/* RIGHT — COLLAB PANEL WITH TRANSITION */}
        <div
          className={`flex border-l bg-muted overflow-hidden transition-all duration-300 ease-in-out ${
            isResizing ? "transition-none" : ""
          }`}
          style={{
            width: showCollaboration ? (isChatMaximized ? "100%" : `${collabWidth}px`) : "0px",
          }}
        >
          {showCollaboration && !isChatMaximized && (
            <div
              className="w-1 hover:bg-blue-500/40"
              style={{ cursor: "ew-resize" }}
              onMouseDown={() => {
                setIsResizing(true);
                document.body.style.cursor = "ew-resize";
                document.body.style.userSelect = "none";
              }}
            />
          )}

          <div
            className={`flex-1 overflow-hidden transition-opacity duration-300 ease-in-out ${
              showCollaboration ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {showCollaboration && (
              <CollaborationPanel
                username={currentUser?.username || "local-user"}
                roomId="workspace"
                onToggleMaximize={() => setIsChatMaximized((v) => !v)}
              />
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM PANEL WITH SMOOTH TRANSITION */}
      <div
        className={`border-t flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          bottomTab === "terminal" ? "max-h-[50vh] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {/* RESIZE HANDLE */}
        <div
          className={`h-1 bg-neutral-700 hover:bg-blue-500/50 transition-opacity duration-300 ${
            bottomTab === "terminal" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ cursor: "ns-resize" }}
          onMouseDown={() => {
            if (bottomTab !== "terminal") return;
            terminalDragging.current = true;
            document.body.style.cursor = "ns-resize";
            document.body.style.userSelect = "none";
          }}
        />

        {/* TAB BAR */}
        <div
          className={`flex border-b text-sm shrink-0 transition-opacity duration-300 ${
            bottomTab === "terminal" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <button onClick={() => setBottomTab("git")}>Git</button>
          <button onClick={() => setBottomTab("terminal")}>Terminal</button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden">
          {bottomTab === "git" && (
            <div className="h-full overflow-hidden transition-opacity duration-300 ease-in-out">
              <GitPanel />
            </div>
          )}

          {bottomTab === "terminal" && (
            <div className="h-full transition-opacity duration-300 ease-in-out">
              <div
                className={`h-1 bg-neutral-700 hover:bg-blue-500/50 transition-opacity duration-300 ${
                  bottomTab === "terminal" ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                style={{ cursor: "ns-resize" }}
                onMouseDown={() => {
                  if (bottomTab !== "terminal") return;
                  terminalDragging.current = true;
                  document.body.style.cursor = "ns-resize";
                  document.body.style.userSelect = "none";
                }}
              />
              <div
                style={{
                  height: terminalHeight,
                  // Disable transition during drag for zero lag
                  transition: terminalDragging.current
                    ? "none"
                    : "height 0.3s ease-in-out",
                  overflow: "hidden",
                }}
              >
                <TerminalPanel workspaceId={focusedWorkspaceId} workspaceRoot={repoPath} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="h-6 border-t flex shrink-0">
        <GitStatus />
        <StatusBar />
      </div>

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