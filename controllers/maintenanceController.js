// backend/controllers/maintenanceController.js
// Global maintenance mode, controlled by super_admin and stored in AppConfig so
// it applies across the whole server fleet. Non-super-admin users see a friendly
// maintenance page with a countdown while it's active.
import AppConfig from "../models/AppConfig.js";
import { success, fail } from "../utils/response.js";

const NAME = "maintenance";

function readMeta(doc) {
  const m = doc?.meta || {};
  const untilMs = m.until ? new Date(m.until).getTime() : null;
  const active = !!m.enabled && (!untilMs || Date.now() < untilMs);
  return {
    enabled: !!m.enabled,
    until: m.until || null,
    message: m.message || "",
    active,
  };
}

// GET /api/maintenance  (public — the SPA polls this before rendering)
export async function getMaintenance(req, res) {
  try {
    const doc = await AppConfig.findOne({ name: NAME }).lean();
    return success(res, { message: "ok", data: readMeta(doc) });
  } catch (e) {
    // Fail-open: never let a status check itself take the app down.
    return success(res, { message: "ok", data: { enabled: false, until: null, message: "", active: false } });
  }
}

// POST /api/maintenance  (super_admin)  body: { enabled, until?, message? }
export async function setMaintenance(req, res) {
  try {
    const { enabled, until, message } = req.body || {};
    if (enabled && until) {
      const t = new Date(until).getTime();
      if (Number.isNaN(t)) {
        return fail(res, { message: "Invalid 'until' date", status: 400 });
      }
      // A countdown can only run toward a future time.
      if (t <= Date.now()) {
        return fail(res, { message: "Maintenance end time must be in the future", status: 400 });
      }
    }
    const meta = {
      enabled: !!enabled,
      until: enabled ? until || null : null,
      message: (message || "").slice(0, 500),
      updatedAt: new Date(),
    };
    await AppConfig.updateOne({ name: NAME }, { $set: { meta } }, { upsert: true });
    return success(res, {
      message: enabled ? "Maintenance mode enabled" : "Maintenance mode disabled",
      data: readMeta({ meta }),
    });
  } catch (e) {
    return fail(res, { message: e.message || "Failed to update maintenance", status: 500 });
  }
}

export default { getMaintenance, setMaintenance };
