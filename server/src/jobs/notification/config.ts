const config = {
  STREAM_KEY: "notifications",
  GROUP_NAME: "notificationGroup",
  PENDING_IDLE_TIME_MS: 60 * 1000,
  BATCH_SIZE: 100,
  DLQ_STREAM: "notifications:dlq",
  MAX_DLQ_RETRIES: 2,
};

export default config;
