import { NextFunction, Request, Response } from "express";
import userModel from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import handleError from "../services/HandleError.js";

const verifyJWT = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!process.env.ACCESS_TOKEN_SECRET) throw new ApiError(500, "ACCESS_TOKEN_SECRET environment variable is not set");
    const token =
    req.cookies?.__accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
    
    console.log(req.cookies)
      
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as JwtPayload;

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
    handleError(error, res, "Invalid Access Token");
  }
};

export { verifyJWT };
