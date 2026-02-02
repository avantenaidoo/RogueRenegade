import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Workspace from "@/pages/Workspace";
import LoginPanel from "@/auth/LoginPanel";
import AccountSwitcher from "@/auth/AccountSwitcher";
import SignupPanel from "./SignupPanel";
import AdminApprovalPanel from "@/auth/AdminApprovalPanel";




type StoredAccount = {
  account_id: string;
  username: string;
  status: "Pending" | "Approved" | "Rejected" | "Suspended";
  last_used: number;
};


type AuthStateFile = {
  active_account_id: string | null;
  accounts: StoredAccount[];
};

async function switchAccount(
  setState: (s: AuthStateFile) => void
) {
  const updated = await invoke<AuthStateFile>("auth_switch_account");
  setState(updated);
}

async function logout(
  setState: (s: AuthStateFile) => void,
  setAuthMode: (m: "login" | "signup") => void,
  setForceAuthScreen: (v: boolean) => void
) {
  await invoke("auth_logout");
  const updated = await invoke<AuthStateFile>("auth_get_state");
  setAuthMode("login");
  setForceAuthScreen(true);
  setState(updated);
}



function selectActiveAccount(state: AuthStateFile): StoredAccount | null {
  if (!state.accounts.length) return null;

  if (state.active_account_id) {
    return (
      state.accounts.find(
        (a) => a.account_id === state.active_account_id
      ) ?? null
    );
  }

  // ⛔ DO NOT AUTO-SELECT
  return null;
}



export default function AuthGate() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AuthStateFile | null>(null);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [forceAuthScreen, setForceAuthScreen] = useState(false);



  const activeAccount =
  state ? selectActiveAccount(state) : null;

  useEffect(() => {
    (async () => {
      const authState = await invoke<AuthStateFile>("auth_get_state");
      setState(authState);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl">
        Initializing…
      </div>
    );
  }

  // ✅ AUTH CHECK = active account exists
    if (!state || state.accounts.length === 0) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4">
            {authMode === "login" ? (
                <>
                <LoginPanel
                onSuccess={async () => {
                    const updated = await invoke<AuthStateFile>("auth_get_state");
                    setForceAuthScreen(false);
                    setState(updated);
                }}
                onSignup={() => setAuthMode("signup")}
                />

                </>
            ) : (
                <>
                <SignupPanel
                onSuccess={() => setAuthMode("login")}
                onCancel={() => setAuthMode("login")}
                />


                </>
            )}
            </div>
        );
        }


    // 👤 Accounts exist but none active → select account
    if (!activeAccount && !forceAuthScreen) {
    return (
        <div className="h-screen flex items-center justify-center">
        <AccountSwitcher
            accounts={state.accounts}
            onSelected={async () => {
            const updated = await invoke<AuthStateFile>("auth_get_state");
            setState(updated);
            }}
        />
        </div>
    );
    }

    // ⛔ forced auth screen OR still no active account
if (!activeAccount) {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      {authMode === "login" ? (
        <LoginPanel
          onSuccess={async () => {
            const updated = await invoke<AuthStateFile>("auth_get_state");
            setForceAuthScreen(false);
            setState(updated);
          }}
          onSignup={() => setAuthMode("signup")}
        />
      ) : (
        <SignupPanel
          onSuccess={() => setAuthMode("login")}
          onCancel={() => setAuthMode("login")}
        />
      )}
    </div>
  );
}


// 🚫 active account exists but not approved
if (activeAccount.status !== "Approved") {
    return (
    <div className="h-screen flex items-center justify-center">
        <div className="border p-6 rounded w-105 space-y-3 text-center">
        <h2 className="text-lg font-semibold">Access Restricted</h2>

        <p className="text-sm text-gray-600">
            Account status: <b>{activeAccount.status}</b>
        </p>
        </div>
    </div>
    );

}



return (
  <div className="h-screen flex flex-col">
    {/* 🔧 TOP BAR */}
    <div className="flex justify-end gap-2 p-2 border-b">
      <button
        className="px-3 py-1 text-sm bg-gray-600 text-white rounded"
        onClick={() => switchAccount(setState)}
      >
        Switch account
      </button>

      <button
        className="px-3 py-1 text-sm bg-red-600 text-white rounded"
        onClick={() => logout(setState, setAuthMode, setForceAuthScreen)}

      >
        Logout
      </button>
    </div>

    {activeAccount.status === "Approved" &&
    activeAccount.username === "admin" && (
        <div className="p-2 border-b bg-yellow-50">
            <AdminApprovalPanel />
        </div>
    )}


    {/* 🧠 MAIN APP */}
    <div className="flex-1">
      <Workspace />
    </div>
  </div>
);


}
