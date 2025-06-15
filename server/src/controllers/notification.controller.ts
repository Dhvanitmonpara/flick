import { Request, Response } from "express";
import NotificationService from "../services/notification.service.js";
import { ApiError } from "../utils/ApiError.js";
import handleError from "../utils/HandleError.js";
import { io } from "../app.js";

const notificationService = new NotificationService(io);

const listNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const redisNotifications =
      await notificationService.getRedisNotificationsByUserId(
        req.user._id.toString()
      );
    const mongoNotifications =
      await notificationService.getMongoNotificationsByUserId(
        req.user._id.toString(),
        true
      );
    res.status(200).json({ redisNotifications, mongoNotifications });
  } catch (error) {
    handleError(
      error as ApiError,
      res,
      "Error fetching notifications",
      "LIST_NOTIFICATIONS_ERROR"
    );
  }
};

export { listNotifications };
