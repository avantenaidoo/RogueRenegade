import { signRequest } from "./signRequest";

/**
 * Backend base URL (Axum)
 */
const BACKEND_URL = "http://127.0.0.1:3000";

/**
 * TEMP: device key access
 * (later this comes from Tauri secure storage)
 */
function getDeviceKeys() {
  // ⚠️ PLACEHOLDER — you already generate this in Rust
  // For now we hard-wire to prove the pipeline works
  const privateKey = (window as any).__DEVICE_PRIVATE_KEY__ as Uint8Array;
  const keyId = "device-1";

  if (!privateKey) {
    throw new Error("Device private key not loaded");
  }

  return { privateKey, keyId };
}

/**
 * LOW-LEVEL signed HTTP request
 * THIS is what finalises the system
 */
export async function backendFetch(
  path: string,
  options?: {
    method?: "GET" | "POST";
    body?: unknown;
  }
) {
  const method = options?.method ?? "GET";
  const body = options?.body ?? null;

  const bodyBytes = body
    ? new TextEncoder().encode(JSON.stringify(body))
    : new Uint8Array();

  const { privateKey, keyId } = getDeviceKeys();

  const signatureHeaders = await signRequest(
    privateKey,
    keyId,
    method,
    path,
    bodyBytes
  );

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...signatureHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  return res.json().catch(() => null);
}
