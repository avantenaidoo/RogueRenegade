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
    <div className="w-50 border-r border-gray-300 dark:border-gray-700 bg-white dark:bg-black">
      <h4 className="text-black dark:text-white">Files</h4>
      <ul className="text-black dark:text-white">
        {files.map(f => (
          <li
            key={f}
            onClick={() => openFile(f)}
            className="cursor-pointer hover:underline"
          >
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
