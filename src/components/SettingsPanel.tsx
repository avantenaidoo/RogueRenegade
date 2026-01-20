interface SettingsProps {
  theme: "vs-dark" | "vs-light";
  setTheme: (theme: "vs-dark" | "vs-light") => void;
}

export default function SettingsPanel({ theme, setTheme }: SettingsProps) {
  return (
    <div style={{ borderTop: "1px solid gray", padding: "5px" }}>
      <h4>Settings</h4>
      <label>
        Theme:
        <select value={theme} onChange={e => setTheme(e.target.value as any)}>
          <option value="vs-dark">Dark</option>
          <option value="vs-light">Light</option>
        </select>
      </label>
    </div>
  );
}