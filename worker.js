// backend/worker.js
// Standalone BullMQ worker process. Run separately from the API:
//   npm run worker        (production)
//   npm run worker:dev    (nodemon)
// Scale horizontally by running multiple worker processes; concurrency per
// process is bounded by SUBMISSION_CONCURRENCY so a box is not overwhelmed by
// parallel headless browsers.
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import os from "os";
import { Worker } from "bullmq";
import { getRedisConnection } from "./config/redis.js";
import { SUBMISSION_QUEUE_NAME } from "./queue/submissionQueue.js";
import database from "./config/database.js";
import submissionService from "./services/submissionService.js";
import User from "./models/User.js";
import logger from "./utils/logger.js";

const CONCURRENCY = Number(process.env.SUBMISSION_CONCURRENCY || 2);
const WORKER_ID = `${os.hostname()}:${process.pid}`;
const HEARTBEAT_KEY = `worker:heartbeat:${WORKER_ID}`;
const HEARTBEAT_MS = Number(process.env.WORKER_HEARTBEAT_MS || 10000);
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT || 0); // 0 = disabled

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
    // A submission (browser + stayOpen) can run well past BullMQ's 30s default
    // lock. If a job outlives its lock, another worker treats it as stalled and
    // re-runs it -> duplicate lead. Give the lock plenty of headroom; BullMQ
    // renews it automatically while the job is alive. On a genuine box crash the
    // lock simply expires and another worker reclaims the job (maxStalledCount).
    lockDuration: Number(process.env.JOB_LOCK_DURATION_MS || 120000),
    stalledInterval: Number(process.env.JOB_STALLED_INTERVAL_MS || 30000),
    maxStalledCount: Number(process.env.JOB_MAX_STALLED || 1),
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

  logger.info(`Submission worker started (concurrency=${CONCURRENCY}, id=${WORKER_ID})`);

  // Liveness heartbeat: refresh a TTL'd key so a dashboard/orchestrator can tell
  // which worker boxes are alive. The key expires shortly after a crash.
  const redis = getRedisConnection();
  let closing = false;
  const beat = async () => {
    try {
      await redis.set(
        HEARTBEAT_KEY,
        JSON.stringify({ ts: Date.now(), concurrency: CONCURRENCY }),
        "PX",
        HEARTBEAT_MS * 3
      );
    } catch (e) {
      logger.warn("Worker heartbeat failed", { error: e?.message });
    }
  };
  await beat();
  const heartbeatTimer = setInterval(beat, HEARTBEAT_MS);
  heartbeatTimer.unref?.();

  // Optional HTTP health endpoint for load balancers / k8s probes.
  let healthServer = null;
  if (HEALTH_PORT) {
    healthServer = http.createServer((req, res) => {
      const healthy = !closing && worker.isRunning();
      res.writeHead(healthy ? 200 : 503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: healthy ? "ok" : "unavailable", worker: WORKER_ID }));
    });
    healthServer.listen(HEALTH_PORT, () =>
      logger.info(`Worker health endpoint on :${HEALTH_PORT}`)
    );
  }

  const shutdown = async () => {
    if (closing) return;
    closing = true;
    logger.info("Worker shutting down...");
    clearInterval(heartbeatTimer);
    healthServer?.close();
    await redis.del(HEARTBEAT_KEY).catch(() => {});
    await worker.close(); // waits for in-flight jobs; unfinished ones are reclaimed
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
