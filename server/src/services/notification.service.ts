import { subHours } from "date-fns";
import { NotificationModel } from "../models/notification.model.js";
import { v4 as uuid } from "uuid";
import { io } from "../app.js";
import { userIdToSocketMap } from "./socket.service.js";
import notificationQueue from "../queues/notification.queue.js";
import { toObjectId } from "../utils/toObject.js";
import { Types } from "mongoose";

type TNotificationType =
  | "general"
  | "upvoted_post"
  | "upvoted_comment"
  | "replied"
  | "posted";

type TBaseNotification = {
  postId: string;
  receiverId: string;
  type: TNotificationType;
  content?: string;
};
export type TNotification = TBaseNotification & { actorUsernames: string[], _id: string | Types.ObjectId };
export type TRawNotification = TBaseNotification & { actorUsername: string };

class NotificationService {
  private async emitNotificationIfOnline(
    notification: TRawNotification
  ): Promise<boolean> {
    const socketId = userIdToSocketMap.get(notification.receiverId.toString());
    if (socketId) {
      io.to(socketId).emit("notification", {
        ...notification,
        id: uuid(),
      });
      return true;
    }
    return false;
  }

  public bundleNotifications = (
    rawNotifications: TNotification[]
  ): {
    bundled: TNotification[];
    deleteIds: string[];
  } => {
    const bundleMap = new Map<
      string,
      {
        notification: TNotification;
        actorSet: Set<string>;
        originalIds: string[];
      }
    >();

    for (const raw of rawNotifications) {
      const key = `${raw.receiverId}:${raw.postId}:${raw.type}`;
      const bundle = bundleMap.get(key);

      if (!bundle) {
        bundleMap.set(key, {
          notification: {
            _id: "", // new insert will generate one
            postId: raw.postId,
            receiverId: raw.receiverId,
            type: raw.type,
            actorUsernames: [],
            content: raw.content,
          },
          actorSet: new Set(raw.actorUsernames),
          originalIds: [raw._id.toString()],
        });
      } else {
        raw.actorUsernames.forEach((username) => bundle.actorSet.add(username));
        bundle.originalIds.push(raw._id.toString());
      }
    }

    const bundled: TNotification[] = [];
    const deleteIds: string[] = [];

    for (const { notification, actorSet, originalIds } of bundleMap.values()) {
      notification.actorUsernames = Array.from(actorSet);
      bundled.push(notification);
      // Keep first (for simplicity), delete rest
      deleteIds.push(...originalIds.slice(1));
    }

    return { bundled, deleteIds };
  };

  // Push notification to redis stream
  private async pushToQueue(notification: TRawNotification): Promise<void> {
    notificationQueue.add("notification", notification);
  }

  public async handleNotification(
    notification: TRawNotification
  ): Promise<void> {
    await this.emitNotificationIfOnline(notification);
    await this.pushToQueue(notification);
    await this.insertNotificationToDB(notification);
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

  public getLast24HourNotifications = async (userId: string, limit = 1000) => {
    try {
      const twentyFourHoursAgo = subHours(new Date(), 24);
      const notifications = await NotificationModel.find({
        receiverId: toObjectId(userId),
        createdAt: { $gte: twentyFourHoursAgo },
      })
        .sort({ createdAt: -1 })
        .limit(limit);

      return notifications;
    } catch (error) {
      console.error(`Error fetching notifications for user ${userId}:`, error);
      throw new Error("Unable to retrieve notifications.");
    }
  };

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

  public async insertNotificationToDB(
    notification: TRawNotification
  ): Promise<boolean> {
    try {
      const data = {
        postId: toObjectId(notification.postId),
        receiverId: toObjectId(notification.receiverId),
        type: notification.type,
        content: notification.content ?? undefined,
        actorUsernames: [notification.actorUsername],
      };
      const result = await NotificationModel.insertOne(data);

      if (!result) {
        console.log("Error inserting to Mongo");
        return false;
      }

      return true;
    } catch (err: any) {
      console.log("Error inserting to Mongo", err);
      return false;
    }
  }
}

export default NotificationService;
