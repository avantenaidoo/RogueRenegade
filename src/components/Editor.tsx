import MonacoEditor, { OnMount } from "@monaco-editor/react";
import { useEditorStore } from "../store";
import { onChange as workflowOnChange } from "../utils/workflow";
import { useRef, useEffect } from "react";

/* 🔥 REQUIRED */
const normalize = (s: string) => s.replace(/\r\n/g, "\n");

interface EditorProps {
  value: string;
  onChange: (val: string | undefined) => void;
  theme: "vs-dark" | "vs-light";
  path: string;
}

export default function Editor({
  value,
  onChange,
  theme,
  path,
}: EditorProps) {
  const store = useEditorStore();
  const editorRef = useRef<any>(null);

  /* 🔒 RESTORE GUARD */
  const restoringCursorRef = useRef(false);

  /* ✅ VS CODE STYLE SELECTION CACHE */
  const lastSelectionRef = useRef<any>(null);
  const lastSelectedTextRef = useRef<string>("");

  /* ✅ PER-FILE MODEL CACHE (THIS FIXES UNDO) */
  const modelsRef = useRef<Map<string, any>>(new Map());

  console.log("🧪 Editor render", {
    path,
    activeTabIndex: store.activeTabIndex,
    tab: store.tabs[store.activeTabIndex],
    valueLength: value?.length,
  });

  /* ─────────────────────────────
     MONACO SETUP + CURSOR DEBUG
     ───────────────────────────── */
  const handleEditorMount: OnMount = (editor, monaco) => {
    console.log("🧠 Monaco mounted", {
      editorId: editor.getId?.(),
      modelId: editor.getModel()?.id,
      uri: editor.getModel()?.uri?.toString(),
    });

    editorRef.current = editor;

    const ts = monaco.languages.typescript;

    ts.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      jsx: ts.JsxEmit.React,
      strict: true,
      allowJs: true,
      checkJs: true,
      allowNonTsExtensions: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    });

    /* ✅ CREATE OR REUSE MODEL PER FILE */
    let model = modelsRef.current.get(path);
    if (!model) {
      model = monaco.editor.createModel(
        value ?? "",
        path.endsWith(".ts") || path.endsWith(".tsx")
          ? "typescript"
          : "javascript",
        monaco.Uri.file(path)
      );
      modelsRef.current.set(path, model);
    }

    if (editor.getModel() !== model) {
      editor.setModel(model);
    }

    const tab = store.tabs[store.activeTabIndex];
    const cursor = tab?.cursor;

    console.log("🔁 RESTORE ATTEMPT", {
      tabPath: tab?.path,
      savedCursor: cursor,
      modelBefore: editor.getPosition(),
    });

    if (cursor) {
      restoringCursorRef.current = true;

      requestAnimationFrame(() => {
        editor.setPosition(cursor);
        editor.revealPositionInCenter(cursor);
        editor.focus();

        setTimeout(() => {
          restoringCursorRef.current = false;
          console.log("🔓 RESTORE COMPLETE");
        }, 0);
      });
    }

    /* ✅ VS CODE BEHAVIOR: TRACK SELECTION BEFORE MENU STEALS FOCUS */
    editor.onDidChangeCursorSelection((e) => {
      if (e.selection && !e.selection.isEmpty()) {
        lastSelectionRef.current = e.selection;
        lastSelectedTextRef.current =
          editor.getModel()?.getValueInRange(e.selection) ?? "";

        console.log("🧠 SELECTION CACHED", {
          textLength: lastSelectedTextRef.current.length,
        });
      }
    });

    editor.onDidChangeCursorPosition((e) => {
      if (restoringCursorRef.current) return;

      store.updateTab(store.activeTabIndex, {
        cursor: {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        },
      });
    });
  };

  /* ─────────────────────────────
     🔥 SWITCH MODEL ON FILE CHANGE
     ───────────────────────────── */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const monaco = (window as any).monaco;
    if (!monaco) return;

    let model = modelsRef.current.get(path);
    if (!model) {
      model = monaco.editor.createModel(
        value ?? "",
        path.endsWith(".ts") || path.endsWith(".tsx")
          ? "typescript"
          : "javascript",
        monaco.Uri.file(path)
      );
      modelsRef.current.set(path, model);
    }

    if (editor.getModel() !== model) {
      editor.setModel(model);
    }
  }, [path]);

  /* ─────────────────────────────
     🔥 MENU COMMAND HANDLER
     ───────────────────────────── */
  useEffect(() => {
    const handler = async (e: CustomEvent<{ action: string }>) => {
      const editor = editorRef.current;

      console.group("🧨 MENU COMMAND");
      console.log("Action:", e.detail.action);

      if (!editor) {
        console.error("❌ NO EDITOR REF");
        console.groupEnd();
        return;
      }

      editor.focus();

      switch (e.detail.action) {
        case "undo":
          editor.trigger("menu", "undo", null);
          break;

        case "redo":
          editor.trigger("menu", "redo", null);
          break;

        case "cut":
          if (lastSelectedTextRef.current) {
            await navigator.clipboard.writeText(
              lastSelectedTextRef.current
            );
            editor.executeEdits("cut", [
              { range: lastSelectionRef.current, text: "" },
            ]);
          }
          break;

        case "copy":
          await navigator.clipboard.writeText(
            lastSelectedTextRef.current
          );
          break;

        case "paste": {
          const text = await navigator.clipboard.readText();
          const range = editor.getSelection();
          if (!text || !range) break;

          editor.executeEdits("paste", [
            { range, text, forceMoveMarkers: true },
          ]);
          break;
        }
      }

      console.groupEnd();
    };

    window.addEventListener(
      "editor-command",
      handler as unknown as EventListener
    );

    return () =>
      window.removeEventListener(
        "editor-command",
        handler as unknown as EventListener
      );
  }, []);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          theme={theme}
          onMount={handleEditorMount}
          onChange={(val) => {
            if (val === undefined) return;

            const index = store.activeTabIndex;
            const tab = store.tabs[index];

            const normalizedNext = normalize(val);
            const normalizedSaved = normalize(tab.savedContent);

            store.updateTab(index, {
              content: normalizedNext,
              dirty: normalizedNext !== normalizedSaved,
            });

            workflowOnChange(path, val);
            onChange(val);
          }}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            tabSize: 2,
          }}
        />
      </div>

      <div className="h-5 shrink-0 px-2 text-xs flex items-center truncate bg-muted text-muted border-t border-default">
        {path}
      </div>
    </div>
  );
}
