import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useEditorStore } from "../store";

export async function openFolder() {
  const selected = await open({ directory: true });
  if (!selected) return;

  const root = selected.toString();

  // Allow Tauri access
  await invoke("allow_workspace_dir", { path: root });

  // Update global state
  useEditorStore.getState().setRepoPath(root);
}
