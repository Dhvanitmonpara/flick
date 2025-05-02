import { Router } from "express"
import { createAdmin } from "../controllers/admin.controller.js"

const router = Router()

router.route("/").post(createAdmin)
router.route("/").get(createAdmin)

export default router