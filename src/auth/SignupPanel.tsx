import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export default function SignupPanel({
  onSuccess,
  onCancel,
}: Props) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null); // ✅ ADD THIS

  async function handleSignup() {
    setError(null);
    setSuccess(null);

    try {
      const res = await invoke<{
        success: boolean;
        message: string;
      }>("signup_user", {
        email,
        username,
        passwordHash: password,
      });

      if (!res.success) {
        setError(res.message);
        return;
      }

      // ✅ SHOW SUCCESS MESSAGE
      setSuccess(res.message);

      // ✅ DELAY RETURN TO LOGIN
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      setError(String(err));
    }
  }

  return (
    <div className="border p-6 rounded w-96 space-y-3">
      <h2 className="text-lg font-semibold">Create account</h2>

      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      {success && ( // ✅ ADD THIS BLOCK
        <div className="text-sm text-green-600">
          {success}
        </div>
      )}

      <input
        className="w-full border p-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full border p-2"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        className="w-full border p-2"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="w-full bg-black text-white py-2 rounded"
        onClick={handleSignup}
        disabled={!!success} // optional but good UX
      >
        Create account
      </button>

      <button
        className="text-sm underline w-full mt-2"
        onClick={onCancel}
        disabled={!!success}
      >
        Back to sign in
      </button>
    </div>
  );
}
