import { DashboardPanel } from "./DashboardGrid";

interface DashboardHeaderProps {
  active: DashboardPanel;
  onSelect: (panel: DashboardPanel) => void;
}

export default function DashboardHeader({
  active,
  onSelect,
}: DashboardHeaderProps) {
  return (
    <div
      className="
        h-12
        flex items-center justify-between
        px-4
        border-b border-default
        bg-default
        text-default
        text-sm
        font-semibold
      "
    >
      {/* LEFT TITLE */}
      <span>App Dashboard</span>

      {/* RIGHT NAV */}
      <div className="flex gap-1 text-xs font-normal">
        {(["general", "admin", "account", "settings"] as DashboardPanel[]).map(
          panel => (
            <button
              key={panel}
              onClick={() => onSelect(panel)}
              className={`
                px-2 py-1 rounded
                transition-colors
                ${
                  active === panel
                    ? "bg-muted text-default"
                    : "text-muted hover:bg-muted"
                }
              `}
            >
              {panel}
            </button>
          )
        )}
      </div>
    </div>
  );
}
