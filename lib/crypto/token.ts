/**
 * Symmetric encryption for the user's GitHub access token at rest.
 *
 * AES-256-GCM via Node's webcrypto. Each ciphertext is prefixed with a
 * fresh 12-byte IV; the GCM auth tag is appended to the ciphertext by
 * the WebCrypto API automatically. Final blob is base64-encoded.
 *
 * The encryption key comes from `GITHUB_TOKEN_ENCRYPTION_KEY` (a
 * base64-encoded 32-byte secret). Generate one with:
 *
 *   node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))'
 *
 * NEVER log the plaintext token or the key. NEVER ship this code to the
 * browser — `lib/crypto/token.ts` is only imported by server code.
 */
import "server-only";
import { webcrypto } from "node:crypto";

const ALGO = "AES-GCM";
const IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const raw = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "GITHUB_TOKEN_ENCRYPTION_KEY is not set. " +
        'Generate one with: node -e \'console.log(require("crypto").randomBytes(32).toString("base64"))\'',
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(raw, "base64"));
  } catch {
    throw new Error(
      "GITHUB_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte secret.",
    );
  }

  if (bytes.length !== KEY_BYTES) {
    throw new Error(
      `GITHUB_TOKEN_ENCRYPTION_KEY must decode to exactly ${KEY_BYTES} bytes (got ${bytes.length}).`,
    );
  }

  cachedKey = await webcrypto.subtle.importKey(
    "raw",
    bytes,
    { name: ALGO, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  return cachedKey;
}

/**
 * Encrypt a plaintext string and return a base64 blob safe to store in
 * a TEXT column. Format: `iv (12 bytes) || ciphertext+authTag`.
 */
export async function encryptToken(plaintext: string): Promise<string> {
  if (!plaintext) {
    throw new Error("encryptToken: plaintext must be non-empty");
  }

  const key = await getKey();
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(plaintext);

  const ciphertext = new Uint8Array(
    await webcrypto.subtle.encrypt({ name: ALGO, iv }, key, data),
  );

  const blob = new Uint8Array(iv.length + ciphertext.length);
  blob.set(iv, 0);
  blob.set(ciphertext, iv.length);

  return Buffer.from(blob).toString("base64");
}

/**
 * Decrypt a base64 blob produced by `encryptToken`. Throws on tamper or
 * key mismatch.
 */
export async function decryptToken(payload: string): Promise<string> {
  if (!payload) {
    throw new Error("decryptToken: payload must be non-empty");
  }

  const key = await getKey();
  const blob = new Uint8Array(Buffer.from(payload, "base64"));

  if (blob.length <= IV_BYTES) {
    throw new Error("decryptToken: payload too short to be valid");
  }

  const iv = blob.subarray(0, IV_BYTES);
  const ciphertext = blob.subarray(IV_BYTES);

  const plain = await webcrypto.subtle.decrypt(
    { name: ALGO, iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plain);
}
