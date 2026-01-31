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
        console.log("🎯 BEFORE RESTORE POSITION", editor.getPosition());

        editor.setPosition(cursor);
        editor.revealPositionInCenter(cursor);
        editor.focus();

        console.log("🎯 AFTER RESTORE POSITION", editor.getPosition());

        setTimeout(() => {
          restoringCursorRef.current = false;
          console.log("🔓 RESTORE COMPLETE");
        }, 0);
      });
    }

    /* ─────────────────────────────
       🔥 CURSOR TRACKING
       ───────────────────────────── */
    editor.onDidChangeCursorPosition((e) => {
      if (restoringCursorRef.current) {
        console.log("⛔ CURSOR MOVE IGNORED (RESTORE)", e.position);
        return;
      }

      const index = store.activeTabIndex;

      console.log("📍 CURSOR MOVED", {
        position: e.position,
        reason: e.reason,
      });

      store.updateTab(index, {
        cursor: {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        },
      });
    });

    /* ─────────────────────────────
       🔥 MODEL DEBUG
       ───────────────────────────── */
    editor.getModel()?.onDidChangeContent(() => {
      console.log("📝 MODEL CONTENT CHANGED", {
        cursor: editor.getPosition(),
        valueLength: editor.getValue()?.length,
      });
    });
  };

  /* ─────────────────────────────
     🔥 VALUE PROP WATCHER
     ───────────────────────────── */
  useEffect(() => {
    if (!editorRef.current) return;

    console.log("🔄 VALUE PROP CHANGED", {
      path,
      valueLength: value?.length,
      cursorNow: editorRef.current.getPosition(),
      modelId: editorRef.current.getModel()?.id,
    });
  }, [value, path]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={
            path.endsWith(".ts") || path.endsWith(".tsx")
              ? "typescript"
              : "javascript"
          }
          value={value}
          theme={theme}
          onMount={handleEditorMount}
          onChange={(val) => {
            if (val === undefined) return;

            const index = store.activeTabIndex;
            const tab = store.tabs[index];

            const normalizedNext = normalize(val);
            const normalizedSaved = normalize(tab.savedContent);

            const isDirty = normalizedNext !== normalizedSaved;

            console.log("🔥 DIRTY CHECK", {
              path: tab.path,
              nextLength: normalizedNext.length,
              savedLength: normalizedSaved.length,
              equal: normalizedNext === normalizedSaved,
              DIRTY_RESULT: isDirty,
            });

            store.updateTab(index, {
              content: normalizedNext,
              dirty: isDirty,
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

      <div
        className="h-5 shrink-0 px-2 text-xs flex items-center truncate
                   bg-muted text-muted border-t border-default"
      >
        {path}
      </div>
    </div>
  );
}
