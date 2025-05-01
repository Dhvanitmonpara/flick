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
} from "../controllers/reports.controller.js";

const router = Router();

router.route("/").post(createReport).delete(deleteReport).patch(updateReportStatus);
router.route("/posts").get(getReportedPosts)
router.route("/posts/ban").patch(banPost)
router.route("/posts/unban").patch(unbanPost)
router.route("/posts/shadowban").patch(shadowBanPost)
router.route("/posts/shadowunban").patch(shadowUnbanPost)
router.route("/comments").get(getReportedComments)
router.route("/many").delete(bulkDeleteReports)
router.route("/users").get(getUserReports).post(createReport).delete(deleteReport);
router.route("/users/block").patch(blockUser)
router.route("/users/unblock").patch(unblockUser)
router.route("/users/suspension").patch(suspendUser).get(getSuspensionStatus)

export default router;
