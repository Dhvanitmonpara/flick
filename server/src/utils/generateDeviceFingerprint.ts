import { Request } from "express";
import crypto from "crypto";

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

export default generateDeviceFingerprint;