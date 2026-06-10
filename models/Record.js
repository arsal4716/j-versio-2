// backend/models/Record.js
import mongoose from "mongoose";

const recordSchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    searchBlob: { type: String, default: "" },

    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

recordSchema.index(
  { centerId: 1, campaignId: 1, createdAt: -1, _id: -1 },
  { name: "tenant_campaign_createdAt_cursor" }
);

recordSchema.index(
  { centerId: 1, userId: 1, createdAt: -1, _id: -1 },
  { name: "tenant_user_createdAt_cursor" }
);

recordSchema.index(
  { centerId: 1, campaignId: 1, searchBlob: "text" },
  { name: "tenant_campaign_text_search" }
);

export default mongoose.model("Record", recordSchema);