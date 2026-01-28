interface SettingsProps {
  theme: "vs-dark" | "vs-light";
  setTheme: (theme: "vs-dark" | "vs-light") => void;
}

export default function SettingsPanel({ theme, setTheme }: SettingsProps) {
  const isDark = theme === "vs-dark";

  return (
    <div className="h-full w-full flex flex-col gap-6 p-4">
      {/* HEADER */}
      <h4 className="text-(--text-main) dark:text-(--text-main-dark) font-semibold">
        Settings
      </h4>

      {/* THEME ROW */}
      <div className="flex items-center gap-4 text-(--text-main) dark:text-(--text-main-dark)">
        <span className="text-sm">Theme</span>

        {/* TOGGLE — SAME INVERTED BEHAVIOR AS YOUR ORIGINAL */}
        <button
          onClick={() => setTheme(isDark ? "vs-light" : "vs-dark")}
          className="relative w-14 h-7 rounded-full transition-colors duration-300
                     focus:outline-none bg-(--toggle-track)"
        >
          {/* THUMB */}
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full
              transition-transform duration-300 bg-(--foreground)
              ${isDark ? "translate-x-7" : "translate-x-0"}`}
          />
        </button>

        <span className="text-sm">
          {isDark ? "Dark" : "Light"}
        </span>
      </div>
    </div>
  );
}
