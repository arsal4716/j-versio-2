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

  // GET /api/settings/ui-access -> { agentCrm, crmCampaigns } for the caller.
  // CRM access is evaluated PER CAMPAIGN (campaign override beats center
  // default). For an agent, crmCampaigns is the subset of their allowed
  // campaigns where CRM is enabled; agentCrm is true when that subset is
  // non-empty. Privileged users get { agentCrm: true, crmCampaigns: null }
  // (null = all). The records API enforces the same per-campaign gate.
  getUiAccess = async (req, res) => {
    try {
      const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
      const privileged = roles.includes("super_admin") || roles.includes("admin");
      const centerId = req.user?.centerId?.toString?.() || req.user?.centerId;
      if (privileged || !centerId) {
        return success(res, { message: "ok", data: { agentCrm: true, crmCampaigns: null } });
      }

      const allowed = Array.isArray(req.user.allowedCampaigns) ? req.user.allowedCampaigns : [];
      const enabled = [];
      for (const name of allowed) {
        try {
          const eff = await settingsService.getEffectiveSettings(centerId, name);
          if (eff?.access?.agentCrm === true) enabled.push(name);
        } catch {
          /* skip this campaign */
        }
      }
      return success(res, {
        message: "ok",
        data: { agentCrm: enabled.length > 0, crmCampaigns: enabled },
      });
    } catch (e) {
      // Default is "disabled", so fail closed (but never 500).
      return success(res, { message: "ok", data: { agentCrm: false, crmCampaigns: [] } });
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
