import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Workspace from "@/pages/Workspace";

type AuthState = {
  is_authenticated: boolean;
  active_account_id: string | null;
};

export default function AuthGate() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => {
    (async () => {
      const state = await invoke<AuthState>("get_auth_state");
      setAuth(state);
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

  if (!auth?.is_authenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="border p-6 rounded w-90">
          <h2 className="text-lg font-semibold mb-4">Sign in required</h2>

          <button
            className="w-full bg-black text-white py-2 rounded"
            onClick={async () => {
              // TEMP LOGIN (DEV ONLY)
              await invoke("set_authenticated", {
                accountId: "dev-account",
              });
              window.location.reload();
            }}
          >
            Dev Login
          </button>
        </div>
      </div>
    );
  }

  return <Workspace />;
}
