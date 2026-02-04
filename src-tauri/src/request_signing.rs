use ed25519_dalek::{Signature, SigningKey, Signer};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use base64::{engine::general_purpose, Engine};

pub struct SignedRequest {
    pub headers: Vec<(String, String)>,
}

pub fn sign_request(
    signing_key: &SigningKey,
    key_id: &str,
    method: &str,
    path: &str,
    body: &[u8],
) -> Result<SignedRequest, String> {
    // ── timestamp ───────────────────────────────
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "clock error")?
        .as_secs();

    // ── nonce ──────────────────────────────────
    let nonce = Uuid::new_v4().to_string();

    // ── body hash ──────────────────────────────
    let body_hash = Sha256::digest(body);
    let body_hash_hex = hex::encode(body_hash);

    // ── canonical string (MUST MATCH BACKEND) ──
    let canonical = format!(
        "{}\n{}\n{}\n{}\n{}",
        method,
        path,
        ts,
        nonce,
        body_hash_hex
    );

    // ── sign ───────────────────────────────────
    let signature: Signature = signing_key.sign(canonical.as_bytes());
    let signature_b64 =
        general_purpose::STANDARD.encode(signature.to_bytes());

    Ok(SignedRequest {
        headers: vec![
            ("x-signature-version".into(), "v1".into()),
            ("x-signature-key-id".into(), key_id.into()),
            ("x-timestamp".into(), ts.to_string()),
            ("x-nonce".into(), nonce),
            ("x-signature".into(), signature_b64),
        ],
    })
}
