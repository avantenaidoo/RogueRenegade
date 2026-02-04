import { sha256 } from "@noble/hashes/sha2.js";
import * as ed25519 from "@noble/ed25519";

/**
 * Uint8Array → hex string
 * (no external utils, no missing imports)
 */
function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * EXACT canonical signing helper
 * MUST match backend signed_middleware.rs
 */
export async function signRequest(
  privateKey: Uint8Array,   // 32 bytes
  keyId: string,            // e.g. "main-2025-01"
  method: string,           // "POST", "GET"
  path: string,             // "/ping"
  body: Uint8Array          // raw request body bytes
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();

  // ── body hash ───────────────────────────────
  const bodyHashHex = toHex(sha256(body));

  // ── canonical request ──────────────────────
  const canonical =
    `${method.toUpperCase()}\n` +
    `${path}\n` +
    `${timestamp}\n` +
    `${nonce}\n` +
    `${bodyHashHex}`;

  // ── sign ───────────────────────────────────
  const signature = await ed25519.sign(
    new TextEncoder().encode(canonical),
    privateKey
  );

  const signatureB64 = btoa(
    String.fromCharCode(...signature)
  );

  return {
    "x-signature-version": "v1",
    "x-signature-key-id": keyId,
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "x-signature": signatureB64,
  };
}
