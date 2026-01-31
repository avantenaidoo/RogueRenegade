import { useEffect, useState } from "react";
import { MenuBar } from "./Menu";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Initial state
    appWindow.isMaximized().then(setIsMaximized);

    // Listen for resize/maximize changes
    const unlisten = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

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
      </div>

      {/* CENTER */}
      <div data-tauri-drag-region className="text-xs text-muted">
        rogue-renegade-ide
      </div>

      {/* RIGHT — WINDOW CONTROLS */}
      <div className="flex">
        {/* MINIMIZE */}
        <button
          data-tauri-drag-region={false}
          className="w-10 h-9 flex items-center justify-center hover:bg-neutral-500"
          onClick={() => appWindow.minimize()}
        >
          —
        </button>

        {/* MAXIMIZE / RESTORE */}
        <button
          data-tauri-drag-region={false}
          className="w-10 h-9 flex items-center justify-center hover:bg-neutral-500"
          onClick={() => appWindow.toggleMaximize()}
        >
          {isMaximized ? "🗗" : "▢"}
        </button>

        {/* CLOSE */}
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
