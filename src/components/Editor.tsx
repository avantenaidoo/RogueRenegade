// src/components/Editor.tsx

import MonacoEditor, { OnMount } from "@monaco-editor/react";
import { useEditorStore } from "../store";
import { onChange as workflowOnChange } from "../utils/workflow";

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

  /* ─────────────────────────────
     MONACO SETUP (REAL FIX)
     ───────────────────────────── */
  const handleEditorMount: OnMount = (_editor, monaco) => {
    console.log("🧠 Monaco mounted — enabling diagnostics");

    const ts = monaco.languages.typescript;

    // Enable diagnostics
    ts.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Compiler options (JS + TS linting)
    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      jsx: ts.JsxEmit.React,
      strict: true,

      allowJs: true,
      checkJs: true, // 🔥 THIS BRINGS BACK JS LINTING
      allowNonTsExtensions: true,

      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    });
  };

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

            store.updateTab(index, {
              content: val,
              dirty: true,
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
