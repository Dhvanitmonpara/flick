import { NextFunction, Request, Response } from "express";
import userModel from "../models/user.model.js";

const checkSuspension = async (req: Request, res: Response, next: NextFunction) => {
  const user = await userModel.findById(req.user?._id);

  if (user && user.suspension && user.suspension.ends > new Date()) {
    return res.status(403).json({
      message: `You are suspended until ${user.suspension.ends}`,
      reason: user.suspension.reason,
    });
  }

  next();
};

export default checkSuspension;