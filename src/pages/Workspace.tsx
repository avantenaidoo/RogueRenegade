// src/pages/Workspace.tsx
import { useState, useEffect } from "react";
import { useEditorStore } from "../store";
import Editor from "../components/Editor";
import FileExplorer from "../components/FileExplorer";
import GitPanel from "../components/GitPanel";
import SettingsPanel from "../components/SettingsPanel";
import { saveFile } from "../utils/fs";
import "../App.css";
import GitStatus from "../components/GitStatus";
import StatusBar from "../components/StatusBar";

export default function Workspace() {
  const { tabs, activeTabIndex, updateTab, setActiveTab, closeTab } = useEditorStore();

  const markClean = useEditorStore(state => state.markClean);

  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [dirtyFiles, setDirtyFiles] = useState<string[]>([]);

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
     <div className="flex flex-col h-screen bg-default text-default dark:bg-muted dark:text-default">
    {/* Main workspace */}
    <div className="flex flex-1">
      <FileExplorer />

      <div className="flex-1 flex flex-col">
        {/* Tab bar */}
        <div className="flex border-b border-default bg=default">
          {tabs.map((t, i) => {
            const isDirty = dirtyFiles.includes(t.path);
            return (
              <div
                key={t.path}
                className={`px-2 py-1 cursor-pointer ${
                  i === activeTabIndex
                    ? "bg-muted text-default"
                    : "bg-default text-muted hover:bg-muted"
                }`}
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
                onClick={() => setActiveTab(i)}
              >
                <span
                  className={`font-semibold ${
                    isDirty
                      ? "text-red-500"
                      : "text-inherit"
                  }`}
                >
                  {t.path.split("/").pop()}
                </span>

                {t.branch && (
                  <span className="ml-2 px-1 text-xs rounded bg-muted text-muted">
                    {t.branch}
                  </span>
                )}

                {isDirty && (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}

                <button
                  className="ml-2 text-red-500 dark:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(i);
                  }}
                >
                  x
                </button>
              </div>
            );
          })}
        </div>

        {/* Editor */}
        {activeTab && (
          <Editor
            value={activeTab.content}
            onChange={(val) =>
              val !== undefined && updateTab(activeTabIndex, { content: val })
            }
            theme={theme}
            path={activeTab.path}
          />
        )}

        {/* Save + Git */}
        <button
          className="mt-2 px-4 py-2 bg-default dark:bg-muted text-default dark:text-default border border-default dark:border-muted rounded hover:bg-gray-300 dark:hover:bg-gray-700"
          onClick={() => {
            if (activeTab) {
              saveFile(activeTab.path, activeTab.content);
              markClean(activeTab.path);
            }
          }}
        >
          Save
        </button>

        <GitStatus onDirtyFilesChange={setDirtyFiles} />
        <GitPanel />
        <SettingsPanel
          theme={theme}
          setTheme={(newTheme) => setIsDarkMode(newTheme === "vs-dark")}
        />
      </div>
    </div>

    {/* ✅ Status bar ALWAYS at bottom */}
    <StatusBar />
  </div>
  );
}