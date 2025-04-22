import { Request, Response } from "express";
import userModel from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import mongoose from "mongoose";

const options = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as "strict"
}

const accessTokenExpiry = 15 * 60 * 1000; // 15 minutes
const refreshTokenExpiry = 60 * 60 * 1000 * 24 * 30; // 30 days

interface UserDocument extends Document {
  refreshToken: string;
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

const createUser = async (req: Request, res: Response) => {
  try {
    const { username, branch, college, email } = req.body;

    // Check if any required field is missing or empty
    if (
      Object.values(req.body).some(
        (value) => value === "" || value === undefined
      )
    ) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    // hashing algo
    const hashedEmail = email.toLowerCase();

    const existingUser = await userModel.findOne({ email: hashedEmail });

    if (existingUser) {
      res.status(400).json({ error: "User with this email already exists" });
      return;
    }

    // Create and save new entry
    const createdUser = await userModel.create({
      username,
      branch,
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
        .status(400)
        .json({ error: "Failed to generate access and refresh token" });
      return;
    }

    res
      .status(201)
      .cookie("__accessToken", accessToken, {...options, maxAge: accessTokenExpiry})
      .cookie("__refreshToken", refreshToken, {...options, maxAge: refreshTokenExpiry})
      .json({ message: "Form submitted successfully!", data: createdUser });
    return;
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      if (error.name === "MongoServerError" && (error as any).code === 11000) {
        res.status(400).json({ error: "User with this email already exists" });
        return;
      }
      res.status(500).json({ error: error.message || "Failed to submit form" });
    } else {
      res.status(500).json({ error: "Failed to submit form" });
    }
  }
};

const getUserData = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const newEntry = await userModel.findOne({ email });

    if (!newEntry) {
      res.status(400).json({ error: "User with this email does not exist" });
      return;
    }

    await newEntry.save();
    res
      .status(201)
      .json({ message: "Form fetched successfully!", data: newEntry || "" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch the form" });
  }
};

export { createUser, getUserData };
