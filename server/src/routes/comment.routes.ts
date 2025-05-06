import { Router } from "express";
import {
  getCommentsByPostId,
  createComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/p/:postId").get(getCommentsByPostId);
router.route("/create/:postId").post(verifyJWT, createComment);

export default router;
