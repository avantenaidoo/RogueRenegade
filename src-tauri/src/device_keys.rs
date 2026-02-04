use ed25519_dalek::{SigningKey, VerifyingKey};
use rand::rngs::OsRng;
use keyring::Entry;
use base64::{engine::general_purpose, Engine};

const SERVICE: &str = "com.avant.rogue-renegade-ide.device";
const KEY_NAME: &str = "device_private_key";

pub fn get_or_create_device_key() -> Result<VerifyingKey, String> {
    let entry = Entry::new(SERVICE, KEY_NAME)
        .map_err(|e| e.to_string())?;

    // ─────────────────────────────
    // LOAD EXISTING PRIVATE KEY
    // ─────────────────────────────
    if let Ok(encoded) = entry.get_password() {
        let bytes: Vec<u8> = general_purpose::STANDARD
            .decode(encoded)
            .map_err(|e| e.to_string())?;

        let secret: [u8; 32] = bytes
            .try_into()
            .map_err(|_| "Invalid private key length (expected 32 bytes)".to_string())?;

        let signing_key = SigningKey::from_bytes(&secret);
        return Ok(signing_key.verifying_key());
    }

    // ─────────────────────────────
    // GENERATE NEW KEYPAIR
    // ─────────────────────────────
    let signing_key = SigningKey::generate(&mut OsRng);
    let private_bytes: [u8; 32] = signing_key.to_bytes();

    // Store private key in OS secure storage (BASE64)
    entry
        .set_password(&general_purpose::STANDARD.encode(private_bytes))
        .map_err(|e| e.to_string())?;

    Ok(signing_key.verifying_key())
}

pub fn public_key_base64(vk: &VerifyingKey) -> String {
    general_purpose::STANDARD.encode(vk.to_bytes())
}
