import { Worker } from "bullmq";
import { queueConnectionConfig } from "../services/queue.service.js";
import handleNotification from "../services/notification.service.js";

const lowPriorityWorker = new Worker(
  "low-priority",
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