import { Schema } from "mongoose";
import { io } from "../app.js";
import isUserOnline from "../utils/isUserOnline.js";
import redisClient from "./redis.service.js";

const handleNotification = async (data: TNotification) => {
  const isOnline = await isUserOnline(data.receiverId);
  if (isOnline) io.to(data.receiverId).emit("notification", data);

  const entries: string[] = Object.entries(data).flatMap(([k, v]) => [
    k,
    String(v),
  ]);

  await redisClient.xadd("notifications", "*", ...entries);
};

type TNotificationType =
  | "general"
  | "upvoted_post"
  | "upvoted_comment"
  | "replied"
  | "posted"
  | "re-posted";

type TNotification = {
  title: string;
  body: string;
  postId: Schema.Types.ObjectId;
  actorUsernames: string;
  receiverId: string;
  type: TNotificationType;
};

export default handleNotification;
