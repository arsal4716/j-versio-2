// backend/models/AppConfig.js
// Tiny key/value store for global, fleet-wide configuration that must be shared
// across every server via MongoDB. Currently holds the global admin Google
// service-account key (encrypted) so it can be uploaded once and used by all
// servers/workers — no per-server file copies.
import mongoose from "mongoose";

const appConfigSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    // Encrypted (utils/secretCrypto) secret payload.
    valueEnc: { type: String, default: "" },
    // Non-secret metadata for display (e.g. the service-account client_email).
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("AppConfig", appConfigSchema);
