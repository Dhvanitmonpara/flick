import NotificationService, {
  TRawNotificationWithMetadata,
} from "../../services/notification.service.js";
import redisClient from "../../services/redis.service.js";
import {
  parseStreamEntry,
  RedisStreamEntry,
} from "../../utils/parseStreamEntry.js";
import CircuitBreaker from "./circuiteBreaker.helper.js";
import { startCleanupTasks, stopCleanupTasks } from "./cleanup.helper.js";
import config from "./config.js";
import { moveToDLQ } from "./dlq.helper.js";

const initializeStream = async () => {
  try {
    await redisClient.xgroup(
      "CREATE",
      config.STREAM_KEY,
      config.GROUP_NAME,
      "0",
      "MKSTREAM"
    );
    console.log("Consumer group initialized");
  } catch (err: any) {
    if (err?.message?.includes("BUSYGROUP")) {
      console.log("Consumer group already exists");
    } else {
      throw err;
    }
  }
};

const parseNotification = ([
  id,
  fields,
]: RedisStreamEntry): TRawNotificationWithMetadata => {
  const obj = parseStreamEntry([id, fields]);
  const retryCount = parseInt(obj._retries ?? "0", 10);

  return {
    ...obj,
    _retries: retryCount,
    _redisId: id,
  } as unknown as TRawNotificationWithMetadata;
};

async function insertWithRetry(
  notifications: TRawNotificationWithMetadata[],
  notificationService: NotificationService,
  circuitBreaker: CircuitBreaker
) {
  let toRetry = [...notifications];
  let allSuccessIds: string[] = [];
  let attempt = 0;

  while (attempt < config.MAX_RETRIES && toRetry.length > 0) {
    attempt++;

    try {
      const { successIds, failed } =
        await notificationService.insertNotificationsToMongo(toRetry);

      allSuccessIds.push(...successIds);

      if (failed.length === 0) {
        circuitBreaker.reset();
        break;
      }
      console.log(failed)

      console.warn(`Attempt ${attempt}: ${failed.length} notifications failed`);

      if (attempt >= config.MAX_RETRIES) {
        await moveToDLQ(failed, "Mongo insert failed after retries", attempt);
        break;
      }

      toRetry = failed;

      const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (e) {
      console.error(`Attempt ${attempt} failed with error:`, e);

      circuitBreaker.recordFailure();

      if (attempt >= config.MAX_RETRIES) {
        await moveToDLQ(toRetry, "Mongo insert failed after retries", attempt);
        break;
      }

      const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return allSuccessIds;
}

async function fetchPendingMessages(): Promise<RedisStreamEntry[]> {
  try {
    const [, entries] = await redisClient.xautoclaim(
      config.STREAM_KEY,
      config.GROUP_NAME,
      config.CONSUMER_NAME,
      config.PENDING_IDLE_TIME_MS,
      "0-0",
      "COUNT",
      config.BATCH_SIZE
    );

    if (!Array.isArray(entries) || entries.length === 0) {
      return [];
    }

    return entries as RedisStreamEntry[];
  } catch (err) {
    console.error("Failed to fetch/claim pending messages:", err);
    return [];
  }
}

export {
  initializeStream,
  parseNotification,
  insertWithRetry,
  fetchPendingMessages,
  startCleanupTasks,
  stopCleanupTasks,
};
