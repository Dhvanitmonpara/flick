import { Queue } from "bullmq";

const queueConnectionConfig = {
  host: "127.0.0.1",
  port: 6379,
};

const notificationQueue = new Queue("notificationQueue", {
  connection: queueConnectionConfig,
});

const initNotificationQueue = async () => {
  const result = await notificationQueue.add("email to dhvanit", {
    title: "Hello",
    description: "fuck it works",
    sender: "dhvanit",
    receiver: "piyush",
  });

  console.log(result.data);
};

initNotificationQueue();

export { notificationQueue, queueConnectionConfig };
