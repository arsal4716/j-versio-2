import mongoose from 'mongoose';

const submissionLogSchema = new mongoose.Schema({
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true,
    index: true
  },
  campaignName: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  formData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    leadId: String,
    trustedForm: String,
    ipAddress: String,
    proxyIp: String,
    pageUrl: String,
    userAgent: String,
    deviceType: String,
    referer: String
  },
  result: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  errorDetails: {
    type: {
      message: String,
      code: String,
      stack: String
    },
    default: null
  },
  timestamps: {
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    duration: Number // in milliseconds
  },
  sheetStatus: {
    master: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
    errors: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
submissionLogSchema.index({ centerId: 1, campaignName: 1, 'timestamps.startedAt': -1 });
submissionLogSchema.index({ userId: 1, result: 1 });

// Virtual for duration
submissionLogSchema.virtual('durationMs').get(function() {
  if (this.timestamps.completedAt && this.timestamps.startedAt) {
    return this.timestamps.completedAt - this.timestamps.startedAt;
  }
  return null;
});

const SubmissionLog = mongoose.model('SubmissionLog', submissionLogSchema);

export default SubmissionLog;