import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import { useEditorStore } from "../store";
import { initCollaboration } from "../utils/collaboration";
import { Canvas } from "@/components/Canvas";

export default function Workspace() {
  const {
    tabs,
    activeTabIndex,
    setRepoPath,
    addRecentFolder
  } = useEditorStore();

  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [isDarkMode, setIsDarkMode] = useState(true);

  /* ─────────────────────────────
     INIT COLLAB
     ───────────────────────────── */
  useEffect(() => {
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
     🚪 EXIT (MENU)
     ───────────────────────────── */
  useEffect(() => {
    const unlistenExit = listen("menu-exit", async () => {
      console.log("🚪 FRONTEND RECEIVED: EXIT");

      const state = useEditorStore.getState();
      const activeTab = state.tabs[state.activeTabIndex];

      await invoke("log_and_exit", {
        lastWorkspace: state.repoPath ?? null,
        lastFile: activeTab?.path ?? null
      });
    });

    return () => {
      unlistenExit.then(f => f());
    };
  }, []);

  /* ─────────────────────────────
     🔥 STEP 11 — RESTORE (CORRECT)
     ───────────────────────────── */
  useEffect(() => {
    (async () => {
      console.log("🔁 FRONTEND REQUESTING LAST SESSION");

      await invoke("frontend_log", {
        message: "🔁 FRONTEND REQUESTING LAST SESSION"
      });

      const session = await invoke<{
        last_workspace: string | null;
        last_file: string | null;
      } | null>("get_last_session");

      if (!session) return;

      if (session.last_workspace) {
        console.log("📁 Restoring workspace:", session.last_workspace);

        await invoke("frontend_log", {
          message: `📁 Restoring workspace: ${session.last_workspace}`
        });



        await invoke("allow_workspace_dir", { path: session.last_workspace });
        setRepoPath(session.last_workspace);
        addRecentFolder(session.last_workspace);
      }

      if (session.last_file) {
        console.log("📄 Restoring last file:", session.last_file);
      }
    })();
  }, [setRepoPath, addRecentFolder]);

  return <Canvas />;
}
