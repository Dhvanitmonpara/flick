import { ICollege } from "./College"
import { IPost } from "./Post"

export interface IUser {
  _id: string
  username: string
  branch: string
  college: string | ICollege
  bookmarks: string[] | IPost[]
  isBlocked: boolean
  theme: "light" | "dark"
  suspension: {
    ends: Date
    reason: string
    howManyTimes: number
  }
}