// backend/queue/submissionQueue.js
// Defines the BullMQ queue used to offload browser-automation form submissions
// from the HTTP request lifecycle. The API enqueues; the worker (worker.js) runs
// the actual Playwright session. This is what lets the platform handle concurrent
// call-center load without tying up Express workers for 15-30s per submission.
import { Queue, QueueEvents } from "bullmq";
import { getRedisConnection } from "../config/redis.js";

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
  const job = await submissionQueue.add("submit", payload, {
    jobId: undefined, // let BullMQ assign
  });
  return { jobId: job.id };
}

export default submissionQueue;
