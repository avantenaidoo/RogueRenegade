import { useState, useEffect } from "react";
import { readTextFile, readDir } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "../store";

export default function FileExplorer() {
  const [files, setFiles] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const addTab = useEditorStore(state => state.addTab);

  useEffect(() => { loadFiles(); }, [currentPath]);

  async function loadFiles() {
    try {
      const path = currentPath || (await open({ directory: true }));
      if (!path) return;
      setCurrentPath(path.toString());
      const dir = await readDir(path.toString());
      setFiles(dir.map(f => f.name ?? ""));
    } catch (err) { console.error(err); }
  }

  async function openFile(fileName: string) {
    if (!currentPath) return;
    const path = `${currentPath}/${fileName}`;
    const content = await readTextFile(path);
    addTab(path, content);
  }

  return (
    <div style={{ width: "200px", borderRight: "1px solid gray" }}>
      <h4>Files</h4>
      <ul>
        {files.map(f => (
          <li key={f} onClick={() => openFile(f)}>{f}</li>
        ))}
      </ul>
    </div>
  );
}