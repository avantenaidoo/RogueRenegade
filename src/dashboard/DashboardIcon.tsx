interface DashboardIconProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function Icon({ label }: { label: string }) {
  switch (label) {
    case "General":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        </svg>
      );

    case "Account":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M4 20c1.5-4 14.5-4 16 0"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );

    case "Settings":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9c0 .7.4 1.3 1.1 1.5H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );

    case "Admin":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );

    default:
      return null;
  }
}

export default function DashboardIcon({
  label,
  active = false,
  onClick,
}: DashboardIconProps) {
  return (
    <button
      onClick={onClick}
      className={`
        h-20 w-full rounded-md
        border border-default
        text-sm font-medium
        flex flex-col items-center justify-center gap-2
        transition-colors
        ${
          active
            ? "bg-default text-default"
            : "bg-default text-muted hover:bg-muted"
        }
      `}
    >
      <Icon label={label} />
      <span>{label}</span>
    </button>
  );
}
