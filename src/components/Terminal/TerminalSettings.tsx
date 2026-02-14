import { useState } from "react";

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
        onClick={() => setOpen(v => !v)}
        className="px-1 hover:text-default"
        title="Select Terminal Type"
      >
        ▾
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 top-8 w-44 bg-muted border border-default shadow-lg z-50">
          {SHELL_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => {
                setOpen(false);
                onSpawn(opt.value);
              }}
              className="w-full text-left px-3 py-2 hover:bg-default"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
