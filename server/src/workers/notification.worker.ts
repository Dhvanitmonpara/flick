import { Job, Worker } from "bullmq";
import { env } from "../conf/env.js";
import config from "../conf/notification.js";
import NotificationService from "../services/notification.service.js";
import { NotificationModel } from "../models/notification.model.js";

const notificationService = new NotificationService();

const notificationProcessor = async (job: Job) => {
  try {
    const unbundled = await notificationService.getLast24HourNotifications(
      job.data.receiverId
    );

    if (unbundled.length > 0) {
      const rawNotifications = unbundled.map((notification) => ({
        _id: notification._id.toString(),
        postId: notification.postId!.toString(),
        receiverId: notification.receiverId,
        type: notification.type,
        content: notification.content ?? undefined,
        actorUsernames: notification.actorUsernames,
      }));

      const { bundled, deleteIds } =
        await notificationService.bundleNotifications(rawNotifications);

      const deleteResult = await NotificationModel.deleteMany({
        _id: { $in: deleteIds },
      });

      if (deleteResult.deletedCount !== deleteIds.length) {
        console.log(
          `❌ Failed to delete ${
            deleteIds.length - deleteResult.deletedCount
          } notifications`
        );
      }

      await NotificationModel.insertMany(bundled);
    }
  } catch (error) {
    console.log("Error processing notification job:", error);
  }
};

const notificationWorker = new Worker(
  config.NOTIFICATION_QUEUE,
  notificationProcessor,
  {
    connection: {
      host: env.redisHost,
      port: Number(env.redisPort),
    },
  }
);
