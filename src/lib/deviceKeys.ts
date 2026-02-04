import * as ed25519 from "@noble/ed25519";
import {
  readTextFile,
  writeTextFile,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";

const KEY_FILE = "device_key.json";

let cachedKeys: {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} | null = null;

export async function getDeviceKeys() {
  if (cachedKeys) return cachedKeys;

  try {
    const raw = await readTextFile(KEY_FILE, {
      baseDir: BaseDirectory.AppData,
    });

    const parsed = JSON.parse(raw);

    cachedKeys = {
      privateKey: Uint8Array.from(parsed.privateKey),
      publicKey: Uint8Array.from(parsed.publicKey),
    };

    return cachedKeys;
  } catch {
    // 🔥 FIRST RUN — CREATE KEYS
    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = await ed25519.getPublicKey(privateKey);

    await writeTextFile(
      KEY_FILE,
      JSON.stringify({
        privateKey: Array.from(privateKey),
        publicKey: Array.from(publicKey),
      }),
      { baseDir: BaseDirectory.AppData }
    );

    cachedKeys = { privateKey, publicKey };
    return cachedKeys;
  }
}
