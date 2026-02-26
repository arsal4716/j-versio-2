// backend/models/ApiConfig.js
const mongoose = require("mongoose");

const keyValueSchema = new mongoose.Schema(
    {
        key: { type: String, trim: true, maxlength: 200 },
        value: { type: String, trim: true, maxlength: 5000 },
        enabled: { type: Boolean, default: true },
        secret: { type: Boolean, default: false },
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

module.exports = mongoose.model("ApiConfig", apiConfigSchema);