// backend/services/settingsService.js
import SettingsConfig from "../models/SettingsConfig.js";
import Center from "../models/Center.js";
import { ValidationError, NotFoundError, AuthorizationError } from "../utils/errorTypes.js";

const isSuperAdmin = (user) => Array.isArray(user?.roles) && user.roles.includes("super_admin");

const isPlainObject = (v) =>
  v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);

// Deep-merges source onto target (arrays replaced, not concatenated).
function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source || {})) {
    const sv = source[key];
    if (sv === undefined || sv === null) continue;
    if (isPlainObject(sv) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], sv);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

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

  // Resolves the settings actually in effect for a scope, applying the hierarchy:
  //   schema defaults  ←  center default  ←  campaign override
  // (campaign wins, then center, then defaults). Returns a plain object; safe to
  // call without a user (used by the automation pipeline).
  async getEffectiveSettings(centerId, campaignName = null) {
    const [centerDoc, campaignDoc] = await Promise.all([
      SettingsConfig.findOne({ centerId, campaignName: null }).lean(),
      campaignName ? SettingsConfig.findOne({ centerId, campaignName }).lean() : null,
    ]);
    // A fresh (unsaved) document guarantees every default key is present.
    const defaults = new SettingsConfig({ centerId }).toObject();
    delete defaults._id;
    return deepMerge(deepMerge(defaults, centerDoc || {}), campaignDoc || {});
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
    // Strip fields that must never be written from a client patch. In
    // particular `createdBy` is set only via $setOnInsert below — leaving it in
    // $set as well makes MongoDB throw "Updating the path 'createdBy' would
    // create a conflict at 'createdBy'". The UI sends back the whole settings
    // doc (including these), so we drop them here.
    delete update._id;
    delete update.createdBy;
    delete update.createdAt;
    delete update.updatedAt;
    delete update.__v;

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
