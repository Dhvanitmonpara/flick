import { NextFunction, Request, Response } from "express";
import userModel from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import handleError from "../services/HandleError.js";
import { env } from "../conf/env.js";
import adminModel from "../models/admin.model.js";

const verifyJWT = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies?.__accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      const hasRefreshToken = Boolean(req.cookies?.__refreshToken);

      throw new ApiError(
        401,
        hasRefreshToken
          ? "Access token not found"
          : "Access and refresh token not found"
      );
    }

    const decodedToken = jwt.verify(token, env.accessTokenSecret) as JwtPayload;

    const user = await userModel
      .findById(decodedToken?._id)
      .select("-password -refreshToken -email")
      .lean();

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
    handleError(error, res, "Invalid Access Token");
  }
};

const verifyAdminJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.cookies?.__adminAccessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) throw new ApiError(401, "Admin access token not found");

    if (!env.adminAccessTokenSecret)
      throw new ApiError(500, "Admin access token secret not found");

    const decodedToken = jwt.verify(
      token,
      env.adminAccessTokenSecret
    ) as JwtPayload;

    const admin = await adminModel
      .findById(decodedToken?._id)
      .select("-password")
      .lean();

    if (!admin) {
      throw new ApiError(401, "Invalid Admin Access Token");
    }

    req.admin = {
      _id: admin._id,
    };

    next();
  } catch (error) {
    handleError(error, res, "Invalid Admin Access Token");
  }
};

export { verifyJWT, verifyAdminJWT };
