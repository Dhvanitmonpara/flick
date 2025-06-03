import { io } from "../../app.js";
import NotificationService from "../../services/notification.service.js";
import redisClient from "../../services/redis.service.js";
import { moveToDLQ } from "../notification/dlq.helper.js";
import { parseNotification } from "./stream.helper.js";

const notificationService = new NotificationService(redisClient, io);

const DLQ_STREAM = "notifications:dlq";
const BATCH_SIZE = 100;
const MAX_DLQ_RETRIES = 3;
const PERMADEAD_STREAM = "notifications:permadead";

export const retryDlqNotifications = async () => {
  const entries = await redisClient.xrange(
    DLQ_STREAM,
    "-",
    "+",
    "COUNT",
    BATCH_SIZE
  );
  if (!entries || entries.length === 0) return;

  const toRetry = [];
  const toPermadead = [];

  for (const entry of entries) {
    const n = parseNotification(entry);
    const retries = parseInt(n._retries || "0", 10);

    if (retries >= MAX_DLQ_RETRIES) {
      toPermadead.push(n);
    } else {
      toRetry.push(n);
    }
  }

  // Retry
  if (toRetry.length > 0) {
    try {
      const { successIds, failed } =
        await notificationService.insertNotificationsToMongo(toRetry);

      // Remove successful ones
      if (successIds.length > 0) {
        await redisClient
          .multi(successIds.map((id) => ["xdel", DLQ_STREAM, id]))
          .exec();
      }

      // Requeue failed ones back into DLQ
      if (failed.length > 0) {
        const failedWithRetry = failed.map((n) => ({
          ...n,
          _retries: String(parseInt(n._retries || "0", 10) + 1),
        }));

        await moveToDLQ(failedWithRetry, "DLQ Retry Failed");

        const failedIds = failed.map((n) => n._redisId);
        await redisClient
          .multi(failedIds.map((id) => ["xdel", DLQ_STREAM, id]))
          .exec();
      }
    } catch (err) {
      console.error("DLQ retry failed:", err);
    }
  }

  // Move permadead
  if (toPermadead.length > 0) {
    try {
      const pipeline = redisClient.multi();
      for (const n of toPermadead) {
        const { _redisId, ...payload } = n;
        pipeline.xadd(
          PERMADEAD_STREAM,
          "*",
          ...Object.entries({
            ...payload,
            reason: "Exceeded DLQ retry limit",
            timestamp: String(Date.now()),
          }).flat()
        );

        pipeline.xdel(DLQ_STREAM, n._redisId);
      }
      await pipeline.exec();
      console.warn(
        "Moved permadead notifications:",
        toPermadead.map((n) => n._redisId)
      );
    } catch (err) {
      console.error("Failed to move permadead notifications:", err);
    }
  }
};
