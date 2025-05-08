import { Router } from "express";
import {
  bulkDeleteReports,
  deleteReport,
  getUserReports,
  banPost,
  shadowBanPost,
  shadowUnbanPost,
  unbanPost,
  blockUser,
  getSuspensionStatus,
  suspendUser,
  unblockUser,
  updateReportStatus,
  getReports,
} from "../controllers/reports.controller.js";

const router = Router();

router.route("/status/:reportId").patch(updateReportStatus);
router.route("/reports/get").get(getReports);
router.route("/posts/ban/:postId").patch(banPost);
router.route("/posts/unban/:postId").patch(unbanPost);
router.route("/posts/shadowban/:postId").patch(shadowBanPost);
router.route("/posts/shadowunban/:postId").patch(shadowUnbanPost);
router.route("/single").delete(deleteReport);
router.route("/many").delete(bulkDeleteReports);
router.route("/users").get(getUserReports);
router.route("/users/block").patch(blockUser);
router.route("/users/unblock").patch(unblockUser);
router.route("/users/suspension").patch(suspendUser).get(getSuspensionStatus);

export default router;
