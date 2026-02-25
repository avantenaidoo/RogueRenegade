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

/* ✅ LANGUAGE DETECTOR */
const getLanguage = (p: string) => {
  // 🔥 CRITICAL: DIFF FILES MUST NOT USE TYPESCRIPT
  if (p.startsWith("diff://")) {
    return "plaintext";
  }

  if (p.endsWith(".ts") || p.endsWith(".tsx")) return "typescript";
  if (p.endsWith(".js") || p.endsWith(".jsx")) return "javascript";
  if (p.endsWith(".json")) return "json";
  if (p.endsWith(".css")) return "css";
  if (p.endsWith(".html")) return "html";

  return "plaintext";
};

export default function Editor({
  value,
  onChange,
  theme,
  path,
}: EditorProps) {
  const store = useEditorStore();
  const editorRef = useRef<any>(null);

  const restoringCursorRef = useRef(false);
  const lastSelectionRef = useRef<any>(null);
  const lastSelectedTextRef = useRef<string>("");

  const modelsRef = useRef<Map<string, any>>(new Map());

  console.log("🧪 Editor render", {
    path,
    activeTabIndex: store.activeTabIndex,
    tab: store.tabs[store.activeTabIndex],
    valueLength: value?.length,
  });

  /* ─────────────────────────────
     MONACO SETUP
     ───────────────────────────── */
  const handleEditorMount: OnMount = (editor, monaco) => {
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

    const isDiff = path.startsWith("diff://");

    const uri = isDiff
      ? monaco.Uri.parse(
          `inmemory://model/${encodeURIComponent(path)}`
        )
      : monaco.Uri.file(path);

    let model = monaco.editor.getModel(uri);

    if (!model) {
      model = monaco.editor.createModel(
        value ?? "",
        getLanguage(path),
        uri
      );
    }

    modelsRef.current.set(path, model);

    if (editor.getModel() !== model) {
      editor.setModel(model);
    }

    const tab = store.tabs[store.activeTabIndex];
    const cursor = tab?.cursor;

    if (cursor) {
      restoringCursorRef.current = true;

      requestAnimationFrame(() => {
        editor.setPosition(cursor);
        editor.revealPositionInCenter(cursor);
        editor.focus();

        setTimeout(() => {
          restoringCursorRef.current = false;
        }, 0);
      });
    }

    editor.onDidChangeCursorSelection((e) => {
      if (e.selection && !e.selection.isEmpty()) {
        lastSelectionRef.current = e.selection;
        lastSelectedTextRef.current =
          editor.getModel()?.getValueInRange(e.selection) ?? "";
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
     CLEANUP ON WORKSPACE CHANGE
     ───────────────────────────── */
  useEffect(() => {
    const handler = () => {
      modelsRef.current.forEach((model) => model.dispose());
      modelsRef.current.clear();
    };

    window.addEventListener("workspace-changed", handler);
    return () =>
      window.removeEventListener("workspace-changed", handler);
  }, []);

  /* ─────────────────────────────
     SWITCH MODEL ON FILE CHANGE
     ───────────────────────────── */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const monaco = (window as any).monaco;
    if (!monaco) return;

    const isDiff = path.startsWith("diff://");

    const uri = isDiff
      ? monaco.Uri.parse(
          `inmemory://model/${encodeURIComponent(path)}`
        )
      : monaco.Uri.file(path);

    let model = monaco.editor.getModel(uri);

    if (!model) {
      model = monaco.editor.createModel(
        value ?? "",
        getLanguage(path),
        uri
      );
    }

    modelsRef.current.set(path, model);

    if (editor.getModel() !== model) {
      editor.setModel(model);
    }
  }, [path]);

  /* ─────────────────────────────
     MENU COMMAND HANDLER
     ───────────────────────────── */
  useEffect(() => {
    const handler = async (e: CustomEvent<{ action: string }>) => {
      const editor = editorRef.current;
      if (!editor) return;

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
            readOnly: path.startsWith("diff://"),
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