import cron from "node-cron";
import { LogModel } from "../models/log.model.js";

const job = cron.schedule("0 0 * * 1", async () => {
  console.log("Running weekly job — time to do your thing.");

  try {
    const days = 28;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await LogModel.deleteMany({ createdAt: { $lt: cutoff } });
    console.log(
      `🧹 Deleted ${result.deletedCount} logs older than ${days} days`
    );
  } catch (error) {
    console.log("Weekly job failed:", error);
  }
});

job.on("execution:failed", (err) => {
  console.error("Weekly cron job failed:", err);
});
