import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Workspace from "@/pages/Workspace";
import LoginPanel from "@/auth/LoginPanel";
import AccountSwitcher from "@/auth/AccountSwitcher";
import SignupPanel from "./SignupPanel";

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

  const [isDeviceBlocked, setIsDeviceBlocked] = useState<boolean | null>(null);

  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const activeAccount =
  state ? selectActiveAccount(state) : null;

    useEffect(() => {
    (async () => {
        // 1️⃣ Ensure device ID exists and fetch it
        const deviceId = await invoke<string>("get_device_id");

        // 2️⃣ Load blocked state
        const blocked = await invoke<{
        blocked_devices: string[];
        blocked_accounts: string[];
        }>("blocked_get_state");

        // 3️⃣ HARD DEVICE BLOCK CHECK
        if (blocked.blocked_devices.includes(deviceId)) {
        setIsDeviceBlocked(true);
        setLoading(false);
        return; // ⛔ STOP EVERYTHING
        }

        // 4️⃣ Device is allowed
        setIsDeviceBlocked(false);

    // 5️⃣ Continue normal auth flow (WITH HARD BACKEND BAN CHECK)
    try {
    const authState = await invoke<AuthStateFile>("auth_get_state");
    setState(authState);
    setLoading(false);
    } catch (err: any) {
    const msg = String(err);

    if (msg.includes("DEVICE_BANNED") || msg.includes("423")) {
        // 🔥 Persist ban locally
        await invoke("blocked_add_device");

        // 🔁 Force re-evaluation → AuthGate will hard-lock
        window.location.reload();
        return;
    }

    throw err; // other errors still bubble
}
    })();
    }, []);

    useEffect(() => {
        let interval: number | null = null;

        if (state?.accounts.length) {
            // initial load
            fetchPendingApprovalCount(setPendingApprovalCount);

            // live refresh every 5 seconds
            interval = window.setInterval(() => {
            fetchPendingApprovalCount(setPendingApprovalCount);
            }, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
        }, [state?.accounts.length]);



  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl">
        Initializing…
      </div>
    );
  }


    // 🚫 HARD DEVICE BAN — NOTHING ELSE RENDERS
    if (isDeviceBlocked) {
    return (
        <div className="h-screen flex items-center justify-center bg-black text-red-500">
        <div className="border border-red-600 p-8 rounded text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold">Device Banned</h1>
            <p className="text-sm text-red-400">
            This device has been permanently blocked from accessing Rogue Renegade IDE.
            </p>
            <p className="text-xs text-red-700">
            If you believe this is a mistake, contact the administrator.
            </p>
        </div>
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

async function fetchPendingApprovalCount(
  setCount: (n: number) => void
) {
  const pending = await invoke<any[]>("auth_get_pending_accounts");
  setCount(pending.length);
}

const refreshPendingApprovals = async () => {
  await fetchPendingApprovalCount(setPendingApprovalCount);
};



return (
  <div className="h-screen flex flex-col">

    {/* 🧠 MAIN APP */}
    <div className="flex-1">
        <Workspace
        onSwitchAccount={() => switchAccount(setState)}
        onLogout={() =>
            logout(setState, setAuthMode, setForceAuthScreen)
        }
        pendingApprovalCount={pendingApprovalCount}
        refreshPendingApprovals={refreshPendingApprovals}
        />
    </div>
  </div>
);


}
