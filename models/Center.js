const mongoose = require("mongoose");

const centerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  verificationCode: { type: String, required: true, unique: true },
  centerAdminEmail: { type: String, required: true, unique: true },
  proxy: {
    provider: { type: String, default: "decodo" },
    username: { type: String },
    password: { type: String },
    type: { type: String, enum: ["zip", "state", "random"], default: "zip" },
  },
  googleSheets: {
    clientKeyFile: { type: String },
    masterSheetId: { type: String, required: true },
  },
  campaigns: [
    {
      name: { type: String, required: true },
      sheetTabId: { type: String, required: true },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],

  settings: {
    typingSpeed: { type: Number, default: 800 },
    stayOpenTime: { type: Number, default: 9 },
    deviceDistribution: {
      desktop: { type: Number, default: 60 },
      tablet: { type: Number, default: 20 },
      mobile: { type: Number, default: 20 },
    },
    referrers: {
      type: [String],
      default: ["https://google.com", "https://facebook.com"],
    },
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Center", centerSchema);
