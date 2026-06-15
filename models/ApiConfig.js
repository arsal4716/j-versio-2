// backend/models/ApiConfig.js
import mongoose from "mongoose";

const keyValueSchema = new mongoose.Schema(
    {
        key: { type: String, trim: true, maxlength: 200 },
        value: { type: String, trim: true, maxlength: 5000 },
        enabled: { type: Boolean, default: true },
        secret: { type: Boolean, default: false },
    },
    { _id: false }
);

// One row of the field-mapping table. Maps a value source to the key the buyer's
// API expects, e.g. { apiKey: "fname", source: "form", sourceKey: "txtFN" }.
const fieldMappingSchema = new mongoose.Schema(
    {
        apiKey: { type: String, trim: true, maxlength: 200 },
        source: { type: String, enum: ["form", "system", "custom"], default: "form" },
        sourceKey: { type: String, trim: true, maxlength: 200, default: "" },
        location: { type: String, enum: ["query", "body"], default: "body" },
        stateFormat: { type: String, enum: ["", "full", "abbr"], default: "" },
        // Phone formatting when sending: "" = as stored (10 digits),
        // "plus1" = +1XXXXXXXXXX, "11" = 1XXXXXXXXXX.
        phoneFormat: { type: String, enum: ["", "10", "plus1", "11"], default: "" },
        enabled: { type: Boolean, default: true },
    },
    { _id: false }
);

// An API-only field the agent fills at runtime (not collected on the lander),
// e.g. "City" required by a buyer.
const customFieldSchema = new mongoose.Schema(
    {
        key: { type: String, trim: true, maxlength: 200 },
        label: { type: String, trim: true, maxlength: 200 },
        location: { type: String, enum: ["query", "body"], default: "body" },
        required: { type: Boolean, default: false },
    },
    { _id: false }
);

const apiConfigSchema = new mongoose.Schema(
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
        // Denormalized campaign name so the records portal (which works in
        // campaign names, not Campaign _ids) can list a campaign's APIs.
        campaignName: { type: String, trim: true, default: "", index: true },

        fieldMappings: { type: [fieldMappingSchema], default: [] },
        customFields: { type: [customFieldSchema], default: [] },

        apiName: { type: String, required: true, trim: true, maxlength: 120 },
        method: {
            type: String,
            required: true,
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        },
        endpointUrl: { type: String, required: true, trim: true, maxlength: 5000 },

        headers: { type: [keyValueSchema], default: [] },
        queryParams: { type: [keyValueSchema], default: [] },

        bodyType: {
            type: String,
            enum: ["json", "xml", "form-data", "raw", "encrypted"],
            default: "json",
        },
        bodySchema: { type: mongoose.Schema.Types.Mixed, default: {} },

        authType: {
            type: String,
            enum: ["none", "bearer", "basic", "apiKey"],
            default: "none",
        },
        authConfig: { type: mongoose.Schema.Types.Mixed, default: {} },

        timeout: { type: Number, default: 15000, min: 1000, max: 120000 },
        retryCount: { type: Number, default: 0, min: 0, max: 10 },

        status: { type: String, enum: ["active", "inactive"], default: "active" },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        // soft delete
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

apiConfigSchema.index(
    { centerId: 1, campaignId: 1, isDeleted: 1, status: 1, createdAt: -1 },
    { name: "tenant_campaign_status_createdAt" }
);

apiConfigSchema.index(
    { centerId: 1, campaignId: 1, apiName: 1, isDeleted: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false }, name: "uniq_apiName_per_campaign" }
);

export default mongoose.model("ApiConfig", apiConfigSchema);