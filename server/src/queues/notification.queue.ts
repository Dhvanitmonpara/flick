import { Queue } from "bullmq";
import config from "../conf/notification.js";
import { env } from "../conf/env.js";

const notificationQueue = new Queue(config.NOTIFICATION_QUEUE, {
  connection: {
    host: env.redisHost,
    port: Number(env.redisPort),
  },
});

export default notificationQueue;
