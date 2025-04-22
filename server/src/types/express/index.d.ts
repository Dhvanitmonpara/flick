// src/types/express/index.d.ts

import { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: Types.ObjectId;
        username: string;
        isVerified: boolean;
        isBlocked: boolean;
        suspension: {
          ends: Date | null;
          reason: string | null;
          howManyTimes: number;
        };
        refreshToken: string | null;
        bookmarks: Types.ObjectId[];
        branch: string;
        college: Types.ObjectId | null;
      };
    }
  }
}
