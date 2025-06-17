import { Queue } from "bullmq";
import config from "../conf/notification.js";
import { env } from "../conf/env.js";
import "../workers/notification.worker.js"

const notificationQueue = new Queue(config.NOTIFICATION_QUEUE, {
  connection: {
    host: env.redisHost,
    port: Number(env.redisPort),
  },
});

notificationQueue.on("error", (err) => {
  console.log("Notification queue error:", err);
})

export default notificationQueue;
