import { CookieOptions, Request, Response } from "express";
import adminModel from "../models/admin.model.js";
import { ApiError } from "../utils/ApiError.js";
import handleError from "../services/HandleError.js";
import mongoose from "mongoose";

export interface AdminDocument extends Document {
  password: string;
  email: string;
  _id: mongoose.Types.ObjectId | string;
  isPasswordCorrect(password: string): Promise<boolean>;
  save({
    validateBeforeSave,
  }: {
    validateBeforeSave: boolean;
  }): Promise<AdminDocument>;
  generateAccessToken(): string;
}

const options: CookieOptions = {
  httpOnly: true,
  sameSite: "none",
  secure: true,
};

const generateAccessToken = async (userId: mongoose.Types.ObjectId) => {
  const admin = await adminModel.findById(userId) as AdminDocument;
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }
  return admin.generateAccessToken();
};

const accessTokenExpiry = 15 * 60 * 1000;

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const admin = await adminModel.create({ email, password });

    if (!admin) {
      throw new ApiError(500, "Error creating admin");
    }

    const accessToken = await generateAccessToken(admin._id);

    res
      .status(201)
      .cookie("__adminAccessToken", accessToken, {
        ...options,
        maxAge: accessTokenExpiry,
      })
      .json({
        success: true,
        admin,
        message: "Admin created successfully",
      });
  } catch (error) {
    handleError(error as ApiError, res, "Error creating admin");
  }
};

export const getAdmin = async (req: Request, res: Response) => {
  try {
    const admin = req.admin
    res.status(200).json({
      success: true,
      admin,
      message: "Admin fetched successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error fetching admin");
  }
};