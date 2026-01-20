import { useState } from "react";
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

  const activeTab = tabs[activeTabIndex];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <FileExplorer />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid gray" }}>
          {tabs.map((t, i) => (
            <div
              key={t.path}
              style={{
                padding: "5px 10px",
                cursor: "pointer",
                background: i === activeTabIndex ? "#ddd" : "#eee",
              }}
              onClick={() => setActiveTab(i)}
            >
              {t.path.split("/").pop()}
              <button onClick={() => closeTab(i)}>x</button>
            </div>
          ))}
        </div>
        {activeTab && (
          <Editor
            value={activeTab.content}
            onChange={val => {
                if (val !== undefined) {
                    updateTab(activeTabIndex, val);
                }
                }}
            theme={theme}
            path={activeTab.path}
          />
        )}
        <button
          onClick={() => activeTab && saveFile(activeTab.path, activeTab.content)}
        >
          Save
        </button>
        <GitPanel />
        <SettingsPanel theme={theme} setTheme={setTheme} />
      </div>
    </div>
  );
}