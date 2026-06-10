// backend/controllers/settingsController.js
import settingsService from "../services/settingsService.js";
import { success, fail } from "../utils/response.js";

class SettingsController {
  // GET /api/settings/:centerId            -> center default
  // GET /api/settings/:centerId?campaignName=ACA -> campaign override
  get = async (req, res) => {
    try {
      const { centerId } = req.params;
      const campaignName = req.query.campaignName || null;
      const doc = await settingsService.getSettings(req.user, centerId, campaignName);
      return success(res, { message: "Settings retrieved", data: doc });
    } catch (e) {
      return fail(res, {
        message: e.message || "Failed to load settings",
        status: e.statusCode || 500,
      });
    }
  };

  // PUT /api/settings/:centerId  body: { campaignName?, ...settings }
  update = async (req, res) => {
    try {
      const { centerId } = req.params;
      const { campaignName = null, ...patch } = req.body || {};
      const doc = await settingsService.updateSettings(req.user, centerId, campaignName, patch);
      return success(res, { message: "Settings saved", data: doc });
    } catch (e) {
      return fail(res, {
        message: e.message || "Failed to save settings",
        errors: e.errors || null,
        status: e.statusCode || 500,
      });
    }
  };
}

export default new SettingsController();
