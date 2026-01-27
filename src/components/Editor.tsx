import MonacoEditor from "@monaco-editor/react";
import { onChange as workflowOnChange } from "../utils/workflow"; // ✅ STEP 7

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
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-black">
      <MonacoEditor
        height="100%"
        language="javascript"
        value={value}
        theme={theme}
        onChange={(val) => {
          onChange(val);

          if (val !== undefined) {
            // ✅ STEP 7: workflow automation
            workflowOnChange(path, val);
          }
        }}
        options={{ automaticLayout: true }}
      />
      <div className="text-xs px-1 py-0.5 bg-white dark:bg-black">
        {path}
      </div>
    </div>
  );
}
