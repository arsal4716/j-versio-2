// backend/utils/secretCrypto.js
// Symmetric encryption for secrets stored in MongoDB (Google service-account
// key JSON). Uses AES-256-GCM with a key derived from KEY_ENCRYPTION_SECRET
// (falling back to JWT_SECRET, which is already shared identically across every
// server so encrypt-on-server-A / decrypt-on-server-B works out of the box).
import crypto from "crypto";

const SECRET =
  process.env.KEY_ENCRYPTION_SECRET ||
  process.env.JWT_SECRET ||
  "your_super_secure_jwt_secret_here";

const KEY = crypto.createHash("sha256").update(String(SECRET)).digest(); // 32 bytes
const ALGO = "aes-256-gcm";

// Returns "v1:<iv>:<tag>:<ciphertext>" (all base64).
export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain ?? ""), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

// Decrypts a "v1:..." blob. A value that is not in that format is returned as-is
// (so a plain-JSON value accidentally stored unencrypted still works).
export function decryptSecret(blob) {
  if (!blob) return "";
  const parts = String(blob).split(":");
  if (parts[0] !== "v1" || parts.length !== 4) return String(blob);
  try {
    const [, ivB, tagB, dataB] = parts;
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivB, "base64"));
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}

export default { encryptSecret, decryptSecret };
