import { getDeviceKeys } from "./deviceKeys";

const API_BASE = "http://127.0.0.1:3000";
const KEY_ID = "device-main";

let registered = false;

export async function registerDeviceOnce() {
  if (registered) return;

  const { publicKey } = await getDeviceKeys();

  const res = await fetch(`${API_BASE}/device/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key_id: KEY_ID,
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
