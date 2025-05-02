import { CookieOptions, Request, Response } from "express";
import adminModel from "../models/admin.model.js";
import { ApiError } from "../utils/ApiError.js";
import handleError from "../services/HandleError.js";
import mongoose from "mongoose";
import { hashEmailForLookup, hashOTP } from "../services/cryptographer.js";
import sendMail from "../utils/sendMail.js";
import { redis } from "../app.js";
import crypto from "crypto";

export interface AdminDocument extends Document {
  password: string;
  email: string;
  authorizedDevices: {
    deviceFingerprint: string;
    deviceName: string;
    lastSeen: Date;
    authorizedAt: Date;
  }[];
  _id: mongoose.Types.ObjectId | string;
  isPasswordCorrect(password: string): Promise<boolean>;
  save({
    validateBeforeSave,
  }?: {
    validateBeforeSave: boolean;
  }): Promise<AdminDocument>;
  generateAccessToken(): string;
}

const options: CookieOptions = {
  httpOnly: true,
  sameSite: "none",
  secure: true,
};

async function generateDeviceFingerprint(req: Request) {
  const userAgent = req.headers["user-agent"] || "";
  const acceptLanguage = req.headers["accept-language"] || "";
  const screenResolution = req.body.screenResolution || "";
  const hardwareConcurrency = req.body.hardwareConcurrency || "";
  const timezone = req.body.timezone || "";

  const rawFingerprint = `${userAgent}|${acceptLanguage}|${screenResolution}|${timezone}|${hardwareConcurrency}`;

  const fingerprintHash = crypto
    .createHash("sha256")
    .update(rawFingerprint)
    .digest("hex");

  return fingerprintHash;
}

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

export const initializeAdmin = async (req: Request, res: Response) => {
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

    const passwordMatches = await admin.isPasswordCorrect(password);
    if (!passwordMatches) throw new ApiError(400, "Invalid password");

    const deviceFingerprint = await generateDeviceFingerprint(req);

    const isAuthorizedDevice = admin.authorizedDevices.findIndex(
      (device) => device.deviceFingerprint === deviceFingerprint
    );

    if (!isAuthorizedDevice) {
      const mailRes = await sendMail(email, "OTP");
      if (!mailRes?.success || !mailRes?.otpCode) {
        throw new ApiError(500, "Failed to send OTP email");
      }

      const hashedOtp = await hashOTP(mailRes.otpCode);

      const redisRes = await redis.set(
        `otp:${hashedEmail}`,
        hashedOtp,
        "EX",
        65
      );

      if (redisRes !== "OK") {
        console.error("Failed to set OTP in Redis:", redisRes);
        throw new ApiError(500, "Failed to store OTP securely");
      }

      res.status(200).json({
        success: true,
        statusText: "OTP_REQUIRED",
        message: "OTP sent to admin",
      });
      return;
    }

    const accessToken = await generateAccessToken(
      admin._id as mongoose.Types.ObjectId
    );

    res
      .status(200)
      .cookie("__adminAccessToken", accessToken, options)
      .json({
        success: true,
        admin: {
          _id: admin._id,
          email: admin.email,
        },
        statusText: "SESSION_READY",
        message: "Admin logged in successfully",
      });
  } catch (error) {
    handleError(error as ApiError, res, "Error initializing admin");
  }
};

export const resendAdminOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    const hashedEmail = await hashEmailForLookup(email.toLowerCase());

    const admin = (await adminModel.findOne({
      email: hashedEmail,
    })) as AdminDocument;
    if (!admin) throw new ApiError(404, "Admin not found");

    const mailRes = await sendMail(email, "OTP");
    if (!mailRes?.success || !mailRes?.otpCode) {
      throw new ApiError(500, "Failed to send OTP email");
    }

    const hashedOtp = await hashOTP(mailRes.otpCode);

    const redisRes = await redis.set(`otp:${hashedEmail}`, hashedOtp, "EX", 65);

    if (redisRes !== "OK") {
      console.error("Failed to set OTP in Redis:", redisRes);
      throw new ApiError(500, "Failed to store OTP securely");
    }

    res.status(200).json({
      success: true,
      statusText: "OTP_REQUIRED",
      message: "OTP sent to admin",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error resending OTP");
  }
};

export const verifyAdminOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      throw new ApiError(400, "Email and OTP are required");
    }

    const hashedEmail = await hashEmailForLookup(email.toLowerCase());

    const admin = (await adminModel.findOne({
      email: hashedEmail,
    })) as AdminDocument;
    if (!admin) throw new ApiError(404, "Admin not found");

    const redisOtp = await redis.get(`otp:${hashedEmail}`);
    if (!redisOtp) throw new ApiError(400, "OTP expired or invalid");

    const hashedOtp = await hashOTP(otp);
    if (redisOtp !== hashedOtp) throw new ApiError(400, "Invalid OTP");

    const deviceFingerprint = await generateDeviceFingerprint(req);

    // OTP is valid - authorize device
    admin.authorizedDevices.push({
      deviceFingerprint: deviceFingerprint,
      deviceName: req.body.platform,
      authorizedAt: new Date(),
      lastSeen: new Date(),
    });
    await admin.save();

    // Delete OTP from Redis
    await redis.del(`otp:${hashedEmail}`);

    // Generate session
    const accessToken = await generateAccessToken(
      admin._id as mongoose.Types.ObjectId
    );

    res
      .status(200)
      .cookie("__adminAccessToken", accessToken, options)
      .json({
        success: true,
        statusText: "SESSION_READY",
        admin: {
          _id: admin._id,
          email: admin.email,
        },
        message: "OTP verified, admin logged in successfully",
      });
  } catch (error) {
    handleError(error as ApiError, res, "Error verifying admin OTP");
  }
};

export const logoutAdmin = async (req: Request, res: Response) => {
  try {
    res.clearCookie("__adminAccessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message: "Admin logged out successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error logging out admin");
  }
};

export const removeAuthorizedDevice = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new ApiError(400, "Email and device ID are required");
    }

    const hashedEmail = await hashEmailForLookup(email.toLowerCase());

    const admin = (await adminModel.findOne({
      email: hashedEmail,
    })) as AdminDocument;
    if (!admin) throw new ApiError(404, "Admin not found");

    const initialLength = admin.authorizedDevices.length;

    const deviceFingerprint = await generateDeviceFingerprint(req);

    admin.authorizedDevices = admin.authorizedDevices.filter(
      (device) => device.deviceFingerprint !== deviceFingerprint
    );

    if (admin.authorizedDevices.length === initialLength) {
      throw new ApiError(404, "Device not found");
    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Device removed successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error removing device");
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
