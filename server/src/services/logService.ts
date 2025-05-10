import { LogModel } from "../models/log.model.js";
import { TLogAction } from "../types/Log.js";

interface LogEventOptions {
  userId?: string;
  action: TLogAction;
  status?: "success" | "fail";
  platform: "web" | "mobile" | "tv" | "server" | "other";
  sessionId?: string;
  metadata?: object;
  timestamp?: Date;
}

export async function logEvent(options: LogEventOptions) {
  try {
    const {
      userId,
      action,
      status = "success",
      platform,
      sessionId = "unknown",
      metadata = {},
      timestamp = new Date(),
    } = options;

    await LogModel.create({
      userId,
      action,
      status,
      platform,
      sessionId,
      metadata,
      timestamp,
    });
  } catch (err) {
    console.error("Failed to log event internally:", err);
  }
}
