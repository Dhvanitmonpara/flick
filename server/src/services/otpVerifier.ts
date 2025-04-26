import { redis } from "../app.js";

const OtpVerifier = async (email: string, otp: string) => {
  try {
    const storedOtp = await redis.get(`otp:${email}`);

    if (storedOtp === otp) {
      await redis.del(`otp:${email}`);
      return true;
    } else {
      return false
    }
  } catch (error) {
    return false;
  }
};

export default OtpVerifier;
