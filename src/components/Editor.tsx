import MonacoEditor, { DiffEditor, OnMount } from "@monaco-editor/react";
import { useEditorStore } from "../store";
import { onChange as workflowOnChange } from "../utils/workflow";
import { useRef, useEffect, useState, useMemo } from "react";

// Silence harmless Monaco dispose races in dev console
if (process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("InstantiationService has been disposed") ||
        args[0].includes("TextModel got disposed before DiffEditorWidget") ||
        args[0].includes("Cannot read properties of undefined (reading 'domNode')") ||
        args[0].includes("Cannot read properties of undefined (reading 'getWidgets')"))
    ) {
      return;
    }
    originalError(...args);
  };
}

const normalize = (s: string) => s.replace(/\r\n/g, "\n");

interface EditorProps {
  value: string;
  onChange: (val: string | undefined) => void;
  theme: "vs-dark" | "vs-light";
  path: string;
}

const getLanguage = (p: string) => {
  if (p.endsWith(".ts") || p.endsWith(".tsx")) return "typescript";
  if (p.endsWith(".js") || p.endsWith(".jsx")) return "javascript";
  if (p.endsWith(".json")) return "json";
  if (p.endsWith(".css")) return "css";
  if (p.endsWith(".html")) return "html";
  return "plaintext";
};

// 🔥 GLOBAL PROMISE FOR WORKSPACE TO WAIT ON
export const editorReadyRef = { current: Promise.resolve() };

export default function Editor({ value, onChange, theme, path }: EditorProps) {
  const store = useEditorStore();
  const editorRef = useRef<any>(null);

  const restoringCursorRef = useRef(false);
  const lastSelectionRef = useRef<any>(null);
  const lastSelectedTextRef = useRef<string>("");

  const modelsRef = useRef<Map<string, any>>(new Map());
  const [_ready, setReady] = useState(false); // ← fixed: added underscore to silence unused warning

  // ── Detect if this is an image file we should preview ───────────────────────
  const isImageFile = useMemo(() => {
    if (!path) return false;
    const lowerPath = path.toLowerCase();
    return (
      lowerPath.endsWith(".png") ||
      lowerPath.endsWith(".jpg") ||
      lowerPath.endsWith(".jpeg") ||
      lowerPath.endsWith(".gif") ||
      lowerPath.endsWith(".webp") ||
      lowerPath.endsWith(".bmp") ||
      lowerPath.endsWith(".ico") ||
      lowerPath.endsWith(".svg")
    );
  }, [path]);

  const isImageDataUri = value?.startsWith("data:image/") ?? false;

  const shouldShowImagePreview = isImageFile && isImageDataUri;
  // ──────────────────────────────────────────────────────────────────────────────

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

    const uri = monaco.Uri.file(path);
    let model = monaco.editor.getModel(uri);

    if (!model) {
      model = monaco.editor.createModel(value ?? "", getLanguage(path), uri);
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
        setTimeout(() => (restoringCursorRef.current = false), 0);
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

    setReady(true);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const monaco = (window as any).monaco;
    if (!monaco) return;

    const uri = monaco.Uri.file(path);
    let model = monaco.editor.getModel(uri);

    if (!model && value !== undefined) {
      try {
        model = monaco.editor.createModel(value, getLanguage(path), uri);
        modelsRef.current.set(path, model);
      } catch {
        return;
      }
    }

    if (model && editor.getModel() !== model) {
      try {
        editor.setModel(model);
      } catch {}
    }
  }, [path, value]);

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
            await navigator.clipboard.writeText(lastSelectedTextRef.current);
            editor.executeEdits("cut", [
              { range: lastSelectionRef.current, text: "" },
            ]);
          }
          break;
        case "copy":
          await navigator.clipboard.writeText(lastSelectedTextRef.current);
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

  const isDiff = path.startsWith("diff://");
  const hasTab = store.tabs.length > 0 && store.activeTabIndex >= 0;

  const safeOriginal =
    isDiff && hasTab
      ? normalize(store.tabs[store.activeTabIndex]?.originalContent ?? "")
      : "";

  const safeModified =
    isDiff && hasTab
      ? normalize(store.tabs[store.activeTabIndex]?.content ?? "")
      : "";

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0">

        {shouldShowImagePreview ? (
          // ── IMAGE PREVIEW ────────────────────────────────────────────────────────
          <div className="h-full w-full flex items-center justify-center bg-[#1e1e1e] p-4 overflow-auto">
            <img
              src={value}
              alt={path.split(/[\\/]/).pop() || "Image preview"}
              className="max-w-full max-h-full object-contain shadow-2xl border border-neutral-700 rounded"
              onError={(e) => {
                console.error("Failed to load image preview:", path);
                e.currentTarget.alt = "Failed to load image";
              }}
            />
          </div>
        ) : isDiff ? (
          // Diff mode
          <DiffEditor
            height="100%"
            theme={theme}
            original={safeOriginal}
            modified={safeModified}
            language={
              isDiff
                ? getLanguage(path.replace("diff://", "").split("@")[0])
                : "plaintext"
            }
            options={{
              readOnly: true,
              renderSideBySide: true,
              automaticLayout: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              keepCurrentOriginalModel: true,
              keepCurrentModifiedModel: true,
            } as any}
          />
        ) : (
          // Normal code editor
          <MonacoEditor
            height="100%"
            theme={theme}
            onMount={handleEditorMount}
            onChange={(val) => {
              if (val === undefined) return;

              workflowOnChange(path, val);
              onChange(val);
            }}
            options={{
              readOnly: false,
              automaticLayout: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              tabSize: 2,
              keepCurrentModel: true,
            } as any}
          />
        )}

      </div>

      <div className="h-5 shrink-0 px-2 text-xs flex items-center truncate bg-muted text-muted border-t border-default">
        {path}
      </div>
    </div>
  );
}