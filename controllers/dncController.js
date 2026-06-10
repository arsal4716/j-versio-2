// backend/controllers/dncController.js
import dncService from "../services/dncService.js";
import { success, fail } from "../utils/response.js";
import logger from "../utils/logger.js";

class DncController {
  // POST /api/dnc/check  { centerId, campaignName, phone }
  // Real-time phone checker used by the form page as the agent types.
  check = async (req, res) => {
    try {
      const { centerId, campaignName = null, phone } = req.body || {};
      const result = await dncService.checkPhone({
        user: req.user,
        centerId,
        campaignName,
        phone,
      });
      return success(res, { message: "DNC check complete", data: result });
    } catch (e) {
      return fail(res, {
        message: e.message || "DNC check failed",
        status: e.statusCode || 500,
      });
    }
  };

  // POST /api/dnc/internal/upload  (multipart: file, centerId, campaignName?)
  uploadInternal = async (req, res) => {
    try {
      const { centerId, campaignName = null } = req.body || {};
      const stats = await dncService.uploadFile(req.user, centerId, campaignName || null, req.file);
      logger.info("Internal DNC uploaded", { centerId, campaignName, ...stats });
      return success(res, { message: "Internal DNC list updated", data: stats });
    } catch (e) {
      return fail(res, {
        message: e.message || "Upload failed",
        errors: e.errors || null,
        status: e.statusCode || 500,
      });
    }
  };

  // POST /api/dnc/internal  { centerId, campaignName?, phones: [] }
  addInternal = async (req, res) => {
    try {
      const { centerId, campaignName = null, phones = [] } = req.body || {};
      const stats = await dncService.addNumbers(req.user, centerId, campaignName || null, phones);
      return success(res, { message: "Numbers added", data: stats });
    } catch (e) {
      return fail(res, { message: e.message || "Failed to add numbers", status: e.statusCode || 500 });
    }
  };

  // GET /api/dnc/internal?centerId=&campaignName=&page=&limit=&q=
  listInternal = async (req, res) => {
    try {
      const { centerId, campaignName, page, limit, q } = req.query;
      const data = await dncService.list(req.user, centerId, campaignName, { page, limit, q });
      return success(res, { message: "DNC list", data });
    } catch (e) {
      return fail(res, { message: e.message || "Failed to load list", status: e.statusCode || 500 });
    }
  };

  // GET /api/dnc/internal/stats?centerId=
  stats = async (req, res) => {
    try {
      const data = await dncService.stats(req.user, req.query.centerId);
      return success(res, { message: "DNC stats", data });
    } catch (e) {
      return fail(res, { message: e.message || "Failed to load stats", status: e.statusCode || 500 });
    }
  };

  // DELETE /api/dnc/internal/:id?centerId=
  deleteInternal = async (req, res) => {
    try {
      const data = await dncService.deleteEntry(req.user, req.query.centerId, req.params.id);
      return success(res, { message: "Entry removed", data });
    } catch (e) {
      return fail(res, { message: e.message || "Failed to delete", status: e.statusCode || 500 });
    }
  };

  // DELETE /api/dnc/internal?centerId=&campaignName=
  clearInternal = async (req, res) => {
    try {
      const { centerId, campaignName } = req.query;
      const data = await dncService.clear(req.user, centerId, campaignName);
      return success(res, { message: "List cleared", data });
    } catch (e) {
      return fail(res, { message: e.message || "Failed to clear", status: e.statusCode || 500 });
    }
  };
}

export default new DncController();
