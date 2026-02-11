import React from "react";

export const shellOptionsWin = ["powershell", "cmd", "bash"];
export const shellOptionsUnix = ["bash", "zsh", "fish"];

interface TerminalSettingsProps {
  shell: string;
  setShell: (shell: string) => void;
  isWindows: boolean;
}

export default function TerminalSettings({
  shell,
  setShell,
  isWindows,
}: TerminalSettingsProps) {
  const options = isWindows ? shellOptionsWin : shellOptionsUnix;

  return (
    <div className="flex items-center gap-2 bg-gray-800 text-white p-1">
      <label htmlFor="shell-select" className="text-sm">
        Shell:
      </label>
      <select
        id="shell-select"
        value={shell}
        onChange={(e) => setShell(e.target.value)}
        className="bg-gray-700 text-white p-1 rounded"
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
