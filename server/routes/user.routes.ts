import { Router } from "express";
import {
    createUser,
    getUserData
} from "../controllers/user.controller";

const router = Router()

router.route('/').post(createUser)
router.route('/:email').get(getUserData)

export default router;