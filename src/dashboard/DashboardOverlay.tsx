import DashboardHome from "./DashboardHome";

interface DashboardOverlayProps {
  open: boolean;
  onClose: () => void;
  theme: "vs-dark" | "vs-light";
  setTheme: (theme: "vs-dark" | "vs-light") => void;
  onSwitchAccount: () => void;
  onLogout: () => void;
}

export default function DashboardOverlay({
  open,
  onClose,
  theme,
  setTheme,
  onSwitchAccount,
  onLogout,
}: DashboardOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="
        fixed
        top-9
        left-0
        right-0
        bottom-0
        z-50
        bg-default
        flex
        flex-col
      "
    >
      {/* HEADER */}
      <div className="h-9 flex items-center justify-between px-3 border-b">
        <span className="text-sm font-semibold">DASHBOARD</span>
        <button
          className="text-xs hover:text-red-400"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* FULL CONTENT */}
      <div className="flex-1 overflow-auto">
        <DashboardHome
          theme={theme}
          setTheme={setTheme}
          onSwitchAccount={onSwitchAccount}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
}
