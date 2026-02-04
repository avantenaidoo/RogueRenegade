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

  async function load() {
    const res = await invoke<PendingAccount[]>(
      "auth_get_pending_accounts"
    );
    setPending(res);
    setLoading(false);
  }

    async function approve(email: string) {
    await invoke("auth_approve_account", {
        email,
    });

    await load();
    onActionComplete?.(); // ✅ GLOBAL REFRESH
    }

    async function decline(email: string) {
    const deviceId = await invoke<string>("get_device_id");

    await invoke("blocked_ban_account_and_device", {
        email,
        deviceId,
    });

    // 🔥 REMOVE FROM UI IMMEDIATELY
    setPending(prev =>
        prev.filter(acc => acc.email !== email)
    );

    onActionComplete?.(); // badge refresh
    }



  
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
        <span className="font-medium">Username: {acc.username}</span>
        <span className="text-gray-600">Email: {acc.email}</span>
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
                Decline
            </button>
            </div>

        </div>
      ))}
    </div>
  );
}
