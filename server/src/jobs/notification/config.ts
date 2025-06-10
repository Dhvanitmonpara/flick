const STREAM_KEY = "notifications";

const config = {
  STREAM_KEY,
  GROUP_NAME: "notificationGroup",
  CONSUMER_NAME: `consumer-${process.pid}`,
  LOCK_KEY: `lock:${STREAM_KEY}:notificationJob`,
  MAX_CONSUMER_IDLE_TIME: 3 * 60 * 1000, // 3 mins
  PENDING_IDLE_TIME_MS: 60 * 1000,
  BATCH_SIZE: 100,
  DLQ_STREAM: "notifications:dlq",
  DLQ_STREAM_MAX_LEN: 10000,
  DOMExceptionLQ_STREAM: "notifications:dlq",
  DLQ_BATCH_SIZE: 100,
  PERMADEAD_STREAM: "notifications:permadead",
  MAX_DLQ_RETRIES: 2,
  MAX_RETRIES: 3,
};

export default config;
