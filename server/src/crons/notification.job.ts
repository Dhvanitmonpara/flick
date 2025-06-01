import redisClient from "../services/redis.service.js";
import NotificationService, {
  TNotificationWihMetadata,
} from "../services/notification.service.js";
import { io } from "../app.js";
import { randomUUID } from "crypto";
import { deadLetterQueue } from "../services/queue.service.js";
import {
  parseStreamEntry,
  RedisStreamEntry,
} from "../utils/parseStreamEntry.js";

const STREAM_KEY = "notifications";
const GROUP_NAME = "notificationGroup";
const PENDING_IDLE_TIME_MS = 60 * 1000; // 1 minute
const CONSUMER_NAME = `consumer-${randomUUID().slice(0, 8)}`;
const BATCH_SIZE = 100;
const LOCK_KEY = `lock:${STREAM_KEY}:notificationJob`;
const LOCK_TTL = 30;
const DLQ_STREAM = `${STREAM_KEY}:dlq`;
const MAX_RETRIES = 3;
const FAILURE_THRESHOLD = 5;
const COOLDOWN_PERIOD_MS = 60 * 1000; // 1 minute

let recentFailures = 0;
let lastFailureTimestamp = 0;
let shutdownRequested = false;
let lockValue = "";
let heartbeatInterval: NodeJS.Timeout | null = null;

const cleanupIntervals: NodeJS.Timeout[] = [];
const notificationService = new NotificationService(redisClient, io);

const startHeartbeat = () => {
  heartbeatInterval = setInterval(async () => {
    try {
      const currentVal = await redisClient.get(LOCK_KEY);
      if (currentVal === lockValue) {
        await redisClient.expire(LOCK_KEY, LOCK_TTL);
        console.log("Lock heartbeat refreshed");
      } else {
        console.warn("Lock stolen or expired");
      }
    } catch (err) {
      console.error("Heartbeat refresh failed:", err);
    }
  }, (LOCK_TTL * 1000) / 2); // Refresh halfway through TTL
};

function circuitBreakerIsOpen() {
  return (
    recentFailures >= FAILURE_THRESHOLD &&
    Date.now() - lastFailureTimestamp < COOLDOWN_PERIOD_MS
  );
}

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

const acquireLock = async () => {
  lockValue = randomUUID();
  const result = await (redisClient as any).set(
    LOCK_KEY,
    lockValue,
    "NX",
    "EX",
    LOCK_TTL
  );
  return result === "OK";
};

const releaseLock = async () => {
  try {
    const currentVal = await redisClient.get(LOCK_KEY);
    if (currentVal === lockValue) {
      await redisClient.del(LOCK_KEY);
      console.log("Lock released");
    } else {
      console.warn("Lock not released — no longer owned");
    }
  } catch (err) {
    console.error("Failed to release lock:", err);
  }
};

const initializeStream = async () => {
  try {
    await redisClient.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "0", "MKSTREAM");
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
]: RedisStreamEntry): TNotificationWihMetadata => {
  const obj = parseNotification([id, fields]);
  const retryCount = parseInt(obj._retries ?? "0", 10);

  return {
    ...obj,
    _retries: retryCount,
    _redisId: id,
  } as unknown as TNotificationWihMetadata;
};

function startCleanupTasks() {
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

const moveToDLQ = async (
  notifications: TNotificationWihMetadata[],
  reason: string,
  retryCount = 0
) => {
  try {
    for (const n of notifications) {
      await deadLetterQueue.add("failed-notification", {
        id: n._redisId,
        receiverId: n.receiverId || "",
        actorUsernames: n.actorUsernames,
        title: n.title || "",
        body: n.body || "",
        postId: n.postId ? String(n.postId) : "",
        type: n.type,
        reason,
        retryCount: n._retries ?? retryCount,
        timestamp: Date.now(),
      });
    }
    console.log(
      `DLQ: Pushed ${notifications.length} notifications to BullMQ DLQ`
    );
  } catch (err) {
    console.error("Failed to push to BullMQ DLQ:", err);
  }
};

async function fetchPendingMessages(): Promise<RedisStreamEntry[]> {
  try {
    const [, entries] = await redisClient.xautoclaim(
      STREAM_KEY,
      GROUP_NAME,
      CONSUMER_NAME,
      PENDING_IDLE_TIME_MS,
      "0-0",
      "COUNT",
      BATCH_SIZE
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

async function insertWithRetry(notifications: TNotificationWihMetadata[]) {
  let toRetry = [...notifications];
  let allSuccessIds: string[] = [];
  let attempt = 0;

  while (attempt < MAX_RETRIES && toRetry.length > 0) {
    attempt++;

    try {
      const { successIds, failed } =
        await notificationService.insertNotificationsToMongo(toRetry);

      allSuccessIds.push(...successIds);

      if (failed.length === 0) {
        recentFailures = 0;
        break;
      }

      console.warn(`Attempt ${attempt}: ${failed.length} notifications failed`);

      if (attempt >= MAX_RETRIES) {
        await moveToDLQ(failed, "Mongo insert failed after retries", attempt);
        break;
      }

      toRetry = failed;

      const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (e) {
      console.error(`Attempt ${attempt} failed with error:`, e);

      recentFailures++;
      lastFailureTimestamp = Date.now();

      if (attempt >= MAX_RETRIES) {
        await moveToDLQ(toRetry, "Mongo insert failed after retries", attempt);
        break;
      }

      const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return allSuccessIds;
}

const blockAndConsume = async () => {
  await initializeStream();
  startCleanupTasks();

  try {
    while (true) {
      if (circuitBreakerIsOpen()) {
        console.warn("Circuit breaker open. Cooling off...");
        await new Promise((res) => setTimeout(res, COOLDOWN_PERIOD_MS));
        continue;
      }

      if (shutdownRequested) {
        console.log("Shutdown in progress...");
        stopHeartbeat();
        await releaseLock();
        stopCleanupTasks();
        break;
      }

      if (!(await acquireLock())) {
        console.log("notificationJob already running. Skipping.");
        return;
      }

      startHeartbeat();

      let notifications = (await fetchPendingMessages()).map(parseNotification);

      if (notifications.length === 0) {
        const response = (await redisClient.xreadgroup(
          "GROUP",
          GROUP_NAME,
          CONSUMER_NAME,
          "COUNT",
          BATCH_SIZE,
          "BLOCK",
          5000, // wait up to 5 seconds for new messages
          "STREAMS",
          STREAM_KEY,
          ">"
        )) as [string, RedisStreamEntry[]][] | null;

        if (response && response.length > 0) {
          const [, messages] = response[0];
          notifications = messages
            .map((entry) => {
              try {
                return parseNotification(entry);
              } catch (e) {
                console.error("Malformed notification entry:", entry, e);
                return null;
              }
            })
            .filter((n): n is TNotificationWihMetadata => n !== null);
        }
      }

      if (notifications.length === 0) {
        await new Promise((res) => setTimeout(res, 3000));
        continue;
      }

      const successIds = await insertWithRetry(notifications);

      if (successIds.length > 0) {
        await redisClient.xack(STREAM_KEY, GROUP_NAME, ...successIds);
      }

      stopHeartbeat();
      await releaseLock();
    }
  } catch (err) {
    console.error("Fatal stream processing error:", err);
  }
};

process.on("SIGINT", () => (shutdownRequested = true));
process.on("SIGTERM", () => (shutdownRequested = true));

blockAndConsume();
