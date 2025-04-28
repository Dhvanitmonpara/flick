import { RequestHandler, Router } from "express";
import {
  registerUser,
  initializeUser,
  getUserData,
  loginUser,
  logoutUser,
  refreshAccessToken,
  sendOtp,
  verifyOtp,
  heartbeat,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/initialize").post(initializeUser);
router.route("/me").get(verifyJWT, getUserData);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/heartbeat").patch(heartbeat as RequestHandler);
router.route("/refresh").post(refreshAccessToken);
router.route("/otp/send").post(sendOtp);
router.route("/otp/verify").post(verifyOtp);

export default router;
