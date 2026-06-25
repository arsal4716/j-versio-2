// backend/services/sheetService.js
import path from "path";
import fs from "fs";
import { google } from "googleapis";
import logger from "../utils/logger.js";
import Center from "../models/Center.js";
import AppConfig from "../models/AppConfig.js";
import { encryptSecret, decryptSecret } from "../utils/secretCrypto.js";

const ADMIN_KEY_CONFIG_NAME = "adminGoogleKey";

const absPath = (p) =>
  path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);

function normalizeTabName(name) {
  const tab = String(name || "").trim();
  return tab.replace(/[\[\]\*\?:\/\\]/g, " ").trim() || "Sheet1";
}

function fileExists(p) {
  try {
    fs.accessSync(absPath(p), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function loadServiceAccountKeyJson(keyFilePath) {
  const full = absPath(keyFilePath);
  const raw = fs.readFileSync(full, "utf8");
  return JSON.parse(raw);
}

async function appendRow({ keyJson, spreadsheetId, tabName, row }) {
  const auth = new google.auth.GoogleAuth({
    credentials: keyJson,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const safeTabName = `'${tabName.replace(/'/g, "''")}'`;
  const range = `${safeTabName}!A1`;

  await sheets.spreadsheets.values.append({
    spreadsheetId: String(spreadsheetId).trim(),
    range,
    valueInputOption: "RAW",
    resource: { values: [row] },
  });
}

function getValueFromSubmission(submission, fieldName) {
  if (!fieldName) return "";

  const direct = submission?.[fieldName];
  if (direct !== undefined && direct !== null) return String(direct);

  const nested = submission?.additionalData?.[fieldName];
  if (nested !== undefined && nested !== null) return String(nested);

  return "";
}

function buildRowFromFormSetup(
  formSetup,
  submission,
  { centerName, campaignName },
) {
  const fields = Array.isArray(formSetup?.fields) ? formSetup.fields : [];
  const row = [];

  for (const f of fields) {
    row.push(getValueFromSubmission(submission, f?.name));
  }
  row.push(
    centerName || "",
    campaignName || "",
    submission?.leadId || "",
    submission?.ipAddress || "",
    submission?.trustedForm || "",
    submission?.pageUrl || "",
    new Date().toISOString(),
  );

  return row;
}

// The single global super-admin service-account key. Usable as a fallback for
// any center that has not uploaded its own key (env override supported).
const globalKeyFile = () =>
  process.env.GOOGLE_GLOBAL_KEY_FILE || "storage/global/google-key.json";

function sanitizeCenterName(name) {
  return String(name || "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

// Returns the first JSON file found in a directory (any filename — sheet2.json,
// client-key.json, 3883829.json, etc.), preferring a conventional name when
// several exist. Used so an operator can drop a center's service-account key
// into sheets/<centerName>/ without caring what it's called.
function firstJsonInDir(dir) {
  try {
    const full = absPath(dir);
    const stat = fs.statSync(full);
    if (!stat.isDirectory()) return null;
    const jsons = fs
      .readdirSync(full)
      .filter((f) => f.toLowerCase().endsWith(".json"));
    if (!jsons.length) return null;
    const preferred = jsons.find((f) => /(google|client|service|account)?[-_]?key/i.test(f));
    return path.join(dir, preferred || jsons[0]);
  } catch {
    return null;
  }
}

function resolveCenterKeyFile(center) {
  const gs = center?.googleSheets || {};
  const direct = gs.clientKeyFile;

  // An explicit, existing path always wins.
  if (direct && fileExists(direct)) return direct;

  const code = String(center?.verificationCode || "").trim();
  const name = String(center?.name || "").trim();
  const safeName = sanitizeCenterName(name);

  // Any JSON file dropped into the center's folder (manual upload or the form
  // upload, which now also lands here). Both the raw and the sanitized center
  // name are checked so "Broad Center" works whether the folder uses a space or
  // an underscore.
  const dirs = [
    name && `sheets/${name}`,
    safeName && safeName !== name && `sheets/${safeName}`,
    code && `sheets/${code}`,
    safeName && `storage/centers/${safeName}`,
  ].filter(Boolean);

  for (const d of dirs) {
    const found = firstJsonInDir(d);
    if (found) return found;
  }

  // Legacy explicit filenames (backward compatibility).
  const legacy = [
    safeName && `storage/centers/${safeName}/google-key.json`,
    code && `sheets/${code}/client-key.json`,
    name && `sheets/${name}/client-key.json`,
  ].filter(Boolean);
  for (const p of legacy) {
    if (fileExists(p)) return p;
  }

  // Global super-admin key fallback so every center can sync without its own key.
  const global = globalKeyFile();
  if (fileExists(global)) return global;

  return null;
}

// Resolve a center's service-account key JSON. MongoDB (encrypted) is the
// fleet-wide source of truth; the filesystem is a fallback. When only a file
// exists it is auto-migrated into MongoDB so every other server can use it
// without a re-upload.
async function resolveCenterKeyJson(center) {
  // The center object passed in is usually a lean read WITHOUT the select:false
  // clientKeyEnc, so fetch the encrypted blob explicitly.
  let enc = center?.googleSheets?.clientKeyEnc;
  if (!enc && center?._id) {
    const fresh = await Center.findById(center._id)
      .select("+googleSheets.clientKeyEnc")
      .lean()
      .catch(() => null);
    enc = fresh?.googleSheets?.clientKeyEnc;
  }
  if (enc) {
    try {
      return JSON.parse(decryptSecret(enc));
    } catch (e) {
      logger.warn("Failed to decrypt stored center key; falling back to file", {
        centerId: center?._id,
        error: e?.message,
      });
    }
  }

  // Filesystem fallback (+ auto-migrate into Mongo for the rest of the fleet).
  const file = resolveCenterKeyFile(center);
  if (file) {
    try {
      const json = loadServiceAccountKeyJson(file);
      if (center?._id) {
        Center.updateOne(
          { _id: center._id },
          { $set: { "googleSheets.clientKeyEnc": encryptSecret(JSON.stringify(json)) } }
        ).catch((e) => logger.warn("Center key auto-migrate failed", { error: e?.message }));
      }
      return json;
    } catch (e) {
      logger.warn("Failed to read center key file", { file, error: e?.message });
    }
  }
  return null;
}

// Resolve the global admin service-account key JSON. MongoDB first, then the
// legacy sheets/admin/admin.json file (auto-migrated into Mongo on first use).
async function resolveAdminKeyJson() {
  const doc = await AppConfig.findOne({ name: ADMIN_KEY_CONFIG_NAME }).lean().catch(() => null);
  if (doc?.valueEnc) {
    try {
      return JSON.parse(decryptSecret(doc.valueEnc));
    } catch (e) {
      logger.warn("Failed to decrypt stored admin key; falling back to file", { error: e?.message });
    }
  }

  const file = process.env.GOOGLE_ADMIN_KEY_FILE || "sheets/admin/admin.json";
  if (fileExists(file)) {
    try {
      const json = loadServiceAccountKeyJson(file);
      AppConfig.updateOne(
        { name: ADMIN_KEY_CONFIG_NAME },
        {
          $set: {
            valueEnc: encryptSecret(JSON.stringify(json)),
            meta: { client_email: json.client_email || "", source: "file-migrated" },
          },
        },
        { upsert: true }
      ).catch((e) => logger.warn("Admin key auto-migrate failed", { error: e?.message }));
      return json;
    } catch (e) {
      logger.warn("Failed to read admin key file", { file, error: e?.message });
    }
  }
  return null;
}

class SheetService {
  async saveSubmissionToSheets(center, campaign, submissionResult, formSetup) {
    const [adminKeyJson, centerKeyJson] = await Promise.all([
      resolveAdminKeyJson(),
      resolveCenterKeyJson(center),
    ]);

    const adminSpreadsheetId = center?.googleSheets?.masterSheetId;
    const adminTabName = normalizeTabName(center?.name);

    const centerSpreadsheetId = campaign?.sheetTabId;
    const centerTabName = normalizeTabName(campaign?.name);

    const row = buildRowFromFormSetup(formSetup, submissionResult, {
      centerName: center?.name,
      campaignName: campaign?.name,
    });

    const result = {
      master: { success: false },
      admin: { success: false },
    };

    // ---- Admin / master sheet ----
    if (!adminKeyJson) {
      result.admin = {
        success: false,
        error:
          "Admin Google key not configured. Upload it once (stored in DB) via POST /api/google-keys/admin, or place sheets/admin/admin.json.",
      };
    } else if (!adminSpreadsheetId) {
      result.admin = {
        success: false,
        error: "Admin spreadsheetId missing. Set center.googleSheets.masterSheetId.",
      };
    } else {
      try {
        await appendRow({
          keyJson: adminKeyJson,
          spreadsheetId: adminSpreadsheetId,
          tabName: adminTabName,
          row,
        });
        result.admin = { success: true };
      } catch (e) {
        const err = e?.message || "Admin sheet append failed";
        result.admin = { success: false, error: err };
        logger.error("Admin sheet append failed", {
          centerId: center?._id,
          spreadsheetId: adminSpreadsheetId,
          tabName: adminTabName,
          error: err,
        });
      }
    }

    // ---- Center sheet ----
    if (!centerKeyJson) {
      result.master = {
        success: false,
        error:
          "Center Google key not found. Upload it on the center (stored in DB) or place a *.json in sheets/<centerName>/.",
      };
    } else if (!centerSpreadsheetId) {
      result.master = {
        success: false,
        error: "Center campaign spreadsheetId missing. Set campaign.sheetTabId.",
      };
    } else {
      try {
        await appendRow({
          keyJson: centerKeyJson,
          spreadsheetId: centerSpreadsheetId,
          tabName: centerTabName,
          row,
        });
        result.master = { success: true };
      } catch (e) {
        const err = e?.message || "Center sheet append failed";
        result.master = { success: false, error: err };
        logger.error("Center sheet append failed", {
          centerId: center?._id,
          spreadsheetId: centerSpreadsheetId,
          tabName: centerTabName,
          error: err,
        });
      }
    }

    return result;
  }
}

export default new SheetService();
