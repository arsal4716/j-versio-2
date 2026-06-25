// backend/controllers/googleKeyController.js
// Upload Google service-account keys straight into MongoDB (encrypted) so they
// are available to every server/worker — no per-server file copies.
import AppConfig from "../models/AppConfig.js";
import Center from "../models/Center.js";
import { encryptSecret } from "../utils/secretCrypto.js";
import { success, fail } from "../utils/response.js";
import { isValidObjectId } from "../utils/objectId.js";

const ADMIN_KEY_CONFIG_NAME = "adminGoogleKey";

function parseKeyFile(req) {
  if (!req.file?.buffer) return { error: "No file uploaded (field name: keyFile)" };
  let parsed;
  try {
    parsed = JSON.parse(req.file.buffer.toString("utf8"));
  } catch {
    return { error: "File is not valid JSON" };
  }
  if (!parsed || typeof parsed !== "object" || !parsed.client_email || !parsed.private_key) {
    return { error: "Not a Google service-account key (missing client_email / private_key)" };
  }
  return { parsed };
}

// POST /api/google-keys/admin   (super_admin)  field: keyFile
export async function uploadAdminKey(req, res) {
  const { parsed, error } = parseKeyFile(req);
  if (error) return fail(res, { message: error, status: 400 });

  await AppConfig.updateOne(
    { name: ADMIN_KEY_CONFIG_NAME },
    {
      $set: {
        valueEnc: encryptSecret(JSON.stringify(parsed)),
        meta: { client_email: parsed.client_email, source: "upload" },
      },
    },
    { upsert: true }
  );

  return success(res, {
    message: "Admin Google key saved to database (used across all servers).",
    data: { client_email: parsed.client_email },
  });
}

// GET /api/google-keys/admin/status   (super_admin)
export async function adminKeyStatus(req, res) {
  const doc = await AppConfig.findOne({ name: ADMIN_KEY_CONFIG_NAME }).lean();
  return success(res, {
    message: "Admin key status",
    data: { configured: !!doc?.valueEnc, client_email: doc?.meta?.client_email || "" },
  });
}

// POST /api/google-keys/center/:id   (super_admin/admin)  field: keyFile
export async function uploadCenterKey(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) return fail(res, { message: "Invalid center id", status: 400 });

  const { parsed, error } = parseKeyFile(req);
  if (error) return fail(res, { message: error, status: 400 });

  const r = await Center.updateOne(
    { _id: id },
    { $set: { "googleSheets.clientKeyEnc": encryptSecret(JSON.stringify(parsed)) } }
  );
  if (!r.matchedCount) return fail(res, { message: "Center not found", status: 404 });

  return success(res, {
    message: "Center Google key saved to database (used across all servers).",
    data: { client_email: parsed.client_email },
  });
}

export default { uploadAdminKey, adminKeyStatus, uploadCenterKey };
