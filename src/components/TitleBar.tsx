export default function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="h-9 flex items-center justify-between
                 bg-muted text-default border-b border-default
                 select-none"
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
        <div className="flex items-center gap-3 text-xs">
          {["File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Help"].map(
            (item) => (
              <button
                key={item}
                className="px-1 rounded hover:bg-default/10"
              >
                {item}
              </button>
            )
          )}
        </div>
      </div>

      {/* ───── Center: Project + Search ───── */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="font-medium text-default">
          rogue-renegade-ide
        </span>
        <span className="opacity-60">⌕</span>
      </div>

      {/* ───── Right: Window controls (visual only for now) ───── */}
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
