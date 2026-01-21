interface SettingsProps {
  theme: "vs-dark" | "vs-light";
  setTheme: (theme: "vs-dark" | "vs-light") => void;
}

export default function SettingsPanel({ theme, setTheme }: SettingsProps) {
  const isDark = theme === "vs-dark";

  return (
    <div className="border-t border-(--border) dark:border-(--border-dark) p-2 flex flex-col gap-2 bg-(--bg-main) dark:bg-(--bg-main-dark)">
      <h4 className="text-(--text-main) dark:text-(--text-main-dark) font-semibold">Settings</h4>

      <div className="flex items-center gap-2 text-(--text-main) dark:text-(--text-main-dark)">
        <span>Theme:</span>

        {/* Modern dark/light toggle */}
        <button
          onClick={() => setTheme(isDark ? "vs-light" : "vs-dark")}
          className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none bg-(--toggle-track)"
        >
          {/* Slider circle */}
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full transition-transform duration-300
            ${isDark ? "translate-x-7" : "translate-x-0"} bg-(--foreground)`}
          />
        </button>

        {/* Optional text label next to toggle */}
        <span className="ml-2 text-(--text-main) dark:text-(--text-main-dark)">
          {isDark ? "Dark" : "Light"}
        </span>
      </div>
    </div>
  );
}
