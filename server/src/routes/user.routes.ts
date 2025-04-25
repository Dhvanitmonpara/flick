import { Router } from "express";
import {
  registerUser,
  getUserData,
  loginUser,
  logoutUser,
  refreshAccessToken,
  sendOtp,
  verifyOtp,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").post(registerUser);
router.route("/get").get(verifyJWT, getUserData);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh").post(refreshAccessToken);
router.route("/otp/send").post(sendOtp);
router.route("/otp/verify").post(verifyOtp);

export default router;
