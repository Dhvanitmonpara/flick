import { Router } from "express";
import {
  getCommentsByPostId,
  createComment,
  deleteComment,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import verifyJWTLazyCheck from "../middleware/lazyauth.middleware.js";

const router = Router();

router.route("/p/:postId").get(verifyJWTLazyCheck, getCommentsByPostId);
router.route("/create/:postId").post(verifyJWT, createComment);
router.route("/delete/:commentId").delete(verifyJWT, deleteComment);
router.route("/update/:commentId").patch(verifyJWT, updateComment);

export default router;
