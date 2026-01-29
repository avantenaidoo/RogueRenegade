// src/pages/Workspace.tsx
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

  useEffect(() => {
    initCollaboration("avant", "room-1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    setTheme(isDarkMode ? "vs-dark" : "vs-light");
  }, [isDarkMode]);

  // 🔥 NEW: LISTEN FOR NATIVE MENU "OPEN RECENT"
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
