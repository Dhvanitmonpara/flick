import { IPost } from "./Post";

type TNotificationType =
  | "general"
  | "upvoted_post"
  | "upvoted_comment"
  | "replied"
  | "posted"
  | "re-posted";

interface INotification {
  _id?: string;
  type: TNotificationType;
  seen: boolean;
  receiverId: string;
  actorUsernames: string[];
  _retries?: number;
  postId: string;
  post?: IPost | null
  _redisId: string;
}

export type { INotification, TNotificationType };
