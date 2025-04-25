import { useState, useEffect, useCallback } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import axios, { AxiosResponse } from "axios";
import { toast } from 'sonner'
import useProfileStore from "@/store/profileStore";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const OTP_EXPIRE_TIME = 60;

const EmailVerificationPage = () => {
  const { profile } = useProfileStore()

  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRE_TIME);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate()

  useEffect(() => {
    if (!profile.email) {
      navigate("/auth/signin");
    }
  }, [navigate, profile.email]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const sendOtp = useCallback(async () => {
    try {
      const mailResponse: AxiosResponse = await axios.post(
        `${import.meta.env.VITE_SERVER_API_URL}/users/otp/send`,
        { email: profile.email },
        { withCredentials: true }
      );

      if (mailResponse.status === 200) {
        setTimeLeft(OTP_EXPIRE_TIME);
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
    }
  }, [profile.email])

  const handleResendOTP = () => {
    setTimeLeft(OTP_EXPIRE_TIME);
    sendOtp();
  };

  useEffect(() => {
    const verify = async () => {

      if (otp.length === 6) {
        try {
          setIsLoading(true)

          const response = await axios.post(
            `${import.meta.env.VITE_SERVER_API_URL}/users/otp/verify`,
            { email: profile.email, otp },
            { withCredentials: true }
          );

          if (response.status !== 200 || !response.data.otp) {
            toast.error(response.data.message || "failed to verify otp")
            return
          }

          if (otp.toString() === response.data.otp.toString()) {
            toast.success("opt verified");
            navigate("/")
          } else {
            toast.error("wrong otp try again");
          }
        } catch (error) {
          console.error("Error verifying OTP:", error);
        } finally {
          setIsLoading(false)
        }
      }
    }
    verify()
  }, [navigate, otp, profile.email]);

  useEffect(() => {
    sendOtp();
  }, [profile.email, sendOtp]);

  return (
    <div className="max-w-md w-full mx-auto px-6 py-8 border dark:border-zinc-800 rounded-lg shadow-lg">
      <h1 className="text-3xl font-semibold mb-6 text-center">Sign Up</h1>
      <form className="space-y-5 flex justify-center items-center flex-col">
        <p className="text-sm text-foreground/60 text-center">
          Enter the 6-digit code we emailed to <b>{profile.email}</b>. If you did not
          receive it, you can request a new one{" "}
          {timeLeft > 0 ? (
            <span>
              in <b>{timeLeft}</b> seconds
            </span>
          ) : (
            <span
              className="text-blue-500 hover:underline cursor-pointer"
              onClick={handleResendOTP}
            >
              Resend OTP
            </span>
          )}
          .
        </p>
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup>
            <InputOTPSlot autoFocus index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        <Button
          type="submit"
          disabled={isLoading || timeLeft === 0 || !profile.email || otp === "" || otp.length !== 6}
          className={`w-full py-2 font-semibold rounded-md dark:text-zinc-900 bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:bg-zinc-500 disabled:cursor-wait"}`}
        >
          {isLoading ? "Verifying..." : "Verify Account"}
        </Button>
      </form>
    </div>
  );
};

export default EmailVerificationPage;
