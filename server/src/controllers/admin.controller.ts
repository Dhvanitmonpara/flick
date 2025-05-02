import { CookieOptions, Request, Response } from "express";
import adminModel from "../models/admin.model.js";
import { ApiError } from "../utils/ApiError.js";
import handleError from "../services/HandleError.js";
import mongoose from "mongoose";
import { hashEmailForLookup } from "../services/cryptographer.js";

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
  const admin = (await adminModel.findById(userId)) as AdminDocument;
  if (!admin) throw new ApiError(404, "Admin not found");
  return admin.generateAccessToken();
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const hashedEmail = await hashEmailForLookup(email.toLowerCase());

    const existingAdmin = await adminModel.findOne({ email: hashedEmail });
    if (existingAdmin)
      throw new ApiError(400, "Admin with this email already exists");

    const admin = await adminModel.create({ email: hashedEmail, password });
    if (!admin) throw new ApiError(500, "Error creating admin");

    const accessToken = await generateAccessToken(admin._id);

    res.status(201).cookie("__adminAccessToken", accessToken, options).json({
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
    const admin = req.admin;
    res.status(200).json({
      success: true,
      admin,
      message: "Admin fetched successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error fetching admin");
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const hashedEmail = await hashEmailForLookup(email.toLowerCase());

    const admin = (await adminModel.findOne({
      email: hashedEmail,
    })) as AdminDocument;

    if (!admin) throw new ApiError(404, "Admin not found");

    if (!(await admin.isPasswordCorrect(password))) {
      throw new ApiError(400, "Invalid password");
    }

    const accessToken = await generateAccessToken(
      admin._id as mongoose.Types.ObjectId
    );

    res.status(200).cookie("__adminAccessToken", accessToken, options).json({
      success: true,
      admin,
      message: "Admin logged in successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error logging in admin");
  }
};

export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) throw new ApiError(404, "Admin not found");
    await adminModel.findByIdAndDelete(admin._id);
    res.status(200).json({ success: true, message: "Admin deleted" });
  } catch (error) {
    handleError(error as ApiError, res, "Error deleting admin");
  }
};

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await adminModel.find({});
    res.status(200).json({ success: true, admins });
  } catch (error) {
    handleError(error as ApiError, res, "Error getting admins");
  }
};

export const updateAdmin = async (req: Request, res: Response) => {
  try {
    const admin = req.admin;
    if (!admin) throw new ApiError(404, "Admin not found");

    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const hashedEmail = await hashEmailForLookup(email.toLowerCase());

    await adminModel.findByIdAndUpdate(admin._id, {
      email: hashedEmail,
      password,
    });

    res.status(200).json({ success: true, message: "Admin updated" });
  } catch (error) {
    handleError(error as ApiError, res, "Error updating admin");
  }
};
