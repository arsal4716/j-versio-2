// backend/services/apiConfigService.js
import ApiConfig from "../models/ApiConfig.js";
import Campaign from "../models/Campaigns.js";

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

// Lists a campaign's API configs by campaign NAME (the records portal works in
// names, not Campaign _ids). Matches both the denormalized campaignName and the
// underlying Campaign _id for backward compatibility with older configs.
async function listByCenterCampaignName(centerId, campaignName) {
  const campaign = await Campaign.findOne({ center: centerId, name: campaignName })
    .select("_id")
    .lean();
  const or = [{ campaignName }];
  if (campaign?._id) or.push({ campaignId: campaign._id });
  const docs = await ApiConfig.find({ centerId, isDeleted: false, $or: or })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map((d) => {
    d.headers = (d.headers || []).map((h) => (h.secret ? { ...h, value: "********" } : h));
    d.queryParams = (d.queryParams || []).map((p) => (p.secret ? { ...p, value: "********" } : p));
    return d;
  });
}

export { createApiConfig,
  updateApiConfig,
  softDeleteApiConfig,
  toggleStatus,
  listByCenterCampaign,
  listByCenterCampaignName, };
export default {
  createApiConfig,
  updateApiConfig,
  softDeleteApiConfig,
  toggleStatus,
  listByCenterCampaign,
  listByCenterCampaignName,
};
