import { Router } from "express";
import {
    createPost,
    deletePost,
    getPost,
    getPostsForFeed,
    updatePost,
} from "../controllers/post.controller.js";

const router = Router()

router.route('/').post(createPost).delete(deletePost)
router.route('/get/:postId').get(getPost)
router.route('/get/:userId').get(getPostsForFeed).patch(updatePost)

export default router;