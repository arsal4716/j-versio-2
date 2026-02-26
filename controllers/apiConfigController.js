// backend/controllers/apiConfigController.js
const ApiConfig = require("../models/ApiConfig");
const apiConfigService = require("../services/apiConfigService");
const { executeApiConfig } = require("../services/apiExecutorService");
const { isValidObjectId } = require("../utils/objectId");

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

module.exports = { create, update, softDelete, list, toggle, execute };