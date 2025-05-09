import { Router } from "express";
import {
  createPost,
  deletePost,
  getPostById,
  getPostsForFeed,
  updatePost,
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import verifyJWTLazyCheck from "../middleware/lazyauth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createPost);
router.route("/delete/:postId").delete(verifyJWT, deletePost);
router.route("/get/single/:id").get(verifyJWTLazyCheck, getPostById);
router.route("/feed").get(verifyJWTLazyCheck, getPostsForFeed);
router.route("/update/:postId").patch(verifyJWT, updatePost);

export default router;
