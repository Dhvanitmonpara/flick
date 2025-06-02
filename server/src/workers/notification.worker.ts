import { Worker } from "bullmq";
import { deadLetterQueue, queueConnectionConfig } from "../services/queue.service.js";

const notificationWorker = new Worker(
  "high-priority",
  async (job) => {
    // do something
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

notificationWorker.on("failed", async (job, err) => {
  await deadLetterQueue.add("failedNotification", {
    ...job?.data,
    reason: err.message,
  });
});
