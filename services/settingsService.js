// backend/services/settingsService.js
import SettingsConfig from "../models/SettingsConfig.js";
import Center from "../models/Center.js";
import { ValidationError, NotFoundError, AuthorizationError } from "../utils/errorTypes.js";

const isSuperAdmin = (user) => Array.isArray(user?.roles) && user.roles.includes("super_admin");

// Tenant guard: super_admin → any center; admin → only own center; user → denied write.
function assertCenterAccess(user, centerId, { write = false } = {}) {
  if (isSuperAdmin(user)) return;
  if (write && !user?.roles?.includes("admin")) {
    throw new AuthorizationError("You do not have permission to edit settings");
  }
  if (user?.centerId?.toString() !== centerId?.toString()) {
    throw new AuthorizationError("You do not have access to this center's settings");
  }
}

class SettingsService {
  // Returns the settings doc for a scope, creating defaults on first access.
  async getSettings(user, centerId, campaignName = null) {
    assertCenterAccess(user, centerId);

    const center = await Center.findById(centerId).lean();
    if (!center) throw new NotFoundError("Center not found");

    // If a campaign scope is requested, validate it belongs to the center.
    if (campaignName) {
      const exists = (center.campaigns || []).some((c) => c.name === campaignName);
      if (!exists) throw new ValidationError("Campaign not found in this center");
    }

    const scope = { centerId, campaignName: campaignName || null };
    let doc = await SettingsConfig.findOne(scope);
    if (!doc) {
      doc = await SettingsConfig.create({ ...scope, createdBy: user._id, updatedBy: user._id });
    }
    return doc;
  }

  // Full upsert of a scope's settings. `patch` is the settings object from the UI.
  async updateSettings(user, centerId, campaignName, patch) {
    assertCenterAccess(user, centerId, { write: true });

    const center = await Center.findById(centerId).lean();
    if (!center) throw new NotFoundError("Center not found");
    if (campaignName) {
      const exists = (center.campaigns || []).some((c) => c.name === campaignName);
      if (!exists) throw new ValidationError("Campaign not found in this center");
    }

    this.validatePercentages(patch);

    const scope = { centerId, campaignName: campaignName || null };
    const update = {
      ...patch,
      ...scope,
      updatedBy: user._id,
    };
    delete update._id;

    const doc = await SettingsConfig.findOneAndUpdate(
      scope,
      { $set: update, $setOnInsert: { createdBy: user._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return doc;
  }

  // Device + browser percentages, when their group is enabled, should each be 0-100.
  validatePercentages(patch) {
    const dist = patch?.customization?.devices;
    if (dist) {
      const enabledSum = ["mobile", "tablet", "desktop"]
        .filter((k) => dist[k]?.enabled)
        .reduce((s, k) => s + (Number(dist[k]?.percentage) || 0), 0);
      if (enabledSum > 0 && Math.abs(enabledSum - 100) > 1) {
        throw new ValidationError(
          `Enabled device percentages must sum to 100 (got ${enabledSum})`
        );
      }
    }
  }
}

export default new SettingsService();
