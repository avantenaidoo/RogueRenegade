import { signRequest } from "./signRequest";
import { getDeviceKeys } from "./deviceKeys";

const API_BASE = "http://127.0.0.1:3000";
const KEY_ID = "device-main";

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

export async function backendFetch(
  path: string,
  options: RequestInit = {}
) {
  const { privateKey } = await getDeviceKeys();

  const method = (options.method ?? "GET").toUpperCase();
  const bodyBytes = normalizeBody(options.body);

  const signedHeaders = await signRequest(
    privateKey,
    KEY_ID,
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
    // ✅ FORCE REAL ArrayBuffer (NOT SharedArrayBuffer)
    body: bodyBytes.length > 0
      ? bodyBytes.slice().buffer
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
