import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type PendingAccount = {
  account_id: string;
  username: string;
  email: string;
};

interface AdminApprovalPanelProps {
  onActionComplete?: () => void;
}

export default function AdminApprovalPanel({
  onActionComplete,
}: AdminApprovalPanelProps) {
  const [pending, setPending] = useState<PendingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  /* ─────────────────────────
     LOAD PENDING ACCOUNTS
     ───────────────────────── */
  async function load() {
    const res = await invoke<PendingAccount[]>(
      "auth_get_pending_accounts"
    );
    setPending(res);
    setLoading(false);
  }

  /* ─────────────────────────
     APPROVE ACCOUNT + DEVICE
     ───────────────────────── */
  async function approve(email: string) {
    // ✅ IMMEDIATE UI UPDATE
    setPending((prev) =>
      prev.filter((acc) => acc.email !== email)
    );

    const deviceId = await invoke<string>("get_device_id");

    // ✅ UPDATE users.json
    await invoke("auth_approve_account", {
      email,
    });

    // ✅ UPDATE backend device state
    await invoke("admin_approve_device", {
      deviceId,
    });

    onActionComplete?.();
  }

  /* ─────────────────────────
     DECLINE = REJECT USER + BAN ACCOUNT + DEVICE
     ───────────────────────── */
  async function decline(email: string) {
    // ✅ IMMEDIATE UI UPDATE
    setPending((prev) =>
      prev.filter((acc) => acc.email !== email)
    );

    const deviceId = await invoke<string>("get_device_id");

    // 🔥 THIS IS THE LINE YOU WERE MISSING
    // 🔥 THIS UPDATES users.json → approval_status: "Rejected"
    await invoke("auth_reject_account", {
      email,
    });

    // ✅ BAN ACCOUNT + DEVICE (blocked list)
    await invoke("blocked_ban_account_and_device", {
      email,
      deviceId,
    });

    // ✅ BAN DEVICE IN BACKEND
    await invoke("admin_ban_device", {
      deviceId,
    });

    onActionComplete?.();
  }

  /* ───────────────────────── */

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="p-4">Loading approvals…</div>;
  }

  if (pending.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-600">
        No pending accounts
      </div>
    );
  }

  return (
    <div className="border rounded p-4 space-y-3">
      <h3 className="font-semibold">Pending approvals</h3>

      {pending.map((acc) => (
        <div
          key={acc.account_id}
          className="flex justify-between items-center border p-2 rounded"
        >
          <div className="flex flex-col text-sm">
            <span className="font-medium">
              Username: {acc.username}
            </span>
            <span className="text-gray-600">
              Email: {acc.email}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              className="px-2 py-1 bg-green-600 text-white rounded text-sm"
              onClick={() => approve(acc.email)}
            >
              Approve
            </button>

            <button
              className="px-2 py-1 bg-red-600 text-white rounded text-sm"
              onClick={() => decline(acc.email)}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
