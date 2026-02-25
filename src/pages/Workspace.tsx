import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
  getCurrentWindow,
  type CloseRequestedEvent
} from "@tauri-apps/api/window";

import { useEditorStore } from "../store";
import { initCollaboration } from "../utils/collaboration";
import { Canvas } from "@/components/Canvas";
import { writeTextFile } from "@tauri-apps/plugin-fs";

interface WorkspaceProps {
  onSwitchAccount: () => void;
  onLogout: () => void;
  pendingApprovalCount: number;
  refreshPendingApprovals: () => void;
}


export default function Workspace({
  onSwitchAccount,
  onLogout,
  pendingApprovalCount,
  refreshPendingApprovals,
}: WorkspaceProps) {
  const {
    setRepoPath,
    addRecentFolder,
    updateTab,
    setActiveTab,
    loadWorkspaces,
  } = useEditorStore();

  const [_theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [isDarkMode, _setIsDarkMode] = useState(true);

  const appWindow = getCurrentWindow();

  const params = new URLSearchParams(window.location.search);
  const isInitialBlankWindow = params.get("blank") === "true";

  console.log("🪟 WINDOW MODE", window.location.href, isInitialBlankWindow);


  let isClosing = false;


  /* ─────────────────────────────
     INIT COLLAB
     ───────────────────────────── */
  useEffect(() => {
    console.log("🟢 INIT COLLAB");
    initCollaboration("avant", "room-1");
  }, []);

  /* ─────────────────────────────
     THEME TOGGLE
     ───────────────────────────── */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    setTheme(isDarkMode ? "vs-dark" : "vs-light");
  }, [isDarkMode]);

  /* ─────────────────────────────
     💾 SAVE SESSION + AUTO SAVE + CURSORS
     ───────────────────────────── */
  useEffect(() => {
    const saveSessionOnly = async () => {
      const state = useEditorStore.getState();

      const activeTab =
        state.tabs.length > 0
          ? state.tabs[Math.min(state.activeTabIndex, state.tabs.length - 1)]
          : null;

      const openFiles = state.tabs
        .map(t => t.path)
        .filter(p => p && p !== "untitled");

      const cursors = state.tabs
        .filter(t => t.path && t.cursor)
        .map(t => ({
          path: t.path!,
          cursor: t.cursor!
        }));

      // auto-save dirty files
      for (const tab of state.tabs) {
        if (tab.dirty && tab.path && tab.path !== "untitled") {
          await writeTextFile(tab.path, tab.content);
        }
      }

      await invoke("save_session", {
        lastWorkspace: state.repoPath ?? null,
        openFiles,
        activeFile: activeTab?.path ?? null,
        cursors
      });
      useEditorStore.getState().saveTerminals();
    };

    // MENU EXIT
    const unlistenMenu = listen("menu-exit", async () => {
      console.log("🚪 MENU EXIT");
      await saveSessionOnly();
    });

    // REAL WINDOW CLOSE (TAURI v2)
    const unlistenClose = appWindow.onCloseRequested(
      async (event: CloseRequestedEvent) => {
        if (isClosing) {
          console.log("🟢 CLOSE: already handled, letting window close");
          return;
        }

        console.log("🛑 CLOSE REQUEST INTERCEPTED");
        event.preventDefault();

        isClosing = true;

        console.log("💾 CLOSE: saving session");
        await saveSessionOnly();

        useEditorStore.getState().saveTerminals();

        console.log("🚪 CLOSE: closing window for real");
        await appWindow.close();
      }
    );

    // 🔄 PAGE RELOAD (Ctrl+R / Dev Refresh)
    const handleBeforeUnload = () => {
      console.log("🔄 RELOAD — saving session");
      saveSessionOnly();
      useEditorStore.getState().saveTerminals();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);



    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unlistenMenu.then((f: () => void) => f());
      unlistenClose.then((f: () => void) => f());
    };
  }, [appWindow]);

  /* ─────────────────────────────
     🔁 RESTORE SESSION + CURSORS
     ───────────────────────────── */

  
  useEffect(() => {
    if (isInitialBlankWindow) {
      // 🔥 REMOVE blank=true AFTER FIRST LOAD
      const url = new URL(window.location.href);
      url.searchParams.delete("blank");
      window.history.replaceState({}, "", url.toString());

      console.log("🧹 BLANK FLAG CLEARED — future reloads will restore session");
      return;
    }

    (async () => {
      console.log("🔁 REQUESTING LAST SESSION FROM RUST");

      // Load workspaces first
      await loadWorkspaces();

      const session = await invoke<{
        last_workspace: string | null;
        open_files: string[];
        active_file: string | null;
        cursors?: {
          path: string;
          cursor: { lineNumber: number; column: number };
        }[];
      }>("get_last_session");

      console.log("📥 SESSION RECEIVED FROM RUST", session);

      if (!session) return;

      const hasWorkspace =
        !!session.last_workspace || session.open_files.length > 0;

      if (isInitialBlankWindow && !hasWorkspace) {
        console.log("🆕 BLANK WINDOW WITH NO CONTENT — skipping restore");
        return;
      }

      if (session.last_workspace) {
        await invoke("allow_workspace_dir", {
          path: session.last_workspace
        });

        setRepoPath(session.last_workspace);
        addRecentFolder(session.last_workspace);

        // FIX: Update root_path in workspaces array for active workspace
        const currentState = useEditorStore.getState();
        const activeId = currentState.focusedWorkspaceId;
        if (activeId && session.last_workspace !== null) {  // null check here
          const activeIndex = currentState.workspaces.findIndex(w => w.id === activeId);
          if (activeIndex !== -1 && currentState.workspaces[activeIndex].root_path !== session.last_workspace) {
            useEditorStore.setState(prev => {
              const newWorkspaces = [...prev.workspaces];
              newWorkspaces[activeIndex] = {
                ...newWorkspaces[activeIndex],
                root_path: session.last_workspace as string  // Type assertion safe after null check
              };
              return { workspaces: newWorkspaces };
            });
          }
        }
      }

for (const path of session.open_files) {
  try {
    let content = "";

    // 🔥 HANDLE DIFF TABS CORRECTLY
    if (path.startsWith("diff://")) {
      const [, rest] = path.split("diff://");
      const [realPath, commitId] = rest.split("@");

      if (!session.last_workspace) continue;

      content = await invoke<string>(
        "git_get_commit_diff_for_file",
        {
          repoPath: session.last_workspace,
          commitId,
          filePath: realPath,
        }
      );
    } else {
      // 🔥 NORMAL FILE
      content = await invoke<string>("read_file", { path });
    }

    const state = useEditorStore.getState();
    const existingIndex = state.tabs.findIndex(t => t.path === path);
    const index =
      existingIndex !== -1 ? existingIndex : state.tabs.length;

    updateTab(index, { path, content });

    const cursorEntry = session.cursors?.find(c => c.path === path);
    if (cursorEntry) {
      updateTab(index, { cursor: cursorEntry.cursor });
    }

  } catch (err) {
    console.error("❌ FAILED TO RESTORE FILE", path, err);
  }
}

      // Always select the first tab on refresh
      const state = useEditorStore.getState();
      if (state.tabs.length > 0) {
        console.log("🔥 Refresh: forcing first tab as active:", state.tabs[0].path);
        setActiveTab(0);
      }

      console.log("✅ FINAL STATE AFTER RESTORE", useEditorStore.getState());
    })();
  }, [setRepoPath, addRecentFolder, updateTab, setActiveTab, loadWorkspaces]);

  return <Canvas
            onSwitchAccount={onSwitchAccount}
            onLogout={onLogout}
            pendingApprovalCount={pendingApprovalCount}
            refreshPendingApprovals={refreshPendingApprovals}
         />;
}