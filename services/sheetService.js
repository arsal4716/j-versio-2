// backend/services/sheetService.js
import path from "path";
import fs from "fs";
import { google } from "googleapis";
import logger from "../utils/logger.js";

const absPath = (p) => (path.isAbsolute(p) ? p : path.resolve(process.cwd(), p));

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

async function appendRow({ keyFile, spreadsheetId, tabName, row }) {
  const keyJson = loadServiceAccountKeyJson(keyFile);

  const auth = new google.auth.GoogleAuth({
    credentials: keyJson,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const range = `${tabName}!A1`;

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

function buildRowFromFormSetup(formSetup, submission, { centerName, campaignName }) {
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
    new Date().toISOString()
  );

  return row;
}

function resolveCenterKeyFile(center) {
  const gs = center?.googleSheets || {};
  const direct = gs.clientKeyFile;

  if (direct && fileExists(direct)) return direct;

  const code = String(center?.verificationCode || "").trim();
  const name = String(center?.name || "").trim();

  const byCode = code ? `sheets/${code}/client-key.json` : null;
  if (byCode && fileExists(byCode)) return byCode;

  const byName = name ? `sheets/${name}/client-key.json` : null;
  if (byName && fileExists(byName)) return byName;

  return null;
}

class SheetService {

  async saveSubmissionToSheets(center, campaign, submissionResult, formSetup) {
    const adminKeyFile = "sheets/admin/admin.json";
    const centerKeyFile = resolveCenterKeyFile(center);

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

    if (!fileExists(adminKeyFile)) {
      result.admin = {
        success: false,
        error: `Admin key file not found: ${adminKeyFile}`,
      };
    }

    if (!centerKeyFile) {
      result.master = {
        success: false,
        error:
          "Center key file not found. Set googleSheets.clientKeyFile OR place file at sheets/<verificationCode>/client-key.json OR sheets/<centerName>/client-key.json",
      };
    }
    if (!adminSpreadsheetId) {
      result.admin = {
        success: false,
        error:
          " spreadsheetId missing. Set center.googleSheets.masterSheetId (sheet spreadsheet ID).",
      };
    } else if (result.admin.error) {
      // keep error
    } else {
      try {
        await appendRow({
          keyFile: adminKeyFile,
          spreadsheetId: adminSpreadsheetId,
          tabName: adminTabName,
          row,
        });
        result.admin = { success: true };
      } catch (e) {
        const err = e?.message || " sheet append failed";
        result.admin = { success: false, error: err };
        logger.error(" sheet append failed", {
          centerId: center?._id,
          spreadsheetId: adminSpreadsheetId,
          tabName: adminTabName,
          error: err,
        });
      }
    }
    if (!centerSpreadsheetId) {
      result.master = {
        success: false,
        error:
          "Center campaign spreadsheetId missing. Set campaign.sheetTabId (center sheet spreadsheet ID).",
      };
    } else if (result.master.error) {
      // keep error
    } else {
      try {
        await appendRow({
          keyFile: centerKeyFile,
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
