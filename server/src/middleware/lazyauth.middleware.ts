import { NextFunction, Request, Response } from "express";
import userModel from "../models/user.model.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../conf/env.js";

const verifyJWTLazyCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies?.__accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return next();
    }

    const decodedToken = jwt.verify(token, env.accessTokenSecret) as JwtPayload;

    const user = await userModel
      .findById(decodedToken?._id)
      .select("-password -refreshToken -email")
      .lean();

    if (!user) {
      return next();
    }

    const mappedUser = {
      _id: user._id,
      username: user.username,
      isVerified: user.isVerified,
      isBlocked: user.isBlocked,
      suspension: {
        ends: user.suspension?.ends ?? null,
        reason: user.suspension?.reason ?? null,
        howManyTimes: user.suspension?.howManyTimes ?? 0,
      },
      refreshToken: null,
      bookmarks: user.bookmarks,
      branch: user.branch ?? "",
      college: user.college ?? null,
    };

    req.user = mappedUser;
    next();
  } catch (error) {
    next();
  }
};

export default verifyJWTLazyCheck;