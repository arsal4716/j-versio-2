// backend/services/apiConfigService.js
const ApiConfig = require("../models/ApiConfig");

function sanitizeApiConfigForResponse(doc) {
  const obj = doc.toObject();
  // Hide secret values
  obj.headers = (obj.headers || []).map((h) => (h.secret ? { ...h, value: "********" } : h));
  obj.queryParams = (obj.queryParams || []).map((p) => (p.secret ? { ...p, value: "********" } : p));
  // authConfig may contain secrets - you can mask selectively
  return obj;
}

async function createApiConfig(payload, userId) {
  const doc = await ApiConfig.create({ ...payload, createdBy: userId });
  return sanitizeApiConfigForResponse(doc);
}

async function updateApiConfig(id, patch, userId) {
  const doc = await ApiConfig.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { ...patch, updatedBy: userId } },
    { new: true }
  );
  return doc ? sanitizeApiConfigForResponse(doc) : null;
}

async function softDeleteApiConfig(id, userId) {
  const doc = await ApiConfig.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } },
    { new: true }
  );
  return !!doc;
}

async function toggleStatus(id, status) {
  const doc = await ApiConfig.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { status } },
    { new: true }
  );
  return doc ? sanitizeApiConfigForResponse(doc) : null;
}

async function listByCenterCampaign(centerId, campaignId) {
  const docs = await ApiConfig.find({
    centerId,
    campaignId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map((d) => {
    d.headers = (d.headers || []).map((h) => (h.secret ? { ...h, value: "********" } : h));
    d.queryParams = (d.queryParams || []).map((p) => (p.secret ? { ...p, value: "********" } : p));
    return d;
  });
}

module.exports = {
  createApiConfig,
  updateApiConfig,
  softDeleteApiConfig,
  toggleStatus,
  listByCenterCampaign,
};