// backend/models/FormSetup.js
import mongoose from "mongoose";

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

    // Per-campaign overrides for the hidden tracking fields we read off the
    // lander. Some landers use non-standard ids, so each is configurable; when
    // left blank the industry-standard default (below) is used at run time.
    captureSelectors: {
      leadId: { type: String, default: "" },   // Jornaya LeadiD token (default #leadid_token)
      tfCert: { type: String, default: "" },    // TrustedForm cert url  (default #xxTrustedFormCertUrl_0)
      tfToken: { type: String, default: "" },   // TrustedForm token     (default #xxTrustedFormToken_0)
      tfPing: { type: String, default: "" },    // TrustedForm ping url   (default #xxTrustedFormPingUrl_0)
      userIp: { type: String, default: "" },    // captured IP field      (default #user_ip)
    },

    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

FormSetupSchema.index({ centerId: 1, campaignName: 1 }, { unique: true });

export default mongoose.model("FormSetup", FormSetupSchema);
