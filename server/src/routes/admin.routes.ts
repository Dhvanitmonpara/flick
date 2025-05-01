import { Router } from "express";
import {
  bulkDeleteReports,
  createReport,
  deleteReport,
  getReportedPosts,
  getReportedComments,
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
} from "../controllers/admin.controller.js";

const router = Router();

router.route("/reports").post(createReport).delete(deleteReport).patch(updateReportStatus);
router.route("/reports/posts").get(getReportedPosts)
router.route("/reports/posts/ban").patch(banPost)
router.route("/reports/posts/unban").patch(unbanPost)
router.route("/reports/posts/shadowban").patch(shadowBanPost)
router.route("/reports/posts/shadowunban").patch(shadowUnbanPost)
router.route("/reports/comments").get(getReportedComments)
router.route("/reports/many").delete(bulkDeleteReports)
router.route("/reports/users").get(getUserReports).post(createReport).delete(deleteReport);
router.route("/reports/users/block").patch(blockUser)
router.route("/reports/users/unblock").patch(unblockUser)
router.route("/reports/users/suspension").patch(suspendUser).get(getSuspensionStatus)

export default router;
