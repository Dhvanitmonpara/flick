import { Response } from "express";
import { ApiError } from "../utils/ApiError.js";

// MongoServerError interface for better type safety
interface MongoServerError extends Error {
  name: string;
  code: number;
}

function handleError(
  error: unknown,
  res: Response,
  fallbackMessage: string,
  duplicationErrorMessage?: string
) {
  console.error(fallbackMessage, error);

  // Handle Mongo duplicate key error first
  if (isMongoDuplicateError(error)) {
    return res
      .status(400)
      .json({ error: duplicationErrorMessage || "Duplicate key error" });
  }

  // Handle known API errors
  if (error instanceof ApiError) {
    if (error.statusCode === 401 && error.message === "Access token not found" || error.message === "Access and refresh token not found") {
      return res.status(401).json({ error: "Unauthorized", hasRefreshToken: error.message === "Access token not found" });
    }
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || fallbackMessage });
  }

  // Handle unexpected errors
  return res.status(500).json({ error: fallbackMessage });
}

// Helper function to check MongoDB duplicate error
function isMongoDuplicateError(error: unknown): error is MongoServerError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as MongoServerError).name === "MongoServerError" &&
    (error as MongoServerError).code === 11000
  );
}

export default handleError;
