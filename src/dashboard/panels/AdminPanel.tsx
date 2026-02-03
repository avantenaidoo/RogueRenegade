import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

// ⚠️ THIS IS THE REAL APPROVAL PANEL (AUTH ONE)
import AdminApprovalPanel from "@/auth/AdminApprovalPanel";

type AdminView = "home" | "pending";

type PendingAccount = {
  account_id: string;
  username: string;
  email: string;
};

export default function AdminPanel() {
  const [view, setView] = useState<AdminView>("home");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(true);

  async function loadPendingCount() {
    const pending = await invoke<PendingAccount[]>(
      "auth_get_pending_accounts"
    );
    setPendingCount(pending.length);
    setLoadingCount(false);
  }

  useEffect(() => {
    loadPendingCount();
  }, []);

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

          {/* BADGE */}
          {!loadingCount && pendingCount > 0 && (
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
              {pendingCount}
            </span>
          )}
        </button>

        {/* 🚧 FUTURE ADMIN BUTTONS GO HERE */}
        {/* <button>Blocked devices</button> */}
        {/* <button>Audit logs</button> */}
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
              loadPendingCount(); // refresh badge when returning
            }}
          >
            ← Back
          </button>
        </div>

        <AdminApprovalPanel />
      </div>
    );
  }

  return null;
}
