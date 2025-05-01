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
router.route('/get/:postId').get(getPost)
router.route('/get/:userId').get(getPostsForFeed).patch(verifyJWT, updatePost)

export default router;