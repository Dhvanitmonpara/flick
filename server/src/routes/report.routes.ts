import { Router } from "express";
import { createReport } from "../controllers/reports.controller.js";
import {
  blockSuspensionMiddleware,
  verifyUserJWT,
} from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").post(verifyUserJWT, blockSuspensionMiddleware, createReport);

export default router;
