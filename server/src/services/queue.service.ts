import { Queue } from "bullmq";

const queueConnectionConfig = {
  host: "127.0.0.1",
  port: 6379,
};

const highPriorityQueue = new Queue("high-priority", {
  connection: queueConnectionConfig,
});
const lowPriorityQueue = new Queue("low-priority", {
  connection: queueConnectionConfig,
});
const deadLetterQueue = new Queue("dead-letter", {
  connection: queueConnectionConfig,
});

// const result = await highPriorityQueue.add("email to dhvanit", {
//   title: "Hello",
//   description: "fuck it works",
//   sender: "dhvanit",
//   receiver: "piyush",
// });

export {
  highPriorityQueue,
  lowPriorityQueue,
  deadLetterQueue,
  queueConnectionConfig,
};
