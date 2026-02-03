import DashboardIcon from "./DashboardIcon";

export type DashboardPanel =
  | "general"
  | "account"
  | "settings"
  | "admin";

interface DashboardGridProps {
  active: DashboardPanel;
  onSelect: (panel: DashboardPanel) => void;
}

export default function DashboardGrid({
  active,
  onSelect,
}: DashboardGridProps) {
  return (
    <div
      className="
        w-64
        border-r border-default
        bg-default
        p-3
        grid grid-cols-2 gap-3
      "
    >
      <DashboardIcon
        label="General"
        active={active === "general"}
        onClick={() => onSelect("general")}
      />

      <DashboardIcon
        label="Account"
        active={active === "account"}
        onClick={() => onSelect("account")}
      />

      <DashboardIcon
        label="Settings"
        active={active === "settings"}
        onClick={() => onSelect("settings")}
      />

      <DashboardIcon
        label="Admin"
        active={active === "admin"}
        onClick={() => onSelect("admin")}
      />
    </div>
  );
}
