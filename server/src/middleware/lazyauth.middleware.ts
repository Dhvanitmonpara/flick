import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../conf/env.js";

const verifyJWTLazyCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.cookies?.__accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return next();
    }

    const decodedToken = jwt.verify(token, env.accessTokenSecret) as JwtPayload;

    req.user = {
      _id: decodedToken._id,
      username: decodedToken.username,
      isVerified: decodedToken.isVerified,
      isBlocked: decodedToken.isBlocked,
      suspension: decodedToken.suspension ?? {
        ends: null,
        reason: null,
        howManyTimes: 0,
      },
      refreshToken: null,
      bookmarks: [],
      branch: "",
      college: null,
    };

    next();
  } catch (error) {
    next();
  }
};

export default verifyJWTLazyCheck;
