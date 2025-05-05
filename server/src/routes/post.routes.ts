import { Router } from "express";
import {
    createPost,
    deletePost,
    getPost,
    getPostsForFeed,
    updatePost,
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router()

router.route('/').post(verifyJWT, createPost).delete(verifyJWT, deletePost)
router.route('/get/post/:postId').get(getPost)
router.route('/feed').get(getPostsForFeed)
router.route('/update/:postId').patch(verifyJWT, updatePost)

export default router;