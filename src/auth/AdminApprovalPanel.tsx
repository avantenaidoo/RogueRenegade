import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type PendingAccount = {
  account_id: string;
  username: string;
};

export default function AdminApprovalPanel() {
  const [pending, setPending] = useState<PendingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await invoke<PendingAccount[]>(
      "auth_get_pending_accounts"
    );
    setPending(res);
    setLoading(false);
  }

  async function approve(account_id: string) {
    await invoke("auth_approve_account", { accountId: account_id });
    await load();
  }

  async function decline(account_id: string) {
    await invoke("auth_reject_account", { accountId: account_id });
    await load();
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
          <span>{acc.username}</span>
            <div className="flex gap-2">
            <button
                className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                onClick={() => approve(acc.account_id)}
            >
                Approve
            </button>

            <button
                className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                onClick={() => decline(acc.account_id)}
            >
                Decline
            </button>
            </div>

        </div>
      ))}
    </div>
  );
}
