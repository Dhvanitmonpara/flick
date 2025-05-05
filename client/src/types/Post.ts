import { IUser } from "./User";

export interface IPost extends Document {
  _id: string;
  title: string;
  content: string;
  postedBy: string | IUser;
  isBanned: boolean;
  isShadowBanned: boolean;
  likes: string[];
  views: number;
  createdAt: Date;
  updatedAt: Date;
}