// backend/queue/submissionQueue.js
// Defines the BullMQ queue used to offload browser-automation form submissions
// from the HTTP request lifecycle. The API enqueues; the worker (worker.js) runs
// the actual Playwright session. This is what lets the platform handle concurrent
// call-center load without tying up Express workers for 15-30s per submission.
import crypto from "crypto";
import { Queue, QueueEvents } from "bullmq";
import { getRedisConnection } from "../config/redis.js";

// Dedupe window (ms): identical leads enqueued within this window collapse to the
// same jobId, so a double-tap or a retry on another box can't create duplicate
// submissions. After the window elapses a genuine re-submit is allowed again.
const DEDUPE_WINDOW_MS = Number(process.env.SUBMISSION_DEDUPE_MS || 60000);

// Pull a phone-ish identifier out of the heterogeneous form payloads.
function extractPhone(formData = {}) {
  const candidates = [
    formData.phone,
    formData.Phone,
    formData.phoneNumber,
    formData.txtPhone,
    formData.mobile,
    formData.cell,
    formData["wpforms-2715-field_3"],
  ];
  const raw = candidates.find((v) => v != null && String(v).trim() !== "");
  return raw ? String(raw).replace(/\D/g, "") : "";
}

// Deterministic jobId = hash(center + campaign + phone|payload + time bucket).
// BullMQ ignores an add() whose jobId already exists, giving us idempotency.
function buildJobId({ centerId, campaignName, formData }) {
  const phone = extractPhone(formData);
  const identity =
    phone ||
    crypto
      .createHash("sha1")
      .update(JSON.stringify(formData || {}))
      .digest("hex")
      .slice(0, 16);
  const bucket = Math.floor(Date.now() / DEDUPE_WINDOW_MS);
  return crypto
    .createHash("sha1")
    .update(`${centerId}|${campaignName}|${identity}|${bucket}`)
    .digest("hex");
}

export const SUBMISSION_QUEUE_NAME = "form-submission";

// Concurrency is enforced on the Worker side (worker.js). Here we just define the
// queue + sensible default job options for a production lead pipeline.
export const submissionQueue = new Queue(SUBMISSION_QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: Number(process.env.SUBMISSION_JOB_ATTEMPTS || 2),
    backoff: { type: "exponential", delay: 5000 },
    // Keep completed jobs briefly for status polling, then auto-clean.
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 5000 },
  },
});

// QueueEvents lets the API await a job result if a caller wants synchronous-style
// behavior (optional). Created lazily to avoid an extra redis connection when unused.
let _queueEvents = null;
export function getSubmissionQueueEvents() {
  if (!_queueEvents) {
    _queueEvents = new QueueEvents(SUBMISSION_QUEUE_NAME, {
      connection: getRedisConnection(),
    });
  }
  return _queueEvents;
}

/**
 * Enqueue a submission job.
 * @param {Object} payload { centerId, campaignName, formData, user }
 * @returns {Promise<{ jobId: string }>}
 */
export async function enqueueSubmission(payload) {
  // Deterministic id => duplicate leads within the window are collapsed by
  // BullMQ instead of running twice (safe under retries / multi-server failover).
  const jobId = buildJobId(payload);
  const job = await submissionQueue.add("submit", payload, { jobId });
  return { jobId: job.id };
}

export default submissionQueue;
