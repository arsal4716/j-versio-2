// backend/controllers/portalRecordController.js
const { listPortalRecords } = require("../services/recordService");

async function list(req, res) {
  const centerId = req.tenant.centerId;
  const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
  const isUserOnly = roles.includes("user") && !roles.includes("admin") && !roles.includes("super_admin");

  const { campaignName } = req.query;

  if (isUserOnly) {
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
  });

  return res.json({ success: true, ...result });
}

module.exports = { list };