import { TNotificationWihMetadata } from "../../services/notification.service.js";
import redisClient from "../../services/redis.service.js";

const DLQ_STREAM_KEY = "dlq:notifications";
const DLQ_STREAM_MAX_LEN = 10000;

const moveToDLQ = async (
  notifications: TNotificationWihMetadata[],
  reason: string,
  retryCount = 0
) => {
  try {
    const pipeline = redisClient.pipeline();

    for (const n of notifications) {
      pipeline.xadd(
        DLQ_STREAM_KEY,
        "MAXLEN",
        "~",
        DLQ_STREAM_MAX_LEN,
        "*", // auto-generated ID
        "id", n._redisId,
        "receiverId", n.receiverId || "",
        "actorUsernames", JSON.stringify(n.actorUsernames || []),
        "title", n.title || "",
        "body", n.body || "",
        "postId", n.postId ? String(n.postId) : "",
        "type", n.type,
        "reason", reason,
        "retryCount", String(n._retries ?? retryCount),
        "timestamp", String(Date.now())
      );
    }

    await pipeline.exec();
    console.log(`DLQ: Streamed ${notifications.length} notifications to Redis stream`);
  } catch (err) {
    console.error("Failed to stream to Redis DLQ:", err);
  }
};

export { moveToDLQ };