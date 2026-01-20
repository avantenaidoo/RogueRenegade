import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";

// Read a file
export async function readFile(path: string) {
  return await readTextFile(path);
}

// Write file
export async function saveFile(path: string, content: string) {
  await writeTextFile({ path, contents: content });
}

// Check if file exists
export async function exists(path: string) {
  try {
    await readTextFile(path);
    return true;
  } catch {
    return false;
  }
}