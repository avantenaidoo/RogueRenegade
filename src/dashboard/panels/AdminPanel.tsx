import { useState } from "react";

// ⚠️ REAL APPROVAL PANEL
import AdminApprovalPanel from "@/auth/AdminApprovalPanel";

type AdminView = "home" | "pending";

interface AdminPanelProps {
  pendingApprovalCount: number;
  refreshPendingApprovals: () => void;
}

export default function AdminPanel({
  pendingApprovalCount,
  refreshPendingApprovals,
}: AdminPanelProps) {
  const [view, setView] = useState<AdminView>("home");

  /* ───────── HOME / MENU ───────── */
  if (view === "home") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Admin
        </h2>

        {/* PENDING APPROVALS BUTTON */}
        <button
          className="
            relative
            flex
            items-center
            justify-between
            w-full
            border
            border-default
            rounded-md
            px-4
            py-3
            hover:bg-hover
          "
          onClick={() => setView("pending")}
        >
          <span className="font-medium">
            Pending approvals
          </span>

          {/* ✅ GLOBAL BADGE */}
          {pendingApprovalCount > 0 && (
            <span
              className="
                ml-3
                min-w-5
                h-5
                px-2
                rounded-full
                bg-red-600
                text-white
                text-xs
                flex
                items-center
                justify-center
              "
            >
              {pendingApprovalCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  /* ───────── PENDING APPROVALS VIEW ───────── */
  if (view === "pending") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Pending approvals
          </h2>

          <button
            className="text-sm text-muted hover:text-default"
            onClick={() => {
              setView("home");
              refreshPendingApprovals(); // ✅ force refresh on return
            }}
          >
            ← Back
          </button>
        </div>

        <AdminApprovalPanel
          onActionComplete={refreshPendingApprovals}
        />
      </div>
    );
  }

  return null;
}
