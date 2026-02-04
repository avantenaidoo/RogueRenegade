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
    setActiveTab
  } = useEditorStore();

  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [isDarkMode, setIsDarkMode] = useState(true);

  const appWindow = getCurrentWindow();

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
    const saveSession = async () => {
      const state = useEditorStore.getState();

      console.log("🧠 STATE AT EXIT", {
        tabs: state.tabs,
        activeTabIndex: state.activeTabIndex,
        repoPath: state.repoPath
      });

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
          path: t.path,
          cursor: t.cursor
        }));

      console.log("💾 SAVING SESSION PAYLOAD", {
        last_workspace: state.repoPath ?? null,
        open_files: openFiles,
        active_file: activeTab?.path ?? null,
        cursors
      });

      // 🔥 AUTO-SAVE DIRTY FILES
      for (const tab of state.tabs) {
        if (tab.dirty && tab.path && tab.path !== "untitled") {
          await writeTextFile(tab.path, tab.content);
          console.log("💾 AUTO-SAVED", tab.path);
        }
      }

      await invoke("log_and_exit", {
        lastWorkspace: state.repoPath ?? null,
        openFiles,
        activeFile: activeTab?.path ?? null,
        cursors
      });
    };

    // MENU EXIT
    const unlistenMenu = listen("menu-exit", async () => {
      console.log("🚪 MENU EXIT");
      await saveSession();
    });

    // REAL WINDOW CLOSE (TAURI v2)
    const unlistenClose = appWindow.onCloseRequested(
      async (event: CloseRequestedEvent) => {
        console.log("❌ WINDOW CLOSE (PREVENTED)");
        event.preventDefault();
        await saveSession();
      }
    );

    return () => {
      unlistenMenu.then((f: () => void) => f());
      unlistenClose.then((f: () => void) => f());
    };
  }, [appWindow]);

  /* ─────────────────────────────
     🔁 RESTORE SESSION + CURSORS
     ───────────────────────────── */
  useEffect(() => {
    (async () => {
      console.log("🔁 REQUESTING LAST SESSION FROM RUST");

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

      if (session.last_workspace) {
        await invoke("allow_workspace_dir", {
          path: session.last_workspace
        });

        setRepoPath(session.last_workspace);
        addRecentFolder(session.last_workspace);
      }

      for (const path of session.open_files) {
        try {
          const content = await invoke<string>("read_file", { path });

          const state = useEditorStore.getState();
          const existingIndex = state.tabs.findIndex(t => t.path === path);
          const index = existingIndex !== -1 ? existingIndex : state.tabs.length;

          updateTab(index, { path, content });

          const cursorEntry = session.cursors?.find(c => c.path === path);
          if (cursorEntry) {
            updateTab(index, { cursor: cursorEntry.cursor });
            console.log("🎯 Restored cursor for", path, cursorEntry.cursor);
          }
        } catch (err) {
          console.error("❌ FAILED TO RESTORE FILE", path, err);
        }
      }

      if (session.active_file) {
        const state = useEditorStore.getState();
        const index = state.tabs.findIndex(
          t => t.path === session.active_file
        );
        if (index !== -1) setActiveTab(index);
      }

      console.log("✅ FINAL STATE AFTER RESTORE", useEditorStore.getState());
    })();
  }, [setRepoPath, addRecentFolder, updateTab, setActiveTab]);

  return <Canvas
            onSwitchAccount={onSwitchAccount}
            onLogout={onLogout}
            pendingApprovalCount={pendingApprovalCount}
            refreshPendingApprovals={refreshPendingApprovals}
         />;
}
