import { io } from "../app.js";
import NotificationService from "../services/notification.service.js";
import redisClient from "../services/redis.service.js";

const DLQ_STREAM = "notifications:dlq";
const MAX_DLQ_RETRIES = 2;
const BATCH_SIZE = 100;

const notificationService = new NotificationService(redisClient, io);

const parseDlqEntry = ([id, fields]: [string, string[]]) => {
  const obj: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return { ...obj, _redisId: id };
};

export const retryDlqNotifications = async () => {
  const entries = await redisClient.xrange(DLQ_STREAM, "-", "+", "COUNT", BATCH_SIZE);

  if (!entries || entries.length === 0) return;

  const toRetry = [];
  const toKill = [];

  for (const entry of entries) {
    const n = parseDlqEntry(entry);
    const retries = parseInt(n.retries || "0", 10);

    if (retries >= MAX_DLQ_RETRIES) {
      toKill.push(n._redisId); // optionally move to `permadead`
      continue;
    }

    toRetry.push(n);
  }

  if (toRetry.length > 0) {
    try {
      const { successIds, failed } = await notificationService.insertNotificationsToMongo(toRetry);

      // ACK successful: remove from DLQ
      if (successIds.length > 0) {
        const pipeline = redisClient.multi();
        for (const id of successIds) pipeline.xdel(DLQ_STREAM, id);
        await pipeline.exec();
      }

      // re-DLQ the ones that failed again
      if (failed.length > 0) {
        await moveToDLQ(
          failed.map((f) => ({ ...f, _redisId: f._redisId })),
          "DLQ Retry Failed",
          parseInt(failed[0].retries || "0", 10) + 1
        );

        // remove the retried messages regardless
        const failedIds = failed.map((f) => f._redisId);
        const pipeline = redisClient.multi();
        for (const id of failedIds) pipeline.xdel(DLQ_STREAM, id);
        await pipeline.exec();
      }
    } catch (err) {
      console.error("DLQ retry job failed:", err);
    }
  }

  if (toKill.length > 0) {
    console.warn(`Permadead notifications (exceeded retry limit):`, toKill);
    // optionally move to a new stream `notifications:permadead`
  }
};
