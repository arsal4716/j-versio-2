// backend/controllers/apiConfigController.js
import ApiConfig from "../models/ApiConfig.js";
import SubmissionLog from "../models/SubmissionLog.js";
import apiConfigService from "../services/apiConfigService.js";
import { executeApiConfig, executeApiConfigForLead } from "../services/apiExecutorService.js";
import { isValidObjectId } from "../utils/objectId.js";

const isSuper = (user) => Array.isArray(user?.roles) && user.roles.includes("super_admin");
const isUserOnly = (user) =>
  Array.isArray(user?.roles) &&
  user.roles.includes("user") &&
  !user.roles.includes("admin") &&
  !user.roles.includes("super_admin");

async function create(req, res) {
  const doc = await apiConfigService.createApiConfig(req.body, req.user._id);
  return res.json({ success: true, data: doc });
}

async function update(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

  const updated = await apiConfigService.updateApiConfig(id, req.body, req.user._id);
  if (!updated) return res.status(404).json({ success: false, message: "Not found" });

  return res.json({ success: true, data: updated });
}

async function softDelete(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

  const ok = await apiConfigService.softDeleteApiConfig(id, req.user._id);
  if (!ok) return res.status(404).json({ success: false, message: "Not found" });

  return res.json({ success: true, message: "Deleted" });
}

async function list(req, res) {
  const { centerId, campaignId } = req.query;
  if (!isValidObjectId(centerId) || !isValidObjectId(campaignId)) {
    return res.status(400).json({ success: false, message: "centerId & campaignId required" });
  }

  const items = await apiConfigService.listByCenterCampaign(centerId, campaignId);
  return res.json({ success: true, data: items });
}

async function toggle(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });
  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  const updated = await apiConfigService.toggleStatus(id, status);
  if (!updated) return res.status(404).json({ success: false, message: "Not found" });

  return res.json({ success: true, data: updated });
}

async function execute(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

  const result = await executeApiConfig(id, req.body || {});
  return res.json({ success: true, data: result });
}

// List a campaign's API configs by NAME — used by the records portal to render
// the per-lead "Data Transfer" buttons. Available to all roles (tenant-checked).
async function listByCampaign(req, res) {
  const { campaignName } = req.query;
  let centerId = req.query.centerId;
  if (!isSuper(req.user)) centerId = req.user.centerId?.toString();
  if (!isValidObjectId(centerId) || !campaignName) {
    return res.status(400).json({ success: false, message: "centerId & campaignName required" });
  }
  const items = await apiConfigService.listByCenterCampaignName(centerId, campaignName);
  return res.json({ success: true, data: items });
}

// Execute an API for a specific lead and return the exact request + response.
async function executeForLead(req, res) {
  const { id } = req.params;
  const { recordId, customValues = {} } = req.body || {};
  if (!isValidObjectId(id) || !isValidObjectId(recordId)) {
    return res.status(400).json({ success: false, message: "Valid id & recordId required" });
  }

  const cfg = await ApiConfig.findOne({ _id: id, isDeleted: false, status: "active" }).lean();
  if (!cfg) return res.status(404).json({ success: false, message: "API config not found or inactive" });

  const record = await SubmissionLog.findById(recordId).lean();
  if (!record) return res.status(404).json({ success: false, message: "Lead record not found" });

  // Tenant isolation: the record and the API must belong to the caller's center;
  // a plain user may only push their own leads.
  if (!isSuper(req.user)) {
    if (record.centerId?.toString() !== req.user.centerId?.toString()) {
      return res.status(403).json({ success: false, message: "Access denied to this record" });
    }
    if (isUserOnly(req.user) && record.userId?.toString() !== req.user._id?.toString()) {
      return res.status(403).json({ success: false, message: "Access denied to this record" });
    }
  }
  if (record.centerId?.toString() !== cfg.centerId?.toString()) {
    return res.status(400).json({ success: false, message: "API config does not belong to this center" });
  }

  // Enforce required custom fields the agent must supply at runtime.
  const missing = (cfg.customFields || [])
    .filter((cf) => cf.required && !String(customValues[cf.key] ?? "").trim())
    .map((cf) => cf.label || cf.key);
  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });
  }

  try {
    const result = await executeApiConfigForLead(cfg, record, customValues);
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || "API execution failed" });
  }
}

export { create, update, softDelete, list, toggle, execute, listByCampaign, executeForLead };
export default { create, update, softDelete, list, toggle, execute, listByCampaign, executeForLead };
