import { Router } from "express";
import {
  bulkDeleteReports,
  createReport,
  deleteReport,
  getReportedPosts,
  getUserReports,
  updateReportStatus,
} from "../controllers/admin.controller.js";

const router = Router();

router.route("/reports").post(createReport).delete(deleteReport).patch(updateReportStatus);
router.route("/reports/posts").get(getReportedPosts)
router.route("/reports/many").delete(bulkDeleteReports)
router.route("/reports/users").get(getUserReports).post(createReport).delete(deleteReport);

export default router;
