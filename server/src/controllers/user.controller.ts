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
import collegeModel from "../models/college.model.js";

const options = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as "strict",
};

const accessTokenExpiry = 15 * 60 * 1000; // 15 minutes
const refreshTokenExpiry = 60 * 60 * 1000 * 24 * 30; // 30 days

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

    if (!email || !password || !branch) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const hashedEmail = await hashEmailForLookup(email.toLowerCase());
    const existingUser = await userModel.findOne({ email: hashedEmail });

    if (existingUser) {
      res.status(400).json({ error: "User with this email already exists" });
      return;
    }

    const user = {
      password,
      branch,
    };

    const tempUser = await redis.set(
      `pending:${hashedEmail}`,
      JSON.stringify(user),
      "EX",
      65
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
    handleError(error, res, "Failed to initialize user");
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

    const { branch, password } = JSON.parse(user) as {
      branch: string;
      password: string;
    };

    const username = await generateUsername();

    const collegeDomain = email.split("@")[1].toLowerCase();
    const college = await collegeModel.findOne({ domain: collegeDomain });
    if (!college) throw new ApiError(400, "College not found");

    const createdUser = await userModel.create({
      username,
      branch,
      email: encryptedData,
      lookupEmail: hashedEmail,
      password,
      bookmarks: [],
      college: college._id,
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
      error,
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
      existingUser = await userModel.findOne({ email: encryptedEmail });
    } else if (username) {
      existingUser = await userModel.findOne({ username });
    } else {
      res.status(400).json({ error: "Email or username is required" });
      return;
    }

    if (!existingUser || !existingUser.password) {
      res.status(400).json({ error: "User with this email doesn't exists" });
      return;
    }

    if (existingUser.isBlocked) {
      res.status(400).json({ error: "User is blocked" });
      return;
    }

    if (new Date(existingUser.suspension.ends) > new Date()) {
      res.status(400).json({
        error: `User is suspended till ${existingUser.suspension.ends} for '${existingUser.suspension.reason}'`,
      });
      return;
    }

    if (!(await existingUser.isPasswordCorrect(password))) {
      res.status(400).json({ error: "Password is incorrect" });
      return;
    }

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
    console.log(error);
    handleError(error, res, "Failed to login");
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
      .status(201)
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
    handleError(error, res, "Failed to logout");
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

  if (!process.env.REFRESH_TOKEN_SECRET)
    throw new ApiError(
      500,
      "REFRESH_TOKEN_SECRET environment variable is not set"
    );

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedToken || typeof decodedToken == "string") {
      throw new ApiError(401, "Invalid Access Token");
    }

    const user = (await userModel.findById(decodedToken?._id)) as UserDocument;

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
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
    handleError(error, res, "Failed to refresh access token");
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
    console.log(error);
    handleError(error, res, "Failed to send OTP");
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
    handleError(error, res, "Failed to verify OTP");
  }
};
