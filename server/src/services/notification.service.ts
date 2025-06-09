import { io } from "../app.js";
import isUserOnline from "../utils/isUserOnline.js";
import redisClient from "./redis.service.js";
import { NotificationModel } from "../models/notification.model.js";
import { PostModel } from "../models/post.model.js";

type TNotificationType =
  | "general"
  | "upvoted_post"
  | "upvoted_comment"
  | "replied"
  | "posted"
  | "re-posted";

type TBaseNotification = {
  postId: string;
  receiverId: string;
  type: TNotificationType;
};
type TMetadata = {
  _redisId: string;
  _retries: string;
};
export type TNotification = TBaseNotification & { actorUsernames: string[] };
export type TRawNotification = TBaseNotification & { actorUsername: string };
export type TRawNotificationWithMetadata = TRawNotification & TMetadata;
export type TNotificationWithMetadata = TNotification & TMetadata;

class NotificationService {
  private readonly STREAM_KEY = "notifications";
  private readonly MAX_STREAM_LENGTH = 10000;
  private redisClient;
  private io;

  constructor(redisClientInstance: typeof redisClient, ioInstance: typeof io) {
    this.redisClient = redisClientInstance;
    this.io = ioInstance;
  }

  private toRedisEntries(notification: TRawNotification): string[] {
    return Object.entries(notification).flatMap(([k, v]) => [k, String(v)]);
  }

  private async emitNotificationIfOnline(
    notification: TRawNotification
  ): Promise<boolean> {
    const online = await isUserOnline(notification.receiverId);
    if (online) {
      this.io.to(notification.receiverId).emit("notification", notification);
      return true;
    }
    return false;
  }

  private bundleNotifications = (
    rawNotifications: TRawNotificationWithMetadata[]
  ): TNotificationWithMetadata[] => {
    const bundleMap = new Map<
      string,
      { notification: TNotificationWithMetadata; actorSet: Set<string> }
    >();

    for (const raw of rawNotifications) {
      const key = `${raw.receiverId}:${raw.postId}:${raw.type}`;

      if (!bundleMap.has(key)) {
        bundleMap.set(key, {
          notification: {
            postId: raw.postId,
            receiverId: raw.receiverId,
            type: raw.type,
            actorUsernames: [],
            _redisId: raw._redisId,
            _retries: raw._retries,
          },
          actorSet: new Set([raw.actorUsername]),
        });
      } else {
        const bundle = bundleMap.get(key)!;
        bundle.actorSet.add(raw.actorUsername);
      }
    }

    return Array.from(bundleMap.values()).map(({ notification, actorSet }) => ({
      ...notification,
      actorUsernames: Array.from(actorSet),
    }));
  };

  // Push notification to redis stream
  private async pushToStream(notification: TRawNotification): Promise<void> {
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

  public async handleNotification(
    notification: TRawNotification
  ): Promise<void> {
    await this.emitNotificationIfOnline(notification);
    await this.pushToStream(notification);
  }

  public async getRedisNotificationsByUserId(userId: string, lastSeenId = "0") {
    const streams =
      (await this.redisClient.xread("STREAMS", this.STREAM_KEY, lastSeenId)) ??
      [];

    const result: Array<Record<string, string>> = [];

    for (const [_, entries] of streams) {
      for (const [id, fields] of entries) {
        if (!Array.isArray(fields) || fields.length % 2 !== 0) {
          console.warn(
            `Skipping malformed entry ${id}: ${JSON.stringify(fields)}`
          );
          continue;
        }

        const entry = Object.fromEntries(this.chunkToEntries(fields));

        if (entry.receiverId !== userId) continue;

        entry._redisId = id;
        result.push(entry);
      }
    }

    if (result.length === 0) return [];

    const grouped = this.bundleNotificationsByActor(result);

    const postIds = [...new Set(grouped.map((n) => n.postId))];

    const posts = await PostModel.find({ _id: { $in: postIds } }).select(
      "title content _id"
    );

    const postMap = new Map(posts.map((p) => [p._id.toString(), p]));

    for (const notification of grouped) {
      notification.post = postMap.get(notification.postId) ?? null;
    }

    return grouped;
  }

  bundleNotificationsByActor(
    notifications: Array<Record<string, string>>
  ): Array<Record<string, any>> {
    const grouped: Record<string, Record<string, any>> = {};

    for (const notif of notifications) {
      const { actorUsername, _redisId, ...rest } = notif;

      const groupKey = JSON.stringify(rest);

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          ...rest,
          _redisId,
          seen: false,
          actorUsernames: [actorUsername],
        };
      } else {
        grouped[groupKey].actorUsernames.push(actorUsername);
      }
    }

    return Object.values(grouped);
  }

  chunkToEntries(fields: string[]): [string, string][] {
    const entries: [string, string][] = [];
    for (let i = 0; i < fields.length; i += 2) {
      entries.push([fields[i], fields[i + 1]]);
    }
    return entries;
  }

  public async getMongoNotificationsByUserId(userId: string, populate = false) {
    let notifications;
    if (populate) {
      const rawNotifications = await NotificationModel.find({
        receiverId: userId,
      })
        .populate("postId", "title content _id")
        .sort({ createdAt: -1 })
        .lean();

      notifications = rawNotifications.map((n) => ({
        ...n,
        post: n.postId,
        postId: undefined,
      }));
    } else {
      notifications = await NotificationModel.find({ receiverId: userId }).sort(
        {
          createdAt: -1,
        }
      );
    }
    return notifications;
  }

  // Insert batch notifications to MongoDB with basic error handling
  public async insertNotificationsToMongo(
    notifications: TRawNotificationWithMetadata[]
  ): Promise<{ successIds: string[]; failed: TRawNotificationWithMetadata[] }> {
    try {
      const processedNotifications = this.bundleNotifications(notifications);
      const result = await NotificationModel.insertMany(
        processedNotifications,
        {
          ordered: false,
        }
      );

      const successIds = result.map((doc: any) => doc._redisId);
      const failed = notifications.filter(
        (n) => !successIds.includes(n._redisId)
      ) as TRawNotificationWithMetadata[];

      return { successIds, failed };
    } catch (err: any) {
      console.log("Error inserting to Mongo", err);
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
