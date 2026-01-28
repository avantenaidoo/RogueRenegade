import { useState } from "react";
import { openFolder } from "../utils/openFolder";
import { openFile } from "../utils/openFile";

export default function TitleBar() {
  const [openMenu, setOpenMenu] = useState<null | "file">(null);

  return (
    <div
      data-tauri-drag-region
      className="h-9 flex items-center justify-between
                 bg-muted text-default border-b border-default
                 select-none relative"
    >
      {/* ───── Left: Logo + Menus ───── */}
      <div className="flex items-center gap-3 px-3">
        {/* App Logo */}
        <div
          data-tauri-drag-region
          className="w-6 h-6 flex items-center justify-center"
        >
          <img
            src="/RRLogo.png"
            alt="Rogue Renegade IDE"
            className="w-4 h-4"
            draggable={false}
          />
        </div>

        {/* Menu bar */}
        <div className="flex items-center gap-3 text-xs relative">
          {/* FILE */}
          <button
            className="px-1 rounded hover:bg-default/10"
            onClick={() =>
              setOpenMenu(openMenu === "file" ? null : "file")
            }
          >
            File
          </button>

          {/* FILE DROPDOWN */}
          {openMenu === "file" && (
            <div
              className="absolute top-6 left-0 z-50 w-44
                         bg-muted border border-default shadow-lg"
            >
              <button
                className="w-full text-left px-3 py-1 hover:bg-default/10"
                onClick={() => {
                  setOpenMenu(null);
                  openFile();
                }}
              >
                Open File…
              </button>

              <button
                className="w-full text-left px-3 py-1 hover:bg-default/10"
                onClick={() => {
                  setOpenMenu(null);
                  openFolder();
                }}
              >
                Open Folder…
              </button>
            </div>
          )}

          {/* OTHER MENUS — UNTOUCHED */}
          {[
            "Edit",
            "Selection",
            "View",
            "Go",
            "Run",
            "Terminal",
            "Help",
          ].map((item) => (
            <button
              key={item}
              className="px-1 rounded hover:bg-default/10"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* ───── Center: Project + Search ───── */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="font-medium text-default">
          rogue-renegade-ide
        </span>
        <span className="opacity-60">⌕</span>
      </div>

      {/* ───── Right: Window controls ───── */}
      <div className="flex items-center">
        {["—", "▢", "✕"].map((icon, i) => (
          <button
            key={i}
            className="w-10 h-9 flex items-center justify-center
                       hover:bg-default/10"
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
