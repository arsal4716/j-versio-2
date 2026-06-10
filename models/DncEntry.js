// backend/models/DncEntry.js
// Internal Do-Not-Call store. Tenant-isolated by centerId; an optional
// campaignName scopes an entry to a single campaign (null = center-wide,
// applies to every campaign in the center). Numbers are stored normalized to
// 10 digits so real-time lookups are a single indexed equality match.
import mongoose from "mongoose";

const dncEntrySchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
      index: true,
    },
    // null = center-wide; a string scopes the entry to one campaign.
    campaignName: { type: String, default: null, index: true },

    // Normalized 10-digit US phone number.
    phone: { type: String, required: true, index: true },

    // Where this entry came from (upload filename or "manual").
    source: { type: String, default: "manual" },

    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// A phone can exist once per (center, campaign-scope). Center-wide (null) and a
// campaign-scoped entry are distinct documents, which is intentional.
dncEntrySchema.index(
  { centerId: 1, campaignName: 1, phone: 1 },
  { unique: true, name: "uniq_dnc_per_scope" }
);

// Fast scoped lookup for the real-time checker.
dncEntrySchema.index({ centerId: 1, phone: 1 }, { name: "dnc_center_phone" });

export default mongoose.model("DncEntry", dncEntrySchema);
