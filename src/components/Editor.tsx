// src/components/Editor.tsx
import MonacoEditor from "@monaco-editor/react";
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

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="javascript"
          value={value}
          theme={theme}
          onChange={(val) => {
            if (val === undefined) return;

            // 🔥 THIS IS WHAT YOU WERE MISSING
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
