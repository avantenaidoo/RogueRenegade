import { invoke } from "@tauri-apps/api/core";

type StoredAccount = {
  account_id: string;
  username: string;
  status: "Pending" | "Approved" | "Rejected" | "Suspended";
  last_used: number;
};

export default function AccountSwitcher({
  accounts,
  onSelected,
}: {
  accounts: StoredAccount[];
  onSelected: () => void;
}) {
  async function selectAccount(accountId: string) {
    await invoke("auth_set_active_account", {
      accountId,
    });

    onSelected();
  }

  return (
    <div className="border p-6 rounded w-96 space-y-3">
      <h2 className="text-lg font-semibold text-center">
        Select Account
      </h2>

      {accounts.map((acc) => (
        <button
          key={acc.account_id}
          className="w-full border rounded p-2 hover:bg-gray-100 text-left"
          disabled={acc.status !== "Approved"}
          onClick={() => selectAccount(acc.account_id)}
        >
          <div className="font-medium">
            @{acc.username}
          </div>

          <div className="text-xs text-gray-500">
            Status: {acc.status}
          </div>
        </button>
      ))}
    </div>
  );
}
