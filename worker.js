// backend/worker.js
// Standalone BullMQ worker process. Run separately from the API:
//   npm run worker        (production)
//   npm run worker:dev    (nodemon)
// Scale horizontally by running multiple worker processes; concurrency per
// process is bounded by SUBMISSION_CONCURRENCY so a box is not overwhelmed by
// parallel headless browsers.
import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { getRedisConnection } from "./config/redis.js";
import { SUBMISSION_QUEUE_NAME } from "./queue/submissionQueue.js";
import database from "./config/database.js";
import submissionService from "./services/submissionService.js";
import User from "./models/User.js";
import logger from "./utils/logger.js";

const CONCURRENCY = Number(process.env.SUBMISSION_CONCURRENCY || 2);

async function processJob(job) {
  const { centerId, campaignName, formData, userId } = job.data;

  // Rehydrate the user from DB so access checks run against current state
  // (a user could have been disabled/revoked after the job was queued).
  const user = await User.findById(userId).select("-password").lean();
  if (!user) {
    throw new Error("Submitting user no longer exists");
  }

  logger.info("Worker picked up submission job", {
    jobId: job.id,
    centerId,
    campaignName,
    userId,
  });

  const result = await submissionService.submitForm(
    centerId,
    campaignName,
    formData,
    user
  );

  return result;
}

async function start() {
  await database.connect();
  logger.info("Worker connected to MongoDB");

  const worker = new Worker(SUBMISSION_QUEUE_NAME, processJob, {
    connection: getRedisConnection(),
    concurrency: CONCURRENCY,
  });

  worker.on("completed", (job, result) => {
    logger.info("Submission job completed", {
      jobId: job.id,
      leadId: result?.data?.leadId,
    });
  });

  worker.on("failed", (job, err) => {
    logger.error("Submission job failed", {
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      error: err?.message,
    });
  });

  logger.info(`Submission worker started (concurrency=${CONCURRENCY})`);

  const shutdown = async () => {
    logger.info("Worker shutting down...");
    await worker.close();
    await database.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  logger.error("Worker failed to start", { error: err?.message });
  process.exit(1);
});
