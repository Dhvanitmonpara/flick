import { Router } from "express";
import {
    registerUser,
    getUserData
} from "../controllers/user.controller";

const router = Router()

router.route('/').post(registerUser)
router.route('/:email').get(getUserData)

export default router;