import { Request, Response } from "express";
import userModel from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";
import {
  encrypt,
  hashEmailForLookup,
  hashOTP,
} from "../services/cryptographer.js";
import handleError from "../services/HandleError.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import sendMail from "../utils/sendMail.js";
import { redis } from "../app.js";
import OtpVerifier from "../services/otpVerifier.js";
import { generateUuidBasedUsername } from "../services/userServices.js";
import CollegeModel from "../models/college.model.js";
import { env } from "../conf/env.js";

const options = {
  httpOnly: true,
  secure: process.env.ENVIRONMENT === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as "none")
      : ("lax" as "lax"),
};

const accessTokenExpiry = 60 * 1000 * parseInt(env.accessTokenExpiry); // 15 minutes
const refreshTokenExpiry = 60 * 60 * 1000 * 24 * parseInt(env.refreshTokenExpiry); // 28 days

export interface UserDocument extends Document {
  password: string;
  username: string;
  _id: mongoose.Types.ObjectId | string;
  isBlocked: boolean;
  suspension: {
    ends: Date;
    reason: string;
    howManyTimes: number;
  };
  isVerified: boolean;
  refreshToken: string;
  isPasswordCorrect(password: string): Promise<boolean>;
  save({
    validateBeforeSave,
  }: {
    validateBeforeSave: boolean;
  }): Promise<UserDocument>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

async function isUsernameTaken(username: string) {
  const existingUser = await userModel.findOne({ username }).exec();
  return !!existingUser;
}

const generateUsername = async () => {
  return generateUuidBasedUsername(isUsernameTaken);
};

const generateAccessAndRefreshToken = async (
  userId: mongoose.Types.ObjectId
) => {
  try {
    const user = (await userModel.findById(userId)) as UserDocument;
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

function validateStudentEmail(email: string) {
  if (typeof email !== "string") {
    throw new ApiError(400, "Invalid email format");
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    throw new ApiError(400, "Invalid email structure");
  }

  const [localPart, domain] = parts;

  if (!/^\d+$/.test(localPart)) {
    throw new ApiError(400, "Enrollment ID must be numeric");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email address format");
  }
}

export const heartbeat = async (req: Request, res: Response) => {
  const token = req.cookies?.__accessToken;
  if (!token) return res.json({ success: false });

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    ) as JwtPayload;

    if (!decodedToken || typeof decodedToken == "string") {
      throw new ApiError(401, "Invalid Access Token");
    }
    res.status(200).json({ success: true });
  } catch {
    res.status(401).json({ success: false });
  }
};

export const initializeUser = async (req: Request, res: Response) => {
  try {
    const { email, password, branch } = req.body;

    if (!email || !password || !branch)
      throw new ApiError(400, "All fields are required");

    validateStudentEmail(email);

    const college = await CollegeModel.findOne({
      emailDomain: email.split("@")[1],
    });
    if (!college) throw new ApiError(404, "College not found");

    const hashedEmail = await hashEmailForLookup(email.toLowerCase());
    const existingUser = await userModel.findOne({ email: hashedEmail });

    if (existingUser)
      throw new ApiError(400, "User with this email already exists");

    const user = {
      password,
      branch,
      college: college._id,
    };

    const tempUser = await redis.set(
      `pending:${hashedEmail}`,
      JSON.stringify(user),
      "EX",
      300
    );

    if (tempUser != "OK") {
      throw new ApiError(500, "Failed to set user in Redis");
    }

    const mailResponse = await sendMail(email, "OTP");
    if (!mailResponse.success)
      throw new ApiError(500, mailResponse.error || "Failed to send OTP");
    if (!mailResponse.otpCode) throw new ApiError(500, "Failed to send OTP");

    const encryptedOtp = await hashOTP(mailResponse.otpCode);
    if (!encryptedOtp) throw new ApiError(500, "Failed to encrypt OTP");

    const otpResponse = await redis.set(`otp:${email}`, encryptedOtp, "EX", 65);

    if (otpResponse !== "OK") {
      throw new ApiError(500, "Failed to set OTP in Redis");
    }

    res.status(201).json({
      message: "User initialized successfully and OTP sent",
      identifier: hashedEmail,
    });
  } catch (error) {
    handleError(error as ApiError, res, "Failed to initialize user");
  }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) throw new ApiError(400, "Email is required");

    const hashedEmail = await hashEmailForLookup(email.toLowerCase());
    const user = await redis.get(`pending:${hashedEmail}`);
    if (!user) throw new ApiError(400, "User not found");

    const encryptedData = await encrypt(email.toLowerCase());

    const { branch, password, college } = JSON.parse(user) as {
      branch: string;
      password: string;
      college: string;
    };

    const username = await generateUsername();

    const createdUser = await userModel.create({
      username,
      branch,
      email: encryptedData,
      lookupEmail: hashedEmail,
      password,
      bookmarks: [],
      college,
    });

    if (!createdUser) {
      res.status(400).json({ error: "Failed to create user" });
      return;
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      createdUser._id
    );

    if (!accessToken || !refreshToken) {
      res
        .status(500)
        .json({ error: "Failed to generate access and refresh token" });
      return;
    }

    res
      .status(201)
      .cookie("__accessToken", accessToken, {
        ...options,
        maxAge: accessTokenExpiry,
      })
      .cookie("__refreshToken", refreshToken, {
        ...options,
        maxAge: refreshTokenExpiry,
      })
      .json({
        message: "Form submitted successfully!",
        data: {
          ...createdUser,
          refreshToken: null,
          password: null,
          email: null,
        },
      });
  } catch (error) {
    console.log(error);
    handleError(
      error as ApiError,
      res,
      "Failed to create a user",
      "User with this email already exists"
    );
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    let existingUser: UserDocument | null = null;

    if (email) {
      const encryptedEmail = await hashEmailForLookup(email.toLowerCase());
      existingUser = await userModel.findOne({ lookupEmail: encryptedEmail });
    } else if (username) {
      existingUser = await userModel.findOne({ username });
    } else {
      throw new ApiError(400, "Email or username is required");
    }

    if (!existingUser || !existingUser.password)
      throw new ApiError(400, "User not found");

    if (existingUser.isBlocked) throw new ApiError(400, "User is blocked");

    if (new Date(existingUser.suspension.ends) > new Date())
      throw new ApiError(
        400,
        `User is suspended till ${existingUser.suspension.ends} for '${existingUser.suspension.reason}'`
      );

    if (!(await existingUser.isPasswordCorrect(password)))
      throw new ApiError(400, "Invalid password");

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      existingUser._id as mongoose.Types.ObjectId
    );

    if (!accessToken || !refreshToken) {
      res
        .status(400)
        .json({ error: "Failed to generate access and refresh token" });
      return;
    }

    res
      .status(200)
      .cookie("__accessToken", accessToken, {
        ...options,
        maxAge: accessTokenExpiry,
      })
      .cookie("__refreshToken", refreshToken, {
        ...options,
        maxAge: refreshTokenExpiry,
      })
      .json({
        message: "User logged in successfully!",
        data: {
          ...existingUser,
          refreshToken: null,
          password: null,
          email: null,
        },
      });
  } catch (error) {
    handleError(error as ApiError, res, "Failed to login");
  }
};

export const getUserData = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      res.status(400).json({ error: "User not found" });
      return;
    }

    const user = {
      ...req.user,
      password: null,
      refreshToken: null,
    };

    res
      .status(200)
      .json({ message: "User fetched successfully!", data: user || "" });
  } catch (error) {
    handleError(error, res, "Failed to fetch a user");
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      res.status(400).json({ error: "User not found" });
      return;
    }

    await userModel.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      }
    );

    res
      .status(200)
      .clearCookie("__accessToken", { ...options, maxAge: 0 })
      .clearCookie("__refreshToken", { ...options, maxAge: 0 })
      .json({ message: "User logged Out" });
  } catch (error) {
    handleError(error as ApiError, res, "Failed to logout");
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const incomingRefreshToken =
      req.cookies.__refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      env.refreshTokenSecret
    );

    if (!decodedToken || typeof decodedToken == "string") {
      throw new ApiError(401, "Invalid Access Token");
    }

    const user = (await userModel.findById(decodedToken?._id)) as UserDocument;

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token does not match with database");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id as mongoose.Types.ObjectId
    );

    res
      .status(200)
      .cookie("__accessToken", accessToken, {
        ...options,
        maxAge: accessTokenExpiry,
      })
      .cookie("__refreshToken", refreshToken, {
        ...options,
        maxAge: refreshTokenExpiry,
      })
      .json({ message: "Access token refreshed successfully" });
  } catch (error) {
    handleError(error as ApiError, res, "Failed to refresh access token");
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  try {
    const mailResponse = await sendMail(email, "OTP");

    if (!mailResponse.success)
      throw new ApiError(500, mailResponse.error || "Failed to send OTP");
    if (!mailResponse.otpCode) throw new ApiError(500, "Failed to send OTP");

    const encryptedEmail = await hashEmailForLookup(email.toLowerCase());

    const response = await redis.set(
      `otp:${encryptedEmail}`,
      mailResponse.otpCode,
      "EX",
      65
    );

    if (response !== "OK") {
      console.error("Failed to set OTP in Redis:", res);
      throw new ApiError(500, "Failed to set OTP in Redis");
    }

    res.status(200).json({
      messageId: mailResponse.messageId,
      message: "OTP sent successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Failed to send OTP");
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    if (!req.body.email || !req.body.otp)
      throw new ApiError(400, "Email and OTP are required");
    const result = await OtpVerifier(req.body.email, req.body.otp);

    if (result) {
      res
        .status(200)
        .json({ message: "OTP verified successfully", isVerified: true });
    } else {
      res.status(400).json({ message: "Invalid OTP", isVerified: false });
    }
  } catch (error) {
    handleError(error as ApiError, res, "Failed to verify OTP");
  }
};
