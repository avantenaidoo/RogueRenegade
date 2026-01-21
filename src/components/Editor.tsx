import MonacoEditor from "@monaco-editor/react";

interface EditorProps {
  value: string;
  onChange: (val: string | undefined) => void;
  theme: "vs-dark" | "vs-light";
  path: string;
}

export default function Editor({ value, onChange, theme, path }: EditorProps) {
  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-black">
      <MonacoEditor
        height="100%"
        language="javascript"
        value={value}
        theme={theme}
        onChange={onChange}
        options={{ automaticLayout: true }}
      />
      <div className="text-xs text-gray-700 dark:text-gray-300 px-1 py-0.5 bg-white dark:bg-black">
        {path}
      </div>
    </div>
  );
}
