// backend/services/dncService.js
// Do-Not-Call engine. Powers the real-time phone checker on the form page and
// the server-side enforcement gate in the submission worker.
//
//   - Internal DNC: deterministic, indexed DB lookup. Fail-CLOSED (a hit blocks).
//   - External providers (Blacklist Alliance, DNC.com, TCPA Litigator,
//     LeadConduit): real authenticated HTTP calls keyed by the API key stored in
//     SettingsConfig. Fail-OPEN — a provider outage/timeout never blocks a clean
//     lead (the agent override path covers genuine disputes), but a confirmed
//     "listed" response blocks.
//
// All checks run concurrently and each is independently time-boxed so the
// real-time check stays fast even when one provider is slow.
import axios from "axios";
import fs from "fs";
import path from "path";
import xlsx from "xlsx";

import DncEntry from "../models/DncEntry.js";
import SettingsConfig from "../models/SettingsConfig.js";
import Center from "../models/Center.js";
import { ValidationError, NotFoundError, AuthorizationError } from "../utils/errorTypes.js";
import logger from "../utils/logger.js";

const PROVIDER_TIMEOUT_MS = Number(process.env.DNC_PROVIDER_TIMEOUT_MS || 4500);

/* ------------------------------------------------------------------ */
/* Phone normalization                                                 */
/* ------------------------------------------------------------------ */

// Returns a 10-digit US phone string or null if the input cannot be a US number.
export function normalizePhone(raw) {
  if (raw === null || raw === undefined) return null;
  let digits = String(raw).replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return digits;
}

// Extracts every distinct, normalized phone number from arbitrary text (CSV/TXT
// content or XLSX cell dump). Tolerant of separators and a leading country code.
const PHONE_TOKEN_RE = /(?:\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g;
function extractPhones(text) {
  const out = new Set();
  const matches = String(text || "").match(PHONE_TOKEN_RE) || [];
  for (const m of matches) {
    const n = normalizePhone(m);
    if (n) out.add(n);
  }
  return [...out];
}

/* ------------------------------------------------------------------ */
/* Tenant access                                                       */
/* ------------------------------------------------------------------ */

const isSuperAdmin = (user) => Array.isArray(user?.roles) && user.roles.includes("super_admin");

function assertCenterAccess(user, centerId, campaignName, { write = false } = {}) {
  if (isSuperAdmin(user)) return;
  if (write && !user?.roles?.includes("admin")) {
    throw new AuthorizationError("You do not have permission to manage DNC lists");
  }
  if (user?.centerId?.toString() !== centerId?.toString()) {
    throw new AuthorizationError("You do not have access to this center");
  }
  // A plain user may only check phones for campaigns they are assigned to.
  if (!write && campaignName && !user?.roles?.includes("admin")) {
    if (!Array.isArray(user?.allowedCampaigns) || !user.allowedCampaigns.includes(campaignName)) {
      throw new AuthorizationError("You do not have permission for this campaign");
    }
  }
}

/* ------------------------------------------------------------------ */
/* Effective settings (campaign override → center default)             */
/* ------------------------------------------------------------------ */

// Returns the DNC toggle block in effect for a scope. Campaign settings override
// the center default; if no campaign-scoped document exists, the center default
// is used.
async function resolveEffectiveSettings(centerId, campaignName) {
  let doc = null;
  if (campaignName) {
    doc = await SettingsConfig.findOne({ centerId, campaignName }).lean();
  }
  if (!doc) {
    doc = await SettingsConfig.findOne({ centerId, campaignName: null }).lean();
  }
  return doc || null;
}

/* ------------------------------------------------------------------ */
/* External provider adapters                                          */
/* ------------------------------------------------------------------ */

// Each adapter resolves to { listed: boolean, message: string }. Throwing is
// treated as a provider error (fail-open) by the caller.

async function runBlacklistAlliance(phone, cfg) {
  const endpoint = (cfg.endpoint || "https://api.blacklistalliance.net/lookup").trim();
  const res = await axios.get(endpoint, {
    params: { key: cfg.apiKey, phone },
    timeout: PROVIDER_TIMEOUT_MS,
  });
  // Documented response shape:
  //   { status: "success", message: "Good", code: "none", results: 0, scrubs: true }
  // `results` is a COUNT of matches: 0 = clean, > 0 = listed.
  const data = res.data || {};
  if (String(data.status ?? "").toLowerCase() !== "success") {
    // Bad key / quota / outage — fail open (do not block on an unusable lookup).
    throw new Error(data.message || "Lookup not successful");
  }
  const count = Number(data.results) || 0;
  const listed = count > 0;
  return {
    listed,
    message: listed ? `Listed (${count})` : data.message || "Good",
  };
}

async function runTcpaLitigator(phone, cfg) {
  const endpoint = (cfg.endpoint || "https://api.tcpalitigatorlist.com/scrub/phones/").trim();
  const res = await axios.post(
    endpoint,
    new URLSearchParams({ phones: phone }).toString(),
    {
      timeout: PROVIDER_TIMEOUT_MS,
      headers: {
        Authorization: `Token ${cfg.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  const body = JSON.stringify(res.data || {}).toLowerCase();
  // The scrub response separates clean vs flagged numbers. If the phone surfaces
  // alongside a litigator/dirty marker, treat it as listed.
  const listed =
    /"dirty"|"litigator"|"is_bad_number":\s*true|"clean":\s*false/.test(body) &&
    body.includes(phone);
  return { listed, message: listed ? "litigator/flagged" : "clean" };
}

async function runDncCom(phone, cfg) {
  const endpoint = (cfg.endpoint || "https://api.dnc.com/v1/lookup").trim();
  const res = await axios.get(endpoint, {
    params: { phone },
    timeout: PROVIDER_TIMEOUT_MS,
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  });
  const data = res.data || {};
  // Common shapes: { onDNC: true } / { listed: true } / { status: "listed" }.
  const listed =
    data.onDNC === true ||
    data.listed === true ||
    data.dnc === true ||
    String(data.status ?? "").toLowerCase() === "listed";
  return { listed, message: data.message || (listed ? "on DNC" : "clean") };
}

async function runLeadConduit(phone, cfg) {
  const endpoint = (cfg.endpoint || "https://app.leadconduit.com/flows/lookup").trim();
  const res = await axios.get(endpoint, {
    params: { phone },
    timeout: PROVIDER_TIMEOUT_MS,
    headers: { Authorization: `Basic ${Buffer.from(`X:${cfg.apiKey}`).toString("base64")}` },
  });
  const data = res.data || {};
  const listed =
    data.dnc === true ||
    data.listed === true ||
    String(data.outcome ?? "").toLowerCase() === "failure";
  return { listed, message: data.reason || (listed ? "rejected" : "clean") };
}

const PROVIDERS = {
  blacklistAlliance: { label: "Blacklist Alliance", run: runBlacklistAlliance },
  tcpaLitigator: { label: "TCPA Litigator List", run: runTcpaLitigator },
  dncCom: { label: "DNC.com", run: runDncCom },
  leadConduit: { label: "LeadConduit", run: runLeadConduit },
};

/* ------------------------------------------------------------------ */
/* Core check                                                          */
/* ------------------------------------------------------------------ */

class DncService {
  normalizePhone = normalizePhone;

  // Real-time / pre-submit phone check. Returns an aggregate plus per-check
  // detail so the UI can render each provider's pass/fail.
  async checkPhone({ user, centerId, campaignName = null, phone }) {
    if (user) assertCenterAccess(user, centerId, campaignName);
    if (!centerId) throw new ValidationError("centerId is required");

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return {
        phone,
        normalized: null,
        valid: false,
        blocked: false,
        checks: [],
      };
    }

    const settings = await resolveEffectiveSettings(centerId, campaignName);
    const dnc = settings?.dnc || {};
    const tasks = [];

    // ---- Internal DNC (deterministic, fail-closed) ----
    const internalEnabled =
      dnc.internalDncLeft?.enabled ||
      dnc.internalDncRight?.enabled ||
      settings?.infoCheckers?.internalDatabase?.enabled;

    if (internalEnabled) {
      tasks.push(
        (async () => {
          const started = Date.now();
          // A center-wide (null) entry OR a campaign-scoped entry blocks.
          const scopes = [null];
          if (campaignName) scopes.push(campaignName);
          const hit = await DncEntry.findOne({
            centerId,
            phone: normalized,
            campaignName: { $in: scopes },
          }).lean();
          return {
            provider: "internalDnc",
            label: "Internal DNC",
            status: hit ? "failed" : "passed",
            listed: !!hit,
            message: hit ? "Number is on your internal DNC list" : "Not on internal list",
            ms: Date.now() - started,
          };
        })()
      );
    }

    // ---- External providers (fail-open) ----
    for (const [key, def] of Object.entries(PROVIDERS)) {
      const cfg = dnc[key];
      if (!cfg?.enabled || !cfg?.apiKey) continue;
      tasks.push(
        (async () => {
          const started = Date.now();
          try {
            const { listed, message } = await def.run(normalized, cfg);
            return {
              provider: key,
              label: def.label,
              status: listed ? "failed" : "passed",
              listed: !!listed,
              message,
              ms: Date.now() - started,
            };
          } catch (err) {
            logger.warn("DNC provider check errored (fail-open)", {
              provider: key,
              error: err?.message,
            });
            return {
              provider: key,
              label: def.label,
              status: "error",
              listed: false,
              message: "Provider unavailable",
              ms: Date.now() - started,
            };
          }
        })()
      );
    }

    const checks = await Promise.all(tasks);
    const blocked = checks.some((c) => c.listed === true);

    return {
      phone,
      normalized,
      valid: true,
      blocked,
      checks,
    };
  }

  /* ---------------- Internal DNC management ---------------- */

  async addNumbers(user, centerId, campaignName, phones, source = "manual") {
    assertCenterAccess(user, centerId, campaignName, { write: true });
    await this._assertCenterAndCampaign(centerId, campaignName);

    const normalized = [...new Set((phones || []).map(normalizePhone).filter(Boolean))];
    if (normalized.length === 0) {
      return { received: phones?.length || 0, inserted: 0, duplicates: 0, invalid: phones?.length || 0 };
    }

    const ops = normalized.map((phone) => ({
      updateOne: {
        filter: { centerId, campaignName: campaignName || null, phone },
        update: {
          $setOnInsert: {
            centerId,
            campaignName: campaignName || null,
            phone,
            source,
            addedBy: user._id,
          },
        },
        upsert: true,
      },
    }));

    const result = await DncEntry.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount || 0;
    return {
      received: phones?.length || 0,
      valid: normalized.length,
      invalid: (phones?.length || 0) - normalized.length,
      inserted,
      duplicates: normalized.length - inserted,
    };
  }

  async uploadFile(user, centerId, campaignName, file) {
    assertCenterAccess(user, centerId, campaignName, { write: true });
    if (!file?.path) throw new ValidationError("No file uploaded");

    let phones = [];
    try {
      const ext = path.extname(file.originalname || "").toLowerCase();
      if (ext === ".xlsx" || ext === ".xls") {
        const wb = xlsx.readFile(file.path);
        let text = "";
        for (const name of wb.SheetNames) {
          text += xlsx.utils.sheet_to_csv(wb.Sheets[name]) + "\n";
        }
        phones = extractPhones(text);
      } else {
        // CSV / TXT (and any plain-text list).
        const content = fs.readFileSync(file.path, "utf8");
        phones = extractPhones(content);
      }
    } finally {
      fs.promises.unlink(file.path).catch(() => {});
    }

    if (phones.length === 0) {
      throw new ValidationError("No valid phone numbers found in the uploaded file");
    }

    const stats = await this.addNumbers(
      user,
      centerId,
      campaignName,
      phones,
      file.originalname || "upload"
    );
    return stats;
  }

  async list(user, centerId, campaignName, { page = 1, limit = 50, q = "" } = {}) {
    assertCenterAccess(user, centerId, campaignName);
    const filter = { centerId };
    if (campaignName !== undefined) filter.campaignName = campaignName || null;
    if (q) {
      const n = normalizePhone(q) || String(q).replace(/\D+/g, "");
      if (n) filter.phone = new RegExp(n);
    }
    const pageNum = Math.max(1, Number(page) || 1);
    const lim = Math.min(500, Math.max(1, Number(limit) || 50));
    const [items, total] = await Promise.all([
      DncEntry.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * lim).limit(lim).lean(),
      DncEntry.countDocuments(filter),
    ]);
    return { items, total, page: pageNum, limit: lim };
  }

  async stats(user, centerId) {
    assertCenterAccess(user, centerId, null);
    const total = await DncEntry.countDocuments({ centerId });
    return { total };
  }

  async deleteEntry(user, centerId, id) {
    assertCenterAccess(user, centerId, null, { write: true });
    const res = await DncEntry.deleteOne({ _id: id, centerId });
    if (res.deletedCount === 0) throw new NotFoundError("DNC entry not found");
    return { deleted: res.deletedCount };
  }

  async clear(user, centerId, campaignName) {
    assertCenterAccess(user, centerId, campaignName, { write: true });
    const filter = { centerId };
    if (campaignName !== undefined) filter.campaignName = campaignName || null;
    const res = await DncEntry.deleteMany(filter);
    return { deleted: res.deletedCount };
  }

  async _assertCenterAndCampaign(centerId, campaignName) {
    const center = await Center.findById(centerId).lean();
    if (!center) throw new NotFoundError("Center not found");
    if (campaignName) {
      const exists = (center.campaigns || []).some((c) => c.name === campaignName);
      if (!exists) throw new ValidationError("Campaign not found in this center");
    }
  }
}

export default new DncService();
