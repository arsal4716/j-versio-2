// backend/models/AuditLog.js
// Lightweight, tenant-scoped activity log. Entries auto-expire after 24h via a
// TTL index so storage stays small. Read-only from the admin log dashboard.
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    // null = platform/global action (e.g. a super-admin action not tied to one center)
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      default: null,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userEmail: { type: String, default: "" },
    role: { type: String, default: "" },

    action: { type: String, required: true, index: true }, // e.g. "user.login", "center.create"
    entity: { type: String, default: "" }, // e.g. "Center", "User"
    entityId: { type: String, default: "" },

    message: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Auto-delete entries 24h after creation (lightweight storage).
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400, name: "ttl_24h" });
// Common query path: a center's recent activity.
auditLogSchema.index({ centerId: 1, createdAt: -1 }, { name: "center_recent" });

export default mongoose.model("AuditLog", auditLogSchema);
