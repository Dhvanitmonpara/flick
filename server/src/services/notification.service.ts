import { Schema } from "mongoose";
import { io } from "../app.js";
import isUserOnline from "../utils/isUserOnline.js";
import redisClient from "./redis.service.js";
import { NotificationModel } from "../models/notification.model.js";

type TNotificationType =
  | "general"
  | "upvoted_post"
  | "upvoted_comment"
  | "replied"
  | "posted"
  | "re-posted";

export type TNotification = {
  title: string;
  body: string;
  postId: Schema.Types.ObjectId;
  actorUsernames: string;
  receiverId: string;
  type: TNotificationType;
};
export type TNotificationWihMetadata = TNotification & { _redisId: string, _retries: string };

class NotificationService {
  private readonly STREAM_KEY = "notifications";
  private readonly MAX_STREAM_LENGTH = 10000;
  private redisClient;
  private io;

  constructor(redisClientInstance: typeof redisClient, ioInstance: typeof io) {
    this.redisClient = redisClientInstance;
    this.io = ioInstance;
  }

  private toRedisEntries(notification: TNotification): string[] {
    return Object.entries(notification).flatMap(([k, v]) => [k, String(v)]);
  }

  private async emitNotificationIfOnline(
    notification: TNotification
  ): Promise<boolean> {
    const online = await isUserOnline(notification.receiverId);
    if (online) {
      this.io.to(notification.receiverId).emit("notification", notification);
      return true;
    }
    return false;
  }

  // Push notification to redis stream
  private async pushToStream(notification: TNotification): Promise<void> {
    const entries = this.toRedisEntries(notification);
    await this.redisClient.xadd(
      this.STREAM_KEY,
      "MAXLEN",
      "=",
      this.MAX_STREAM_LENGTH,
      "*",
      ...entries
    );
  }

  // Public method to handle one notification
  public async handleNotification(notification: TNotification): Promise<void> {
    await this.emitNotificationIfOnline(notification);
    await this.pushToStream(notification);
  }

  // Insert batch notifications to MongoDB with basic error handling
  public async insertNotificationsToMongo(
    notifications: TNotificationWihMetadata[]
  ): Promise<{ successIds: string[]; failed: TNotificationWihMetadata[] }> {
    try {
      const result = await NotificationModel.insertMany(notifications, {
        ordered: false,
      });

      const successIds = result.map((doc: any) => doc._redisId);
      const failed = notifications.filter(
        (n) => !successIds.includes(n._redisId)
      ) as TNotificationWihMetadata[];

      return { successIds, failed };
    } catch (err: any) {
      // Mongo will throw if even 1 doc fails, but insertMany may have partial success
      const successIds =
        err?.result?.insertedDocs?.map((doc: any) => doc._redisId) || [];

      const failed = notifications.filter(
        (n) => !successIds.includes(n._redisId)
      );

      return { successIds, failed };
    }
  }
}

export default NotificationService;
