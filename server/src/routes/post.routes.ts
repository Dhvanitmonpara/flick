import { Router } from "express";
import {
  createPost,
  deletePost,
  getPostById,
  getPostsForFeed,
  updatePost,
} from "../controllers/post.controller.js";
import { blockSuspensionMiddleware, lazyVerifyJWT, termsAcceptedMiddleware, verifyUserJWT } from "../middleware/auth.middleware.js";

const router = Router();

router
  .route("/")
  .post(
    verifyUserJWT,
    blockSuspensionMiddleware,
    termsAcceptedMiddleware,
    createPost
  );
router.route("/delete/:postId").delete(verifyUserJWT, deletePost);
router.route("/get/single/:id").get(lazyVerifyJWT, getPostById);
router.route("/feed").get(lazyVerifyJWT, getPostsForFeed);
router
  .route("/update/:postId")
  .patch(verifyUserJWT, blockSuspensionMiddleware, updatePost);

export default router;
