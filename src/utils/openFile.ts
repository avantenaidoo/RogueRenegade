import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useEditorStore } from "../store";

export async function openFile() {
  const selected = await open({
    multiple: false,
    directory: false,
  });

  if (!selected) return;

  const filePath = selected.toString();

  const content = await readTextFile(filePath);

  useEditorStore.getState().addTab(filePath, content);
}
