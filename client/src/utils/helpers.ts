import { ICollege } from "@/types/College";
import { IUser } from "@/types/User";

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function isUser(obj: unknown): obj is IUser {
  return typeof obj === "object" && obj !== null && "college" in obj && "branch" in obj;
}

export function isCollege(obj: unknown): obj is ICollege {
  return typeof obj === "object" && obj !== null && "profile" in obj && "name" in obj;
}