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

  useEffect(() => {
    console.log("🟢 INIT COLLAB");
    initCollaboration("avant", "room-1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    setTheme(isDarkMode ? "vs-dark" : "vs-light");
  }, [isDarkMode]);

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

    const unlistenMenu = listen("menu-exit", async () => {
      console.log("🚪 MENU EXIT");
      await saveSessionOnly();
    });

    const unlistenClose = appWindow.onCloseRequested(
      async (event: CloseRequestedEvent) => {
        if (isClosing) return;
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

    const handleBeforeUnload = () => {
      console.log("🔄 RELOAD — saving session");
      saveSessionOnly();
      useEditorStore.getState().saveTerminals();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unlistenMenu.then(f => f());
      unlistenClose.then(f => f());
    };
  }, [appWindow]);

  useEffect(() => {
    if (isInitialBlankWindow) {
      const url = new URL(window.location.href);
      url.searchParams.delete("blank");
      window.history.replaceState({}, "", url.toString());
      console.log("🧹 BLANK FLAG CLEARED");
      return;
    }

    (async () => {
      console.log("🔁 [RESTORE] START — requesting last session");

      await loadWorkspaces();

      const session = await invoke<{
        last_workspace: string | null;
        open_files: string[];
        active_file: string | null;
        cursors?: { path: string; cursor: { lineNumber: number; column: number } }[];
      }>("get_last_session");

      console.log("📥 [RESTORE] Session received:", session);

      if (!session) return;

      if (session.last_workspace) {
        await invoke("allow_workspace_dir", { path: session.last_workspace });
        setRepoPath(session.last_workspace);
        addRecentFolder(session.last_workspace);

        // Update workspace root_path if needed
        const currentState = useEditorStore.getState();
        const activeId = currentState.focusedWorkspaceId;
        if (activeId && session.last_workspace !== null) {
          const activeIndex = currentState.workspaces.findIndex(w => w.id === activeId);
          if (activeIndex !== -1 && currentState.workspaces[activeIndex].root_path !== session.last_workspace) {
            useEditorStore.setState(prev => {
              const newWorkspaces = [...prev.workspaces];
              newWorkspaces[activeIndex] = { ...newWorkspaces[activeIndex], root_path: session.last_workspace as string };
              return { workspaces: newWorkspaces };
            });
          }
        }
      }

      for (const path of session.open_files) {
        try {
          console.log(`[RESTORE] Processing file: ${path}`);

          let content = "";

          if (path.startsWith("diff://")) {
            // diff handling (unchanged + debug)
            const [, rest] = path.split("diff://");
            const [realPath, commitId] = rest.split("@");
            if (!session.last_workspace) continue;

            console.log(`[RESTORE DIFF] Fetching diff for ${realPath} @ ${commitId}`);
            const diff = await invoke<{ original: string; modified: string }>(
              "git_get_commit_diff_for_file",
              { repoPath: session.last_workspace, commitId, filePath: realPath }
            );

            content = diff.modified;
            const originalContent = diff.original;

            console.log(`[RESTORE DIFF] Content length: ${content.length}, starts: ${content.substring(0, 60)}...`);

            setTimeout(() => {
              const state = useEditorStore.getState();
              const idx = state.tabs.findIndex(t => t.path === path);
              const index = idx !== -1 ? idx : state.tabs.length;

              updateTab(index, { path, content, originalContent });
              const cursorEntry = session.cursors?.find(c => c.path === path);
              if (cursorEntry) updateTab(index, { cursor: cursorEntry.cursor });

              console.log(`[RESTORE DIFF] After updateTab - tab content preview: ${state.tabs[index]?.content?.substring(0, 60) || "missing"}...`);
            }, 0);
          } else {
            // Normal file
            console.log(`[RESTORE NORMAL] Calling read_file for ${path}`);
            content = await invoke<string>("read_file", { path });

            console.log(`[RESTORE NORMAL] read_file returned length: ${content.length}`);
            console.log(`[RESTORE NORMAL] Content starts: ${content.substring(0, 80)}...`);
            console.log(`[RESTORE NORMAL] Is data URI? ${content.startsWith("data:image/")}`);

            setTimeout(() => {
              const state = useEditorStore.getState();
              const idx = state.tabs.findIndex(t => t.path === path);
              const index = idx !== -1 ? idx : state.tabs.length;

              updateTab(index, { path, content });
              const cursorEntry = session.cursors?.find(c => c.path === path);
              if (cursorEntry) updateTab(index, { cursor: cursorEntry.cursor });

              console.log(`[RESTORE NORMAL] After updateTab - tab content preview: ${state.tabs[index]?.content?.substring(0, 80) || "missing"}...`);
            }, 0);
          }
        } catch (err) {
          console.error("[RESTORE ERROR] Failed file:", path, err);
        }
      }

      const state = useEditorStore.getState();
      if (state.tabs.length > 0) {
        console.log("🔥 [RESTORE] Forcing first tab active:", state.tabs[0].path);
        setActiveTab(0);
      }

      console.log("✅ [RESTORE] FINAL STATE:", useEditorStore.getState());
    })();
  }, [setRepoPath, addRecentFolder, updateTab, setActiveTab, loadWorkspaces]);

  return <Canvas
    onSwitchAccount={onSwitchAccount}
    onLogout={onLogout}
    pendingApprovalCount={pendingApprovalCount}
    refreshPendingApprovals={refreshPendingApprovals}
  />;
}