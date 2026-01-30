// src/pages/Workspace.tsx
import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window"; // ✅ TAURI v2 CORRECT

import { useEditorStore } from "../store";
import { initCollaboration } from "../utils/collaboration";
import { Canvas } from "@/components/Canvas";

export default function Workspace() {
  const {
    tabs,
    activeTabIndex,
    updateTab,
    setActiveTab,
    closeTab,
    markClean,
    setRepoPath,
    addRecentFolder
  } = useEditorStore();

  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [dirtyFiles, setDirtyFiles] = useState<string[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const activeTab = tabs[activeTabIndex];

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
     🔥 DEBUG: NATIVE MENU SAVE EVENTS
     ───────────────────────────── */
  useEffect(() => {
    const unlistenSave = listen("menu-save", () => {
      console.log("🔥 FRONTEND RECEIVED: SAVE");
    });

    const unlistenSaveAs = listen("menu-save-as", () => {
      console.log("🔥 FRONTEND RECEIVED: SAVE AS");
    });

    return () => {
      unlistenSave.then(f => f());
      unlistenSaveAs.then(f => f());
    };
  }, []);

  /* ─────────────────────────────
     🚪 STEP 8 — EXIT (MENU)
     ───────────────────────────── */
  useEffect(() => {
    const window = getCurrentWindow();

    const unlistenExit = listen("menu-exit", () => {
      console.log("🚪 FRONTEND RECEIVED: EXIT");
      window.close(); // ✅ TAURI v2 CORRECT
    });

    return () => {
      unlistenExit.then(f => f());
    };
  }, []);

  /* ─────────────────────────────
     🔥 OPEN RECENT (FROM RUST MENU)
     ───────────────────────────── */
  useEffect(() => {
    const unlisten = listen<string>("open-recent", async (event) => {
      console.log("🔥 RUST MENU OPEN RECENT:", event.payload);
      const path = event.payload;

      await invoke("allow_workspace_dir", { path });
      setRepoPath(path);
      addRecentFolder(path);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [setRepoPath, addRecentFolder]);

  return <Canvas />;
}
