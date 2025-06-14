import cron from "node-cron";
import { NotificationModel } from "../../models/notification.model.js";
import redisClient from "../../services/redis.service.js";
import config from "../notification/config.js";

const job = cron.schedule("0 0 * * 1", async () => {
  console.log("Running monthly job — time to do your thing.");

  try {
    const days = 84;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await NotificationModel.deleteMany({
      createdAt: { $lt: cutoff },
    });
    console.log(
      `🧹 Deleted ${result.deletedCount} notifications older than ${days} days`
    );

    const redisDays = 28
    const cutoffTimestamp = Date.now() - redisDays * 24 * 60 * 60 * 1000;
    const cutoffId = `${cutoffTimestamp}-0`;

    redisClient.xtrim(config.STREAM_KEY, "MINID", "~", cutoffId, (err, res) => {
      if (err) {
        console.error("❌ Stream trim failed:", err);
      } else {
        console.log(
          `🧹 Stream trimmed to keep only entries newer than ${cutoffId}`
        );
      }
    });

    console.clear();
  } catch (error) {
    console.log("Weekly job failed:", error);
  }
});

job.on("execution:failed", (err) => {
  console.error("Monthly cron job failed:", err);
});
