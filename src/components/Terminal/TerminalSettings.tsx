import { useState } from "react";
import { createPortal } from "react-dom";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  Placement,
} from "@floating-ui/react-dom";

const SHELL_OPTIONS = [
  { label: "Default (OS)", value: null },
  { label: "PowerShell", value: "powershell" },
  { label: "Command Prompt", value: "cmd" },
  { label: "Bash", value: "bash" },
  { label: "Zsh", value: "zsh" },
  { label: "Azure", value: "azure" },
  { label: "Ubuntu (WSL)", value: "wsl-ubuntu" },
];

interface TerminalSettingsProps {
  onSpawn: (shell: string | null) => void;
}

export default function TerminalSettings({ onSpawn }: TerminalSettingsProps) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, placement, x, y, strategy } = useFloating({
    open,
    placement: "bottom-end" as Placement,
    middleware: [
      offset(6),
      flip({
        fallbackPlacements: ["top-end", "top-start", "bottom-start"],
        padding: 8,
      }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const isDropUp = placement.startsWith("top");

  // ────────────────────────────── DEBUG LOGGING ──────────────────────────────
  if (open) {
    console.log("=== TERMINAL DROPDOWN DEBUG ===");
    console.log("Current placement (should flip to top-* when low):", placement);
    console.log("Strategy:", strategy);
    console.log("Computed x / y:", x, y);
    console.log("Floating styles object:", floatingStyles);
    
    if (refs.reference.current) {
      const rect = refs.reference.current.getBoundingClientRect();
      console.log("Reference button position:", {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      });
      console.log("Space below button:", window.innerHeight - rect.bottom);
    } else {
      console.log("WARNING: Reference button ref is missing!");
    }

    console.log("Is drop-up mode active?", isDropUp);
    console.log("================================");
  }
  // ───────────────────────────────────────────────────────────────────────────

  const menuContent = open ? (
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        zIndex: 99999,           // very high so it punches through everything
        minWidth: "192px",       // w-48 = 12rem = 192px
      }}
      className={`
        bg-default border border-default shadow-2xl rounded-md 
        overflow-hidden origin-${isDropUp ? "bottom" : "top"}
        transition-opacity duration-100
      `}
    >
      {SHELL_OPTIONS.map((opt) => (
        <button
          key={opt.label}
          onClick={() => {
            onSpawn(opt.value);
            setOpen(false);
          }}
          className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-500  hover:text-white transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative flex items-center">
      {/* + Button */}
      <button
        onClick={() => onSpawn(null)}
        className="p-1 hover:text-default transition-colors"
        title="New Terminal"
      >
        +
      </button>

      {/* Dropdown Toggle */}
      <button
        ref={refs.setReference}
        onClick={() => setOpen((v) => !v)}
        className="px-1 hover:text-default"
        title="Select Terminal Type"
      >
        ▾
      </button>

      {menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}