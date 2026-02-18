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
  { label: "Git Bash", value: "C:\\Program Files\\Git\\bin\\bash.exe" },
  { label: "Bash (WSL)", value: "bash" },
  { label: "Zsh", value: "zsh" },
  { label: "Azure", value: "azure" },
  { label: "Ubuntu (WSL)", value: "wsl-ubuntu" },
];

interface TerminalSettingsProps {
  onSpawn: (shell: string | null, label: string) => void;
}

export default function TerminalSettings({ onSpawn }: TerminalSettingsProps) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, placement } = useFloating({
    open,
    placement: "bottom-end" as Placement,
    middleware: [offset(6), flip({ fallbackPlacements: ["top-end","top-start","bottom-start"], padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const isDropUp = placement.startsWith("top");

  const menuContent = open ? (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, zIndex: 99999, minWidth: "192px" }}
      className={`bg-default border border-default shadow-2xl rounded-md overflow-hidden origin-${isDropUp ? "bottom" : "top"} transition-opacity duration-100`}
      onMouseLeave={() => setOpen(false)}
    >
      {SHELL_OPTIONS.map((opt) => (
        <button
          key={opt.label}
          onClick={() => { onSpawn(opt.value, opt.label); setOpen(false); }}
          className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-500 hover:text-white transition-colors"
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
        onClick={() => onSpawn(null, "Default (OS)")}
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
