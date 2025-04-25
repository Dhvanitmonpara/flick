import { redis } from "../app.js";
import { ApiError } from "../utils/ApiError.js";

const OtpVerifier = async (email: string, otp: string) => {
  try {
    const storedOtp = await redis.get(`otp:${email}`);

    if (storedOtp === otp) {
      await redis.del(`otp:${email}`);
      return true;
    } else {
      throw new ApiError(400, "Invalid OTP");
    }
  } catch (error) {
    return error;
  }
};

export default OtpVerifier;
