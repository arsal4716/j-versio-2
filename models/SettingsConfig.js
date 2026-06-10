// backend/models/SettingsConfig.js
// Holds the full Settings panel state (DNC checkers, bot detection, info checkers,
// automation customization). One document per scope:
//   - center default:   { centerId, campaignName: null }
//   - campaign override: { centerId, campaignName: "ACA" }
import mongoose from "mongoose";

const toggleKeySchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    apiKey: { type: String, default: "" },      // for providers that need a key
    endpoint: { type: String, default: "" },    // optional override of provider URL
    filePath: { type: String, default: "" },    // for "Attach your Files" providers
  },
  { _id: false }
);

const settingsConfigSchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
      index: true,
    },
    // null = center-level default; a string = campaign-specific override.
    campaignName: { type: String, default: null, index: true },

    // ---------------- DNC Checkers ----------------
    dnc: {
      blacklistAlliance: { type: toggleKeySchema, default: () => ({}) },
      tcpaLitigator: { type: toggleKeySchema, default: () => ({}) },
      dncCom: { type: toggleKeySchema, default: () => ({}) },
      leadConduit: { type: toggleKeySchema, default: () => ({}) },
      internalDncLeft: { type: toggleKeySchema, default: () => ({}) },
      internalDncRight: { type: toggleKeySchema, default: () => ({}) },
    },

    // ---------------- Bot Detection ----------------
    botDetection: {
      anura: { type: toggleKeySchema, default: () => ({}) },
      trafficGuard: { type: toggleKeySchema, default: () => ({}) },
    },

    // ---------------- Information Checkers ----------------
    infoCheckers: {
      truePeopleSearch: { type: Boolean, default: false },
      thatsThem: { type: Boolean, default: false },
      fastPeopleSearch: { type: Boolean, default: false },
      internalDatabase: { type: toggleKeySchema, default: () => ({}) },
    },

    // ---------------- Customization ----------------
    customization: {
      typing: {
        randomTypingSpeed: { type: Boolean, default: true },
        randomTypingMistakes: { type: Boolean, default: true },
        dynamicPointerMovement: { type: Boolean, default: false },
      },
      browsers: {
        googleChrome: { enabled: { type: Boolean, default: true }, percentage: { type: Number, default: 0 } },
        safari: { enabled: { type: Boolean, default: true }, percentage: { type: Number, default: 0 } },
        firefox: { enabled: { type: Boolean, default: false }, percentage: { type: Number, default: 0 } },
        edge: { enabled: { type: Boolean, default: true }, percentage: { type: Number, default: 0 } },
        samsungInternet: { enabled: { type: Boolean, default: false }, percentage: { type: Number, default: 0 } },
      },
      devices: {
        mobile: { enabled: { type: Boolean, default: true }, percentage: { type: Number, default: 20 } },
        tablet: { enabled: { type: Boolean, default: true }, percentage: { type: Number, default: 20 } },
        desktop: { enabled: { type: Boolean, default: true }, percentage: { type: Number, default: 60 } },
      },
      referers: {
        enabled: { type: Boolean, default: true },
        links: { type: [String], default: ["https://google.com", "https://facebook.com"] },
      },
      onformPopup: {
        ipAddress: { type: Boolean, default: true },
        leadId: { type: Boolean, default: true },
        trustedform: { type: Boolean, default: false },
        apiResponse: { type: Boolean, default: true },
        randomMessage: { type: Boolean, default: false },
      },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One settings doc per (center, campaign-scope). campaignName null = center default.
settingsConfigSchema.index(
  { centerId: 1, campaignName: 1 },
  { unique: true, name: "uniq_settings_per_scope" }
);

export default mongoose.model("SettingsConfig", settingsConfigSchema);
