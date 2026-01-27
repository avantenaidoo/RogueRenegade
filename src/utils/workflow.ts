import { runTestsLocally } from "./testRunner";
import { stageAndCommit } from "./git";

export async function onSave(
  repoPath: string,
  filePath: string,
  content: string
) {
  await stageAndCommit(repoPath, filePath, "Auto-commit on save");
  await runTestsLocally(content);
}

export async function onCommit(
  repoPath: string,
  filePath: string,
  content: string
) {
  await runTestsLocally(content);
  console.log("Self-review tests passed, ready for push");
}

export async function onChange(filePath: string, content: string) {
  console.log("File changed, can trigger auto optimizations or linting");
}
