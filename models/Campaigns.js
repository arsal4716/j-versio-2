import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Center",
    required: true,
  },
  name: { type: String, required: true },
  url: { type: String, required: true },

  formFields: [
    {
      label: String,
      selector: String,
      key: String,
      type: {
        type: String,
        enum: ["text", "number", "email", "select", "date", "checkbox"],
        default: "text",
      },
      required: { type: Boolean, default: true },
    },
  ],

  submitButtonSelector: { type: String },
  consentSelector: { type: String },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Campaign", campaignSchema);
