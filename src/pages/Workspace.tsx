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
import { Canvas } from "@/components/Canvas";

export default function Workspace() {
  const {
    tabs,
    activeTabIndex,
    updateTab,
    setActiveTab,
    closeTab,
    markClean
  } = useEditorStore();

  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [dirtyFiles, setDirtyFiles] = useState<string[]>([]);
  const [panelOpen, setPanelOpen] = useState(false); // ✅ VS CODE PANEL

  const activeTab = tabs[activeTabIndex];

  useEffect(() => {
    initCollaboration("avant", "room-1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    setTheme(isDarkMode ? "vs-dark" : "vs-light");
  }, [isDarkMode]);

  return (
    // <div className="flex h-screen w-screen overflow-hidden">
    // <div>

    //   <FileExplorer />

    //   <ZenModeWrapper>
    //     {/* <div className="flex flex-col flex-1 min-w-0"> */}
    //     <div>

    //       {/* TABS */}
    //       {/* <div className="flex border-b shrink-0"> */}
    //       <div>
    //         {tabs.map((t, i) => (
    //           <div
    //             key={t.path}
    //             onClick={() => setActiveTab(i)}
    //             className={`px-3 py-1 cursor-pointer ${
    //               i === activeTabIndex ? "bg-muted" : ""
    //             }`}
    //           >
    //             {t.path.split("/").pop()}
    //             <button
    //               className="ml-2 text-red-500"
    //               onClick={(e) => {
    //                 e.stopPropagation();
    //                 closeTab(i);
    //               }}
    //             >
    //               ×
    //             </button>
    //           </div>
    //         ))}
    //       </div>

    //       {/* EDITOR — ALWAYS FULL HEIGHT */}
    //       {/* <div className="flex-1 min-h-0"> */}
    //       <div>
    //         {activeTab && (
    //           <Editor
    //             value={activeTab.content}
    //             path={activeTab.path}
    //             theme={theme}
    //             onChange={(val) => {
    //               if (val !== undefined) {
    //                 updateTab(activeTabIndex, { content: val });
    //               }
    //             }}
    //           />
    //         )}
    //       </div>

    //       {/* PANEL TOGGLE BAR (LIKE VS CODE) */}
    //       {/* <div className="border-t flex items-center gap-2 px-2 py-1 shrink-0"> */}
    //       <div>
    //         <button onClick={() => setPanelOpen(!panelOpen)}>
    //           {panelOpen ? "Hide Panel" : "Show Panel"}
    //         </button>
    //         <button
    //           onClick={async () => {
    //             if (!activeTab) return;
    //             saveFile(activeTab.path, activeTab.content);
    //             markClean(activeTab.path);
    //             await onSave(
    //               activeTab.path.split("/").slice(0, -1).join("/"),
    //               activeTab.path,
    //               activeTab.content
    //             );
    //           }}
    //         >
    //           Save
    //         </button>
    //       </div>

    //       {/* BOTTOM PANEL — CONDITIONAL */}
    //       {panelOpen && (
    //         // <div className="h-64 border-t overflow-y-auto shrink-0">
    //         <div>
    //           <GitStatus onDirtyFilesChange={setDirtyFiles} />
    //           <GitPanel />
    //           <CollaborationPanel username="User" roomId="workspace1" />
    //           <InsightsPanel code={activeTab?.content || ""} />
    //           <SettingsPanel
    //             theme={theme}
    //             setTheme={(t) => setIsDarkMode(t === "vs-dark")}
    //           />
    //         </div>
    //       )}
    //     </div>
    //   </ZenModeWrapper>

    //   <StatusBar />
    // </div>

    <Canvas />
  );
}
