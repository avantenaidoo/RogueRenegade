import { signRequest } from "./signRequest";
import { getDeviceKeys } from "./deviceKeys";

/* ─────────────────────────
   CONFIG
   ───────────────────────── */

const API_BASE = "http://127.0.0.1:3000";
const DEVICE_ID_KEY = "rogue-renegade-device-id";

/* ─────────────────────────
   DEVICE ID (PERSISTENT)
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
   BODY NORMALIZATION
   ───────────────────────── */

function normalizeBody(body?: BodyInit | null): Uint8Array {
  if (!body) return new Uint8Array();

  if (body instanceof Uint8Array) {
    return body;
  }

  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }

  throw new Error("Unsupported request body type for signed request");
}

/* ─────────────────────────
   SIGNED FETCH
   ───────────────────────── */

export async function backendFetch(
  path: string,
  options: RequestInit = {}
) {
  const { privateKey } = await getDeviceKeys();
  const deviceId = getDeviceId();

  const method = (options.method ?? "GET").toUpperCase();
  const bodyBytes = normalizeBody(options.body);

  const signedHeaders = await signRequest(
    privateKey,
    deviceId, // ✅ REAL DEVICE ID
    method,
    path,
    bodyBytes
  );

  const res = await fetch(API_BASE + path, {
    ...options,
    method,
    headers: {
      ...(options.headers || {}),
      ...signedHeaders,
    },
    body:
      bodyBytes.length > 0
        ? bodyBytes.slice().buffer // force ArrayBuffer
        : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Backend error ${res.status}${text ? `: ${text}` : ""}`
    );
  }

  return res;
}
