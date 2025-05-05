import { Router } from "express";
import {
    createVote,
    deleteVote
} from "../controllers/vote.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router()

router.route('/').post(verifyJWT, createVote).delete(verifyJWT, deleteVote)

export default router;