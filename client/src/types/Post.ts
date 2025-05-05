import { IUser } from "./User";

export interface IPost extends Document {
  _id: string;
  title: string;
  content: string;
  postedBy: string | IUser;
  isBanned: boolean;
  isShadowBanned: boolean;
  karma: number;
  upvoteCount: number;
  downvoteCount: number;
  views: number;
  createdAt: string;
  updatedAt: string;
}