import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import {
  readTextFile,
  writeTextFile,
  mkdir,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";

ed25519.hashes.sha512 = sha512;

/*
  STEP 17 — Persistent device Ed25519 keypair
  Tauri v2 + Windows SAFE
*/

const KEY_DIR = "security";
const KEY_FILE = `${KEY_DIR}/device_key.json`;

let cachedKeys: {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} | null = null;

/* helpers */
const serialize = (k: Uint8Array) => Array.from(k);
const deserialize = (a: number[]) => Uint8Array.from(a);

export async function getDeviceKeys() {
  console.log("🔐 [deviceKeys] getDeviceKeys()");

  if (cachedKeys) return cachedKeys;

  /* ─────────────────────────────────────────────
     ✅ CREATE DIRECTORY (THE REAL FIX)
     ───────────────────────────────────────────── */

  try {
    console.log("📁 [deviceKeys] ensuring AppData/security exists");

    await mkdir(KEY_DIR, {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });

    console.log("✅ [deviceKeys] security directory created");
  } catch (err) {
    console.error("❌ [deviceKeys] mkdir failed", err);
    throw err;
  }

  /* ─────────────────────────────────────────────
     LOAD EXISTING KEYS
     ───────────────────────────────────────────── */

  try {
    console.log("📖 [deviceKeys] reading existing key file");

    const raw = await readTextFile(KEY_FILE, {
      baseDir: BaseDirectory.AppData,
    });

    const parsed = JSON.parse(raw);

    cachedKeys = {
      privateKey: deserialize(parsed.privateKey),
      publicKey: deserialize(parsed.publicKey),
    };

    console.log("🔓 [deviceKeys] loaded existing keys");
    return cachedKeys;
  } catch {
    console.log("🧬 [deviceKeys] no key file — generating");
  }

  /* ─────────────────────────────────────────────
     GENERATE + WRITE
     ───────────────────────────────────────────── */

  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = await ed25519.getPublicKey(privateKey);

  console.log("💾 [deviceKeys] writing device_key.json");

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

  console.log("✅ [deviceKeys] key file written");

  cachedKeys = { privateKey, publicKey };
  return cachedKeys;
}
