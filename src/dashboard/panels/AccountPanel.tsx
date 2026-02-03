import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import AccountSwitcher from "../../auth/AccountSwitcher";
import LoginPanel from "../../auth/LoginPanel";
import SignupPanel from "../../auth/SignupPanel";

type StoredAccount = {
  account_id: string;
  username: string;
  status: "Pending" | "Approved" | "Rejected" | "Suspended";
  last_used: number;
};

interface AccountPanelProps {
  onSwitchAccount: () => void;
  onLogout: () => void;
}

type View =
  | "main"
  | "switch"
  | "login"
  | "signup";

export default function AccountPanel({
  onSwitchAccount,
  onLogout,
}: AccountPanelProps) {
  const [view, setView] = useState<View>("main");
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);

  /* ───────── LOAD ACCOUNTS FOR SWITCHER ───────── */
  useEffect(() => {
    if (view !== "switch") return;

    invoke<StoredAccount[]>("auth_get_accounts")
      .then(setAccounts)
      .catch(console.error);
  }, [view]);

  /* ───────── MAIN DASHBOARD VIEW ───────── */
  if (view === "main") {
    return (
      <div className="h-full p-4 bg-default text-default space-y-3">
        <h2 className="text-lg font-semibold">
          Account
        </h2>

        <button onClick={onSwitchAccount}>Switch account</button>

        <button
          className="px-3 py-2 border border-default rounded"
          onClick={() => setView("signup")}
        >
          Create Account
        </button>

        <button onClick={onLogout}>Logout</button>
      </div>
    );
  }

  /* ───────── SWITCH ACCOUNT ───────── */
  if (view === "switch") {
    return (
      <AccountSwitcher
        accounts={accounts}
        onSelected={() => setView("main")}
      />
    );
  }

  /* ───────── LOGIN ───────── */
  if (view === "login") {
    return (
      <LoginPanel
        onSuccess={() => setView("main")}
        onSignup={() => setView("signup")}
      />
    );
  }

  /* ───────── SIGNUP ───────── */
  return (
    <SignupPanel
      onSuccess={() => setView("login")}
      onCancel={() => setView("login")}
    />
  );
}
