import { redis } from "../app.js";
import { hashEmailForLookup } from "./cryptographer.js";

const OtpVerifier = async (email: string, otp: string, isEmailEncrypted: boolean = false) => {
  try {

    const encryptedEmail = isEmailEncrypted ? email : await hashEmailForLookup(email.toLowerCase());

    const storedOtp = await redis.get(`otp:${encryptedEmail}`);

    if (storedOtp === otp) {
      await redis.del(`otp:${encryptedEmail}`);
      return true;
    } else {
      return false
    }
  } catch (error) {
    return false;
  }
};

export default OtpVerifier;
