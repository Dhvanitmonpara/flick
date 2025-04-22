import { Request, Response } from "express";
import userModel from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

interface UserRequest extends Request {
  user: {
    _id: Types.ObjectId;
    username: string;
    isVerified: boolean;
    isBlocked: boolean;
    suspension: {
      ends: NativeDate | null;
      reason: string | null;
      howManyTimes: number;
    },
    refreshToken: string | null;
    bookmarks: Types.ObjectId[];
    branch: string;
    college: Types.ObjectId | null
  };
}

const verifyJWT = async (req: UserRequest, res: Response, next) => {
  try {
    if (!process.env.ACCESS_TOKEN_SECRET) throw new ApiError(500, "ACCESS_TOKEN_SECRET environment variable is not set");

    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
      
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if(!decodedToken || typeof decodedToken == "string") {
      throw new ApiError(401, "Invalid Access Token");
    }

    const user = await userModel.findById(decodedToken?._id).select(
      "-password -refreshToken -email"
    ).lean();

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    const mappedUser = {
      _id: user._id,
      username: user.username,
      isVerified: user.isVerified,
      isBlocked: user.isBlocked,
      suspension: {
        ends: user.suspension?.ends ?? null,
        reason: user.suspension?.reason ?? null,
        howManyTimes: user.suspension?.howManyTimes ?? 0
      },
      refreshToken: null,
      bookmarks: user.bookmarks,
      branch: user.branch ?? '',
      college: user.college ?? null,
    };

    req.user = mappedUser;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
};

export { verifyJWT, UserRequest };
