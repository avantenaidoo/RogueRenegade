import { getDeviceKeys } from "./deviceKeys";

/* ─────────────────────────
   CONFIG
   ───────────────────────── */

const API_BASE = "http://127.0.0.1:3000";
const DEVICE_ID_KEY = "rogue-renegade-device-id";

let registered = false;

/* ─────────────────────────
   DEVICE ID (SAME AS BACKEND)
   ───────────────────────── */

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    console.log("🆕 GENERATED DEVICE ID:", id);
  }

  return id;
}

/* ─────────────────────────
   REGISTER DEVICE (ONCE)
   ───────────────────────── */

export async function registerDeviceOnce() {
  if (registered) return;

  const { publicKey } = await getDeviceKeys();
  const deviceId = getDeviceId();

  console.log("📡 REGISTERING DEVICE:", deviceId);

  const res = await fetch(`${API_BASE}/device/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key_id: deviceId, // ✅ REAL DEVICE ID
      public_key_base64: btoa(
        String.fromCharCode(...publicKey)
      ),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Device registration failed (${res.status}) ${text}`
    );
  }

  registered = true;
}
