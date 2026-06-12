// backend/controllers/dashboardController.js
// Single, count-only stats endpoint for the admin dashboard. Replaces the old
// client-side approach of fetching full center pages + every form setup just to
// read totals (which was the source of the 5-10s dashboard load).
import Center from "../models/Center.js";
import User from "../models/User.js";
import FormSetup from "../models/FormSetup.js";
import { success, fail } from "../utils/response.js";

const isSuperAdmin = (user) => Array.isArray(user?.roles) && user.roles.includes("super_admin");

export const getDashboardStats = async (req, res) => {
  try {
    const superAdmin = isSuperAdmin(req.user);
    const centerScope = superAdmin ? {} : { _id: req.user?.centerId };
    const tenantScope = superAdmin ? {} : { centerId: req.user?.centerId };

    // Sum of embedded campaign arrays across the centers in scope (one pass).
    const campaignAgg = Center.aggregate([
      { $match: centerScope },
      { $group: { _id: null, total: { $sum: { $size: { $ifNull: ["$campaigns", []] } } } } },
    ]);

    const [totalCenters, totalFormSetups, totalUsers, campaignResult] = await Promise.all([
      Center.countDocuments(centerScope),
      FormSetup.countDocuments(tenantScope),
      User.countDocuments(superAdmin ? {} : { centerId: req.user?.centerId }),
      campaignAgg,
    ]);

    return success(res, {
      message: "Dashboard stats",
      data: {
        totalCenters,
        totalCampaigns: campaignResult?.[0]?.total || 0,
        totalFormSetups,
        totalUsers,
      },
    });
  } catch (e) {
    return fail(res, { message: e.message || "Failed to load stats", status: 500 });
  }
};

export default { getDashboardStats };
