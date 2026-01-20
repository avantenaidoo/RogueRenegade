import MonacoEditor from "@monaco-editor/react";

interface EditorProps {
  value: string;
  onChange: (val: string | undefined) => void;
  theme: "vs-dark" | "vs-light";
  path: string;
}

export default function Editor({ value, onChange, theme, path }: EditorProps) {
  return (
    <div style={{ flex: 1, height: "100%" }}>
      <MonacoEditor
        height="100%"
        language="javascript"
        value={value}
        theme={theme}
        onChange={onChange}
        options={{ automaticLayout: true }}
      />
      <div style={{ fontSize: 12, color: "#888", padding: "2px 5px" }}>{path}</div>
    </div>
  );
}