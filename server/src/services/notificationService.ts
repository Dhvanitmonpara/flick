import { Worker } from "bullmq";
import { queueConnectionConfig } from "./queueService.js";

new Worker(
  "notificationQueue",
  async (job) => {
    console.log(`Processing job ${job.id}`);
  },
  {
    connection: queueConnectionConfig,
  }
);
