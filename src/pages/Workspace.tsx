// src/pages/Workspace.tsx
import { useState, useEffect } from "react";
import { useEditorStore } from "../store";

import Editor from "../components/Editor";
import FileExplorer from "../components/FileExplorer";
import GitPanel from "../components/GitPanel";
import SettingsPanel from "../components/SettingsPanel";
import GitStatus from "../components/GitStatus";
import StatusBar from "../components/StatusBar";
import CollaborationPanel from "../components/CollaborationPanel";
import InsightsPanel from "../components/InsightsPanel";
import ZenModeWrapper from "../components/ZenModeWrapper";

import { saveFile } from "../utils/fs";
import { onSave } from "../utils/workflow";
import { initCollaboration } from "../utils/collaboration";

import "../App.css";

export default function Workspace() {
  const { tabs, activeTabIndex, updateTab, setActiveTab, closeTab } =
    useEditorStore();
  const markClean = useEditorStore((state) => state.markClean);

  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [dirtyFiles, setDirtyFiles] = useState<string[]>([]);

  const activeTab = tabs[activeTabIndex];

  useEffect(() => {
    initCollaboration("avant", "room-1");
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      setTheme("vs-dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("vs-light");
    }
  }, [isDarkMode]);

  return (
    <div className="flex flex-col h-screen bg-default text-default dark:bg-muted dark:text-default">
      <div className="flex flex-1">
        <FileExplorer />

        <ZenModeWrapper>
          <div className="flex-1 flex flex-col pt-15">
            {/* Tabs */}
            <div className="flex border-b border-default">
              {tabs.map((t, i) => {
                const isDirty = dirtyFiles.includes(t.path);
                return (
                  <div
                    key={t.path}
                    className={`px-2 py-1 cursor-pointer flex items-center gap-2 ${
                      i === activeTabIndex
                        ? "bg-muted text-default"
                        : "bg-default text-muted hover:bg-muted"
                    }`}
                    onClick={() => setActiveTab(i)}
                  >
                    <span
                      className={`font-semibold ${
                        isDirty ? "text-red-500" : ""
                      }`}
                    >
                      {t.path.split("/").pop()}
                    </span>

                    {t.branch && (
                      <span className="text-xs px-1 rounded bg-muted">
                        {t.branch}
                      </span>
                    )}

                    <button
                      className="ml-2 text-red-500"
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
              <div className="flex-1 min-h-0">
              <Editor
                value={activeTab.content}
                path={activeTab.path}
                theme={theme}
                onChange={(val) => {
                  if (val !== undefined) {
                    updateTab(activeTabIndex, { content: val });
                  }
                }}
              />
              </div>
            )}

            {/* Save */}
            <button
              className="mt-2 px-4 py-2 border rounded bg-default dark:bg-muted"
              onClick={async () => {
                if (!activeTab) return;

                saveFile(activeTab.path, activeTab.content);
                markClean(activeTab.path);
                const repoPath = activeTab.path
                .split("/")
                .slice(0, -1)
                .join("/");

await onSave(repoPath, activeTab.path, activeTab.content);

              }}
            >
              Save
            </button>

            <GitStatus onDirtyFilesChange={setDirtyFiles} />
            <GitPanel />
            <CollaborationPanel username="User" roomId="workspace1" />
            <InsightsPanel code={activeTab?.content || ""} />
            <SettingsPanel
              theme={theme}
              setTheme={(t) => setIsDarkMode(t === "vs-dark")}
            />
          </div>
        </ZenModeWrapper>
      </div>

      <StatusBar />
    </div>
  );
}
