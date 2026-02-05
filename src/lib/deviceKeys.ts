import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import {
  readTextFile,
  writeTextFile,
  BaseDirectory,
  create,
} from "@tauri-apps/plugin-fs";

// REQUIRED for noble-ed25519
ed25519.hashes.sha512 = sha512;

/*
  STEP 17
  - Persistent device Ed25519 keypair
  - Stored in Tauri AppData
*/

const KEY_DIR = "security";
const KEY_FILE = `${KEY_DIR}/device_key.json`;

let cachedKeys: {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} | null = null;

/* ───────────────────────── helpers */

function serialize(key: Uint8Array): number[] {
  return Array.from(key);
}

function deserialize(arr: number[]): Uint8Array {
  return Uint8Array.from(arr);
}

/* ───────────────────────── public API */

export async function getDeviceKeys() {
  if (cachedKeys) return cachedKeys;

  // ensure directory exists (NO recursive support)
  try {
    await create(KEY_DIR, {
      baseDir: BaseDirectory.AppData,
    });
  } catch {
    // directory already exists → ignore
  }

  try {
    // ── load existing keys ─────────────────────
    const raw = await readTextFile(KEY_FILE, {
      baseDir: BaseDirectory.AppData,
    });

    const parsed = JSON.parse(raw);

    cachedKeys = {
      privateKey: deserialize(parsed.privateKey),
      publicKey: deserialize(parsed.publicKey),
    };

    return cachedKeys;
  } catch {
    // ── first run → generate keys ──────────────
    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = await ed25519.getPublicKey(privateKey);

    await writeTextFile(
      KEY_FILE,
      JSON.stringify(
        {
          privateKey: serialize(privateKey),
          publicKey: serialize(publicKey),
        },
        null,
        2
      ),
      { baseDir: BaseDirectory.AppData }
    );

    cachedKeys = { privateKey, publicKey };
    return cachedKeys;
  }
}
