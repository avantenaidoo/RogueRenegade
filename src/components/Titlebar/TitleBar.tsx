import { MenuBar } from "./Menu";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export default function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="h-9 flex items-center justify-between bg-muted text-default border-b border-default select-none"
    >
      {/* LEFT */}
      <div className="flex items-center gap-3 px-3">
        {/* APP ICON */}
        <div
          data-tauri-drag-region
          className="w-6 h-6 flex items-center justify-center"
        >
          <img
            src="/RRLogo.png"
            className="w-4 h-4"
            draggable={false}
          />
        </div>

        {/* MENU BAR */}
        <MenuBar />
      </div>

      {/* CENTER */}
      <div
        data-tauri-drag-region
        className="text-xs text-muted"
      >
        rogue-renegade-ide
      </div>

      {/* RIGHT — WINDOW CONTROLS */}
      <div className="flex">
        <button
          className="w-10 h-9 flex items-center justify-center hover:bg-neutral-500"
          onClick={() => appWindow.minimize()}
        >
          —
        </button>

        <button
          className="w-10 h-9 flex items-center justify-center hover:bg-neutral-500"
          onClick={() => appWindow.toggleMaximize()}
        >
          ▢
        </button>

        <button
          className="w-10 h-9 flex items-center justify-center hover:bg-red-600"
          onClick={() => appWindow.close()}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
