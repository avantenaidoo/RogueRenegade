interface SettingsProps {
  theme: "vs-dark" | "vs-light";
  setTheme: (theme: "vs-dark" | "vs-light") => void;
}

export default function SettingsPanel({ theme, setTheme }: SettingsProps) {
  return (
    <div className="border-t border-gray-300 dark:border-gray-700 p-2 flex flex-col gap-2 bg-white dark:bg-black">
      <h4 className="text-black dark:text-white">Settings</h4>
      <label className="flex flex-col text-black dark:text-white">
        Theme:
        <select
          value={theme}
          onChange={e => setTheme(e.target.value as any)}
          className="mt-1 px-2 py-1 border border-gray-400 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-black dark:text-white"
        >
          <option value="vs-dark">Dark</option>
          <option value="vs-light">Light</option>
        </select>
      </label>
    </div>
  );
}
