import { Worker } from "bullmq";
import { deadLetterQueue, queueConnectionConfig } from "../services/queue.service.js";
import NotificationService from "../services/notification.service.js";
import redisClient from "../services/redis.service.js";
import { io } from "../app.js";

const notificationService = new NotificationService(redisClient, io);

const highPriorityWorker = new Worker(
  "high-priority",
  async (job) => {
    await notificationService.handleNotification(job.data);
  },
  {
    connection: queueConnectionConfig,
    removeOnComplete: {
      count: 3,
      age: 1000 * 60 * 60,
    },
    removeOnFail: {
      count: 3,
      age: 1000 * 60 * 60,
    },
  }
);

highPriorityWorker.on("failed", async (job, err) => {
  await deadLetterQueue.add("failedNotification", {
    ...job?.data,
    reason: err.message,
  });
});
