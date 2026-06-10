// backend/config/redis.js
// Single shared ioredis connection factory for BullMQ.
// BullMQ requires maxRetriesPerRequest: null on the connection it uses.
import IORedis from "ioredis";

let connection = null;

export function getRedisConnection() {
  if (connection) return connection;
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  connection.on("error", (err) => {
    // Avoid crashing the process on transient redis blips.
    console.error("[redis] connection error:", err?.message);
  });
  return connection;
}

export default getRedisConnection;
