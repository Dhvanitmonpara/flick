import { Router } from "express";
import {
    createCollege,
    deleteCollege,
    getCollegeById,
    getColleges,
    updateCollege,
} from "../controllers/college.controller.js";
import { verifyAdminJWT } from "../middleware/auth.middleware.js";

const router = Router()

router.route('/').post(verifyAdminJWT, createCollege).delete(verifyAdminJWT, deleteCollege)
router.route('/update/:id').patch(verifyAdminJWT, updateCollege)
router.route('/get/single/:id').get(getCollegeById)
router.route('/get/all').get(getColleges)

export default router;