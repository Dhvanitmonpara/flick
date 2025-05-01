import { Request, Response } from "express";
import adminModel from "../models/admin.model.js";
import { ApiError } from "../utils/ApiError.js";
import handleError from "../services/HandleError.js";

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const admin = await adminModel.create({
      email,
      password,
    });

    res.status(201).json({
      success: true,
      admin,
      message: "Admin created successfully",
    });
  } catch (error) {
    handleError(error as ApiError, res, "Error creating admin");
  }
};