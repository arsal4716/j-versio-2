// backend/services/auditService.js
// Fire-and-forget audit logging. Never throws into the caller's flow — an audit
// failure must not break the action being audited.
import AuditLog from "../models/AuditLog.js";
import logger from "../utils/logger.js";

function clientIp(req) {
  if (!req) return "";
  return (
    (req.headers?.["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    ""
  );
}

/**
 * Record an audit entry.
 * @param {Object} opts
 * @param {Object} [opts.req]       Express request (for actor + ip)
 * @param {Object} [opts.actor]     Explicit actor { _id, email, roles } if no req.user
 * @param {string} opts.action      e.g. "user.login"
 * @param {string} [opts.entity]
 * @param {string} [opts.entityId]
 * @param {*} [opts.centerId]
 * @param {string} [opts.message]
 * @param {Object} [opts.details]
 */
export async function audit(opts = {}) {
  try {
    const actor = opts.actor || opts.req?.user || {};
    const roles = Array.isArray(actor.roles) ? actor.roles : [];
    await AuditLog.create({
      centerId: opts.centerId ?? actor.centerId ?? null,
      userId: actor._id || null,
      userEmail: actor.email || opts.email || "",
      role: roles[0] || "",
      action: opts.action,
      entity: opts.entity || "",
      entityId: opts.entityId ? String(opts.entityId) : "",
      message: opts.message || "",
      details: opts.details || {},
      ip: clientIp(opts.req),
    });
  } catch (err) {
    logger.warn("Audit log write failed", { action: opts.action, error: err?.message });
  }
}

export default { audit };
