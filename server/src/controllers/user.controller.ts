import { Request, Response } from "express";
import userModel from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";
import {
  decrypt,
  encrypt,
  hashEmailForLookup,
  hashOTP,
} from "../services/cryptographer.js";
import handleError from "../services/HandleError.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import sendMail from "../utils/sendMail.js";
import OtpVerifier from "../services/otpVerifier.js";
import { generateUuidBasedUsername } from "../services/userServices.js";
import CollegeModel from "../models/college.model.js";
import { env } from "../conf/env.js";
import { logEvent } from "../services/logService.js";
import redisClient from "../services/Redis.js";
import generateDeviceFingerprint from "../utils/generateDeviceFingerprint.js";

const options = {
  httpOnly: true,
  secure: process.env.ENVIRONMENT === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as "none")
      : ("lax" as "lax"),
};

const accessTokenExpiry = 60 * 1000 * parseInt(env.accessTokenExpiry); // In minutes
const refreshTokenExpiry =
  60 * 60 * 1000 * 24 * parseInt(env.refreshTokenExpiry); // In days

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
  email?: string;
  isVerified: boolean;
  refreshTokens: {
    token: string;
    ip: string;
    issuedAt: Date;
    userAgent: string;
  }[];
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
  userId: mongoose.Types.ObjectId,
  req: Request
) => {
  try {
    const user = (await userModel.findById(userId)) as UserDocument;
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    const userAgent = await generateDeviceFingerprint(req);
    const rawIp =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.ip;

    const ip = (Array.isArray(rawIp) ? rawIp[0] : rawIp || "")
      .split(",")[0]
      .trim();

    // Find existing token index for this ip + userAgent
    const existingTokenIndex = user.refreshTokens.findIndex(
      (t) => t.ip === ip && t.userAgent === userAgent
    );

    if (existingTokenIndex !== -1) {
      // Update the existing token in the array
      user.refreshTokens[existingTokenIndex] = {
        token: refreshToken,
        userAgent,
        ip,
        issuedAt: new Date(),
      };
    } else {
      if (!user.email) throw new ApiError(400, "Email is required");
      user.refreshTokens.push({
        token: refreshToken,
        userAgent,
        ip,
        issuedAt: new Date(),
      });
      const decryptedEmail = await decrypt(user.email);
      sendMail(decryptedEmail, "NEW-DEVICE-LOGIN");
    }

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken, userAgent, ip };
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

    const tempUser = await redisClient.set(
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

    const otpResponse = await redisClient.set(
      `otp:${email}`,
      encryptedOtp,
      "EX",
      65
    );

    if (otpResponse !== "OK") {
      throw new ApiError(500, "Failed to set OTP in Redis");
    }

    logEvent({
      req,
      action: "user_initialized_account",
      platform: "web",
      userId: null,
      metadata: {
        targetEmail: hashedEmail,
      },
    });

    res.status(201).json({
      message: "User initialized successfully and OTP sent",
      identifier: hashedEmail,
    });
  } catch (error) {
    handleError(
      error as ApiError,
      res,
      "Failed to initialize user",
      "INIT_USER_ERROR"
    );
  }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) throw new ApiError(400, "Email is required");

    const hashedEmail = await hashEmailForLookup(email.toLowerCase());
    const user = await redisClient.get(`pending:${hashedEmail}`);
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

    const { accessToken, refreshToken, userAgent, ip } =
      await generateAccessAndRefreshToken(createdUser._id, req);

    if (!accessToken || !refreshToken) {
      res
        .status(500)
        .json({ error: "Failed to generate access and refresh token" });
      return;
    }

    await redisClient.del(`pending:${hashedEmail}`);
    await redisClient.del(`otp:${hashedEmail}`);

    logEvent({
      req,
      action: "user_created_account",
      platform: "web",
      userId: createdUser._id.toString(),
      metadata: {
        targetEmail: hashedEmail,
        userAgent,
        ip,
      },
    });

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

    const { accessToken, refreshToken, userAgent, ip } =
      await generateAccessAndRefreshToken(
        existingUser._id as mongoose.Types.ObjectId,
        req
      );

    if (!accessToken || !refreshToken) {
      res
        .status(400)
        .json({ error: "Failed to generate access and refresh token" });
      return;
    }

    logEvent({
      req,
      action: "user_logged_in_self",
      platform: "web",
      metadata: {
        userAgent,
        ip,
      },
      userId: existingUser._id.toString(),
    });

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
    handleError(error as ApiError, res, "Failed to login", "LOGIN_ERROR");
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
    handleError(error, res, "Failed to fetch a user", "GET_USER_ERROR");
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

    logEvent({
      req,
      action: "user_logged_out_self",
      platform: "web",
      userId: req.user._id.toString(),
    });

    res
      .status(200)
      .clearCookie("__accessToken", { ...options, maxAge: 0 })
      .clearCookie("__refreshToken", { ...options, maxAge: 0 })
      .json({ message: "User logged Out" });
  } catch (error) {
    handleError(error as ApiError, res, "Failed to logout", "LOGOUT_ERROR");
  }
};

export const initializeForgotPassword = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username) throw new ApiError(400, "Username is required");

    const user = await userModel.findOne({ username });
    if (!user) throw new ApiError(400, "User not found");

    const decryptedEmail = await decrypt(user.email);

    const mailResponse = await sendMail(decryptedEmail, "OTP");
    if (!mailResponse.success)
      throw new ApiError(500, mailResponse.error || "Failed to send OTP");
    if (!mailResponse.otpCode) throw new ApiError(500, "Failed to send OTP");

    const encryptedOtp = await hashOTP(mailResponse.otpCode);
    if (!encryptedOtp) throw new ApiError(500, "Failed to encrypt OTP");

    const encryptedPassword = await encrypt(password);

    const passwordResponse = await redisClient.set(
      `password:${user.lookupEmail}`,
      encryptedPassword,
      "EX",
      300
    );

    if (passwordResponse !== "OK") {
      throw new ApiError(500, "Failed to set password in Redis");
    }

    const otpResponse = await redisClient.set(
      `otp:${user.lookupEmail}`,
      encryptedOtp,
      "EX",
      65
    );

    if (otpResponse !== "OK") {
      throw new ApiError(500, "Failed to set OTP in Redis");
    }

    logEvent({
      req,
      action: "user_initialized_forgot_password",
      platform: "web",
      userId: user._id.toString(),
    });

    res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    handleError(
      error as ApiError,
      res,
      "Failed to forgot password",
      "INITIALIZE_FORGOT_PASSWORD_ERROR"
    );
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    if (!username) throw new ApiError(400, "Username is required");

    const user = await userModel.findOne({ username });
    if (!user) throw new ApiError(400, "User not found");

    const storedPassword = await redisClient.get(`forgot:${user.lookupEmail}`);
    if (!storedPassword) throw new ApiError(400, "Password not found");

    const decryptedPassword = await decrypt(storedPassword);

    const { accessToken, refreshToken, ip, userAgent } =
      await generateAccessAndRefreshToken(user._id, req);

    user.password = decryptedPassword;
    const matchingTokenIndex = user.refreshTokens.findIndex(
      (token) => token.userAgent === userAgent && token.ip === ip
    );

    if (matchingTokenIndex !== -1) {
      user.refreshTokens[matchingTokenIndex].token = refreshToken;
      user.refreshTokens[matchingTokenIndex].issuedAt = new Date();
    } else {
      user.refreshTokens.push({
        token: refreshToken,
        userAgent,
        ip,
        issuedAt: new Date(),
      });
    }

    await user.save({ validateBeforeSave: false });

    await redisClient.del(`forgot:${user.lookupEmail}`);

    logEvent({
      req,
      action: "user_forgot_password",
      platform: "web",
      metadata: { ip, userAgent },
      userId: user._id.toString(),
    });

    res
      .status(200)
      .cookie("__accessToken", accessToken, options)
      .cookie("__refreshToken", refreshToken, options)
      .json({
        message: "Password updated successfully",
      });
  } catch (error) {
    handleError(
      error as ApiError,
      res,
      "Failed to forgot password",
      "FORGOT_PASSWORD_ERROR"
    );
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

    const matchedToken = user.refreshTokens.find(
      (t) => t.token === incomingRefreshToken
    );

    if (!matchedToken) {
      throw new ApiError(401, "Refresh token is invalid or not recognized");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id as mongoose.Types.ObjectId,
      req
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
    handleError(
      error as ApiError,
      res,
      "Failed to refresh access token",
      "REFRESH_ACCESS_TOKEN_ERROR"
    );
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

    const response = await redisClient.set(
      `otp:${encryptedEmail}`,
      mailResponse.otpCode,
      "EX",
      65
    );

    if (response !== "OK") {
      console.error("Failed to set OTP in Redis:", res);
      throw new ApiError(500, "Failed to set OTP in Redis");
    }

    logEvent({
      req,
      action: "user_reset_email_otp",
      platform: "web",
      userId: null,
      metadata: {
        encryptedTargetEmail: encryptedEmail,
      },
    });

    res.status(200).json({
      messageId: mailResponse.messageId,
      message: "OTP sent successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Failed to send OTP", "SEND_OTP_ERROR");
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    if (!req.body.email || !req.body.otp)
      throw new ApiError(400, "Email and OTP are required");
    const encryptedEmail = await hashEmailForLookup(
      req.body.email.toLowerCase()
    );
    const result = await OtpVerifier(encryptedEmail, req.body.otp, true);

    if (result) {
      logEvent({
        req,
        action: "user_verified_otp",
        platform: "web",
        userId: null,
        metadata: {
          encryptedTargetEmail: encryptedEmail,
        },
      });
      res
        .status(200)
        .json({ message: "OTP verified successfully", isVerified: true });
    } else {
      res.status(400).json({ message: "Invalid OTP", isVerified: false });
    }
  } catch (error) {
    handleError(
      error as ApiError,
      res,
      "Failed to verify OTP",
      "VERIFY_OTP_ERROR"
    );
  }
};

export const acceptTerms = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id ?? null;
    if (!userId) throw new ApiError(401, "Unauthorized request");

    await userModel.findByIdAndUpdate(userId, {
      $set: {
        termsAccepted: true,
      },
    });

    logEvent({
      req,
      action: "user_accepted_terms",
      platform: "web",
      userId: userId.toString(),
    });

    res.status(200).json({ message: "Terms accepted successfully" });
  } catch (error) {
    handleError(
      error as ApiError,
      res,
      "Failed to accept terms",
      "ACCEPT_TERMS_ERROR"
    );
  }
};
