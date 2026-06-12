// backend/controllers/auditController.js
import AuditLog from "../models/AuditLog.js";
import { success, fail } from "../utils/response.js";

const isSuperAdmin = (user) => Array.isArray(user?.roles) && user.roles.includes("super_admin");

class AuditController {
  // GET /api/logs?action=&q=&centerId=&page=&limit=
  // Super admin: all centers (optional centerId filter). Admin: own center only.
  list = async (req, res) => {
    try {
      const { action, q, page = 1, limit = 50, centerId } = req.query;
      const filter = {};

      if (isSuperAdmin(req.user)) {
        if (centerId) filter.centerId = centerId;
      } else {
        if (!req.user?.centerId) {
          return fail(res, { message: "No center context", status: 400 });
        }
        filter.centerId = req.user.centerId;
      }

      if (action) filter.action = action;
      if (q) {
        filter.$or = [
          { userEmail: { $regex: q, $options: "i" } },
          { message: { $regex: q, $options: "i" } },
          { entity: { $regex: q, $options: "i" } },
        ];
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const lim = Math.min(200, Math.max(1, Number(limit) || 50));

      const [items, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * lim)
          .limit(lim)
          .populate("centerId", "name")
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      return success(res, {
        message: "Logs fetched",
        data: { items, total, page: pageNum, limit: lim, totalPages: Math.ceil(total / lim) },
      });
    } catch (e) {
      return fail(res, { message: e.message || "Failed to load logs", status: 500 });
    }
  };
}

export default new AuditController();
