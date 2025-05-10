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
  getUsersByQuery,
  banComment,
  unbanComment,
} from "../controllers/reports.controller.js";
import { deleteFeedback, getFeedbackById, listFeedbacks, updateFeedbackStatus } from "../controllers/feedback.controller.js";

const router = Router();

router.route("/status/:reportId").patch(updateReportStatus);
router.route("/reports/get").get(getReports);
router.route("/posts/ban/:targetId").patch(banPost);
router.route("/posts/unban/:targetId").patch(unbanPost);
router.route("/posts/shadowban/:targetId").patch(shadowBanPost);
router.route("/posts/shadowunban/:targetId").patch(shadowUnbanPost);
router.route("/comments/ban/:targetId").patch(banComment);
router.route("/comments/unban/:targetId").patch(unbanComment);
router.route("/single").delete(deleteReport);
router.route("/many").delete(bulkDeleteReports);
router.route("/users").get(getUserReports);
router.route("/users/query").get(getUsersByQuery);
router.route("/users/block/:userId").patch(blockUser);
router.route("/users/unblock/:userId").patch(unblockUser);
router.route("/users/suspension/:userId").patch(suspendUser).get(getSuspensionStatus);
router.route("/feedback/:id").get(getFeedbackById).delete(deleteFeedback);
router.route("/feedback/status/:id").get(getFeedbackById).delete(deleteFeedback).patch(updateFeedbackStatus)
router.route("/feedback/all").get(listFeedbacks)

export default router;
