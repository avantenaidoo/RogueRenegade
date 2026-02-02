import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Props = {
  onSuccess: () => void;
  onSignup: () => void;
};

export default function LoginPanel({
  onSuccess,
  onSignup,
}: Props) {

  const [identifier, setIdentifier] = useState("");
  const [passwordHash, setPasswordHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(null);

    try {
      const res = await invoke<{
        success: boolean;
        message: string;
        accounts: any[];
      }>("login_user", {
        identifier,
        passwordHash,
      });

      if (!res.success) {
        setError(res.message);
        return;
      }

      // ✅ Rust wrote auth_state.json
      // ✅ AuthGate will re-check state
      onSuccess();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border p-6 rounded w-96 space-y-4">
      <h2 className="text-lg font-semibold">Sign in</h2>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <input
        className="w-full border p-2 rounded"
        placeholder="Email or username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />

      <input
        className="w-full border p-2 rounded"
        placeholder="Password"
        type="password"
        value={passwordHash}
        onChange={(e) => setPasswordHash(e.target.value)}
      />

      <button
        className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
        disabled={loading}
        onClick={handleLogin}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      {/* 👇 ADD THIS */}
      <button
        className="text-sm underline w-full mt-2"
        onClick={onSignup}
      >
        Create account
      </button>
    </div>

  );
}
