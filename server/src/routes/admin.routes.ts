import { Router } from "express"
import { 
  createAdmin,
  deleteAdmin,
  getAdmin,
  getAllAdmins,
  updateAdmin,
  initializeAdmin,
  logoutAdmin,
  removeAuthorizedDevice,
  verifyAdminOtp,
 } from "../controllers/admin.controller.js"

const router = Router()

router.route("/").post(createAdmin).get(getAdmin).delete(deleteAdmin).patch(updateAdmin)
router.route("/login/init").post(initializeAdmin)
router.route("/login").post(verifyAdminOtp)
router.route("/logout").post(logoutAdmin)
router.route("/device/remove").post(removeAuthorizedDevice)
router.route("/all").get(getAllAdmins)

export default router