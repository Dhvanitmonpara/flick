import { Request, Response } from "express";
import userModel from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import mongoose, { Mongoose } from "mongoose";
import { encryptEmail } from "../services/encryptor";
import handleError from "../services/HandleError";

const options = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as "strict",
};

const accessTokenExpiry = 15 * 60 * 1000; // 15 minutes
const refreshTokenExpiry = 60 * 60 * 1000 * 24 * 30; // 30 days

interface UserDocument extends Document {
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

const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, branch, college, email, password } = req.body;

    if (!username || !branch || !college || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const encryptedEmail = await encryptEmail(email.toLowerCase());
    const existingUser = await userModel.findOne({ email: encryptedEmail });

    if (existingUser) {
      res.status(400).json({ error: "User with this email already exists" });
      return;
    }

    const createdUser = await userModel.create({
      username,
      branch,
      email: encryptedEmail,
      password,
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
      error,
      res,
      "Failed to create a user",
      "User with this email already exists"
    );
  }
};

const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    let existingUser: UserDocument | null = null;

    if (email) {
      const encryptedEmail = await encryptEmail(email.toLowerCase());
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

const getUserData = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    if (!username) {
      res.status(400).json({ error: "Username is required" });
      return;
    }

    const newEntry = await userModel.findOne({ username });

    if (!newEntry) {
      res.status(400).json({ error: "User with this username does not exist" });
      return;
    }

    await newEntry.save();
    res
      .status(201)
      .json({ message: "User fetched successfully!", data: newEntry || "" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch a user" });
  }
};

export { registerUser, getUserData, loginUser };
