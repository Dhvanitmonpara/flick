import { Router } from "express";
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
  resendAdminOtp,
} from "../controllers/admin.controller.js";

const router = Router();

router
  .route("/")
  .post(createAdmin)
  .get(getAdmin)
  .delete(deleteAdmin)
  .patch(updateAdmin);
router.route("/login/init").post(initializeAdmin);
router.route("/login/verify").post(verifyAdminOtp);
router.route("/login/resend").post(resendAdminOtp);
router.route("/logout").post(logoutAdmin);
router.route("/device/remove").post(removeAuthorizedDevice);
router.route("/all").get(getAllAdmins);

export default router;
