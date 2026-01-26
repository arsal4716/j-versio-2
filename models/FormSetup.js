// backend/models/FormSetup.js
const mongoose = require("mongoose");

const FieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["text", "number", "select", "radio", "checkbox", "date", "file"],
    },
    selector: { type: String, required: true },
    placeholder: { type: String },
    options: { type: [String], default: undefined },
    required: { type: Boolean, default: false },
  },
  { _id: true }
);

const FormSetupSchema = new mongoose.Schema(
  {
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Center",
      required: true,
    },
    campaignName: { type: String, required: true },
    landerUrl: { type: String, required: true },
    fields: { type: [FieldSchema], default: [] },
    submitButtonSelector: { type: String },
    consentSelector: { type: String },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

FormSetupSchema.index({ centerId: 1, campaignName: 1 }, { unique: true });

module.exports = mongoose.model("FormSetup", FormSetupSchema);
