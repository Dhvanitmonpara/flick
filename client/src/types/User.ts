import { ICollege } from "./College"
import { IPost } from "./Post"

export interface IUser {
  _id: string
  email?: string
  lookupEmail?: string
  username: string
  branch: string
  college: string | ICollege
  bookmarks: string[] | IPost[]
  isBlocker: boolean
  suspension: {
    ends: Date
    reason: string
    howManyTimes: number
  }
}