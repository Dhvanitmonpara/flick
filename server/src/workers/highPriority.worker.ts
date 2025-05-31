import { Worker } from "bullmq";
import { deadLetterQueue, queueConnectionConfig } from "../services/queue.service.js";
import handleNotification from "../services/notification.service.js";

const highPriorityWorker = new Worker(
  "high-priority",
  async (job) => {
    await handleNotification(job.data);
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
