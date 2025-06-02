import redisClient from "../../services/redis.service.js";

let cleanupIntervals: NodeJS.Timeout[] = [];

function startCleanupTasks({
  STREAM_KEY,
  DLQ_STREAM,
}: {
  STREAM_KEY: string;
  DLQ_STREAM: string;
}) {
  cleanupIntervals.push(
    setInterval(() => {
      redisClient.xtrim(STREAM_KEY, "MAXLEN", "~", 10000);
    }, 5 * 60 * 1000)
  );

  cleanupIntervals.push(
    setInterval(() => {
      redisClient.xtrim(DLQ_STREAM, "MAXLEN", "~", 10000);
    }, 5 * 60 * 1000)
  );
}

function stopCleanupTasks() {
  for (const interval of cleanupIntervals) clearInterval(interval);
}

export { startCleanupTasks, stopCleanupTasks };
