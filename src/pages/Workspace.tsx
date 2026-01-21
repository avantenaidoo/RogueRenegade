import { useState, useEffect } from "react";
import { useEditorStore } from "../store";
import Editor from "../components/Editor";
import FileExplorer from "../components/FileExplorer";
import GitPanel from "../components/GitPanel";
import SettingsPanel from "../components/SettingsPanel";
import { saveFile } from "../utils/fs";
import "../App.css";

export default function Workspace() {
  const { tabs, activeTabIndex, updateTab, setActiveTab, closeTab } = useEditorStore();
  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [isDarkMode, setIsDarkMode] = useState(true);

  const activeTab = tabs[activeTabIndex];

  // =========================
  // 🔍 MUTATION OBSERVER DEBUG
  // =========================
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === "attributes") {
          const el = m.target as HTMLElement;
          const styles = getComputedStyle(el);
          if (
            document.documentElement.classList.contains("dark") &&
            styles.backgroundColor !== "rgb(0, 0, 0)" &&
            styles.backgroundColor !== "rgba(0, 0, 0, 0)"
          ) {
            console.warn(
              "🧨 ELEMENT WITH LIGHT BACKGROUND IN DARK MODE:",
              el,
              styles.backgroundColor,
              styles.color
            );
          }
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"],
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  // =========================
  // 🌗 DARK MODE TOGGLER
  // =========================
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      setTheme("vs-dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("vs-light");
    }

    // 🔎 Computed style check
    setTimeout(() => {
      const styles = getComputedStyle(document.body);
      console.group("🌗 COMPUTED BODY STYLES");
      console.log("background:", styles.backgroundColor);
      console.log("color:", styles.color);
      console.groupEnd();
    }, 300);
  }, [isDarkMode]);

  return (
    <div className="flex h-screen bg-default text-default dark:bg-muted dark:text-default">
      <FileExplorer />

      <div className="flex-1 flex flex-col">
        {/* Tab bar */}
        <div className="flex border-b border-gray-300 dark:border-gray-700">
          {tabs.map((t, i) => (
            <div
              key={t.path}
              className={`px-2 py-1 cursor-pointer ${
                i === activeTabIndex
                  ? "bg-gray-200 dark:bg-gray-800"
                  : "bg-gray-100 dark:bg-gray-900"
              }`}
              onClick={() => setActiveTab(i)}
            >
              <span className="font-semibold text-default dark:text-muted">
                {t.path.split("/").pop()}
              </span>
              <button
                className="ml-2 text-red-500 dark:text-red-400"
                onClick={() => closeTab(i)}
              >
                x
              </button>
            </div>
          ))}
        </div>

        {/* Editor */}
        {activeTab && (
          <Editor
            value={activeTab.content}
            onChange={(val) => val !== undefined && updateTab(activeTabIndex, val)}
            theme={theme}
            path={activeTab.path}
          />
        )}

        {/* Save Button */}
        <button
          className="mt-2 px-4 py-2 bg-default dark:bg-muted text-default dark:text-default border border-default dark:border-muted rounded hover:bg-gray-300 dark:hover:bg-gray-700"
          onClick={() =>
            activeTab && saveFile(activeTab.path, activeTab.content)
          }
        >
          Save
        </button>

        <GitPanel />

        {/* Settings Panel */}
        <SettingsPanel
          theme={theme}
          setTheme={(newTheme) => setIsDarkMode(newTheme === "vs-dark")}
        />
      </div>
    </div>
  );
}
