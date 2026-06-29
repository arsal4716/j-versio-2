// backend/controllers/portalRecordController.js
import { listPortalRecords } from "../services/recordService.js";
import SubmissionLog from "../models/SubmissionLog.js";
import { isValidObjectId } from "../utils/objectId.js";
import settingsService from "../services/settingsService.js";

const isSuper = (user) => Array.isArray(user?.roles) && user.roles.includes("super_admin");

// Delete a single lead record. Super admin: any. Admin: own center only.
// Plain users may not delete.
async function remove(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid record id" });
  }

  const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
  if (!roles.includes("super_admin") && !roles.includes("admin")) {
    return res.status(403).json({ success: false, message: "Not allowed to delete records" });
  }

  const filter = { _id: id };
  if (!isSuper(req.user)) filter.centerId = req.user.centerId;

  const result = await SubmissionLog.deleteOne(filter);
  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, message: "Record not found" });
  }
  return res.json({ success: true, message: "Record deleted" });
}

async function list(req, res) {
  const centerId = req.tenant.centerId;
  const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
  const isUserOnly = roles.includes("user") && !roles.includes("admin") && !roles.includes("super_admin");

  const { campaignName } = req.query;

  if (isUserOnly) {
    // CRM access can be disabled for agents per center (Settings → Access).
    const eff = await settingsService.getEffectiveSettings(centerId, null).catch(() => null);
    if (eff?.access?.agentCrm === false) {
      return res.status(403).json({
        success: false,
        message: "CRM access is disabled for your account. Contact your admin.",
      });
    }

    const allowed = Array.isArray(req.user.allowedCampaigns) ? req.user.allowedCampaigns : [];
    if (!allowed.includes(campaignName)) {
      return res.status(403).json({ success: false, message: "Campaign access denied" });
    }
  }

  const result = await listPortalRecords({
    centerId,
    campaignName,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    cursor: req.query.cursor,
    limit: Number(req.query.limit || 15),
    q: req.query.q,
    // A plain user only sees the leads they personally submitted,
    // and only today's (Eastern) — never previous days.
    userId: isUserOnly ? req.user._id : undefined,
    todayOnly: isUserOnly,
  });

  return res.json({ success: true, ...result });
}

export { list, remove };
export default { list, remove };
