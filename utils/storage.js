// backend/utils/storage.js
// Persists per-center Google service-account keys to a stable location:
//   sheets/{sanitized-center-name}/google-key.json
// This is the same folder an operator can drop a key into manually (any *.json
// filename works — the sheet service scans the folder). Writing the validated
// content (rather than fs.rename) avoids cross-device EXDEV failures and
// guarantees the stored file is valid JSON.
import fs from "fs";
import path from "path";

export function sanitizeName(name) {
  return (
    String(name || "")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "center"
  );
}

export const centerKeyPath = (centerName) =>
  path.join("sheets", sanitizeName(centerName), "google-key.json");

/**
 * Validates and stores an uploaded service-account key for a center.
 * @returns {string} the relative path the key was stored at
 * @throws if the upload is not valid JSON
 */
export function saveServiceAccountKey(centerName, tmpFilePath) {
  let raw;
  try {
    raw = fs.readFileSync(tmpFilePath, "utf8");
    JSON.parse(raw); // reject non-JSON uploads with a clear error
  } catch {
    fs.promises.unlink(tmpFilePath).catch(() => {});
    const err = new Error("Uploaded Google key file is not valid JSON");
    err.status = 400;
    throw err;
  }

  const dest = centerKeyPath(centerName);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, raw);
  fs.promises.unlink(tmpFilePath).catch(() => {});
  return dest;
}

export default { sanitizeName, centerKeyPath, saveServiceAccountKey };
