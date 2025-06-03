import { TRawNotificationWithMetadata } from "../../services/notification.service.js";
import redisClient from "../../services/redis.service.js";

const DLQ_STREAM_KEY = "dlq:notifications";
const DLQ_STREAM_MAX_LEN = 10000;

const moveToDLQ = async (
  notifications: TRawNotificationWithMetadata[],
  reason: string,
  retryCount = 0
) => {
  try {
    const pipeline = redisClient.pipeline();

    for (const n of notifications) {
      const { _redisId, ...rest } = n;

      // Clean + flatten the object for Redis
      const flatFields = Object.entries({
        ...rest,
        reason,
        retryCount: String(n._retries ?? retryCount),
        timestamp: String(Date.now()),
      }).flatMap(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);

      pipeline.xadd(
        DLQ_STREAM_KEY,
        "MAXLEN",
        "~",
        DLQ_STREAM_MAX_LEN,
        "*", // auto-generated ID
        "id", _redisId,
        ...flatFields
      );
    }

    await pipeline.exec();
    console.log(`DLQ: Streamed ${notifications.length} notifications to Redis stream`);
  } catch (err) {
    console.error("Failed to stream to Redis DLQ:", err);
  }
};

export { moveToDLQ };