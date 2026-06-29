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

  // GET /api/settings/ui-access -> { agentCrm } for the caller's center.
  // Used by the top bar / CRM page to decide what an agent may see. Fail-open
  // (defaults to allowed) so a transient error never locks people out of the UI;
  // the records API still enforces the real gate.
  getUiAccess = async (req, res) => {
    try {
      const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
      const privileged = roles.includes("super_admin") || roles.includes("admin");
      const centerId = req.user?.centerId?.toString?.() || req.user?.centerId;
      if (privileged || !centerId) {
        return success(res, { message: "ok", data: { agentCrm: true } });
      }
      const eff = await settingsService.getEffectiveSettings(centerId, null);
      const agentCrm = eff?.access?.agentCrm !== false;
      return success(res, { message: "ok", data: { agentCrm } });
    } catch (e) {
      return success(res, { message: "ok", data: { agentCrm: true } });
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
