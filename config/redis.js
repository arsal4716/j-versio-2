// backend/config/redis.js
// Single shared ioredis connection factory for BullMQ.
// BullMQ requires maxRetriesPerRequest: null on the connection it uses.
//
// Two modes (auto-detected from env), so the same code runs single-box in dev
// and HA across the 5-10 server fleet in prod:
//   * Sentinel HA: set REDIS_SENTINELS="host1:26379,host2:26379" and
//     REDIS_MASTER_NAME (default "mymaster"). ioredis fails over to the new
//     master automatically when one dies.
//   * Single endpoint: set REDIS_URL (managed Redis or local).
import IORedis from "ioredis";

let connection = null;

function buildOptions() {
  const base = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  const sentinelList = (process.env.REDIS_SENTINELS || "").trim();
  if (sentinelList) {
    const sentinels = sentinelList
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((hp) => {
        const [host, port] = hp.split(":");
        return { host, port: Number(port || 26379) };
      });
    return {
      url: null,
      options: {
        ...base,
        sentinels,
        name: process.env.REDIS_MASTER_NAME || "mymaster",
        password: process.env.REDIS_PASSWORD || undefined,
        sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
      },
      describe: `sentinel(${sentinels.length} nodes, master=${
        process.env.REDIS_MASTER_NAME || "mymaster"
      })`,
    };
  }

  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  return { url, options: base, describe: url.replace(/:\/\/.*@/, "://***@") };
}

export function getRedisConnection() {
  if (connection) return connection;
  const { url, options, describe } = buildOptions();
  connection = url ? new IORedis(url, options) : new IORedis(options);
  connection.on("error", (err) => {
    // Avoid crashing the process on transient redis blips / failover.
    console.error("[redis] connection error:", err?.message);
  });
  connection.on("ready", () => console.log(`[redis] connected: ${describe}`));
  return connection;
}

export default getRedisConnection;
