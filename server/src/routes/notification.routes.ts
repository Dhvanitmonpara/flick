import { Router } from "express";
import {
  verifyUserJWT,
} from "../middleware/auth.middleware.js";
import { listNotifications } from "../controllers/notification.controller.js";

const router = Router();

router
  .route("/list")
  .get(verifyUserJWT, listNotifications);

export default router;