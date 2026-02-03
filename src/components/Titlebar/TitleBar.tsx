import { useEffect, useState } from "react";
import { MenuBar } from "./Menu";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEditorStore } from "../../store";

interface TitleBarProps {
  onToggleDashboard: () => void;
}


const appWindow = getCurrentWindow();

export default function TitleBar({ onToggleDashboard }: TitleBarProps) {

  const [isMaximized, setIsMaximized] = useState(false);
  const repoPath = useEditorStore(state => state.repoPath);
  const toggleCollaboration = useEditorStore(
    state => state.toggleCollaboration
  );
  const showCollaboration = useEditorStore(
    state => state.showCollaboration
  );

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);

    const unlisten = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  /* 🔥 KEYBOARD SHORTCUT — Ctrl/Cmd + Shift + C */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        toggleCollaboration();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCollaboration]);

  const folderName = repoPath
    ? repoPath.split(/[\\/]/).pop()
    : "No Folder";

  return (
    <div
      data-tauri-drag-region
      className="h-9 flex items-center justify-between bg-muted text-default border-b border-default select-none"
    >
      {/* LEFT */}
      <div className="flex items-center gap-3 px-3">
        <div
          data-tauri-drag-region
          className="w-6 h-6 flex items-center justify-center"
        >
          <img src="/RRLogo.png" className="w-4 h-4" draggable={false} />
        </div>

        <MenuBar />
        <button
            data-tauri-drag-region={false}
            className="text-xs px-2 py-1 rounded hover:bg-neutral-500/20"
            onClick={onToggleDashboard}
          >
            Dashboard
        </button>

      </div>

      {/* CENTER — VS CODE STYLE */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 text-xs text-muted"
      >
        <span>{folderName}</span>
        <span className="opacity-70">🔍</span>

        <button
          data-tauri-drag-region={false}
          title="Collaboration (Ctrl+Shift+C)"
          className="relative w-6 h-6 flex items-center justify-center hover:bg-neutral-500 rounded"
          onClick={toggleCollaboration}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          </svg>

          {showCollaboration && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>
      </div>

      {/* RIGHT — WINDOW CONTROLS */}
      <div className="flex">
        <button
          data-tauri-drag-region={false}
          className="w-10 h-9 flex items-center justify-center hover:bg-neutral-500"
          onClick={() => appWindow.minimize()}
        >
          —
        </button>

        <button
          data-tauri-drag-region={false}
          className="w-10 h-9 flex items-center justify-center hover:bg-neutral-500"
          onClick={() => appWindow.toggleMaximize()}
        >
          {isMaximized ? "🗗" : "▢"}
        </button>

        <button
          data-tauri-drag-region={false}
          className="w-10 h-9 flex items-center justify-center hover:bg-red-600"
          onClick={() => appWindow.close()}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
